/**
 * Public Booking Routes — P4
 * POST   /api/public/appointments              — create booking (no auth)
 * POST   /api/public/appointments/cancel       — cancel by token (no auth)
 * GET    /api/public/appointments/services/:slug   — list active services
 * GET    /api/public/appointments/availability/:slug — available slots (real business hours)
 *
 * P4: luxon timezone, round-robin professionals, Resend email, cancel_token
 */

'use strict';

const express = require('express');
const { Op } = require('sequelize');
const { DateTime } = require('luxon');
const crypto = require('crypto');
const router = express.Router();
const { Tenant, Service, Professional, Client, Appointment, MiniSiteConfig, User } = require('../../models');
const logger = require('../../shared/utils/logger');
const emailService = require('../../shared/services/email');

// ─── Constants ────────────────────────────────────────────────────────────────

const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DEFAULT_TZ = 'America/Sao_Paulo';
const CANCEL_TOKEN_TTL_HOURS = 48;

const DEFAULT_HOURS = {
  mon: { open: '09:00', close: '18:00' },
  tue: { open: '09:00', close: '18:00' },
  wed: { open: '09:00', close: '18:00' },
  thu: { open: '09:00', close: '18:00' },
  fri: { open: '09:00', close: '18:00' },
  sat: { open: '09:00', close: '13:00' },
  sun: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

function toMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Parse incoming datetime string and convert to UTC using tenant's timezone.
 * Accepts ISO with offset (2026-04-21T10:00:00-03:00) or naive (2026-04-21T10:00:00).
 * Naive strings are treated as being in the tenant's timezone.
 */
function parseToUTC(datetimeStr, timezone) {
  const tz = timezone || DEFAULT_TZ;

  // Try parsing as ISO with offset first
  let dt = DateTime.fromISO(datetimeStr, { setZone: true });
  if (!dt.isValid) return null;

  // If no offset was in the string, treat it as tenant local time
  if (!datetimeStr.match(/[+-]\d{2}:\d{2}$/) && !datetimeStr.endsWith('Z')) {
    dt = DateTime.fromISO(datetimeStr, { zone: tz });
  }

  return dt.toUTC().toJSDate();
}

/**
 * Get day-of-week key for a UTC date in a given timezone.
 */
function getDowKey(utcDate, timezone) {
  const tz = timezone || DEFAULT_TZ;
  const dt = DateTime.fromJSDate(utcDate, { zone: 'utc' }).setZone(tz);
  return DOW_KEYS[dt.weekday % 7]; // luxon: 1=Mon…7=Sun; JS: 0=Sun…6=Sat
}

/**
 * Get hour+minute of a UTC date in tenant's local time.
 */
function getLocalMinutes(utcDate, timezone) {
  const tz = timezone || DEFAULT_TZ;
  const dt = DateTime.fromJSDate(utcDate, { zone: 'utc' }).setZone(tz);
  return dt.hour * 60 + dt.minute;
}

function getHoursForDate(utcDate, businessHours, timezone) {
  const hours = businessHours || DEFAULT_HOURS;
  const dowKey = getDowKey(utcDate, timezone);
  return hours[dowKey] || null;
}

function isWithinBusinessHours(utcDate, businessHours, timezone) {
  const dayHours = getHoursForDate(utcDate, businessHours, timezone);
  if (!dayHours) return false;
  const openMin  = toMinutes(dayHours.open);
  const closeMin = toMinutes(dayHours.close);
  const slotMin  = getLocalMinutes(utcDate, timezone);
  return slotMin >= openMin && slotMin < closeMin;
}

/**
 * Generate a secure random cancel token.
 */
function generateCancelToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Resolve tenant + mini-site; validate booking_enabled and tenant status.
 */
async function resolveTenantForBooking(slug) {
  const miniSite = await MiniSiteConfig.findOne({
    where: { slug: sanitize(slug), published: true },
  });
  if (!miniSite) return { error: 404, message: 'Mini-site não encontrado ou não publicado' };
  if (!miniSite.booking_enabled) {
    return { error: 400, message: 'Agendamento online não está habilitado para este estabelecimento' };
  }

  const tenant = await Tenant.findByPk(miniSite.tenant_id);
  if (!tenant || ['suspended', 'cancelled'].includes(tenant.status)) {
    return { error: 404, message: 'Estabelecimento indisponível' };
  }

  return { miniSite, tenant };
}

/**
 * Round-robin: pick the professional with fewest PENDING/CONFIRMED appointments
 * on the same day as the requested slot.
 */
async function pickProfessional(tenantId, startTime, endTime) {
  const professionals = await Professional.findAll({
    where: { tenant_id: tenantId, is_active: true },
    include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
    order: [['created_at', 'ASC']],
  });

  if (!professionals.length) return null;

  // Count active bookings per professional for this time window
  const counts = await Promise.all(professionals.map(async (prof) => {
    const busy = await Appointment.count({
      where: {
        tenant_id: tenantId,
        professional_id: prof.id,
        status: { [Op.in]: ['PENDING', 'CONFIRMED'] },
        start_time: { [Op.lt]: endTime },
        end_time:   { [Op.gt]: startTime },
      },
    });
    return { prof, busy };
  }));

  // Return the one with 0 conflicts first (available), else null (all busy)
  const available = counts.filter(c => c.busy === 0);
  if (!available.length) return null; // all busy at this slot

  // Among available, pick the one with fewest appointments today (load balance)
  const dayStart = new Date(startTime);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const withLoad = await Promise.all(available.map(async ({ prof }) => {
    const dayCount = await Appointment.count({
      where: {
        tenant_id: tenantId,
        professional_id: prof.id,
        status: { [Op.in]: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
        start_time: { [Op.gte]: dayStart, [Op.lt]: dayEnd },
      },
    });
    return { prof, dayCount };
  }));

  withLoad.sort((a, b) => a.dayCount - b.dayCount);
  return withLoad[0].prof;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/public/appointments — create booking (P4: timezone + round-robin + email)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { slug, name, phone, service_id, datetime } = req.body;

    // ── Basic field validation ───────────────────────────────────────────────
    const missing = [];
    if (!slug)       missing.push('slug');
    if (!name)       missing.push('nome');
    if (!phone)      missing.push('telefone');
    if (!service_id) missing.push('serviço');
    if (!datetime)   missing.push('data e horário');
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Campos obrigatórios: ${missing.join(', ')}`,
        errors: missing,
      });
    }

    // ── Resolve tenant (needed for timezone before datetime validation) ───────
    const resolved = await resolveTenantForBooking(slug);
    if (resolved.error) {
      return res.status(resolved.error).json({ success: false, message: resolved.message });
    }
    const { tenant } = resolved;
    const tenantId  = tenant.id;
    const tz        = tenant.settings?.timezone || DEFAULT_TZ;
    const businessHours = tenant.settings?.businessHours || null;

    // ── Parse datetime → UTC (P4: uses tenant timezone) ─────────────────────
    const startTime = parseToUTC(datetime, tz);
    if (!startTime) {
      return res.status(400).json({ success: false, message: 'Data/horário inválido' });
    }
    const nowUTC = new Date();
    if (startTime <= nowUTC) {
      return res.status(400).json({ success: false, message: 'O horário escolhido já passou. Escolha uma data futura.' });
    }
    const maxDate = new Date(nowUTC.getTime() + 60 * 24 * 60 * 60 * 1000);
    if (startTime > maxDate) {
      return res.status(400).json({ success: false, message: 'Agendamentos disponíveis para até 60 dias no futuro.' });
    }

    // ── Business hours validation (P4: timezone-aware) ───────────────────────
    if (!isWithinBusinessHours(startTime, businessHours, tz)) {
      const dayHours = getHoursForDate(startTime, businessHours, tz);
      const localDt  = DateTime.fromJSDate(startTime, { zone: 'utc' }).setZone(tz);
      const dayName  = localDt.toFormat('cccc', { locale: 'pt-BR' });
      if (!dayHours) {
        return res.status(400).json({
          success: false,
          message: `Este estabelecimento não funciona ${dayName}. Escolha outro dia.`,
          error: { code: 'OUTSIDE_BUSINESS_HOURS' },
        });
      }
      return res.status(400).json({
        success: false,
        message: `Horário fora do expediente. Atendemos ${dayName} das ${dayHours.open} às ${dayHours.close}.`,
        error: { code: 'OUTSIDE_BUSINESS_HOURS' },
      });
    }

    // ── Resolve service ──────────────────────────────────────────────────────
    const service = await Service.findOne({
      where: { id: service_id, tenant_id: tenantId, is_active: true },
    });
    if (!service) {
      return res.status(400).json({ success: false, message: 'Serviço não encontrado ou indisponível' });
    }

    const durationMinutes = parseInt(service.duration) || 60;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    // Ensure appointment ends within business hours
    const dayHoursEnd = getHoursForDate(startTime, businessHours, tz);
    if (dayHoursEnd) {
      const closeMin = toMinutes(dayHoursEnd.close);
      const endLocalMin = getLocalMinutes(endTime, tz);
      if (endLocalMin > closeMin) {
        return res.status(400).json({
          success: false,
          message: `Este horário ultrapassa o fechamento (${dayHoursEnd.close}). Escolha um horário mais cedo.`,
          error: { code: 'EXCEEDS_BUSINESS_HOURS' },
        });
      }
    }

    // ── Round-robin: pick least-loaded available professional (P4) ────────────
    const professional = await pickProfessional(tenantId, startTime, endTime);
    if (!professional) {
      return res.status(409).json({
        success: false,
        message: 'Horário já ocupado para todos os profissionais. Por favor, escolha outro horário.',
        error: { code: 'CONFLICT' },
      });
    }

    // ── Find or create guest client ──────────────────────────────────────────
    const cleanPhone = sanitize(phone).replace(/\D/g, '');
    if (cleanPhone.length < 8) {
      return res.status(400).json({ success: false, message: 'Telefone inválido' });
    }
    const cleanName = sanitize(name).substring(0, 100);
    const nameParts = cleanName.split(' ');

    let client = await Client.findOne({ where: { tenant_id: tenantId, phone: cleanPhone } });
    if (!client) {
      client = await Client.create({
        tenant_id:  tenantId,
        first_name: nameParts[0] || cleanName,
        last_name:  nameParts.slice(1).join(' ') || null,
        phone:      cleanPhone,
      });
    }

    // ── Generate cancel token (P4) ───────────────────────────────────────────
    const cancelToken = generateCancelToken();

    // ── Create appointment ───────────────────────────────────────────────────
    const appointment = await Appointment.create({
      tenant_id:         tenantId,
      client_id:         client.id,
      professional_id:   professional.id,
      service_id:        service.id,
      start_time:        startTime,
      end_time:          endTime,
      status:            'PENDING',
      notes:             `Agendamento via site público. Cliente: ${cleanName}, Tel: ${cleanPhone}`,
      price_charged:     service.price || null,
      cancel_token:      cancelToken,
      cancel_token_used: false,
      booking_source:    'public',
    });

    logger.info('[PublicBooking] Appointment created', {
      tenantId,
      appointmentId: appointment.id,
      serviceId:     service.id,
      professionalId: professional.id,
      startTime:     startTime.toISOString(),
      tz,
    });

    // ── Email notifications (P4 — fire-and-forget) ───────────────────────────
    emailService.notifyBookingCreated({
      tenant, appointment, service, client, professional, cancelToken,
    }).catch(e => logger.warn('[PublicBooking] Email notification failed', { error: e.message }));

    return res.status(201).json({
      success: true,
      message: 'Agendamento solicitado com sucesso! Em breve entraremos em contato para confirmar.',
      data: {
        appointment_id:   appointment.id,
        service:          service.name,
        duration_minutes: durationMinutes,
        datetime:         startTime.toISOString(),
        end_time:         endTime.toISOString(),
        cancel_token:     cancelToken,
        status:           'PENDING',
      },
    });
  } catch (error) {
    logger.error('[PublicBooking] POST error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Erro ao processar agendamento. Tente novamente em instantes.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/public/appointments/cancel — cancel by token (no auth, P4)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/cancel', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string' || token.length < 32) {
      return res.status(400).json({ success: false, message: 'Token de cancelamento inválido' });
    }

    const appointment = await Appointment.findOne({
      where: { cancel_token: token },
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Token não encontrado ou já utilizado' });
    }

    if (appointment.cancel_token_used) {
      return res.status(410).json({ success: false, message: 'Este link de cancelamento já foi usado' });
    }

    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) {
      return res.status(409).json({
        success: false,
        message: `Este agendamento não pode ser cancelado (status: ${appointment.status.toLowerCase()})`,
      });
    }

    // Check token TTL (48h from creation)
    const tokenAge = Date.now() - new Date(appointment.created_at).getTime();
    if (tokenAge > CANCEL_TOKEN_TTL_HOURS * 60 * 60 * 1000) {
      return res.status(410).json({
        success: false,
        message: 'O link de cancelamento expirou. Entre em contato com o estabelecimento.',
      });
    }

    // Load related records for notification
    const [tenant, service, client] = await Promise.all([
      Tenant.findByPk(appointment.tenant_id),
      Service.findByPk(appointment.service_id),
      Client.findByPk(appointment.client_id),
    ]);

    // Cancel the appointment
    await appointment.update({ status: 'CANCELLED', cancel_token_used: true });

    logger.info('[PublicBooking] Appointment cancelled via token', {
      appointmentId: appointment.id,
      tenantId: appointment.tenant_id,
    });

    // Notify establishment
    if (tenant && service && client) {
      emailService.notifyBookingCancelled({ tenant, appointment, service, client })
        .catch(e => logger.warn('[PublicBooking] Cancel email failed', { error: e.message }));
    }

    return res.json({
      success: true,
      message: 'Agendamento cancelado com sucesso.',
      data: { appointment_id: appointment.id },
    });
  } catch (error) {
    logger.error('[PublicBooking] Cancel error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Erro ao cancelar agendamento.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/public/appointments/availability/:slug — real slots (P4: timezone)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/availability/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { date, service_id } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Informe a data no formato YYYY-MM-DD' });
    }

    const resolved = await resolveTenantForBooking(slug);
    if (resolved.error) {
      return res.status(resolved.error).json({ success: false, message: resolved.message });
    }
    const { tenant } = resolved;
    const tenantId      = tenant.id;
    const tz            = tenant.settings?.timezone || DEFAULT_TZ;
    const businessHours = tenant.settings?.businessHours || DEFAULT_HOURS;

    // Resolve service duration
    let durationMinutes = 60;
    if (service_id) {
      const svc = await Service.findOne({ where: { id: service_id, tenant_id: tenantId, is_active: true } });
      if (svc) durationMinutes = parseInt(svc.duration) || 60;
    }

    // Build a noon reference in tenant timezone to check day-of-week
    const noonLocal = DateTime.fromISO(`${date}T12:00:00`, { zone: tz });
    const dayHours  = getHoursForDate(noonLocal.toUTC().toJSDate(), businessHours, tz);

    if (!dayHours) {
      return res.json({
        success: true,
        data: { date, slots: [], duration_minutes: durationMinutes, closed: true, message: 'Estabelecimento fechado neste dia' },
      });
    }

    const openMin  = toMinutes(dayHours.open);
    const closeMin = toMinutes(dayHours.close);

    // Day boundaries in UTC for DB query
    const dayStartUTC = DateTime.fromISO(`${date}T00:00:00`, { zone: tz }).toUTC().toJSDate();
    const dayEndUTC   = DateTime.fromISO(`${date}T23:59:59`, { zone: tz }).toUTC().toJSDate();

    // Fetch all active professionals
    const professionals = await Professional.findAll({
      where: { tenant_id: tenantId, is_active: true },
      attributes: ['id'],
    });
    const profIds = professionals.map(p => p.id);

    // Fetch existing bookings
    const existing = profIds.length ? await Appointment.findAll({
      where: {
        tenant_id: tenantId,
        professional_id: { [Op.in]: profIds },
        status: { [Op.in]: ['PENDING', 'CONFIRMED'] },
        start_time: { [Op.lt]: dayEndUTC },
        end_time:   { [Op.gt]: dayStartUTC },
      },
    }) : [];

    const nowUTC = new Date();
    const slots  = [];

    let cursorMin = openMin;
    while (cursorMin + durationMinutes <= closeMin) {
      const h = Math.floor(cursorMin / 60);
      const m = cursorMin % 60;
      const slotLocalISO = `${date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
      const slotStartUTC = DateTime.fromISO(slotLocalISO, { zone: tz }).toUTC().toJSDate();
      const slotEndUTC   = new Date(slotStartUTC.getTime() + durationMinutes * 60 * 1000);

      const isPast = slotStartUTC <= nowUTC;

      // Slot available if at least one professional has no conflict
      const hasAvailable = profIds.some(profId => {
        return !existing.some(a =>
          a.professional_id === profId &&
          a.start_time < slotEndUTC &&
          a.end_time   > slotStartUTC
        );
      });

      if (!isPast && hasAvailable) {
        slots.push(slotStartUTC.toISOString());
      }

      cursorMin += 30;
    }

    return res.json({
      success: true,
      data: { date, slots, duration_minutes: durationMinutes, business_hours: dayHours, closed: false, timezone: tz },
    });
  } catch (error) {
    logger.error('[PublicBooking] Availability error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Erro ao buscar horários disponíveis' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/public/appointments/services/:slug — active services
// ─────────────────────────────────────────────────────────────────────────────
router.get('/services/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const miniSite = await MiniSiteConfig.findOne({ where: { slug: sanitize(slug), published: true } });
    if (!miniSite) return res.status(404).json({ success: false, message: 'Mini-site não encontrado' });

    const services = await Service.findAll({
      where: { tenant_id: miniSite.tenant_id, is_active: true },
      attributes: ['id', 'name', 'duration', 'price', 'description', 'category'],
      order: [['name', 'ASC']],
    });

    return res.json({ success: true, data: services });
  } catch (error) {
    logger.error('[PublicBooking] Services error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Erro ao buscar serviços' });
  }
});

module.exports = router;

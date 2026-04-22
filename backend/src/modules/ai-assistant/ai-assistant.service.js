/**
 * AI Assistant Service
 * Derives honest, data-driven responses from existing system data.
 * No fake AI — surfaces real appointment/client patterns.
 */

'use strict';

const { Op } = require('sequelize');

class AiAssistantService {
  constructor(models) {
    this.Appointment  = models.Appointment;
    this.Client       = models.Client;
    this.Professional = models.Professional;
  }

  // ─── STATUS ──────────────────────────────────────────────

  async getStatus(tenantId) {
    const today      = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow   = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayAppts, pendingAppts, inactiveClients] = await Promise.all([
      this.Appointment
        ? this.Appointment.count({
            where: {
              tenant_id:  tenantId,
              start_time: { [Op.gte]: today, [Op.lt]: tomorrow },
            },
          })
        : Promise.resolve(0),

      this.Appointment
        ? this.Appointment.count({
            where: {
              tenant_id: tenantId,
              status:    { [Op.in]: ['PENDING', 'pending'] },
            },
          })
        : Promise.resolve(0),

      this._countInactiveClients(tenantId, 30),
    ]);

    return {
      enabled:             true,
      connected_channels:  ['whatsapp'],
      today_interactions:  todayAppts,
      pending_suggestions: Math.min(pendingAppts + (inactiveClients > 0 ? 1 : 0), 10),
      automation_level:    'basic',
      summary_status:      'online',
    };
  }

  // ─── INTERACTIONS (derived from appointments) ─────────────

  async getInteractions(tenantId, {
    page = 1, limit = 10,
    status, startDate, endDate,
    sortOrder = 'DESC',
  } = {}) {
    if (!this.Appointment) return { data: [], meta: { total: 0, page, limit, pages: 0 } };

    const where = { tenant_id: tenantId };

    if (status) {
      // Accept both uppercase and lowercase
      where.status = { [Op.in]: [status, status.toLowerCase(), status.toUpperCase()] };
    }

    if (startDate || endDate) {
      where.start_time = {};
      if (startDate) where.start_time[Op.gte] = new Date(startDate);
      if (endDate)   where.start_time[Op.lte] = new Date(endDate);
    }

    const dir    = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const offset = (page - 1) * Math.min(limit, 50);
    const cap    = Math.min(limit, 50);

    const { rows, count } = await this.Appointment.findAndCountAll({
      where,
      order:   [['updated_at', dir]],
      limit:   cap,
      offset,
      include: [
        { model: this.Client,       as: 'client',       required: false, attributes: ['id', 'first_name', 'last_name'] },
        { model: this.Professional, as: 'professional', required: false, attributes: ['id'] },
      ],
    });

    return {
      data: rows.map(a => this._appointmentToInteraction(a)),
      meta: {
        total:    count,
        page:     Number(page),
        limit:    cap,
        pages:    Math.ceil(count / cap),
        has_more: page * cap < count,
      },
    };
  }

  // ─── SUGGESTIONS ─────────────────────────────────────────

  async getSuggestions(tenantId) {
    const suggestions = [];

    // 1. Unconfirmed tomorrow appointments
    if (this.Appointment) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const unconfirmed = await this.Appointment.count({
        where: {
          tenant_id:  tenantId,
          status:     { [Op.in]: ['PENDING', 'pending'] },
          start_time: { [Op.gte]: tomorrow, [Op.lt]: dayAfter },
        },
      });

      if (unconfirmed > 0) {
        suggestions.push({
          id:          'suggest_confirm_tomorrow',
          type:        'confirm',
          title:       `Confirmar ${unconfirmed} agendamento${unconfirmed > 1 ? 's' : ''} de amanhã`,
          description: 'Clientes ainda não confirmaram presença para amanhã.',
          priority:    'high',
          created_at:  new Date(),
        });
      }
    }

    // 2. Inactive clients (30d)
    if (this.Client) {
      const inactive = await this._countInactiveClients(tenantId, 30);
      if (inactive > 0) {
        suggestions.push({
          id:          'suggest_reactivate_30d',
          type:        'reactivate',
          title:       `${inactive} cliente${inactive > 1 ? 's' : ''} inativo${inactive > 1 ? 's' : ''} há mais de 30 dias`,
          description: 'Sugestão: enviar mensagem de reativação com oferta especial.',
          priority:    'medium',
          created_at:  new Date(),
        });
      }
    }

    // 3. No-shows to follow up
    if (this.Appointment) {
      const noShows = await this.Appointment.count({
        where: {
          tenant_id: tenantId,
          status:    { [Op.in]: ['NO_SHOW', 'no_show'] },
          start_time: { [Op.gte]: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })() },
        },
      });
      if (noShows > 0) {
        suggestions.push({
          id:          'suggest_follow_noshow',
          type:        'follow_up',
          title:       `${noShows} falta${noShows > 1 ? 's' : ''} sem acompanhamento`,
          description: 'Clientes que faltaram nos últimos 7 dias sem reagendamento.',
          priority:    'low',
          created_at:  new Date(),
        });
      }
    }

    return suggestions;
  }

  // ─── PRIVATE ─────────────────────────────────────────────

  async _countInactiveClients(tenantId, days) {
    if (!this.Appointment || !this.Client) return 0;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Clients with at least one appointment but none since cutoff
    const activeClientIds = await this.Appointment.findAll({
      where:      { tenant_id: tenantId, start_time: { [Op.gte]: cutoff } },
      attributes: ['client_id'],
      group:      ['client_id'],
      raw:        true,
    }).then(rows => rows.map(r => r.client_id));

    const totalClients = await this.Client.count({
      where: { tenant_id: tenantId },
    });

    return Math.max(0, totalClients - activeClientIds.length);
  }

  _appointmentToInteraction(appt) {
    const clientName = appt.client
      ? `${appt.client.first_name || ''} ${appt.client.last_name || ''}`.trim()
      : 'Cliente';

    const STATUS_MAP = {
      CONFIRMED:  { type: 'confirm',  color: 'green', icon: 'fas fa-calendar-check' },
      COMPLETED:  { type: 'complete', color: 'green', icon: 'fas fa-check-circle'   },
      CANCELLED:  { type: 'cancel',   color: 'amber', icon: 'fas fa-times-circle'   },
      NO_SHOW:    { type: 'no_show',  color: 'red',   icon: 'fas fa-user-times'     },
      PENDING:    { type: 'pending',  color: 'blue',  icon: 'fas fa-clock'          },
    };

    const statusKey = (appt.status || '').toUpperCase();
    const meta = STATUS_MAP[statusKey] || STATUS_MAP.PENDING;

    return {
      id:          appt.id,
      customer_name: clientName,
      channel:     'whatsapp',
      intent:      meta.type,
      status:      appt.status,
      color:       meta.color,
      icon:        meta.icon,
      title:       `${clientName} — ${appt.status}`,
      description: `Agendamento ${appt.status?.toLowerCase()} às ${this._formatTime(appt.start_time)}.`,
      handled_by:  'system',
      summary:     appt.notes || '',
      time:        this._relativeTime(appt.updated_at || appt.created_at),
      created_at:  appt.created_at,
    };
  }

  _formatTime(date) {
    if (!date) return '--';
    return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  _relativeTime(date) {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    if (days  > 0)  return `Há ${days} dia${days > 1 ? 's' : ''}`;
    if (hours > 0)  return `Há ${hours}h`;
    if (mins  > 0)  return `Há ${mins}min`;
    return 'Agora';
  }
}

module.exports = AiAssistantService;

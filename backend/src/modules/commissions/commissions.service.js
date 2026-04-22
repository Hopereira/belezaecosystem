/**
 * Commissions Service
 * Calculates real commission data from appointments + professionals.
 * No duplication of business rules in the frontend.
 */

'use strict';

const { Op } = require('sequelize');

class CommissionsService {
  constructor(models) {
    this.Appointment       = models.Appointment;
    this.Professional      = models.Professional;
    this.Service           = models.Service;
    this.User              = models.User;
    this.CommissionSetting = models.CommissionSetting || null;
  }

  // ─── SUMMARY (all professionals) ─────────────────────────

  async getSummary(tenantId, { period = 'month' } = {}) {
    const { startDate, endDate } = this._periodBounds(period);

    const userInclude = this.User ? [{
      model: this.User, as: 'user', required: false,
      attributes: ['id', 'name', 'first_name', 'last_name', 'is_active'],
    }] : [];

    const professionals = await this.Professional.findAll({
      where:   { tenant_id: tenantId },
      attributes: ['id', 'specialty', 'commission_rate'],
      include: userInclude,
    });

    const appts = await this._getCompletedAppointments(tenantId, startDate, endDate);

    // Fetch all commission settings in a single batch query (avoids N+1)
    const profIds = professionals.map(p => p.id);
    const settingRateMap = await this._getBatchSettingRates(tenantId, profIds);

    const result = professionals.map((prof) => {
      const profAppts  = appts.filter(a => a.professional_id === prof.id);
      const revenue    = this._sumRevenue(profAppts);
      const settingRate = settingRateMap.get(prof.id);
      const commRate   = (settingRate !== null && settingRate !== undefined)
        ? settingRate
        : (parseFloat(prof.commission_rate || prof.commission) || 30);
      const commission = revenue * (commRate / 100);

      return {
        professional_id:      prof.id,
        professional_name:    this._profName(prof),
        specialty:            prof.specialty || null,
        commission_rate:      commRate,
        is_active:            ((prof.user?.is_active ?? prof.is_active) !== false),
        appointments_count:   profAppts.length,
        revenue_generated:    parseFloat(revenue.toFixed(2)),
        estimated_commission: parseFloat(commission.toFixed(2)),
        ranking_position:     0,
      };
    });

    // Sort by revenue descending and assign ranking
    result.sort((a, b) => b.revenue_generated - a.revenue_generated);
    result.forEach((r, i) => { r.ranking_position = i + 1; });

    const totalRevenue    = result.reduce((s, r) => s + r.revenue_generated, 0);
    const totalCommission = result.reduce((s, r) => s + r.estimated_commission, 0);
    const totalAppts      = result.reduce((s, r) => s + r.appointments_count, 0);

    return {
      period,
      period_start:      startDate,
      period_end:        endDate,
      total_revenue:     parseFloat(totalRevenue.toFixed(2)),
      total_commission:  parseFloat(totalCommission.toFixed(2)),
      total_appointments:totalAppts,
      professionals:     result,
    };
  }

  // ─── INDIVIDUAL DETAIL ────────────────────────────────────

  async getProfessionalCommissions(tenantId, professionalId, { period = 'month' } = {}) {
    // Ensure professional belongs to tenant
    const userInclude2 = this.User ? [{
      model: this.User, as: 'user', required: false,
      attributes: ['id', 'name', 'first_name', 'last_name'],
    }] : [];

    const prof = await this.Professional.findOne({
      where:   { id: professionalId, tenant_id: tenantId },
      include: userInclude2,
    });
    if (!prof) return null;

    const { startDate, endDate } = this._periodBounds(period);
    const appts = await this._getCompletedAppointments(tenantId, startDate, endDate, professionalId);

    const settingRate2 = await this._getSettingRate(tenantId, professionalId);
    const commRate     = (settingRate2 !== null && settingRate2 !== undefined)
      ? settingRate2
      : (parseFloat(prof.commission_rate || prof.commission) || 30);
    const revenue    = this._sumRevenue(appts);
    const commission = revenue * (commRate / 100);

    // Group by service for breakdown
    const byService = {};
    for (const a of appts) {
      const key = a.service_id || 'unknown';
      if (!byService[key]) {
        byService[key] = {
          service_id:   a.service_id,
          service_name: a.Service?.name || 'Serviço',
          count:        0,
          revenue:      0,
          commission:   0,
        };
      }
      const val = parseFloat(a.price_charged) || 0;
      byService[key].count++;
      byService[key].revenue    += val;
      byService[key].commission += val * (commRate / 100);
    }

    Object.values(byService).forEach(s => {
      s.revenue    = parseFloat(s.revenue.toFixed(2));
      s.commission = parseFloat(s.commission.toFixed(2));
    });

    return {
      professional_id:      prof.id,
      professional_name:    this._profName(prof),
      specialty:            prof.specialty,
      commission_rate:      commRate,
      period,
      period_start:         startDate,
      period_end:           endDate,
      appointments_count:   appts.length,
      revenue_generated:    parseFloat(revenue.toFixed(2)),
      estimated_commission: parseFloat(commission.toFixed(2)),
      breakdown_by_service: Object.values(byService),
    };
  }

  // ─── PERFORMANCE RANKING ──────────────────────────────────

  async getPerformance(tenantId, { period = 'month' } = {}) {
    const summary = await this.getSummary(tenantId, { period });
    // Return top-level ranking view, suitable for the team-commissions frontend
    return {
      period:        summary.period,
      period_start:  summary.period_start,
      period_end:    summary.period_end,
      ranking:       summary.professionals,
      totals: {
        revenue:     summary.total_revenue,
        commission:  summary.total_commission,
        appointments:summary.total_appointments,
      },
    };
  }

  // ─── PRIVATE ─────────────────────────────────────────────

  _periodBounds(period) {
    const now   = new Date();
    let startDate, endDate;

    endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    } else {
      // Default: current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    return { startDate, endDate };
  }

  async _getCompletedAppointments(tenantId, startDate, endDate, professionalId = null) {
    if (!this.Appointment) return [];

    const where = {
      tenant_id: tenantId,
      status:    { [Op.in]: ['COMPLETED', 'completed', 'done'] },
      start_time: { [Op.gte]: startDate, [Op.lte]: endDate },
    };
    if (professionalId) where.professional_id = professionalId;

    const include = [];
    if (this.Service) {
      include.push({
        model:    this.Service,
        as:       'service',
        required: false,
        attributes: ['id', 'name'],
      });
    }

    return this.Appointment.findAll({ where, include, attributes: ['id', 'professional_id', 'service_id', 'price_charged', 'start_time'] });
  }

  _sumRevenue(appts) {
    return appts.reduce((s, a) => s + (parseFloat(a.price_charged) || 0), 0);
  }

  // Returns a Map<professionalId, rate> for all professionals in one query (avoids N+1)
  async _getBatchSettingRates(tenantId, professionalIds) {
    const map = new Map();
    if (!this.CommissionSetting || !professionalIds?.length) return map;
    try {
      const settings = await this.CommissionSetting.findAll({
        where: { tenant_id: tenantId, active: true },
        include: [{
          model: this.User, as: 'user', required: true,
          attributes: ['id'],
          include: [{
            model:    this.Professional, as: 'professional', required: true,
            where:    { id: professionalIds },
            attributes: ['id'],
          }],
        }],
        attributes: ['rate', 'type'],
      });
      for (const s of settings) {
        const profId = s.user?.professional?.id;
        if (profId && !map.has(profId)) {
          map.set(profId, parseFloat(s.rate));
        }
      }
    } catch (_) { /* leave map empty — callers fall back to default rate */ }
    return map;
  }

  // Returns the active commission rate for a single professional, or null
  async _getSettingRate(tenantId, professionalId) {
    const map = await this._getBatchSettingRates(tenantId, [professionalId]);
    return map.has(professionalId) ? map.get(professionalId) : null;
  }

  _profName(prof) {
    // Name may come from the associated User
    const u = prof.user;
    if (u?.name)        return u.name;
    if (u?.first_name)  return `${u.first_name} ${u.last_name || ''}`.trim();
    if (prof.name)      return prof.name;
    return `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || 'Profissional';
  }
}

module.exports = CommissionsService;

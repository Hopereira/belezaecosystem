/**
 * Marketing Service
 * Business logic for campaigns, automations and metrics
 */

'use strict';

const { NotFoundError, ValidationError } = require('../../shared/errors');
const { Op } = require('sequelize');

// Default automations seeded per tenant on first access
const DEFAULT_AUTOMATIONS = [
  {
    slug: 'confirm',
    name: 'Confirmação de Agendamento',
    description: 'Envia confirmação 24h antes pelo WhatsApp.',
    trigger_type: 'appointment_reminder_24h',
    channel: 'whatsapp',
    enabled: true,
  },
  {
    slug: 'reminder',
    name: 'Lembrete de Retorno',
    description: 'Contacta clientes que não voltam há 30 dias.',
    trigger_type: 'client_inactive_30d',
    channel: 'whatsapp',
    enabled: true,
  },
  {
    slug: 'reactivate',
    name: 'Reativação de Inativos',
    description: 'Disparo automático para clientes há 60+ dias ausentes.',
    trigger_type: 'client_inactive_60d',
    channel: 'whatsapp',
    enabled: false,
  },
  {
    slug: 'birthday',
    name: 'Parabéns + Oferta',
    description: 'Mensagem personalizada no aniversário do cliente.',
    trigger_type: 'client_birthday',
    channel: 'whatsapp',
    enabled: true,
  },
  {
    slug: 'review',
    name: 'Pedido de Avaliação',
    description: 'Solicita feedback após cada atendimento concluído.',
    trigger_type: 'appointment_completed',
    channel: 'whatsapp',
    enabled: false,
  },
];

class MarketingService {
  constructor(models) {
    this.Campaign   = models.MarketingCampaign;
    this.Automation = models.MarketingAutomation;
    this.Appointment = models.Appointment;
    this.Client      = models.Client;
  }

  // ─── METRICS ─────────────────────────────────────────────

  async getMetrics(tenantId) {
    const [campaigns, automations, apptCount, clientCount] = await Promise.all([
      this.Campaign.findAll({
        where: { tenant_id: tenantId },
        attributes: ['status', 'sent_count', 'conversion_count', 'sent_at'],
      }),
      this.Automation.findAll({
        where: { tenant_id: tenantId },
        attributes: ['enabled'],
      }),
      this.Appointment ? this.Appointment.count({ where: { tenant_id: tenantId } }) : Promise.resolve(0),
      this.Client ? this.Client.count({ where: { tenant_id: tenantId } }) : Promise.resolve(0),
    ]);

    const activeCampaigns    = campaigns.filter(c => c.status === 'active').length;
    const activeAutomations  = automations.length
      ? automations.filter(a => a.enabled).length
      : DEFAULT_AUTOMATIONS.filter(a => a.enabled).length;

    const totalSent          = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
    const totalConversions   = campaigns.reduce((s, c) => s + (c.conversion_count || 0), 0);
    const engagementRate     = totalSent > 0 ? Math.round((totalConversions / totalSent) * 100) : 0;

    const lastCampaign       = campaigns
      .filter(c => c.sent_at)
      .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))[0];

    return {
      campaigns_active:      activeCampaigns,
      messages_sent:         totalSent,
      automations_active:    activeAutomations,
      open_rate:             engagementRate,
      segmented_clients:     clientCount,
      last_campaign_date:    lastCampaign?.sent_at || null,
    };
  }

  // ─── CAMPAIGNS ───────────────────────────────────────────

  async getCampaigns(tenantId, {
    page = 1, limit = 20, status, channel,
    search, startDate, endDate,
    sortBy = 'created_at', sortOrder = 'DESC',
  } = {}) {
    const where = { tenant_id: tenantId };
    if (status)  where.status  = status;
    if (channel) where.channel = channel;

    if (search) {
      where.name = { [Op.iLike]: `%${search.trim()}%` };
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = new Date(startDate);
      if (endDate)   where.created_at[Op.lte] = new Date(endDate);
    }

    const VALID_SORT = ['created_at', 'name', 'sent_count', 'conversion_count', 'scheduled_at', 'status'];
    const col   = VALID_SORT.includes(sortBy) ? sortBy : 'created_at';
    const dir   = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (page - 1) * limit;
    const { rows, count } = await this.Campaign.findAndCountAll({
      where,
      order:  [[col, dir]],
      limit,
      offset,
    });

    return {
      data: rows.map(c => this._serializeCampaign(c)),
      meta: {
        total:      count,
        page:       Number(page),
        limit:      Number(limit),
        pages:      Math.ceil(count / limit),
        has_more:   page * limit < count,
      },
    };
  }

  async createCampaign(tenantId, userId, data) {
    const { name, channel, message_template, audience_segment, scheduled_at } = data;

    const campaign = await this.Campaign.create({
      tenant_id:        tenantId,
      created_by:       userId || null,
      name:             name.trim(),
      channel,
      message_template: message_template?.trim() || null,
      audience_segment: audience_segment || 'all',
      status:           'draft',
      scheduled_at:     scheduled_at || null,
    });

    return this._serializeCampaign(campaign);
  }

  async updateCampaign(tenantId, campaignId, data) {
    const campaign = await this.Campaign.findOne({
      where: { id: campaignId, tenant_id: tenantId },
    });

    if (!campaign) throw new NotFoundError('Campanha não encontrada.', campaignId);

    const editableStatuses = ['draft', 'paused'];
    if (!editableStatuses.includes(campaign.status) && (data.name || data.channel)) {
      throw new ValidationError('Campanhas ativas ou concluídas não podem ter nome/canal editados.');
    }

    // Sanitize name if provided
    if (data.name) data.name = data.name.trim();
    if (data.message_template) data.message_template = data.message_template.trim();

    await campaign.update(data);
    return this._serializeCampaign(campaign);
  }

  // ─── AUTOMATIONS ─────────────────────────────────────────

  async getAutomations(tenantId) {
    let automations = await this.Automation.findAll({
      where: { tenant_id: tenantId },
      order: [['created_at', 'ASC']],
    });

    // Seed defaults on first access (idempotent)
    if (automations.length === 0) {
      automations = await this._seedAutomations(tenantId);
    }

    return automations;
  }

  async toggleAutomation(tenantId, automationId, enabled) {
    const automation = await this.Automation.findOne({
      where: { id: automationId, tenant_id: tenantId },
    });

    if (!automation) throw new NotFoundError('Automação não encontrada.', automationId);

    await automation.update({ enabled });
    return automation;
  }

  // ─── SERIALIZERS ─────────────────────────────────────────

  _serializeCampaign(c) {
    return {
      id:               c.id,
      name:             c.name,
      channel:          c.channel,
      status:           c.status,
      message_template: c.message_template,
      audience_segment: c.audience_segment,
      audience_size:    c.audience_size    || 0,
      sent_count:       c.sent_count       || 0,
      conversion_count: c.conversion_count || 0,
      conversion_rate:  c.sent_count > 0
        ? parseFloat(((c.conversion_count / c.sent_count) * 100).toFixed(1))
        : 0,
      scheduled_at:     c.scheduled_at,
      sent_at:          c.sent_at,
      created_by:       c.created_by,
      created_at:       c.created_at,
      updated_at:       c.updated_at,
    };
  }

  // ─── PRIVATE ─────────────────────────────────────────────

  async _seedAutomations(tenantId) {
    const records = DEFAULT_AUTOMATIONS.map(a => ({
      ...a,
      tenant_id: tenantId,
    }));
    return this.Automation.bulkCreate(records, { ignoreDuplicates: true });
  }
}

module.exports = MarketingService;

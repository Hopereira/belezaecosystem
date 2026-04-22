'use strict';

/**
 * Unit tests — MarketingService
 * getCampaigns filtering, pagination, serialization
 * createCampaign / updateCampaign validation
 */

process.env.NODE_ENV = 'test';

const { ValidationError, NotFoundError } = require('../../src/shared/errors');

// ─── Factories ───────────────────────────────────────────────────────────────

function makeCampaign(overrides = {}) {
  return {
    id:               'camp-uuid',
    tenant_id:        'tenant-a',
    name:             'Campanha Teste',
    channel:          'whatsapp',
    status:           'draft',
    message_template: null,
    audience_segment: 'all',
    sent_count:       0,
    conversion_count: 0,
    scheduled_at:     null,
    sent_at:          null,
    created_at:       new Date('2026-01-01'),
    updated_at:       new Date('2026-01-01'),
    ...overrides,
    update: jest.fn(async function(data) { Object.assign(this, data); return this; }),
  };
}

function makeModels(campaigns = [], automations = []) {
  return {
    MarketingCampaign: {
      findAndCountAll: jest.fn(async () => ({ rows: campaigns, count: campaigns.length })),
      findOne:         jest.fn(async ({ where } = {}) => campaigns.find(c => c.id === where?.id) || null),
      create:          jest.fn(async (data) => makeCampaign(data)),
    },
    MarketingAutomation: {
      findAll: jest.fn(async () => automations),
      findOne: jest.fn(async () => null),
      create:  jest.fn(),
    },
    Appointment: null,
    Client:      null,
  };
}

// ─── Lazy load service (avoids module-level DB init) ─────────────────────────

let MarketingService;
beforeAll(() => {
  MarketingService = require('../../src/modules/marketing/marketing.service');
});

// ─── getCampaigns ─────────────────────────────────────────────────────────────

describe('MarketingService.getCampaigns', () => {
  test('returns {data, meta} structure', async () => {
    const svc = new MarketingService(makeModels([makeCampaign()]));
    const result = await svc.getCampaigns('tenant-a');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('meta');
    expect(result.meta).toHaveProperty('total');
    expect(result.meta).toHaveProperty('page');
    expect(result.meta).toHaveProperty('limit');
    expect(result.meta).toHaveProperty('pages');
    expect(result.meta).toHaveProperty('has_more');
  });

  test('serialized campaign includes conversion_rate', async () => {
    const camp = makeCampaign({ sent_count: 100, conversion_count: 25 });
    const svc = new MarketingService(makeModels([camp]));
    const result = await svc.getCampaigns('tenant-a');
    expect(result.data[0]).toHaveProperty('conversion_rate', 25);
  });

  test('conversion_rate is 0 when sent_count is 0', async () => {
    const camp = makeCampaign({ sent_count: 0, conversion_count: 0 });
    const svc = new MarketingService(makeModels([camp]));
    const result = await svc.getCampaigns('tenant-a');
    expect(result.data[0].conversion_rate).toBe(0);
  });

  test('passes status filter to query', async () => {
    const models = makeModels([]);
    const svc = new MarketingService(models);
    await svc.getCampaigns('tenant-a', { status: 'active' });
    const callArg = models.MarketingCampaign.findAndCountAll.mock.calls[0][0];
    expect(callArg.where.status).toBe('active');
  });

  test('passes channel filter to query', async () => {
    const models = makeModels([]);
    const svc = new MarketingService(models);
    await svc.getCampaigns('tenant-a', { channel: 'email' });
    const callArg = models.MarketingCampaign.findAndCountAll.mock.calls[0][0];
    expect(callArg.where.channel).toBe('email');
  });

  test('calculates correct offset for page 2', async () => {
    const models = makeModels([]);
    const svc = new MarketingService(models);
    await svc.getCampaigns('tenant-a', { page: 2, limit: 10 });
    const callArg = models.MarketingCampaign.findAndCountAll.mock.calls[0][0];
    expect(callArg.offset).toBe(10);
  });

  test('has_more is true when more pages exist', async () => {
    const models = makeModels([]);
    models.MarketingCampaign.findAndCountAll = jest.fn(async () => ({ rows: [], count: 25 }));
    const svc = new MarketingService(models);
    const result = await svc.getCampaigns('tenant-a', { page: 1, limit: 10 });
    expect(result.meta.has_more).toBe(true);
  });

  test('has_more is false on last page', async () => {
    const models = makeModels([]);
    models.MarketingCampaign.findAndCountAll = jest.fn(async () => ({ rows: [], count: 10 }));
    const svc = new MarketingService(models);
    const result = await svc.getCampaigns('tenant-a', { page: 1, limit: 10 });
    expect(result.meta.has_more).toBe(false);
  });
});

// ─── createCampaign ──────────────────────────────────────────────────────────

describe('MarketingService.createCampaign', () => {
  test('trims name whitespace', async () => {
    const models = makeModels();
    const svc = new MarketingService(models);
    await svc.createCampaign('tenant-a', 'user-1', {
      name: '  Campanha Verão  ',
      channel: 'whatsapp',
    });
    const created = models.MarketingCampaign.create.mock.calls[0][0];
    expect(created.name).toBe('Campanha Verão');
  });

  test('sets status to draft on creation', async () => {
    const models = makeModels();
    const svc = new MarketingService(models);
    await svc.createCampaign('tenant-a', 'user-1', {
      name: 'Test',
      channel: 'sms',
    });
    const created = models.MarketingCampaign.create.mock.calls[0][0];
    expect(created.status).toBe('draft');
  });

  test('returns serialized campaign', async () => {
    const models = makeModels();
    const svc = new MarketingService(models);
    const result = await svc.createCampaign('tenant-a', 'user-1', {
      name: 'Test',
      channel: 'email',
    });
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('conversion_rate');
  });
});

// ─── updateCampaign ──────────────────────────────────────────────────────────

describe('MarketingService.updateCampaign', () => {
  test('throws NotFoundError when campaign not found', async () => {
    const models = makeModels([]);
    models.MarketingCampaign.findOne = jest.fn(async () => null);
    const svc = new MarketingService(models);

    await expect(
      svc.updateCampaign('tenant-a', 'nonexistent-id', { name: 'New' })
    ).rejects.toThrow();
  });

  test('throws ValidationError when editing name on active campaign', async () => {
    const activeCamp = makeCampaign({ status: 'active' });
    const models = makeModels([activeCamp]);
    models.MarketingCampaign.findOne = jest.fn(async () => activeCamp);
    const svc = new MarketingService(models);

    await expect(
      svc.updateCampaign('tenant-a', 'camp-uuid', { name: 'Changed', channel: 'sms' })
    ).rejects.toThrow(ValidationError);
  });

  test('allows updating message_template on active campaign', async () => {
    const activeCamp = makeCampaign({ status: 'active' });
    const models = makeModels([activeCamp]);
    models.MarketingCampaign.findOne = jest.fn(async () => activeCamp);
    const svc = new MarketingService(models);

    const result = await svc.updateCampaign('tenant-a', 'camp-uuid', {
      message_template: 'Nova mensagem',
    });
    expect(activeCamp.update).toHaveBeenCalled();
  });
});

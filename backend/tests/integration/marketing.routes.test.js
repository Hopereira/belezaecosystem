'use strict';

/**
 * Integration tests — Marketing Routes
 * Tests RBAC, validation, and response shape without a real DB.
 */

const request = require('supertest');
const express = require('express');
const { authenticate, authorize } = require('../../src/middleware/auth');
const createMarketingRoutes = require('../../src/modules/marketing/marketing.routes');
const MarketingController   = require('../../src/modules/marketing/marketing.controller');
const { makeToken, injectTenant, subscriptionGate } = require('./helpers/testApp');

// ─── Mock service ─────────────────────────────────────────────────────────────

function makeMockService(overrides = {}) {
  return {
    getMetrics: jest.fn(async () => ({
      campaigns_active: 2, automations_active: 3,
      messages_sent: 100, open_rate: 45, segmented_clients: 50,
    })),
    getCampaigns: jest.fn(async () => ({
      data: [],
      meta: { total: 0, page: 1, limit: 20, pages: 0, has_more: false },
    })),
    createCampaign: jest.fn(async () => ({
      id: 'new-camp', name: 'Test', channel: 'whatsapp', status: 'draft', conversion_rate: 0,
    })),
    updateCampaign: jest.fn(async () => ({
      id: 'camp-id', name: 'Updated', channel: 'whatsapp', status: 'draft', conversion_rate: 0,
    })),
    getAutomations:   jest.fn(async () => []),
    toggleAutomation: jest.fn(async () => ({ id: 'auto-id', enabled: true })),
    ...overrides,
  };
}

// Mock authenticate: injects req.user for the given role
function mockAuthenticate(role) {
  return (req, res, next) => {
    req.user = { id: 'user-id', role, tenantId: 'tenant-uuid' };
    next();
  };
}

function buildApp(service, { role = 'owner', subscriptionStatus = 'active' } = {}) {
  const controller = new MarketingController(service);
  const router = createMarketingRoutes(controller, {
    authenticate:   mockAuthenticate(role),
    authorize:      (roles) => authorize(...roles),
    tenantResolver: (req, res, next) => next(),
  });

  const app = express();
  app.use(express.json());
  app.use(injectTenant({ id: 'tenant-uuid', slug: 'test-salon', status: 'active' }));
  app.use(subscriptionGate(subscriptionStatus));
  app.use('/', router);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      error: { code: err.code || 'ERROR', details: err.details || null },
    });
  });
  return app;
}

// ─── GET /metrics ─────────────────────────────────────────────────────────────

describe('GET /marketing/metrics', () => {
  test('returns 200 with metrics for OWNER', async () => {
    const svc = makeMockService();
    const res = await request(buildApp(svc)).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('campaigns_active');
  });

  test('returns 403 for PROFESSIONAL role', async () => {
    const svc = makeMockService();
    const res = await request(buildApp(svc, { role: 'professional' })).get('/metrics');
    expect(res.status).toBe(403);
  });

  test('blocked when subscription is suspended', async () => {
    const svc = makeMockService();
    const res = await request(buildApp(svc, { subscriptionStatus: 'suspended' })).get('/metrics');
    expect(res.status).toBe(402);
  });
});

// ─── GET /campaigns ───────────────────────────────────────────────────────────

describe('GET /marketing/campaigns', () => {
  test('returns 200 with data + meta', async () => {
    const svc = makeMockService();
    const res = await request(buildApp(svc)).get('/campaigns');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
  });

  test('passes page/limit to service', async () => {
    const svc = makeMockService();
    await request(buildApp(svc)).get('/campaigns?page=2&limit=5');
    const call = svc.getCampaigns.mock.calls[0];
    expect(call[1].page).toBe(2);
    expect(call[1].limit).toBe(5);
  });

  test('passes status filter to service', async () => {
    const svc = makeMockService();
    await request(buildApp(svc)).get('/campaigns?status=active');
    const call = svc.getCampaigns.mock.calls[0];
    expect(call[1].status).toBe('active');
  });

  test('rejects invalid status value', async () => {
    const svc = makeMockService();
    const res = await request(buildApp(svc)).get('/campaigns?status=INVALID_STATUS');
    expect(res.status).toBe(400);
  });
});

// ─── POST /campaigns ──────────────────────────────────────────────────────────

describe('POST /marketing/campaigns', () => {
  test('creates campaign with valid payload', async () => {
    const svc = makeMockService();
    const res = await request(buildApp(svc))
      .post('/campaigns')
      .send({ name: 'Summer Sale', channel: 'whatsapp' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('returns 400 when name is missing', async () => {
    const svc = makeMockService();
    const res = await request(buildApp(svc))
      .post('/campaigns')
      .send({ channel: 'whatsapp' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when channel is invalid', async () => {
    const svc = makeMockService();
    const res = await request(buildApp(svc))
      .post('/campaigns')
      .send({ name: 'Test', channel: 'telegram' });
    expect(res.status).toBe(400);
  });

  test('blocked when subscription is past_due (write)', async () => {
    const svc = makeMockService();
    const res = await request(buildApp(svc, { subscriptionStatus: 'past_due' }))
      .post('/campaigns')
      .send({ name: 'Test', channel: 'sms' });
    expect(res.status).toBe(402);
  });
});

// ─── PATCH /automations/:id/toggle ───────────────────────────────────────────

describe('PATCH /marketing/automations/:id/toggle', () => {
  test('returns 200 on valid toggle', async () => {
    const svc = makeMockService();
    const res = await request(buildApp(svc))
      .patch('/automations/auto-id/toggle')
      .send({ enabled: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 400 when enabled is missing from toggle body', async () => {
    const svc = makeMockService();
    const res = await request(buildApp(svc))
      .patch('/automations/auto-id/toggle')
      .send({});
    expect(res.status).toBe(400);
  });
});

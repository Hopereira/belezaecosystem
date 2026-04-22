'use strict';

/**
 * Integration tests — Help Routes
 * Spam guard, validation, category enum
 */

const request = require('supertest');
const express = require('express');
const { authenticate, authorize } = require('../../src/middleware/auth');
const { injectTenant, subscriptionGate } = require('./helpers/testApp');
const { initHelpModule } = require('../../src/modules/help');

// ─── Mock models ──────────────────────────────────────────────────────────────

function makeContactModel({ spamCount = 0 } = {}) {
  return {
    count:  jest.fn(async () => spamCount),
    create: jest.fn(async (data) => ({
      ...data, id: 'req-uuid', status: 'open', created_at: new Date(),
    })),
  };
}

function mockAuthenticate(role) {
  return (req, res, next) => {
    req.user = { id: 'user-id', role, tenantId: 'tenant-uuid' };
    next();
  };
}

function buildApp(models, { role = 'owner' } = {}) {
  const helpModule = initHelpModule(null, models);
  const router = helpModule.createRoutes({
    authenticate:   mockAuthenticate(role),
    authorize:      (roles) => authorize(...roles),
    tenantResolver: (req, res, next) => next(),
  });

  const app = express();
  app.use(express.json());
  app.use(injectTenant({ id: 'tenant-uuid', slug: 'test', status: 'active' }));
  app.use('/help', router);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      error: { code: err.code || 'ERROR', details: err.details || null },
    });
  });
  return app;
}

const VALID_CONTACT = {
  name:    'Ana Lima',
  email:   'ana@exemplo.com',
  subject: 'Problema no sistema',
  message: 'Não consigo acessar o módulo de agendamentos desde ontem.',
  category: 'appts',
};

// ─── GET /help/categories ─────────────────────────────────────────────────────

describe('GET /help/categories', () => {
  test('returns 200 with array of categories (public)', async () => {
    const app = buildApp({ HelpContactRequest: makeContactModel() });
    const res = await request(app).get('/help/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

// ─── GET /help/faq ────────────────────────────────────────────────────────────

describe('GET /help/faq', () => {
  test('returns 200 with FAQ items', async () => {
    const app = buildApp({ HelpContactRequest: makeContactModel() });
    const res = await request(app).get('/help/faq');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('returns 400 for invalid category enum', async () => {
    const app = buildApp({ HelpContactRequest: makeContactModel() });
    const res = await request(app).get('/help/faq?category=NOT_VALID_CAT');
    expect(res.status).toBe(400);
  });

  test('accepts valid category query param', async () => {
    const app = buildApp({ HelpContactRequest: makeContactModel() });
    const res = await request(app).get('/help/faq?category=billing');
    expect(res.status).toBe(200);
  });
});

// ─── POST /help/contact ───────────────────────────────────────────────────────

describe('POST /help/contact', () => {
  test('returns 201 with valid payload', async () => {
    const app = buildApp({ HelpContactRequest: makeContactModel() });
    const res = await request(app).post('/help/contact').send(VALID_CONTACT);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('returns 400 when name is missing', async () => {
    const app = buildApp({ HelpContactRequest: makeContactModel() });
    const { name: _, ...payload } = VALID_CONTACT;
    const res = await request(app).post('/help/contact').send(payload);
    expect(res.status).toBe(400);
  });

  test('returns 400 when message is too short (< 20 chars)', async () => {
    const app = buildApp({ HelpContactRequest: makeContactModel() });
    const res = await request(app).post('/help/contact').send({
      ...VALID_CONTACT,
      message: 'Curto demais',
    });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid email', async () => {
    const app = buildApp({ HelpContactRequest: makeContactModel() });
    const res = await request(app).post('/help/contact').send({
      ...VALID_CONTACT,
      email: 'not-an-email',
    });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid category enum in contact', async () => {
    const app = buildApp({ HelpContactRequest: makeContactModel() });
    const res = await request(app).post('/help/contact').send({
      ...VALID_CONTACT,
      category: 'INVALID_CAT',
    });
    expect(res.status).toBe(400);
  });

  test('returns 429 (or 400) when spam limit reached', async () => {
    const app = buildApp({ HelpContactRequest: makeContactModel({ spamCount: 3 }) });
    const res = await request(app).post('/help/contact').send(VALID_CONTACT);
    expect([400, 429].includes(res.status)).toBe(true);
    expect(res.body.success).toBe(false);
  });
});

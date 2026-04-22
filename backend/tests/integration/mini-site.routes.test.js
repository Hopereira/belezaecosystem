'use strict';

/**
 * Integration tests — Mini-site Routes
 * Slug validation, publish guard, reserved slugs, RBAC
 */

const request = require('supertest');
const express = require('express');
const { authenticate, authorize } = require('../../src/middleware/auth');
const { injectTenant, subscriptionGate, makeToken } = require('./helpers/testApp');
const { initMiniSiteModule } = require('../../src/modules/mini-site');

// ─── Mock models ──────────────────────────────────────────────────────────────

function makeConfigRecord(overrides = {}) {
  const data = {
    id:         'cfg-uuid',
    tenant_id:  'tenant-uuid',
    slug:       'meu-salao',
    title:      'Meu Salão',
    published:  false,
    ...overrides,
  };
  return {
    ...data,
    update: jest.fn(async (patch) => Object.assign(data, patch)),
    toJSON: () => ({ ...data }),
  };
}

function makeModels(config = null) {
  return {
    MiniSiteConfig: {
      findOne: jest.fn(async ({ where } = {}) => {
        if (!config) return null;
        if (where?.tenant_id && where.tenant_id !== config.tenant_id) return null;
        return config;
      }),
      create: jest.fn(async (data) => ({
        ...data, id: 'new-cfg', update: jest.fn(), toJSON: () => data,
      })),
      count: jest.fn(async () => 0),
    },
    Tenant: {
      findByPk: jest.fn(async () => ({ name: 'Test Salon' })),
    },
  };
}

function mockAuthenticate(role) {
  return (req, res, next) => {
    req.user = { id: 'user-id', role, tenantId: 'tenant-uuid' };
    next();
  };
}

function buildApp(models, { role = 'owner', subscriptionStatus = 'active' } = {}) {
  const miniSiteModule = initMiniSiteModule(null, models);
  const routes = miniSiteModule.createRoutes({
    authenticate:   mockAuthenticate(role),
    authorize:      (roles) => authorize(...roles),
    tenantResolver: (req, res, next) => next(),
  });

  const app = express();
  app.use(express.json());
  app.use(injectTenant({ id: 'tenant-uuid', slug: 'test-salon', status: 'active' }));
  app.use(subscriptionGate(subscriptionStatus));
  app.use('/mini-site', routes.tenant);
  app.use('/public',    routes.public);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      error: { code: err.code || 'ERROR', details: err.details || null },
    });
  });
  return app;
}

// ─── GET /mini-site ──────────────────────────────────────────────────────────

describe('GET /mini-site', () => {
  test('returns 200 with config data', async () => {
    const config = makeConfigRecord();
    const app = buildApp(makeModels(config));
    const res = await request(app).get('/mini-site');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 403 for PROFESSIONAL role', async () => {
    const app = buildApp(makeModels(makeConfigRecord()), { role: 'professional' });
    const res = await request(app).get('/mini-site');
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /mini-site — slug validation ──────────────────────────────────────

describe('PATCH /mini-site — slug validation', () => {
  test('returns 400 for reserved slug "admin"', async () => {
    const config = makeConfigRecord();
    const app = buildApp(makeModels(config));
    const res = await request(app).patch('/mini-site').send({ slug: 'admin' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for reserved slug "api"', async () => {
    const config = makeConfigRecord();
    const app = buildApp(makeModels(config));
    const res = await request(app).patch('/mini-site').send({ slug: 'api' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for slug with special chars (spaces)', async () => {
    const config = makeConfigRecord();
    const app = buildApp(makeModels(config));
    // After .lowercase(), 'my slug!' → pattern still fails (space + !)
    const res = await request(app).patch('/mini-site').send({ slug: 'my slug!' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for cover_color that is not hex', async () => {
    const config = makeConfigRecord();
    const app = buildApp(makeModels(config));
    const res = await request(app).patch('/mini-site').send({ cover_color: 'red' });
    expect(res.status).toBe(400);
  });

  test('accepts valid hex color', async () => {
    const config = makeConfigRecord();
    const models = makeModels(config);
    models.MiniSiteConfig.findOne = jest.fn(async () => config);
    const app = buildApp(models);
    const res = await request(app).patch('/mini-site').send({ cover_color: '#603322' });
    expect(res.status).toBe(200);
  });
});

// ─── POST /mini-site/publish ─────────────────────────────────────────────────

describe('POST /mini-site/publish', () => {
  test('returns 400 (or 422) when title is missing', async () => {
    const config = makeConfigRecord({ title: null });
    const models = makeModels(config);
    models.MiniSiteConfig.findOne = jest.fn(async () => config);
    const app = buildApp(models);
    const res = await request(app).post('/mini-site/publish');
    expect([400, 422, 500].includes(res.status)).toBe(true);
    expect(res.body.success).toBe(false);
  });

  test('publishes successfully when title and slug are present', async () => {
    const config = makeConfigRecord({ title: 'Meu Salão', slug: 'meu-salao' });
    const models = makeModels(config);
    models.MiniSiteConfig.findOne = jest.fn(async () => config);
    const app = buildApp(models);
    const res = await request(app).post('/mini-site/publish');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── GET /public/mini-site/:slug ─────────────────────────────────────────────

describe('GET /public/mini-site/:slug', () => {
  test('returns 400 for slug with invalid chars', async () => {
    const app = buildApp(makeModels());
    const res = await request(app).get('/public/mini-site/INVALID_SLUG!!');
    expect(res.status).toBe(400);
  });

  test('returns 404 when slug not found', async () => {
    const models = makeModels(null); // no config
    const app = buildApp(models);
    const res = await request(app).get('/public/mini-site/slug-nao-existe');
    expect(res.status).toBe(404);
  });

  test('returns 404 for unpublished mini-site', async () => {
    const config = makeConfigRecord({ published: false, slug: 'meu-salao' });
    const models = makeModels(config);
    // findOne only returns published
    models.MiniSiteConfig.findOne = jest.fn(async ({ where }) => {
      if (where?.published === true) return null;
      return config;
    });
    const app = buildApp(models);
    const res = await request(app).get('/public/mini-site/meu-salao');
    expect(res.status).toBe(404);
  });
});

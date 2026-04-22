'use strict';

/**
 * Integration tests — Auth & RBAC middleware
 * Tests authenticate, authorize, and subscription gating
 * without a real database.
 */

const request  = require('supertest');
const express  = require('express');
const { authenticate, authorize } = require('../../src/middleware/auth');
const { generateAccessToken } = require('../../src/shared/utils/jwt');
const { makeToken, subscriptionGate, injectTenant } = require('./helpers/testApp');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildAuthApp(roles = ['owner']) {
  const app = express();
  app.use(express.json());
  app.use(authenticate);
  app.use(authorize(...roles));
  app.get('/protected', (req, res) => res.json({ success: true, user: req.user }));
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      error: { code: err.code || 'INTERNAL_ERROR', details: err.details || null },
    });
  });
  return app;
}

// ─── authenticate ─────────────────────────────────────────────────────────────

describe('authenticate middleware', () => {
  const app = buildAuthApp(['owner']);

  test('returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('AUTH_TOKEN_MISSING');
  });

  test('returns 401 with malformed header (no Bearer prefix)', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Token abc123');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTH_TOKEN_MISSING');
  });

  test('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTH_TOKEN_INVALID');
  });

  test('returns 200 with valid token for correct role', async () => {
    const token = makeToken({ role: 'owner' });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('owner');
  });

  test('attaches decoded user to req.user', async () => {
    const token = makeToken({ role: 'owner', userId: 'my-user-id' });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.user.id).toBe('my-user-id');
    expect(res.body.user.tenantId).toBe('tenant-test-uuid');
  });
});

// ─── authorize ────────────────────────────────────────────────────────────────

describe('authorize middleware', () => {
  test('returns 403 when role is PROFESSIONAL and route requires OWNER', async () => {
    const app = buildAuthApp(['owner', 'admin']);
    const token = makeToken({ role: 'professional' });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('AUTH_FORBIDDEN');
  });

  test('allows ADMIN when route requires [owner, admin]', async () => {
    const app = buildAuthApp(['owner', 'admin']);
    const token = makeToken({ role: 'admin' });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('returns 403 when no user (no token)', async () => {
    const app = buildAuthApp(['owner']);
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401); // caught by authenticate first
  });

  test('MASTER role is blocked from OWNER-only routes (MASTER is not in list)', async () => {
    const app = buildAuthApp(['owner', 'admin']);
    const token = makeToken({ role: 'master', tenantId: null });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    // master is not in ['owner', 'admin']
    expect(res.status).toBe(403);
  });
});

// ─── subscriptionGate ────────────────────────────────────────────────────────

describe('subscription gating middleware', () => {
  function buildSubApp(status) {
    const app = express();
    app.use(express.json());
    app.use(injectTenant({ id: 't1', slug: 'test', status: 'active' }));
    app.use(subscriptionGate(status));
    app.get('/res',  (req, res) => res.json({ success: true }));
    app.post('/res', (req, res) => res.json({ success: true }));
    return app;
  }

  test('active subscription allows GET', async () => {
    const res = await request(buildSubApp('active')).get('/res');
    expect(res.status).toBe(200);
  });

  test('active subscription allows POST', async () => {
    const res = await request(buildSubApp('active')).post('/res').send({});
    expect(res.status).toBe(200);
  });

  test('trial subscription allows GET', async () => {
    const res = await request(buildSubApp('trial')).get('/res');
    expect(res.status).toBe(200);
  });

  test('trial subscription allows POST', async () => {
    const res = await request(buildSubApp('trial')).post('/res').send({});
    expect(res.status).toBe(200);
  });

  test('past_due allows GET', async () => {
    const res = await request(buildSubApp('past_due')).get('/res');
    expect(res.status).toBe(200);
  });

  test('past_due blocks POST (write)', async () => {
    const res = await request(buildSubApp('past_due')).post('/res').send({});
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('SUBSCRIPTION_PAST_DUE');
  });

  test('suspended blocks GET', async () => {
    const res = await request(buildSubApp('suspended')).get('/res');
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('SUBSCRIPTION_INACTIVE');
  });

  test('cancelled blocks GET', async () => {
    const res = await request(buildSubApp('cancelled')).get('/res');
    expect(res.status).toBe(402);
  });

  test('expired blocks GET', async () => {
    const res = await request(buildSubApp('expired')).get('/res');
    expect(res.status).toBe(402);
  });
});

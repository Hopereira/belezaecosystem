'use strict';

/**
 * Test App Builder
 * Creates minimal Express app instances with mocked middleware
 * for integration tests — no real DB required.
 */

const express = require('express');
const { generateAccessToken } = require('../../../src/shared/utils/jwt');
const { authenticate, authorize } = require('../../../src/middleware/auth');

/**
 * Build a fake tenant object
 */
function makeTenant(overrides = {}) {
  return {
    id:     'tenant-test-uuid',
    slug:   'test-salon',
    name:   'Test Salon',
    status: 'active',
    subscription_status: 'active',
    ...overrides,
  };
}

/**
 * Middleware that injects req.tenant from a pre-built tenant object
 */
function injectTenant(tenant) {
  return (req, res, next) => {
    req.tenant = tenant;
    next();
  };
}

/**
 * Middleware that injects req.subscription
 */
function injectSubscription(status = 'active') {
  return (req, res, next) => {
    req.subscription = { status, plan_name: 'pro' };
    next();
  };
}

/**
 * Simple subscription gate (mirrors requireActiveSubscription logic without DB)
 */
function subscriptionGate(status = 'active') {
  return (req, res, next) => {
    const s = status.toLowerCase();
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
    const blockWrite = ['suspended', 'cancelled', 'expired', 'past_due'];
    const blockAll   = ['suspended', 'cancelled', 'expired'];

    if (blockAll.includes(s)) {
      return res.status(402).json({
        success: false,
        message: `Subscription is ${s}`,
        error: { code: 'SUBSCRIPTION_INACTIVE' },
      });
    }
    if (s === 'past_due' && isWrite) {
      return res.status(402).json({
        success: false,
        message: 'Subscription payment is past due',
        error: { code: 'SUBSCRIPTION_PAST_DUE' },
      });
    }
    req.subscription = { status, plan_name: 'pro' };
    next();
  };
}

/**
 * Generate a signed test token for a given role and tenant
 */
function makeToken({ role = 'owner', tenantId = 'tenant-test-uuid', userId = 'user-uuid' } = {}) {
  return generateAccessToken({ id: userId, email: 'test@test.com', role, tenantId });
}

/**
 * Build a minimal test app for a given route handler and options
 *
 * @param {Router|Function} router - Express router or handler
 * @param {object} opts
 * @param {string}  opts.subscriptionStatus - Subscription status to inject
 * @param {object}  opts.tenant             - Tenant object to inject
 * @param {boolean} opts.skipSubscription   - Skip subscription middleware
 */
function buildTestApp(router, opts = {}) {
  const app = express();
  app.use(express.json());

  // Always inject tenant
  const tenant = opts.tenant || makeTenant();
  app.use(injectTenant(tenant));

  if (!opts.skipSubscription) {
    app.use(subscriptionGate(opts.subscriptionStatus || 'active'));
  }

  app.use('/', router);

  // Generic error handler
  app.use((err, req, res, next) => {
    const status = err.statusCode || err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Internal error',
      error: { code: err.code || 'INTERNAL_ERROR', details: err.details || null },
    });
  });

  return app;
}

module.exports = {
  buildTestApp,
  makeToken,
  makeTenant,
  injectTenant,
  injectSubscription,
  subscriptionGate,
  authenticate,
  authorize,
};

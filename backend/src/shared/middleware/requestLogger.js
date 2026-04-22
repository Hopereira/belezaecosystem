'use strict';

/**
 * Structured Request Logger Middleware — Phase 8
 * - Generates a correlation ID per request (X-Correlation-Id header)
 * - Logs request start + response (method, url, status, duration, tenant)
 * - Replaces morgan for structured JSON-compatible output
 */

const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

/**
 * Attach correlation ID to every request/response
 */
function correlationId(req, res, next) {
  const id = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = id;
  res.setHeader('X-Correlation-Id', id);
  next();
}

/**
 * Log structured request + response info
 */
function requestLogger(req, res, next) {
  // Skip health check noise
  if (req.path === '/api/health' || req.path === '/health') return next();

  const startedAt = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    const tenant   = req.tenant?.slug || req.headers['x-tenant-slug'] || '-';
    const userId   = req.user?.id     || '-';
    const level    = res.statusCode >= 500 ? 'error'
                   : res.statusCode >= 400 ? 'warn'
                   : 'info';

    logger[level](`${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`, {
      correlationId: req.correlationId,
      method:        req.method,
      path:          req.path,
      status:        res.statusCode,
      durationMs:    duration,
      tenant,
      userId,
      ip:            req.ip,
    });
  });

  next();
}

module.exports = { correlationId, requestLogger };

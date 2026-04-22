'use strict';

/**
 * Specific Rate Limiters — Phase 8
 * Fine-grained limits per route group
 */

const rateLimit = require('express-rate-limit');

const STANDARD_MESSAGE = (msg) => ({
  success: false,
  message: msg,
  error: { code: 'RATE_LIMIT_EXCEEDED', details: null },
});

/**
 * Auth endpoints — 20 req / 15 min per IP
 * (already exists in app.multitenant.js — kept here as the canonical source)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: STANDARD_MESSAGE('Muitas tentativas de autenticação. Tente novamente em 15 minutos.'),
});

/**
 * Help contact form — 5 req / 60 min per IP
 * (application-level spam guard handles per-email; this is per-IP)
 */
const helpContactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const tenant = req.headers['x-tenant-slug'] || 'global';
    return `help:${tenant}:${req.ip}`;
  },
  message: STANDARD_MESSAGE('Muitas mensagens enviadas. Tente novamente em 1 hora.'),
});

/**
 * Marketing campaign creation — 30 req / 15 min per tenant+IP
 */
const marketingWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const tenant = req.headers['x-tenant-slug'] || req.tenant?.slug || 'global';
    return `marketing:${tenant}:${req.ip}`;
  },
  message: STANDARD_MESSAGE('Muitas operações de marketing. Aguarde 15 minutos.'),
});

/**
 * Mini-site public endpoint — 60 req / 1 min per IP (page loads)
 */
const miniSitePublicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: STANDARD_MESSAGE('Muitas requisições ao mini-site. Aguarde um momento.'),
});

/**
 * AI assistant interactions — 60 req / 15 min per tenant
 */
const aiAssistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const tenant = req.headers['x-tenant-slug'] || req.tenant?.slug || 'global';
    return `ai:${tenant}:${req.ip}`;
  },
  message: STANDARD_MESSAGE('Limite de requisições do assistente atingido. Aguarde 15 minutos.'),
});

module.exports = {
  authLimiter,
  helpContactLimiter,
  marketingWriteLimiter,
  miniSitePublicLimiter,
  aiAssistantLimiter,
};

/**
 * Multi-Tenant Express Application
 * SaaS-ready BelezaEcosystem API
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const { initializeModules } = require('./modules');
const { errorHandler, notFoundHandler, asyncHandler } = require('./shared/middleware');
const { createTenantResolver, validateTenantConsistency } = require('./shared/middleware');
const { createBruteForceProtection } = require('./shared/middleware');
const logger = require('./shared/utils/logger');
const OnboardingService = require('./modules/tenants/onboarding.service');
const { createOnboardingRoutes } = require('./modules/tenants/onboarding.routes');
const { initLgpdModule } = require('./modules/lgpd');
const { initNotificationsModule } = require('./modules/notifications');
const requireActiveSubscription = require('./shared/middleware/requireActiveSubscription');
const swaggerUi       = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger');
const { correlationId, requestLogger } = require('./shared/middleware/requestLogger');
const {
  helpContactLimiter,
  marketingWriteLimiter,
  miniSitePublicLimiter,
  aiAssistantLimiter,
} = require('./shared/middleware/rateLimits');

const authRoutes = require('./routes/auth');

const app = express();

// Trust proxy (Fly.io runs behind a reverse proxy)
app.set('trust proxy', 1);

// ─────────────────────────────────────────────────────────────────────────────
// Initialize Modules
// ─────────────────────────────────────────────────────────────────────────────
const modules = initializeModules();

// ─────────────────────────────────────────────────────────────────────────────
// Security
// ─────────────────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Adjust for SPA
}));

// ─────────────────────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost in development
    if (env.nodeEnv === 'development') {
      return callback(null, true);
    }
    
    // Allow configured origins
    const allowedOrigins = env.cors.origin.split(',').map(o => o.trim());
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // Allow configured subdomains + Cloudflare Pages preview
    try {
      const url = new URL(origin);
      if (url.hostname.endsWith('.belezaecosystem.com.br') || url.hostname === 'belezaecosystem.com.br') {
        return callback(null, true);
      }
      if (url.hostname.endsWith('.pages.dev')) {
        return callback(null, true);
      }
    } catch (_) { /* ignore invalid origins */ }

    // Allow subdomains from configured origins (pattern-based)
    const isSubdomain = allowedOrigins.some(allowed => {
      const pattern = allowed.replace('*.', '.*\\.');
      return new RegExp(`^${pattern}$`).test(origin);
    });
    
    if (isSubdomain) {
      return callback(null, true);
    }
    
    callback(new Error('CORS not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
}));

// ─────────────────────────────────────────────────────────────────────────────
// Body Parsing
// ─────────────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────────────────────
// Observability — Correlation ID + Structured Request Logging
// ─────────────────────────────────────────────────────────────────────────────
app.use(correlationId);
app.use(requestLogger);

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by tenant + IP for better isolation
    const tenantKey = req.headers['x-tenant-slug'] || 'global';
    return `${tenantKey}:${req.ip}`;
  },
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 15 minutos.',
    error: { code: 'RATE_LIMIT_EXCEEDED', details: null },
  },
});
app.use('/api/', limiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    error: { code: 'AUTH_RATE_LIMIT', details: null },
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─────────────────────────────────────────────────────────────────────────────
// Sequelize instance (needed for health/schema check below)
// ─────────────────────────────────────────────────────────────────────────────
const { sequelize } = modules;

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Beleza Ecosystem Multi-Tenant API is running.',
    data: {
      version: '2.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API Documentation — Swagger UI (only in non-production or when explicitly enabled)
// ─────────────────────────────────────────────────────────────────────────────
if (env.nodeEnv !== 'production' || process.env.ENABLE_DOCS === 'true') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'BelezaEcosystem API Docs',
    swaggerOptions: { persistAuthorization: true },
  }));
  app.get('/api/docs/json', (req, res) => res.json(swaggerDocument));
  logger.info('[Docs] Swagger UI available at /api/docs');
}

// Schema Health Check
app.get('/api/health/schema', async (req, res) => {
  try {
    const criticalTables = ['services', 'establishments', 'service_categories', 'tenants', 'subscriptions'];
    const results = {};
    
    for (const table of criticalTables) {
      const [rows] = await sequelize.query(
        'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1) as exists',
        { bind: [table], type: sequelize.QueryTypes.SELECT }
      );
      results[table] = rows[0]?.exists ?? false;
    }

    const allTablesExist = Object.values(results).every(exists => exists);

    res.json({
      success: allTablesExist,
      message: allTablesExist ? 'Schema validation passed' : 'Schema validation failed',
      data: {
        tables: results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Schema validation error',
      error: { code: 'SCHEMA_CHECK_ERROR', details: error.message },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Resolver (for tenant-scoped routes)
// ─────────────────────────────────────────────────────────────────────────────
const tenantResolver = createTenantResolver(modules.tenants.getTenantBySlug);

// ─────────────────────────────────────────────────────────────────────────────
// Brute Force Protection
// ─────────────────────────────────────────────────────────────────────────────
const bruteForceProtection = createBruteForceProtection(sequelize);

// ─────────────────────────────────────────────────────────────────────────────
// Public Routes (no tenant required)
// ─────────────────────────────────────────────────────────────────────────────

// Public billing routes (plans)
const billingRoutes = modules.billing.createRoutes();
app.use('/api/public', billingRoutes.public);

// Public registration routes
if (modules.public && modules.public.routes) {
  app.use('/api/public', modules.public.routes);
}

// Auth routes (public - no tenant required for login/register)
// Apply brute force protection specifically to login endpoint
app.use('/api/auth/login', bruteForceProtection.checkLoginAllowed());
app.use('/api/auth', authRoutes);

// Onboarding / Self-Signup routes (public)
const onboardingService = new OnboardingService({
  sequelize,
  tenantService: modules.tenants.service,
  userService: modules.users.service,
  subscriptionService: modules.billing.services.subscriptionService,
  planService: modules.billing.services.planService,
});
const onboardingRoutes = createOnboardingRoutes(onboardingService);
app.use('/api', onboardingRoutes);

// Billing public routes (plans listing)
app.get('/api/billing/plans', asyncHandler(async (req, res) => {
  const { SubscriptionPlan } = modules.billing.models;
  const plans = await SubscriptionPlan.findAll({
    where: { is_active: true, is_public: true },
    order: [['sort_order', 'ASC']],
  });
  res.json({
    success: true,
    data: plans,
  });
}));

app.get('/api/billing/plans/:slug', asyncHandler(async (req, res) => {
  const { SubscriptionPlan } = modules.billing.models;
  const plan = await SubscriptionPlan.findOne({
    where: { slug: req.params.slug, is_active: true },
  });
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Plan not found' });
  }
  res.json({ success: true, data: plan });
}));

// ─────────────────────────────────────────────────────────────────────────────
// Master Routes (SaaS Admin - no tenant scope)
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/master/tenants', modules.tenants.routes.master);

// Master Billing routes (plans, subscriptions, invoices, MRR)
const masterBillingRoutes = modules.billing.createRoutes({
  authenticate: modules.users.middleware.authenticate,
  authorize: modules.users.middleware.authorize,
}).master;
app.use('/api/master/billing', masterBillingRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// Tenant-Scoped Routes
// ─────────────────────────────────────────────────────────────────────────────

// Apply tenant resolver to all tenant-scoped routes
app.use('/api', tenantResolver);
app.use('/api', validateTenantConsistency);

// LGPD module (compliance — Art. 18 LGPD)
const lgpdMiddleware = {
  authenticate: modules.users.middleware.authenticate,
  authorize: modules.users.middleware.authorize,
  ROLES: require('./shared/constants').ROLES,
};
const { routes: lgpdRoutes } = initLgpdModule({
  models: modules.users.models,
  sequelize: require('./shared/database/connection'),
  middleware: lgpdMiddleware,
});
app.use('/api/lgpd', lgpdRoutes.tenant);
app.use('/api/master/lgpd', lgpdRoutes.master);

// Notifications module
const { routes: notifRoutes } = initNotificationsModule({
  models: require('./models'),
  middleware: lgpdMiddleware,
});
app.use('/api/notifications', requireActiveSubscription(), notifRoutes);

// Current tenant info
app.use('/api/tenant', modules.tenants.routes.tenant);

// Users
app.use('/api/users', modules.users.routes.users);

// Profile
app.use('/api/profile', modules.users.routes.profile);

// PROFESSIONAL Area Routes (tenant-scoped, PROFESSIONAL role only, Subscription enforced)
const professionalAreaRoutes = require('./routes/professionalArea');
app.use('/api/professional', requireActiveSubscription(), professionalAreaRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// OWNER Module Routes (REFACTORED - using tenant_id, subscription enforced)
// ─────────────────────────────────────────────────────────────────────────────
// ✅ All routes use tenant_id for multi-tenant isolation
// ✅ All routes protected with requireActiveSubscription()
// ✅ All routes use authorize(['OWNER', 'ADMIN'])
// ✅ Standardized pagination with { total, page, limit, pages }

const ownerProductRoutes = require('./routes/owner/products');
const ownerSupplierRoutes = require('./routes/owner/suppliers');
const ownerPurchaseRoutes = require('./routes/owner/purchases');
const ownerProfessionalDetailRoutes = require('./routes/owner/professional-details');
const ownerPaymentTransactionRoutes = require('./routes/owner/payment-transactions');

// NEW: Refactored modules with tenant_id
const ownerServicesRoutes = require('./routes/owner/services');
const ownerClientsRoutes = require('./routes/owner/clients');
const ownerAppointmentsRoutes = require('./routes/owner/appointments');
const ownerFinancialRoutes = require('./routes/owner/financial');
const ownerReportsRoutes = require('./routes/owner/reports');

// Apply subscription middleware to all OWNER routes
app.use('/api/products', requireActiveSubscription(), ownerProductRoutes);
app.use('/api/suppliers', requireActiveSubscription(), ownerSupplierRoutes);
app.use('/api/purchases', requireActiveSubscription(), ownerPurchaseRoutes);
app.use('/api/professional-details', requireActiveSubscription(), ownerProfessionalDetailRoutes);
app.use('/api/payment-transactions', requireActiveSubscription(), ownerPaymentTransactionRoutes);

// NEW: Refactored routes (replacing legacy establishment_id routes)
const ownerProfessionalsRoutes = require('./routes/owner/professionals');

// Phase 6 routes
const marketingRoutes    = require('./routes/owner/marketing');
const aiAssistantRoutes  = require('./routes/owner/ai-assistant');
const miniSiteRoutes     = require('./routes/owner/mini-site');
const commissionsRoutes  = require('./routes/owner/commissions');
const helpRoutes         = require('./routes/help');

app.use('/api/services', requireActiveSubscription(), ownerServicesRoutes);
app.use('/api/clients', requireActiveSubscription(), ownerClientsRoutes);
app.use('/api/appointments', requireActiveSubscription(), ownerAppointmentsRoutes);
app.use('/api/financial', requireActiveSubscription(), ownerFinancialRoutes);
app.use('/api/professionals', requireActiveSubscription(), ownerProfessionalsRoutes);
app.use('/api/reports', requireActiveSubscription({ allowReadOnly: true }), ownerReportsRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 — New module routes
// ─────────────────────────────────────────────────────────────────────────────

// Marketing & Automations (write limiter on POST/PATCH ops)
app.use('/api/marketing/campaigns', marketingWriteLimiter);
app.use('/api/marketing', requireActiveSubscription(), marketingRoutes);

// AI Assistant (derived data — no heavy writes, allow read-only)
app.use('/api/ai', aiAssistantLimiter, requireActiveSubscription({ allowReadOnly: true }), aiAssistantRoutes);

// Mini-site (tenant config)
app.use('/api/mini-site', requireActiveSubscription(), miniSiteRoutes.tenant);

// Commissions & Performance (mounted alongside /professionals)
app.use('/api/professionals', requireActiveSubscription({ allowReadOnly: true }), commissionsRoutes);

// Help (categories/faq public — contact has per-IP + per-email spam guard)
app.use('/api/help/contact', helpContactLimiter);
app.use('/api/help', helpRoutes);

// Public mini-site (no auth, no tenant required — per-IP rate limited)
app.use('/api/public/mini-site', miniSitePublicLimiter);
app.use('/api/public', miniSiteRoutes.public);

// ─────────────────────────────────────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/*', notFoundHandler);

// ─────────────────────────────────────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;

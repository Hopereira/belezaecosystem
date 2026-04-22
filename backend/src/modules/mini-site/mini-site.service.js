/**
 * Mini-site Service
 * One config row per tenant — upsert pattern
 */

'use strict';

const { Op } = require('sequelize');
const { ValidationError } = require('../../shared/errors');

// Slug: lowercase, starts with alphanumeric, hyphens allowed, 3–60 chars
const SLUG_RE       = /^[a-z0-9][a-z0-9-]{2,59}$/;
// Reserved slugs that must not be used by tenants
const RESERVED_SLUGS = new Set([
  'api', 'admin', 'login', 'register', 'app', 'help', 'support',
  'marketing', 'mini-site', 'billing', 'dashboard', 'static',
  'www', 'mail', 'ftp', 'public', 'assets', 'cdn', 'health',
]);

class MiniSiteService {
  constructor(models) {
    this.MiniSiteConfig = models.MiniSiteConfig;
    this.Tenant         = models.Tenant;
  }

  // ─── GET CONFIG ──────────────────────────────────────────

  async getConfig(tenantId) {
    let config = await this.MiniSiteConfig.findOne({
      where: { tenant_id: tenantId },
    });

    if (!config) {
      // Bootstrap default config from tenant name
      const tenant = this.Tenant
        ? await this.Tenant.findByPk(tenantId)
        : null;

      const tenantName = tenant?.name || 'Meu Salão';
      const slug       = this._slugify(tenantName);

      config = await this.MiniSiteConfig.create({
        tenant_id:   tenantId,
        slug:        await this._ensureUniqueSlug(slug, null),
        title:       tenantName,
        published:   false,
        cover_color: '#603322',
      });
    }

    return this._serialize(config);
  }

  // ─── UPDATE CONFIG ────────────────────────────────────────

  async updateConfig(tenantId, data) {
    let config = await this.MiniSiteConfig.findOne({
      where: { tenant_id: tenantId },
    });

    if (!config) {
      // create defaults first, then apply patch
      await this.getConfig(tenantId);
      config = await this.MiniSiteConfig.findOne({ where: { tenant_id: tenantId } });
    }

    // Validate and sanitize slug if changing
    if (data.slug !== undefined && data.slug !== config.slug) {
      const newSlug = this._slugify(data.slug);
      if (!SLUG_RE.test(newSlug)) {
        throw new ValidationError(
          'Slug inválido. Use letras minúsculas, números e hífens (3–60 chars).'
        );
      }
      if (RESERVED_SLUGS.has(newSlug)) {
        throw new ValidationError(
          `O slug "${newSlug}" é reservado. Escolha outro.`
        );
      }
      data.slug = await this._ensureUniqueSlug(newSlug, tenantId);
    }

    // Sanitize text fields
    if (data.title)       data.title       = data.title.trim().substring(0, 255);
    if (data.description) data.description = data.description.trim().substring(0, 2000);
    if (data.address)     data.address     = data.address.trim().substring(0, 500);

    // Strip unknown/dangerous fields
    const ALLOWED = [
      'slug', 'title', 'description', 'hero_image_url', 'cover_color',
      'contact_phone', 'whatsapp', 'address',
      'booking_enabled', 'online_payment_enabled', 'reviews_enabled',
      'services_highlight', 'professionals_highlight',
    ];
    const safeData = Object.fromEntries(
      Object.entries(data).filter(([k]) => ALLOWED.includes(k))
    );

    await config.update(safeData);
    return this._serialize(config);
  }

  // ─── PUBLISH / UNPUBLISH ──────────────────────────────────

  async publish(tenantId) {
    const config = await this._getOrCreate(tenantId);

    // Guard: must have at minimum a slug and title before publishing
    if (!config.slug || !config.title) {
      throw new ValidationError(
        'Configure um título antes de publicar o mini-site.'
      );
    }

    await config.update({ published: true, published_at: new Date() });
    return this._serialize(config);
  }

  async unpublish(tenantId) {
    const config = await this._getOrCreate(tenantId);
    await config.update({ published: false });
    return this._serialize(config);
  }

  // ─── PUBLIC ENDPOINT (no auth) ───────────────────────────

  async getPublicConfig(slug) {
    const config = await this.MiniSiteConfig.findOne({
      where: { slug, published: true },
    });

    if (!config) return null;

    return {
      slug:                   config.slug,
      title:                  config.title,
      description:            config.description,
      hero_image_url:         config.hero_image_url,
      cover_color:            config.cover_color,
      contact_phone:          config.contact_phone,
      whatsapp:               config.whatsapp,
      address:                config.address,
      booking_enabled:        config.booking_enabled,
      online_payment_enabled: config.online_payment_enabled,
      reviews_enabled:        config.reviews_enabled,
      services_highlight:     config.services_highlight || [],
      professionals_highlight:config.professionals_highlight || [],
    };
  }

  // ─── PRIVATE ─────────────────────────────────────────────

  async _getOrCreate(tenantId) {
    let config = await this.MiniSiteConfig.findOne({ where: { tenant_id: tenantId } });
    if (!config) {
      await this.getConfig(tenantId); // bootstrap
      config = await this.MiniSiteConfig.findOne({ where: { tenant_id: tenantId } });
    }
    return config;
  }

  async _ensureUniqueSlug(base, excludeTenantId) {
    let candidate = base;
    let attempt   = 0;
    const MAX_ATTEMPTS = 20;

    while (attempt <= MAX_ATTEMPTS) {
      const where = { slug: candidate };
      if (excludeTenantId) where.tenant_id = { [Op.ne]: excludeTenantId };

      const exists = await this.MiniSiteConfig.findOne({ where });
      if (!exists) return candidate;

      attempt++;
      candidate = `${base}-${attempt}`;
    }

    // Fallback: append random suffix
    return `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  _slugify(str) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 60) || 'meu-salao';
  }

  _serialize(config) {
    return {
      id:                     config.id,
      slug:                   config.slug,
      published:              config.published,
      title:                  config.title,
      description:            config.description,
      hero_image_url:         config.hero_image_url,
      cover_color:            config.cover_color,
      contact_phone:          config.contact_phone,
      whatsapp:               config.whatsapp,
      address:                config.address,
      booking_enabled:        config.booking_enabled,
      online_payment_enabled: config.online_payment_enabled,
      reviews_enabled:        config.reviews_enabled,
      services_highlight:     config.services_highlight  || [],
      professionals_highlight:config.professionals_highlight || [],
      published_at:           config.published_at,
      created_at:             config.created_at,
      updated_at:             config.updated_at,
    };
  }
}

module.exports = MiniSiteService;

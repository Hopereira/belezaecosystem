'use strict';

/**
 * Unit tests — MiniSiteService
 * Slug validation, reserved slugs, publish guard, sanitization
 */

process.env.NODE_ENV = 'test';

const MiniSiteService = require('../../src/modules/mini-site/mini-site.service');
const { ValidationError } = require('../../src/shared/errors');

// ─── Mock MiniSiteConfig model ───────────────────────────────────────────────

function makeMockConfig(overrides = {}) {
  const data = {
    id: 'config-uuid',
    tenant_id: 'tenant-a',
    slug: 'meu-salao',
    title: 'Meu Salão',
    published: false,
    contact_phone: null,
    ...overrides,
  };
  return {
    ...data,
    update: jest.fn(async (patch) => Object.assign(data, patch)),
  };
}

function makeModels(configData = null) {
  const mockConfig = configData;
  return {
    MiniSiteConfig: {
      findOne: jest.fn(async ({ where } = {}) => {
        if (where?.slug && where.slug !== (mockConfig?.slug)) return null;
        return mockConfig;
      }),
      create: jest.fn(async (data) => ({
        ...data,
        id: 'new-uuid',
        update: jest.fn(),
      })),
      count: jest.fn(async () => 0),
    },
    Tenant: {
      findByPk: jest.fn(async () => ({ name: 'Test Salon' })),
    },
  };
}

// ─── _slugify ────────────────────────────────────────────────────────────────

describe('MiniSiteService._slugify', () => {
  const svc = new MiniSiteService(makeModels());

  test('converts uppercase to lowercase', () => {
    expect(svc._slugify('MEU SALÃO')).toBe('meu-salao');
  });

  test('strips accents', () => {
    expect(svc._slugify('ção café')).toBe('cao-cafe');
  });

  test('replaces spaces with hyphens', () => {
    expect(svc._slugify('salon de  beleza')).toBe('salon-de-beleza');
  });

  test('removes non-alphanumeric/hyphen chars', () => {
    expect(svc._slugify('My Salon! #1')).toBe('my-salon-1');
  });

  test('truncates to 60 chars', () => {
    const long = 'a'.repeat(100);
    expect(svc._slugify(long).length).toBeLessThanOrEqual(60);
  });

  test('returns fallback for empty string', () => {
    expect(svc._slugify('')).toBe('meu-salao');
  });
});

// ─── updateConfig — slug validation ──────────────────────────────────────────

describe('MiniSiteService.updateConfig — slug validation', () => {
  test('throws ValidationError for slug too short after slugify', async () => {
    const config = makeMockConfig({ slug: 'original' });
    const models = makeModels(config);
    const svc = new MiniSiteService(models);

    await expect(svc.updateConfig('tenant-a', { slug: 'ab' })).rejects.toThrow(ValidationError);
  });

  test('throws ValidationError for reserved slug "admin"', async () => {
    const config = makeMockConfig({ slug: 'original' });
    const models = makeModels(config);
    const svc = new MiniSiteService(models);

    await expect(svc.updateConfig('tenant-a', { slug: 'admin' })).rejects.toThrow(ValidationError);
  });

  test('throws ValidationError for reserved slug "api"', async () => {
    const config = makeMockConfig({ slug: 'original' });
    const models = makeModels(config);
    const svc = new MiniSiteService(models);

    await expect(svc.updateConfig('tenant-a', { slug: 'api' })).rejects.toThrow(ValidationError);
  });

  test('accepts valid slug', async () => {
    const config = makeMockConfig({ slug: 'old-slug' });
    const models = makeModels(config);
    // First findOne: by tenant_id (returns config)
    // Second findOne: collision check by slug (returns null = no collision)
    models.MiniSiteConfig.findOne = jest.fn(async ({ where } = {}) => {
      if (where?.tenant_id) return config; // lookup by tenant
      return null;                         // slug availability check
    });
    const svc = new MiniSiteService(models);

    await svc.updateConfig('tenant-a', { slug: 'novo-salao' });
    expect(config.update).toHaveBeenCalled();
  });

  test('strips fields not in ALLOWED whitelist', async () => {
    const config = makeMockConfig();
    const models = makeModels(config);
    models.MiniSiteConfig.findOne = jest.fn(async () => config);
    const svc = new MiniSiteService(models);

    await svc.updateConfig('tenant-a', {
      title: 'Test',
      dangerous_field: 'XSS',
      is_admin: true,
    });

    const patchArg = config.update.mock.calls[0][0];
    expect(patchArg).not.toHaveProperty('dangerous_field');
    expect(patchArg).not.toHaveProperty('is_admin');
    expect(patchArg).toHaveProperty('title', 'Test');
  });

  test('trims and truncates title', async () => {
    const config = makeMockConfig();
    const models = makeModels(config);
    models.MiniSiteConfig.findOne = jest.fn(async () => config);
    const svc = new MiniSiteService(models);

    const longTitle = '  ' + 'A'.repeat(300) + '  ';
    await svc.updateConfig('tenant-a', { title: longTitle });

    const patchArg = config.update.mock.calls[0][0];
    expect(patchArg.title.length).toBeLessThanOrEqual(255);
    expect(patchArg.title).not.toMatch(/^\s|\s$/);
  });
});

// ─── publish guard ───────────────────────────────────────────────────────────

describe('MiniSiteService.publish', () => {
  test('throws ValidationError when title is missing', async () => {
    const config = makeMockConfig({ title: null, slug: 'meu-salao' });
    const models = makeModels(config);
    models.MiniSiteConfig.findOne = jest.fn(async () => config);
    const svc = new MiniSiteService(models);

    await expect(svc.publish('tenant-a')).rejects.toThrow(ValidationError);
  });

  test('throws ValidationError when title is empty string', async () => {
    const config = makeMockConfig({ title: '', slug: 'meu-salao' });
    const models = makeModels(config);
    models.MiniSiteConfig.findOne = jest.fn(async () => config);
    const svc = new MiniSiteService(models);

    await expect(svc.publish('tenant-a')).rejects.toThrow(ValidationError);
  });

  test('succeeds when title and slug are set', async () => {
    const config = makeMockConfig({ title: 'Meu Salão', slug: 'meu-salao' });
    const models = makeModels(config);
    models.MiniSiteConfig.findOne = jest.fn(async () => config);
    const svc = new MiniSiteService(models);

    const result = await svc.publish('tenant-a');
    expect(config.update).toHaveBeenCalledWith(
      expect.objectContaining({ published: true })
    );
  });
});

// ─── _ensureUniqueSlug ───────────────────────────────────────────────────────

describe('MiniSiteService._ensureUniqueSlug', () => {
  test('returns base slug when no collision', async () => {
    const models = makeModels(null);
    models.MiniSiteConfig.findOne = jest.fn(async () => null);
    const svc = new MiniSiteService(models);

    const result = await svc._ensureUniqueSlug('meu-salao', null);
    expect(result).toBe('meu-salao');
  });

  test('appends -1 on first collision', async () => {
    const models = makeModels(null);
    let callCount = 0;
    models.MiniSiteConfig.findOne = jest.fn(async ({ where }) => {
      if (callCount === 0) { callCount++; return { slug: where.slug }; } // first collision
      return null;
    });
    const svc = new MiniSiteService(models);

    const result = await svc._ensureUniqueSlug('meu-salao', null);
    expect(result).toBe('meu-salao-1');
  });
});

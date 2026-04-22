'use strict';

/**
 * Unit tests — HelpService
 * Spam guard, input sanitization, category validation
 */

process.env.NODE_ENV = 'test';

const HelpService = require('../../src/modules/help/help.service');
const { ValidationError } = require('../../src/shared/errors');
const { Op } = require('sequelize');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeContactModel(countResult = 0) {
  return {
    count:  jest.fn(async () => countResult),
    create: jest.fn(async (data) => ({ ...data, id: 'req-uuid', status: 'open', created_at: new Date() })),
  };
}

const VALID_PAYLOAD = {
  name:     'Ana Lima',
  email:    'ana@exemplo.com',
  subject:  'Problema no sistema',
  message:  'Não consigo acessar o módulo de agendamentos desde ontem.',
  category: 'appts',
};

// ─── getCategories ────────────────────────────────────────────────────────────

describe('HelpService.getCategories', () => {
  const svc = new HelpService({ HelpContactRequest: makeContactModel() });

  test('returns array of categories', () => {
    const cats = svc.getCategories();
    expect(Array.isArray(cats)).toBe(true);
    expect(cats.length).toBeGreaterThan(0);
  });

  test('each category has id, title, icon', () => {
    svc.getCategories().forEach(c => {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('title');
      expect(c).toHaveProperty('icon');
    });
  });
});

// ─── getFaq ──────────────────────────────────────────────────────────────────

describe('HelpService.getFaq', () => {
  const svc = new HelpService({ HelpContactRequest: makeContactModel() });

  test('returns all FAQs when no category', () => {
    const all = svc.getFaq();
    expect(all.length).toBeGreaterThan(0);
  });

  test('filters FAQs by category', () => {
    const filtered = svc.getFaq({ category: 'billing' });
    filtered.forEach(f => expect(f.category).toBe('billing'));
  });

  test('returns empty array for unknown category', () => {
    const result = svc.getFaq({ category: 'unknown-cat' });
    expect(result).toEqual([]);
  });
});

// ─── submitContact — spam guard ───────────────────────────────────────────────

describe('HelpService.submitContact — spam guard', () => {
  test('throws ValidationError when 3+ submissions in window', async () => {
    const svc = new HelpService({ HelpContactRequest: makeContactModel(3) });
    await expect(svc.submitContact(null, null, VALID_PAYLOAD)).rejects.toThrow(ValidationError);
  });

  test('allows submission when under limit', async () => {
    const svc = new HelpService({ HelpContactRequest: makeContactModel(2) });
    const result = await svc.submitContact(null, null, VALID_PAYLOAD);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('status', 'open');
  });

  test('passes correct email to spam count query', async () => {
    const model = makeContactModel(0);
    const svc = new HelpService({ HelpContactRequest: model });
    await svc.submitContact(null, null, { ...VALID_PAYLOAD, email: '  ANA@EXEMPLO.COM  ' });

    const countCall = model.count.mock.calls[0][0];
    expect(countCall.where.email).toBe('ana@exemplo.com');
  });
});

// ─── submitContact — sanitization ────────────────────────────────────────────

describe('HelpService.submitContact — sanitization', () => {
  test('trims whitespace from name, subject, message', async () => {
    const model = makeContactModel(0);
    const svc = new HelpService({ HelpContactRequest: model });

    await svc.submitContact(null, null, {
      name:    '  Ana Lima  ',
      email:   'ana@exemplo.com',
      subject: '  Problema  ',
      message: '  Não consigo acessar.  ',
    });

    const created = model.create.mock.calls[0][0];
    expect(created.name).toBe('Ana Lima');
    expect(created.subject).toBe('Problema');
    expect(created.message).toBe('Não consigo acessar.');
  });

  test('lowercases and trims email', async () => {
    const model = makeContactModel(0);
    const svc = new HelpService({ HelpContactRequest: model });

    await svc.submitContact(null, null, { ...VALID_PAYLOAD, email: '  USER@DOMAIN.COM  ' });

    const created = model.create.mock.calls[0][0];
    expect(created.email).toBe('user@domain.com');
  });

  test('stores status as open', async () => {
    const model = makeContactModel(0);
    const svc = new HelpService({ HelpContactRequest: model });

    await svc.submitContact(null, null, VALID_PAYLOAD);
    expect(model.create.mock.calls[0][0].status).toBe('open');
  });

  test('returns confirmation message in response', async () => {
    const svc = new HelpService({ HelpContactRequest: makeContactModel(0) });
    const result = await svc.submitContact(null, null, VALID_PAYLOAD);
    expect(result).toHaveProperty('message');
    expect(typeof result.message).toBe('string');
  });
});

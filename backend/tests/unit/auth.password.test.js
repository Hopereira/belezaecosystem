'use strict';

/**
 * Unit tests — Password Reset Flow (forgotPassword + resetPassword)
 *
 * Tests:
 *  1. forgotPassword — email não existe → resposta safe (anti-enumeração)
 *  2. forgotPassword — email existe → gera token, persiste hash, envia email
 *  3. forgotPassword — email existe mas user inativo → resposta safe
 *  4. resetPassword — token inválido (não encontrado) → 400
 *  5. resetPassword — token expirado → 400 RESET_TOKEN_EXPIRED
 *  6. resetPassword — token já usado → 400 RESET_TOKEN_USED
 *  7. resetPassword — token válido → 200 + senha atualizada + token invalidado
 *  8. resetPassword — replay do mesmo token → 400 RESET_TOKEN_USED
 *  9. resetPassword — senha < 6 chars → 400 VALIDATION_ERROR
 * 10. resetPassword — token ausente → 400 VALIDATION_ERROR
 */

process.env.NODE_ENV = 'test';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function futureDate(minutesFromNow = 60) {
  return new Date(Date.now() + minutesFromNow * 60 * 1000);
}

function pastDate(minutesAgo = 90) {
  return new Date(Date.now() - minutesAgo * 60 * 1000);
}

// ─── Mock infrastructure ──────────────────────────────────────────────────────

// In-memory store for password_reset_tokens (mimics DB table)
let tokenStore = [];
let userStore = [];

// We test the controller functions directly by injecting mocked dependencies
// via module-level mocking (jest.mock).

jest.mock('../../src/models', () => {
  return {
    User: {
      findOne: jest.fn(),
      findByPk: jest.fn(),
    },
    Establishment: {},
    Professional: {},
    Tenant: {},
    Subscription: {},
    sequelize: {
      query: jest.fn(),
      transaction: jest.fn(),
    },
  };
});

jest.mock('../../src/shared/services/email.service', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ id: 'email-mock-id' }),
}));

jest.mock('../../src/config/env', () => ({
  nodeEnv: 'test',
  email: {
    resendApiKey: 'test-key',
    from: 'test@beleza.com',
    appUrl: 'http://localhost:8080',
    resetTokenExpirationMinutes: 60,
  },
}));

jest.mock('../../src/utils/jwt', () => ({
  generateAccessToken: jest.fn(() => 'mock-access-token'),
  generateRefreshToken: jest.fn(() => 'mock-refresh-token'),
  verifyRefreshToken: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { User, sequelize } = require('../../src/models');
const { sendPasswordResetEmail } = require('../../src/shared/services/email.service');
const authController = require('../../src/controllers/authController');

// ─── Request / Response factories ─────────────────────────────────────────────

function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
  };
  return res;
}

function makeNext() {
  return jest.fn();
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  tokenStore = [];
  userStore = [];
  jest.clearAllMocks();

  // Default sequelize.query mock: captures INSERT and SELECT calls
  sequelize.query.mockImplementation(async (sql, opts) => {
    const s = typeof sql === 'string' ? sql.trim().toUpperCase() : '';

    if (s.startsWith('INSERT INTO PASSWORD_RESET_TOKENS')) {
      const record = {
        id: 'token-uuid-' + Math.random(),
        user_id: opts.replacements.userId,
        token_hash: opts.replacements.tokenHash,
        expires_at: opts.replacements.expiresAt,
        used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      tokenStore.push(record);
      return [{ affectedRows: 1 }];
    }

    if (s.startsWith('SELECT') && s.includes('PASSWORD_RESET_TOKENS')) {
      const hash = opts.replacements.tokenHash;
      const found = tokenStore.find(t => t.token_hash === hash) || null;
      return [[found].filter(Boolean)];
    }

    if (s.startsWith('UPDATE PASSWORD_RESET_TOKENS') && s.includes('USED_AT')) {
      const id = opts.replacements?.id;
      const userId = opts.replacements?.userId;
      tokenStore = tokenStore.map(t => {
        if (id && t.id === id) return { ...t, used_at: new Date() };
        if (userId && t.user_id === userId && !t.used_at) return { ...t, used_at: new Date() };
        return t;
      });
      return [{ affectedRows: 1 }];
    }

    return [[]];
  });

  // Default transaction mock: executes the callback immediately
  sequelize.transaction.mockImplementation(async (cb) => {
    return cb({ /* mock transaction object */ });
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('forgotPassword', () => {
  test('1. email não existe → retorna resposta safe (anti-enumeração)', async () => {
    User.findOne.mockResolvedValue(null);

    const req = { body: { email: 'naoexiste@test.com' } };
    const res = makeRes();
    const next = makeNext();

    await authController.forgotPassword(req, res, next);

    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.message).toMatch(/receberá as instruções/i);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('2. email existe → gera token, persiste hash, envia email', async () => {
    const user = {
      id: 'user-uuid-1',
      email: 'user@test.com',
      is_active: true,
      first_name: 'Ana',
    };
    User.findOne.mockResolvedValue(user);

    const req = { body: { email: 'user@test.com' } };
    const res = makeRes();
    const next = makeNext();

    await authController.forgotPassword(req, res, next);

    expect(res._body.success).toBe(true);

    // Token deve ter sido persistido
    expect(tokenStore.length).toBe(1);
    expect(tokenStore[0].user_id).toBe('user-uuid-1');
    expect(tokenStore[0].token_hash).toHaveLength(64); // SHA-256 hex

    // Email deve ter sido enviado
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const emailCall = sendPasswordResetEmail.mock.calls[0][0];
    expect(emailCall.to).toBe('user@test.com');
    expect(emailCall.name).toBe('Ana');
    expect(emailCall.resetUrl).toContain('/reset-password?token=');

    // URL não deve conter o hash — deve conter o raw token
    const rawToken = emailCall.resetUrl.split('token=')[1];
    expect(rawToken).toHaveLength(64); // 32 bytes hex
    expect(rawToken).not.toBe(tokenStore[0].token_hash);

    expect(next).not.toHaveBeenCalled();
  });

  test('3. user inativo → resposta safe sem enviar email', async () => {
    User.findOne.mockResolvedValue({ id: 'u', email: 'inactive@test.com', is_active: false });

    const req = { body: { email: 'inactive@test.com' } };
    const res = makeRes();

    await authController.forgotPassword(req, res, makeNext());

    expect(res._body.success).toBe(true);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  test('4. email em branco → 400 VALIDATION_ERROR', async () => {
    const req = { body: { email: '' } };
    const res = makeRes();

    await authController.forgotPassword(req, res, makeNext());

    expect(res._status).toBe(400);
    expect(res._body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('resetPassword', () => {
  test('5. token inválido (não encontrado) → 400 RESET_TOKEN_INVALID', async () => {
    const req = { body: { token: 'aaaa'.repeat(16), password: 'nova-senha-123' } };
    const res = makeRes();

    await authController.resetPassword(req, res, makeNext());

    expect(res._status).toBe(400);
    expect(res._body.error.code).toBe('RESET_TOKEN_INVALID');
  });

  test('6. token expirado → 400 RESET_TOKEN_EXPIRED', async () => {
    const { raw, hash } = makeToken();
    tokenStore.push({
      id: 'tok-1',
      user_id: 'user-uuid-exp',
      token_hash: hash,
      expires_at: pastDate(90), // expirado há 90 min
      used_at: null,
    });

    const req = { body: { token: raw, password: 'nova-senha-123' } };
    const res = makeRes();

    await authController.resetPassword(req, res, makeNext());

    expect(res._status).toBe(400);
    expect(res._body.error.code).toBe('RESET_TOKEN_EXPIRED');
  });

  test('7. token já usado → 400 RESET_TOKEN_USED', async () => {
    const { raw, hash } = makeToken();
    tokenStore.push({
      id: 'tok-2',
      user_id: 'user-uuid-used',
      token_hash: hash,
      expires_at: futureDate(60),
      used_at: new Date(), // já usado
    });

    const req = { body: { token: raw, password: 'nova-senha-123' } };
    const res = makeRes();

    await authController.resetPassword(req, res, makeNext());

    expect(res._status).toBe(400);
    expect(res._body.error.code).toBe('RESET_TOKEN_USED');
  });

  test('8. token válido → 200, senha atualizada, token marcado como usado', async () => {
    const { raw, hash } = makeToken();
    const userId = 'user-uuid-valid';

    tokenStore.push({
      id: 'tok-3',
      user_id: userId,
      token_hash: hash,
      expires_at: futureDate(60),
      used_at: null,
    });

    const mockUser = {
      id: userId,
      email: 'valid@test.com',
      is_active: true,
      password: await bcrypt.hash('old-password', 10),
      update: jest.fn().mockResolvedValue(true),
    };
    User.findByPk.mockResolvedValue(mockUser);

    const req = { body: { token: raw, password: 'nova-senha-segura' } };
    const res = makeRes();

    await authController.resetPassword(req, res, makeNext());

    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.message).toMatch(/redefinida com sucesso/i);

    // User.update deve ter sido chamado com nova senha (bcrypt hash)
    expect(mockUser.update).toHaveBeenCalledTimes(1);
    const [updateArgs] = mockUser.update.mock.calls[0];
    expect(updateArgs.password).not.toBe('nova-senha-segura'); // deve estar hasheada
    const passwordMatches = await bcrypt.compare('nova-senha-segura', updateArgs.password);
    expect(passwordMatches).toBe(true);

    // Token deve ter sido marcado como usado
    const usedToken = tokenStore.find(t => t.token_hash === hash);
    expect(usedToken.used_at).not.toBeNull();
  });

  test('9. replay do mesmo token após uso → 400 RESET_TOKEN_USED', async () => {
    const { raw, hash } = makeToken();
    tokenStore.push({
      id: 'tok-4',
      user_id: 'user-replay',
      token_hash: hash,
      expires_at: futureDate(60),
      used_at: new Date(), // marcado como usado
    });

    const req = { body: { token: raw, password: 'outra-senha-123' } };
    const res = makeRes();

    await authController.resetPassword(req, res, makeNext());

    expect(res._status).toBe(400);
    expect(res._body.error.code).toBe('RESET_TOKEN_USED');
  });

  test('10. senha menor que 6 chars → 400 VALIDATION_ERROR', async () => {
    const req = { body: { token: 'qualquer-token-aqui-abc123', password: '123' } };
    const res = makeRes();

    await authController.resetPassword(req, res, makeNext());

    expect(res._status).toBe(400);
    expect(res._body.error.code).toBe('VALIDATION_ERROR');
  });

  test('11. token ausente no body → 400 VALIDATION_ERROR', async () => {
    const req = { body: { password: 'valida123' } };
    const res = makeRes();

    await authController.resetPassword(req, res, makeNext());

    expect(res._status).toBe(400);
    expect(res._body.error.code).toBe('VALIDATION_ERROR');
  });
});

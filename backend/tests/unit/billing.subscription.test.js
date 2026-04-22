'use strict';

/**
 * Unit tests — SubscriptionService.activateSubscription
 * Validates the secure card tokenization flow:
 *   - cardToken required for card payments (never raw card data)
 *   - valid cardToken proceeds through gateway
 *   - PIX payments do not require cardToken
 */

process.env.NODE_ENV = 'test';

const SubscriptionService = require('../../src/modules/billing/services/subscription.service');
const { PAYMENT_METHOD_TYPE, BILLING_CYCLE, SUBSCRIPTION_STATUS, TENANT_STATUS } = require('../../src/shared/constants');
const { ValidationError } = require('../../src/shared/errors');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSubscription(overrides = {}) {
  return {
    id: 'sub-uuid-001',
    tenant_id: 'tenant-uuid-001',
    gateway_customer_id: null,
    status: SUBSCRIPTION_STATUS.TRIAL,
    plan: makePlan(),
    toJSON() { return { ...this }; },
    update: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makePlan(overrides = {}) {
  return {
    id: 'plan-uuid-001',
    stripe_price_id: 'price_mock_001',
    price_monthly: 99.90,
    price_yearly: 1078.80,
    price: 99.90,
    toJSON() { return { ...this }; },
    ...overrides,
  };
}

function makeTenant(overrides = {}) {
  return {
    id: 'tenant-uuid-001',
    name: 'Salão Teste',
    owner_email: 'owner@salao.com',
    ...overrides,
  };
}

function makeModels({ subscription, plan, tenant } = {}) {
  return {
    Subscription: {
      findOne: jest.fn().mockResolvedValue(subscription ?? makeSubscription()),
    },
    SubscriptionPlan: {
      findByPk: jest.fn().mockResolvedValue(plan ?? makePlan()),
    },
    Tenant: {
      findByPk: jest.fn().mockResolvedValue(tenant ?? makeTenant()),
      update: jest.fn().mockResolvedValue([1]),
    },
    Invoice: {},
  };
}

function makePaymentProvider({ shouldFail = false } = {}) {
  return {
    getProviderName: jest.fn().mockReturnValue('mock'),
    createCustomer: jest.fn().mockResolvedValue({ customerId: 'cus_mock_001' }),
    createSubscription: shouldFail
      ? jest.fn().mockRejectedValue(Object.assign(new Error('Gateway error'), { code: 'GATEWAY_ERROR' }))
      : jest.fn().mockResolvedValue({ subscriptionId: 'sub_gw_001' }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SubscriptionService.activateSubscription — card tokenization', () => {
  // ── P0: cardToken obrigatório ────────────────────────────────────────────

  test('should throw ValidationError when paymentMethod=card and cardToken is missing', async () => {
    const service = new SubscriptionService(makeModels(), makePaymentProvider(), null);

    await expect(
      service.activateSubscription('tenant-uuid-001', {
        planId: 'plan-uuid-001',
        billingCycle: BILLING_CYCLE.MONTHLY,
        paymentMethod: PAYMENT_METHOD_TYPE.CARD,
        // cardToken intentionally omitted
      })
    ).rejects.toThrow(ValidationError);
  });

  test('should throw ValidationError with descriptive message when cardToken is empty string', async () => {
    const service = new SubscriptionService(makeModels(), makePaymentProvider(), null);

    await expect(
      service.activateSubscription('tenant-uuid-001', {
        planId: 'plan-uuid-001',
        billingCycle: BILLING_CYCLE.MONTHLY,
        paymentMethod: PAYMENT_METHOD_TYPE.CARD,
        cardToken: '',
      })
    ).rejects.toThrow(ValidationError);
  });

  // ── P1: cardToken válido → fluxo normal ─────────────────────────────────

  test('should call paymentProvider.createSubscription with cardToken when cardToken is provided', async () => {
    const provider = makePaymentProvider();
    const models = makeModels();
    const service = new SubscriptionService(models, provider, null);

    await service.activateSubscription('tenant-uuid-001', {
      planId: 'plan-uuid-001',
      billingCycle: BILLING_CYCLE.MONTHLY,
      paymentMethod: PAYMENT_METHOD_TYPE.CARD,
      cardToken: 'tok_valid_abc123xyz',
    });

    expect(provider.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethodData: { cardToken: 'tok_valid_abc123xyz' },
      })
    );
  });

  test('should update subscription status to ACTIVE after successful card payment', async () => {
    const subscription = makeSubscription();
    const models = makeModels({ subscription });
    const service = new SubscriptionService(models, makePaymentProvider(), null);

    await service.activateSubscription('tenant-uuid-001', {
      planId: 'plan-uuid-001',
      billingCycle: BILLING_CYCLE.MONTHLY,
      paymentMethod: PAYMENT_METHOD_TYPE.CARD,
      cardToken: 'tok_valid_abc123xyz',
    });

    expect(subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: SUBSCRIPTION_STATUS.ACTIVE })
    );
  });

  test('should update tenant status to ACTIVE after successful card payment', async () => {
    const models = makeModels();
    const service = new SubscriptionService(models, makePaymentProvider(), null);

    await service.activateSubscription('tenant-uuid-001', {
      planId: 'plan-uuid-001',
      billingCycle: BILLING_CYCLE.MONTHLY,
      paymentMethod: PAYMENT_METHOD_TYPE.CARD,
      cardToken: 'tok_valid_abc123xyz',
    });

    expect(models.Tenant.update).toHaveBeenCalledWith(
      { status: TENANT_STATUS.ACTIVE },
      { where: { id: 'tenant-uuid-001' } }
    );
  });

  test('should NOT include raw card fields in gateway call', async () => {
    const provider = makePaymentProvider();
    const service = new SubscriptionService(makeModels(), provider, null);

    await service.activateSubscription('tenant-uuid-001', {
      planId: 'plan-uuid-001',
      billingCycle: BILLING_CYCLE.MONTHLY,
      paymentMethod: PAYMENT_METHOD_TYPE.CARD,
      cardToken: 'tok_valid_abc123xyz',
    });

    const callArg = provider.createSubscription.mock.calls[0][0];
    expect(callArg.paymentMethodData).not.toHaveProperty('number');
    expect(callArg.paymentMethodData).not.toHaveProperty('cvv');
    expect(callArg.paymentMethodData).not.toHaveProperty('expMonth');
    expect(callArg.paymentMethodData).not.toHaveProperty('expYear');
    expect(callArg.paymentMethodData).not.toHaveProperty('card');
  });

  test('should create a new gateway customer when gateway_customer_id is null', async () => {
    const provider = makePaymentProvider();
    const subscription = makeSubscription({ gateway_customer_id: null });
    const service = new SubscriptionService(makeModels({ subscription }), provider, null);

    await service.activateSubscription('tenant-uuid-001', {
      planId: 'plan-uuid-001',
      billingCycle: BILLING_CYCLE.MONTHLY,
      paymentMethod: PAYMENT_METHOD_TYPE.CARD,
      cardToken: 'tok_valid_abc123xyz',
    });

    expect(provider.createCustomer).toHaveBeenCalledTimes(1);
  });

  test('should reuse existing gateway_customer_id without creating a new customer', async () => {
    const provider = makePaymentProvider();
    const subscription = makeSubscription({ gateway_customer_id: 'cus_existing_001' });
    const service = new SubscriptionService(makeModels({ subscription }), provider, null);

    await service.activateSubscription('tenant-uuid-001', {
      planId: 'plan-uuid-001',
      billingCycle: BILLING_CYCLE.MONTHLY,
      paymentMethod: PAYMENT_METHOD_TYPE.CARD,
      cardToken: 'tok_valid_abc123xyz',
    });

    expect(provider.createCustomer).not.toHaveBeenCalled();
    expect(provider.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cus_existing_001' })
    );
  });

  // ── P2: PIX não precisa de cardToken ────────────────────────────────────

  test('should succeed for PIX payment without cardToken', async () => {
    const subscription = makeSubscription();
    const models = makeModels({ subscription });
    const service = new SubscriptionService(models, null /* no provider */, null);

    await expect(
      service.activateSubscription('tenant-uuid-001', {
        planId: 'plan-uuid-001',
        billingCycle: BILLING_CYCLE.MONTHLY,
        paymentMethod: PAYMENT_METHOD_TYPE.PIX,
        // no cardToken — correct for PIX
      })
    ).resolves.not.toThrow();

    expect(subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: SUBSCRIPTION_STATUS.ACTIVE })
    );
  });

  // ── P3: gateway falha ────────────────────────────────────────────────────

  test('should propagate gateway errors without swallowing them', async () => {
    const failingProvider = makePaymentProvider({ shouldFail: true });
    const service = new SubscriptionService(makeModels(), failingProvider, null);

    await expect(
      service.activateSubscription('tenant-uuid-001', {
        planId: 'plan-uuid-001',
        billingCycle: BILLING_CYCLE.MONTHLY,
        paymentMethod: PAYMENT_METHOD_TYPE.CARD,
        cardToken: 'tok_valid_abc123xyz',
      })
    ).rejects.toThrow('Gateway error');
  });

  // ── P4: yearly billing ───────────────────────────────────────────────────

  test('should calculate amount from price_yearly when billingCycle=yearly', async () => {
    const subscription = makeSubscription();
    const models = makeModels({ subscription });
    const service = new SubscriptionService(models, makePaymentProvider(), null);

    await service.activateSubscription('tenant-uuid-001', {
      planId: 'plan-uuid-001',
      billingCycle: BILLING_CYCLE.YEARLY,
      paymentMethod: PAYMENT_METHOD_TYPE.CARD,
      cardToken: 'tok_valid_abc123xyz',
    });

    expect(subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1078.80 })
    );
  });
});

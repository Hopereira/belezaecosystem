'use strict';

/**
 * Unit tests — CommissionsService
 * Commission rate priority, period bounds, serialization
 */

process.env.NODE_ENV = 'test';

const CommissionsService = require('../../src/modules/commissions/commissions.service');

// ─── Factories ────────────────────────────────────────────────────────────────

function makeProfessional(overrides = {}) {
  return {
    id:              'prof-uuid',
    specialty:       'hair',
    commission_rate: 30,
    user: null,
    ...overrides,
  };
}

function makeAppointment(overrides = {}) {
  return {
    id:              'appt-uuid',
    professional_id: 'prof-uuid',
    service_id:      'svc-uuid',
    price_charged:   100,
    start_time:      new Date('2026-01-15'),
    service:         { id: 'svc-uuid', name: 'Corte' },
    ...overrides,
  };
}

function makeModels({ professionals = [], appointments = [], settingRate = null } = {}) {
  return {
    Professional: {
      findAll: jest.fn(async () => professionals),
      findOne: jest.fn(async ({ where }) =>
        professionals.find(p => p.id === where?.id) || null
      ),
    },
    Appointment: {
      findAll:         jest.fn(async () => appointments),
      findAndCountAll: jest.fn(async () => ({ rows: appointments, count: appointments.length })),
      count:           jest.fn(async () => appointments.length),
    },
    Service:  null,
    User:     null,
    CommissionSetting: settingRate !== null ? {
      findAll: jest.fn(async () =>
        professionals.map(p => ({
          rate: settingRate,
          type: 'percentage',
          user: { id: 'user-uuid', professional: { id: p.id } },
        }))
      ),
    } : null,
  };
}

// ─── _periodBounds ────────────────────────────────────────────────────────────

describe('CommissionsService._periodBounds', () => {
  const svc = new CommissionsService(makeModels());

  test('month period starts on 1st of current month', () => {
    const { startDate } = svc._periodBounds('month');
    expect(startDate.getDate()).toBe(1);
    expect(startDate.getHours()).toBe(0);
  });

  test('year period starts on Jan 1', () => {
    const { startDate } = svc._periodBounds('year');
    expect(startDate.getMonth()).toBe(0);
    expect(startDate.getDate()).toBe(1);
  });

  test('week period starts on Sunday (day 0)', () => {
    const { startDate } = svc._periodBounds('week');
    expect(startDate.getDay()).toBe(0);
  });

  test('endDate has time set to 23:59:59', () => {
    const { endDate } = svc._periodBounds('month');
    expect(endDate.getHours()).toBe(23);
    expect(endDate.getMinutes()).toBe(59);
  });
});

// ─── _sumRevenue ──────────────────────────────────────────────────────────────

describe('CommissionsService._sumRevenue', () => {
  const svc = new CommissionsService(makeModels());

  test('sums price_charged correctly', () => {
    const appts = [
      makeAppointment({ price_charged: 100 }),
      makeAppointment({ price_charged: 50.5 }),
    ];
    expect(svc._sumRevenue(appts)).toBeCloseTo(150.5);
  });

  test('returns 0 for empty array', () => {
    expect(svc._sumRevenue([])).toBe(0);
  });

  test('handles missing price_charged gracefully', () => {
    expect(svc._sumRevenue([{ price_charged: null }, { price_charged: undefined }])).toBe(0);
  });
});

// ─── getSummary — commission rate priority ────────────────────────────────────

describe('CommissionsService.getSummary — rate priority', () => {
  test('uses CommissionSetting rate when available', async () => {
    const prof = makeProfessional({ commission_rate: 30 });
    const appt = makeAppointment({ professional_id: prof.id, price_charged: 100 });
    const models = makeModels({
      professionals: [prof],
      appointments:  [appt],
      settingRate:   50, // override
    });
    const svc = new CommissionsService(models);
    const result = await svc.getSummary('tenant-a');
    expect(result.professionals[0].commission_rate).toBe(50);
    expect(result.professionals[0].estimated_commission).toBeCloseTo(50);
  });

  test('falls back to professional.commission_rate when no CommissionSetting', async () => {
    const prof = makeProfessional({ commission_rate: 40 });
    const appt = makeAppointment({ professional_id: prof.id, price_charged: 100 });
    const models = makeModels({
      professionals: [prof],
      appointments:  [appt],
      settingRate:   null,
    });
    const svc = new CommissionsService(models);
    const result = await svc.getSummary('tenant-a');
    expect(result.professionals[0].commission_rate).toBe(40);
    expect(result.professionals[0].estimated_commission).toBeCloseTo(40);
  });

  test('defaults to 30% when no CommissionSetting and no commission_rate', async () => {
    const prof = makeProfessional({ commission_rate: null });
    const appt = makeAppointment({ professional_id: prof.id, price_charged: 200 });
    const models = makeModels({
      professionals: [prof],
      appointments:  [appt],
      settingRate:   null,
    });
    const svc = new CommissionsService(models);
    const result = await svc.getSummary('tenant-a');
    expect(result.professionals[0].commission_rate).toBe(30);
    expect(result.professionals[0].estimated_commission).toBeCloseTo(60);
  });
});

// ─── getSummary — ranking ─────────────────────────────────────────────────────

describe('CommissionsService.getSummary — ranking', () => {
  test('professionals sorted by revenue descending', async () => {
    const prof1 = makeProfessional({ id: 'p1', commission_rate: 30 });
    const prof2 = makeProfessional({ id: 'p2', commission_rate: 30 });
    const appts = [
      makeAppointment({ professional_id: 'p1', price_charged: 100 }),
      makeAppointment({ professional_id: 'p2', price_charged: 200 }),
    ];
    const models = makeModels({ professionals: [prof1, prof2], appointments: appts });
    const svc = new CommissionsService(models);
    const result = await svc.getSummary('tenant-a');
    expect(result.professionals[0].professional_id).toBe('p2');
    expect(result.professionals[1].professional_id).toBe('p1');
  });

  test('ranking_position starts at 1', async () => {
    const prof = makeProfessional();
    const models = makeModels({ professionals: [prof], appointments: [] });
    const svc = new CommissionsService(models);
    const result = await svc.getSummary('tenant-a');
    expect(result.professionals[0].ranking_position).toBe(1);
  });

  test('totals are summed correctly', async () => {
    const prof = makeProfessional({ commission_rate: 50 });
    const appts = [
      makeAppointment({ professional_id: prof.id, price_charged: 100 }),
      makeAppointment({ professional_id: prof.id, price_charged: 100 }),
    ];
    const models = makeModels({ professionals: [prof], appointments: appts });
    const svc = new CommissionsService(models);
    const result = await svc.getSummary('tenant-a');
    expect(result.total_revenue).toBeCloseTo(200);
    expect(result.total_commission).toBeCloseTo(100);
    expect(result.total_appointments).toBe(2);
  });
});

/**
 * Multi-Tenant Integration Test Script
 * Tests the full flow: login → CRUD with tenant_id isolation
 * Run: node tests/test-multitenant-integration.js
 * Requires: backend running on localhost:5001
 */

const http = require('http');

const BASE_URL = 'http://localhost:5001';
let ownerToken = '';
let results = { passed: 0, failed: 0, skipped: 0 };

// ─────────────────────────────────────────────────────
// HTTP Helper
// ─────────────────────────────────────────────────────
function req(method, path, data = null, token = null, tenantSlug = 'beleza-pura') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': tenantSlug,
      },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const request = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    request.on('error', reject);
    if (data) request.write(JSON.stringify(data));
    request.end();
  });
}

function assert(condition, msg) {
  if (condition) {
    console.log(`   ✅ ${msg}`);
    results.passed++;
  } else {
    console.log(`   ❌ FAIL: ${msg}`);
    results.failed++;
  }
}

// ─────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────

async function testHealthCheck() {
  console.log('\n── Health Check ──');
  const r = await req('GET', '/api/health');
  assert(r.status === 200, `API is running (${r.status})`);
}

async function testOwnerLogin() {
  console.log('\n── Owner Login ──');
  const r = await req('POST', '/api/auth/login', {
    email: 'owner@belezapura.com',
    password: '123456',
  });
  assert(r.status === 200, `Login status ${r.status}`);
  assert(!!r.body?.data?.accessToken, 'Got access token');

  if (r.body?.data?.accessToken) {
    ownerToken = r.body.data.accessToken;
    const payload = JSON.parse(Buffer.from(ownerToken.split('.')[1], 'base64').toString());
    assert(!!payload.tenantId, `JWT contains tenantId: ${payload.tenantId}`);
    assert(payload.role === 'owner', `JWT role is owner`);
  }
}

async function testListClients() {
  console.log('\n── GET /clients ──');
  if (!ownerToken) { console.log('   ⏭ Skipped (no token)'); results.skipped++; return; }
  const r = await req('GET', '/api/clients?page=1&limit=5', null, ownerToken);
  assert(r.status === 200, `Status ${r.status}`);
  assert(r.body?.success === true, 'Response has success:true');
  assert(Array.isArray(r.body?.data), 'Response data is array');
  assert(r.body?.pagination?.total >= 0, `Pagination total: ${r.body?.pagination?.total}`);
  assert(r.body?.pagination?.pages >= 1, `Pagination pages: ${r.body?.pagination?.pages}`);

  // Verify client structure has expected fields
  if (r.body?.data?.length > 0) {
    const c = r.body.data[0];
    assert(!!c.id, 'Client has id');
    assert(!!c.first_name, `Client has first_name: ${c.first_name}`);
    assert(c.tenant_id !== undefined, 'Client has tenant_id field');
  }
}

async function testCreateClient() {
  console.log('\n── POST /clients ──');
  if (!ownerToken) { console.log('   ⏭ Skipped (no token)'); results.skipped++; return; }
  const r = await req('POST', '/api/clients', {
    first_name: 'Test',
    last_name: 'Integration',
    phone: '11999998888',
    email: 'test-integration@email.com',
  }, ownerToken);
  assert(r.status === 201, `Created client status ${r.status}`);
  assert(!!r.body?.data?.id, `Client id: ${r.body?.data?.id}`);

  // Clean up
  if (r.body?.data?.id) {
    await req('DELETE', `/api/clients/${r.body.data.id}`, null, ownerToken);
  }
}

async function testListServices() {
  console.log('\n── GET /services ──');
  if (!ownerToken) { console.log('   ⏭ Skipped (no token)'); results.skipped++; return; }
  const r = await req('GET', '/api/services', null, ownerToken);
  assert(r.status === 200, `Status ${r.status}`);
  assert(Array.isArray(r.body?.data), 'Response data is array');

  if (r.body?.data?.length > 0) {
    const s = r.body.data[0];
    assert(!!s.name, `Service name: ${s.name}`);
    assert(s.price !== undefined, `Service price: ${s.price}`);
    assert(s.duration_minutes !== undefined, `Service duration: ${s.duration_minutes}`);
  }
}

async function testListAppointments() {
  console.log('\n── GET /appointments ──');
  if (!ownerToken) { console.log('   ⏭ Skipped (no token)'); results.skipped++; return; }
  const r = await req('GET', '/api/appointments?limit=5', null, ownerToken);
  assert(r.status === 200, `Status ${r.status}`);
  assert(Array.isArray(r.body?.data), 'Response data is array');

  if (r.body?.data?.length > 0) {
    const a = r.body.data[0];
    assert(!!a.id, 'Appointment has id');
    assert(!!a.start_time, `Appointment has start_time`);
    assert(!!a.client, 'Appointment includes nested client');
    assert(!!a.service, 'Appointment includes nested service');
  }
}

async function testAppointmentStats() {
  console.log('\n── GET /appointments/stats ──');
  if (!ownerToken) { console.log('   ⏭ Skipped (no token)'); results.skipped++; return; }
  const r = await req('GET', '/api/appointments/stats', null, ownerToken);
  assert(r.status === 200, `Status ${r.status}`);
  assert(r.body?.data?.today !== undefined, `Today count: ${r.body?.data?.today}`);
  assert(r.body?.data?.week !== undefined, `Week count: ${r.body?.data?.week}`);
  assert(r.body?.data?.month !== undefined, `Month count: ${r.body?.data?.month}`);
}

async function testFinancialSummary() {
  console.log('\n── GET /financial/summary ──');
  if (!ownerToken) { console.log('   ⏭ Skipped (no token)'); results.skipped++; return; }
  const r = await req('GET', '/api/financial/summary', null, ownerToken);
  assert(r.status === 200, `Status ${r.status}`);
  assert(r.body?.success === true, 'Response has success:true');
}

async function testFinancialEntries() {
  console.log('\n── GET /financial/entries ──');
  if (!ownerToken) { console.log('   ⏭ Skipped (no token)'); results.skipped++; return; }
  const r = await req('GET', '/api/financial/entries', null, ownerToken);
  assert(r.status === 200, `Status ${r.status}`);
  assert(Array.isArray(r.body?.data), 'Response data is array');

  if (r.body?.data?.length > 0) {
    const e = r.body.data[0];
    assert(!!e.id, 'Entry has id');
    assert(e.amount !== undefined, `Entry amount: ${e.amount}`);
    assert(!!e.entry_date, `Entry date: ${e.entry_date}`);
  }
}

async function testFinancialExits() {
  console.log('\n── GET /financial/exits ──');
  if (!ownerToken) { console.log('   ⏭ Skipped (no token)'); results.skipped++; return; }
  const r = await req('GET', '/api/financial/exits', null, ownerToken);
  assert(r.status === 200, `Status ${r.status}`);
  assert(Array.isArray(r.body?.data), 'Response data is array');
}

async function testPaymentMethods() {
  console.log('\n── GET /financial/payment-methods ──');
  if (!ownerToken) { console.log('   ⏭ Skipped (no token)'); results.skipped++; return; }
  const r = await req('GET', '/api/financial/payment-methods', null, ownerToken);
  assert(r.status === 200, `Status ${r.status}`);
  assert(Array.isArray(r.body?.data), 'Response data is array');

  if (r.body?.data?.length > 0) {
    assert(!!r.body.data[0].name, `Payment method: ${r.body.data[0].name}`);
  }
}

async function testProfessionals() {
  console.log('\n── GET /professionals ──');
  if (!ownerToken) { console.log('   ⏭ Skipped (no token)'); results.skipped++; return; }
  const r = await req('GET', '/api/professionals', null, ownerToken);
  assert(r.status === 200, `Status ${r.status}`);
  assert(Array.isArray(r.body?.data), 'Response data is array');

  if (r.body?.data?.length > 0) {
    const p = r.body.data[0];
    assert(!!p.id, 'Professional has id');
    assert(!!p.specialty || p.user, 'Professional has specialty or nested user');
  }
}

async function testTenantIsolation_NoToken() {
  console.log('\n── Tenant Isolation: No Token ──');
  const r = await req('GET', '/api/clients', null, null);
  assert(r.status === 401, `Unauthenticated request returns 401 (got ${r.status})`);
}

async function testTenantIsolation_WrongSlug() {
  console.log('\n── Tenant Isolation: Wrong Slug ──');
  if (!ownerToken) { console.log('   ⏭ Skipped (no token)'); results.skipped++; return; }
  const r = await req('GET', '/api/clients', null, ownerToken, 'non-existent-tenant');
  assert(r.status === 400 || r.status === 404 || r.status === 403 || r.status === 401,
    `Wrong tenant slug rejected (status ${r.status})`);
}

// ─────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────
async function run() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  MULTI-TENANT INTEGRATION TESTS');
  console.log('  Target: ' + BASE_URL);
  console.log('══════════════════════════════════════════════════════');

  const tests = [
    testHealthCheck,
    testOwnerLogin,
    testListClients,
    testCreateClient,
    testListServices,
    testListAppointments,
    testAppointmentStats,
    testFinancialSummary,
    testFinancialEntries,
    testFinancialExits,
    testPaymentMethods,
    testProfessionals,
    testTenantIsolation_NoToken,
    testTenantIsolation_WrongSlug,
  ];

  for (const test of tests) {
    try {
      await test();
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      results.failed++;
    }
  }

  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${results.passed} passed | ${results.failed} failed | ${results.skipped} skipped`);
  console.log('══════════════════════════════════════════════════════\n');

  if (results.failed === 0) {
    console.log('✅ All integration tests passed!\n');
  } else {
    console.log(`⚠️  ${results.failed} test(s) failed. Check output above.\n`);
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exitCode = 1;
});

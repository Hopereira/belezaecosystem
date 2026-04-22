/**
 * E2E Auth Helpers — BelezaEcosystem
 * Shared login/logout utilities for Playwright tests
 */

/**
 * Inject a mock authenticated session into localStorage.
 * Use this to bypass the real login flow in tests that don't test auth itself.
 */
export async function injectOwnerSession(page) {
    await page.goto('/');
    await page.evaluate(() => {
        const user = {
            id: 'test-owner-1',
            name: 'Teste Owner',
            firstName: 'Teste',
            lastName: 'Owner',
            email: 'owner@test.com',
            role: 'owner',
            tenantId: 'tenant-test-1',
        };
        const tenant = { id: 'tenant-test-1', slug: 'salon-test', name: 'Salão Teste' };
        localStorage.setItem('be_user', JSON.stringify(user));
        localStorage.setItem('be_access_token', 'fake-token-owner');
        localStorage.setItem('be_tenant_slug', 'salon-test');
    });
}

export async function injectAdminSession(page) {
    await page.goto('/');
    await page.evaluate(() => {
        const user = {
            id: 'test-admin-1',
            name: 'Teste Admin',
            firstName: 'Teste',
            lastName: 'Admin',
            email: 'admin@test.com',
            role: 'admin',
            tenantId: 'tenant-test-1',
        };
        localStorage.setItem('be_user', JSON.stringify(user));
        localStorage.setItem('be_access_token', 'fake-token-admin');
        localStorage.setItem('be_tenant_slug', 'salon-test');
    });
}

export async function injectProfessionalSession(page) {
    await page.goto('/');
    await page.evaluate(() => {
        const user = {
            id: 'test-prof-1',
            name: 'Teste Profissional',
            firstName: 'Teste',
            lastName: 'Profissional',
            email: 'prof@test.com',
            role: 'professional',
            tenantId: 'tenant-test-1',
        };
        localStorage.setItem('be_user', JSON.stringify(user));
        localStorage.setItem('be_access_token', 'fake-token-prof');
        localStorage.setItem('be_tenant_slug', 'salon-test');
    });
}

export async function injectMasterSession(page) {
    await page.goto('/');
    await page.evaluate(() => {
        const user = {
            id: 'test-master-1',
            name: 'Master Admin',
            firstName: 'Master',
            lastName: 'Admin',
            email: 'master@test.com',
            role: 'master',
        };
        localStorage.setItem('be_user', JSON.stringify(user));
        localStorage.setItem('be_access_token', 'fake-token-master');
    });
}

export async function clearSession(page) {
    await page.evaluate(() => {
        localStorage.clear();
    });
}

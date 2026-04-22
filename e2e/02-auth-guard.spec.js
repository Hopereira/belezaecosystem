/**
 * E2E — Guards de Autenticação e RBAC
 * Valida que rotas protegidas redirecionam corretamente
 */
import { test, expect } from '@playwright/test';
import { clearSession, injectOwnerSession, injectProfessionalSession, injectMasterSession } from './helpers/auth.js';

test.describe('Visitante — sem sessão', () => {
    test.beforeEach(async ({ page }) => {
        await clearSession(page);
    });

    const protectedRoutes = [
        '/dashboard',
        '/appointments',
        '/clients',
        '/services',
        '/professionals',
        '/financial',
        '/billing',
        '/marketing',
        '/ai-assistant',
        '/mini-site',
        '/team-commissions',
        '/help',
        '/settings',
        '/account',
        '/reports',
        '/inventory',
    ];

    for (const route of protectedRoutes) {
        test(`${route} redireciona para /login`, async ({ page }) => {
            await page.goto(route);
            await expect(page).toHaveURL(/\/login/);
        });
    }

    test('/professional/dashboard redireciona para /login', async ({ page }) => {
        await page.goto('/professional/dashboard');
        await expect(page).toHaveURL(/\/login/);
    });

    test('/master redireciona para /login', async ({ page }) => {
        await page.goto('/master');
        await expect(page).toHaveURL(/\/login/);
    });
});

test.describe('OWNER — sessão injetada', () => {
    test.beforeEach(async ({ page }) => {
        await injectOwnerSession(page);
    });

    test('/dashboard carrega shell', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page.locator('.sidebar')).toBeVisible();
        await expect(page.locator('.main-content')).toBeVisible();
    });

    test('sidebar contém links de gestão', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page.locator('a[href="/appointments"]')).toBeVisible();
        await expect(page.locator('a[href="/clients"]')).toBeVisible();
        await expect(page.locator('a[href="/marketing"]')).toBeVisible();
    });

    test('sidebar NÃO mostra área de professional', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page.locator('a[href="/professional/dashboard"]')).not.toBeVisible();
    });

    test('/professional/dashboard redireciona para /dashboard (role mismatch)', async ({ page }) => {
        await page.goto('/professional/dashboard');
        await expect(page).not.toHaveURL(/\/professional\/dashboard/);
    });

    test('/master redireciona para /dashboard (role mismatch)', async ({ page }) => {
        await page.goto('/master');
        await expect(page).not.toHaveURL(/\/master$/);
    });

    test('/login redireciona para /dashboard quando já autenticado', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveURL(/\/dashboard/);
    });
});

test.describe('PROFESSIONAL — sessão injetada', () => {
    test.beforeEach(async ({ page }) => {
        await injectProfessionalSession(page);
    });

    test('/dashboard redireciona para /professional/dashboard', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/professional\/dashboard/);
    });

    test('/professional/dashboard carrega shell', async ({ page }) => {
        await page.goto('/professional/dashboard');
        await expect(page.locator('.sidebar')).toBeVisible();
    });

    test('sidebar contém links da área profissional', async ({ page }) => {
        await page.goto('/professional/dashboard');
        await expect(page.locator('a[href="/professional/appointments"]')).toBeVisible();
        await expect(page.locator('a[href="/professional/earnings"]')).toBeVisible();
    });

    test('sidebar NÃO mostra link Marketing (owner only)', async ({ page }) => {
        await page.goto('/professional/dashboard');
        await expect(page.locator('a[href="/marketing"]')).not.toBeVisible();
    });

    test('/master redireciona (role mismatch)', async ({ page }) => {
        await page.goto('/master');
        await expect(page).not.toHaveURL(/\/master$/);
    });
});

test.describe('MASTER — sessão injetada', () => {
    test.beforeEach(async ({ page }) => {
        await injectMasterSession(page);
    });

    test('/master carrega shell master', async ({ page }) => {
        await page.goto('/master');
        await expect(page.locator('.master-shell, .dashboard-container')).toBeVisible();
    });

    test('sidebar mostra link "Master Admin"', async ({ page }) => {
        await page.goto('/master');
        await expect(page.locator('a[href="/master"]')).toBeVisible();
    });

    test('/master/tenants carrega', async ({ page }) => {
        await page.goto('/master/tenants');
        await expect(page.locator('.sidebar')).toBeVisible();
    });

    test('/login redireciona para /master quando já autenticado', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveURL(/\/master/);
    });
});

/**
 * E2E — Área Master
 * Smoke tests para páginas /master/*
 */
import { test, expect } from '@playwright/test';
import { injectMasterSession, injectOwnerSession } from './helpers/auth.js';

test.describe('Master — smoke pages', () => {
    test.beforeEach(async ({ page }) => {
        await injectMasterSession(page);
    });

    const masterPages = [
        '/master',
        '/master/tenants',
        '/master/plans',
        '/master/billing',
        '/master/system',
    ];

    for (const route of masterPages) {
        test(`${route} — abre sem erro JS`, async ({ page }) => {
            const errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.goto(route);
            // Master usa .dashboard-container (renderMasterShell ou renderShell)
            await expect(page.locator('.dashboard-container, .master-shell')).toBeVisible({ timeout: 8000 });
            expect(errors, `Erros JS em ${route}: ${errors.join(', ')}`).toHaveLength(0);
        });
    }

    test('sidebar master tem link "Master Admin"', async ({ page }) => {
        await page.goto('/master');
        await expect(page.locator('a[href="/master"]')).toBeVisible();
    });
});

test.describe('Owner não acessa área Master', () => {
    test.beforeEach(async ({ page }) => {
        await injectOwnerSession(page);
    });

    test('/master redireciona owner para /dashboard', async ({ page }) => {
        await page.goto('/master');
        await expect(page).toHaveURL('/dashboard');
    });

    test('/master/tenants redireciona owner para /dashboard', async ({ page }) => {
        await page.goto('/master/tenants');
        await expect(page).toHaveURL('/dashboard');
    });
});

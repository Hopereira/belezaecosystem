/**
 * E2E — Área Profissional
 * Smoke tests para todas as páginas do role PROFESSIONAL
 */
import { test, expect } from '@playwright/test';
import { injectProfessionalSession } from './helpers/auth.js';

test.beforeEach(async ({ page }) => {
    await injectProfessionalSession(page);
});

const professionalPages = [
    '/professional/dashboard',
    '/professional/appointments',
    '/professional/clients',
    '/professional/earnings',
    '/professional/performance',
    '/professional/profile',
    '/professional/availability',
];

for (const route of professionalPages) {
    test(`${route} — abre sem erro JS`, async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(route);
        await expect(page.locator('.sidebar')).toBeVisible({ timeout: 8000 });
        await expect(page.locator('#page-content')).toBeVisible({ timeout: 8000 });
        expect(errors, `Erros JS em ${route}: ${errors.join(', ')}`).toHaveLength(0);
    });
}

test.describe('Isolamento de Área Profissional', () => {
    test('sidebar profissional NÃO mostra /marketing', async ({ page }) => {
        await page.goto('/professional/dashboard');
        await expect(page.locator('a[href="/marketing"]')).not.toBeVisible();
    });

    test('sidebar profissional NÃO mostra /clients (owner)', async ({ page }) => {
        await page.goto('/professional/dashboard');
        // /clients owner não deve aparecer; /professional/clients deve aparecer
        await expect(page.locator('a[href="/clients"]')).not.toBeVisible();
        await expect(page.locator('a[href="/professional/clients"]')).toBeVisible();
    });

    test('sidebar profissional mostra todos os 7 links da área', async ({ page }) => {
        await page.goto('/professional/dashboard');
        await expect(page.locator('a[href="/professional/dashboard"]')).toBeVisible();
        await expect(page.locator('a[href="/professional/appointments"]')).toBeVisible();
        await expect(page.locator('a[href="/professional/clients"]')).toBeVisible();
        await expect(page.locator('a[href="/professional/earnings"]')).toBeVisible();
        await expect(page.locator('a[href="/professional/performance"]')).toBeVisible();
        await expect(page.locator('a[href="/professional/availability"]')).toBeVisible();
        await expect(page.locator('a[href="/professional/profile"]')).toBeVisible();
    });

    test('/dashboard redireciona profissional para /professional/dashboard', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL('/professional/dashboard');
    });

    test('/appointments redireciona profissional para /professional/appointments', async ({ page }) => {
        await page.goto('/appointments');
        await expect(page).toHaveURL('/professional/appointments');
    });
});

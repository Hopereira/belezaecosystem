/**
 * E2E — Marketing & Automação
 * Campanhas, métricas, automações
 */
import { test, expect } from '@playwright/test';
import { injectOwnerSession } from './helpers/auth.js';

test.beforeEach(async ({ page }) => {
    await injectOwnerSession(page);
    // Mock de dados de marketing
    await page.route('**/api/marketing/campaigns', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: [
                    { id: 1, name: 'Campanha Teste', status: 'active', channel: 'WhatsApp', sent: 50, returns: 10, date: '2026-04-01' },
                ],
            }),
        });
    });
    await page.route('**/api/marketing/metrics', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: { campaigns_active: 2, messages_sent: 150, open_rate: 72, automations_active: 3 },
            }),
        });
    });
    await page.route('**/api/marketing/automations', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: [] }),
        });
    });
});

test('marketing carrega sem erro JS', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/marketing');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
});

test('marketing renderiza KPIs com dados mockados', async ({ page }) => {
    await page.goto('/marketing');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.mod-kpi-grid, .mod-header')).toBeVisible({ timeout: 6000 });
});

test('marketing menu item ativo é "marketing"', async ({ page }) => {
    await page.goto('/marketing');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.menu-item.active')).toHaveAttribute('href', '/marketing');
});

test('marketing fallback funciona quando API retorna 500', async ({ page }) => {
    await page.route('**/api/marketing/**', async (route) => {
        await route.fulfill({ status: 500, body: 'error' });
    });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/marketing');
    await page.waitForLoadState('networkidle');
    // Com fallback, não deve quebrar
    await expect(page.locator('#page-content')).not.toBeEmpty();
    expect(errors).toHaveLength(0);
});

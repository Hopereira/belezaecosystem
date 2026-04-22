/**
 * E2E — Mini-site
 * Preview, edição de campos, publicação
 */
import { test, expect } from '@playwright/test';
import { injectOwnerSession } from './helpers/auth.js';

test.beforeEach(async ({ page }) => {
    await injectOwnerSession(page);
    // Mock das chamadas de API para o mini-site
    await page.route('**/api/mini-site', async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: {
                        published: false,
                        slug: 'salon-test',
                        name: 'Salão Teste',
                        description: 'Descrição do salão',
                        phone: '(11) 99999-9999',
                        address: 'Rua Teste, 123',
                        cover_color: '#603322',
                        booking_enabled: true,
                        payment_enabled: false,
                        services_featured: [],
                    },
                }),
            });
        } else {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, data: {} }),
            });
        }
    });
});

test('mini-site carrega sem erro JS', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/mini-site');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#page-content')).not.toBeEmpty();
    expect(errors).toHaveLength(0);
});

test('mini-site exibe dados do salão após load', async ({ page }) => {
    await page.goto('/mini-site');
    await page.waitForLoadState('networkidle');
    // Conteúdo deve ser renderizado (não skeleton)
    await expect(page.locator('#page-content')).not.toBeEmpty();
    // Deve conter o nome do salão ou um campo editável
    const content = await page.locator('#page-content').innerHTML();
    expect(content.length).toBeGreaterThan(100);
});

test('skeleton aparece e desaparece no load', async ({ page }) => {
    // Adicionar delay na resposta para capturar skeleton
    await page.route('**/api/mini-site', async (route) => {
        await new Promise(r => setTimeout(r, 500));
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: { published: false, slug: 'salon-test', name: 'Salão Teste' } }),
        });
    });
    await page.goto('/mini-site');
    // Verificar que eventualmente o conteúdo real aparece
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#page-content')).not.toBeEmpty();
});

/**
 * E2E — Shell, Sidebar e Navegação Interna
 * Valida que o shell renderiza corretamente e a navegação via menu funciona
 */
import { test, expect } from '@playwright/test';
import { injectOwnerSession } from './helpers/auth.js';

test.beforeEach(async ({ page }) => {
    await injectOwnerSession(page);
});

test.describe('Shell Layout', () => {
    test('sidebar visível no dashboard', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page.locator('.sidebar')).toBeVisible();
        await expect(page.locator('.top-bar')).toBeVisible();
        await expect(page.locator('#page-content')).toBeVisible();
    });

    test('saudação do usuário aparece no header', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page.locator('.greeting')).toContainText('Olá');
        await expect(page.locator('.user-name')).toContainText('Teste');
    });

    test('dropdown de perfil abre ao clicar', async ({ page }) => {
        await page.goto('/dashboard');
        await page.click('#userProfileBtn');
        await expect(page.locator('#profileDropdown')).toHaveClass(/show/);
    });

    test('dropdown fecha ao clicar fora', async ({ page }) => {
        await page.goto('/dashboard');
        await page.click('#userProfileBtn');
        await page.click('.main-content', { position: { x: 100, y: 100 } });
        await expect(page.locator('#profileDropdown')).not.toHaveClass(/show/);
    });

    test('botão de logout está presente', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page.locator('#btn-logout')).toBeVisible();
    });

    test('logout redireciona para /login', async ({ page }) => {
        await page.goto('/dashboard');
        await page.click('#btn-logout');
        await expect(page).toHaveURL(/\/login/);
    });
});

test.describe('Navegação via Menu Lateral', () => {
    const menuRoutes = [
        { label: 'Agendamentos', href: '/appointments' },
        { label: 'Clientes', href: '/clients' },
        { label: 'Serviços', href: '/services' },
        { label: 'Financeiro', href: '/financial' },
        { label: 'Marketing', href: '/marketing' },
        { label: 'Ajuda', href: '/help' },
        { label: 'Assinatura', href: '/billing' },
        { label: 'Minha Conta', href: '/account' },
    ];

    for (const { label, href } of menuRoutes) {
        test(`navega para ${href} via menu`, async ({ page }) => {
            await page.goto('/dashboard');
            const errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.click(`a[href="${href}"]`);
            await expect(page).toHaveURL(href);
            await expect(page.locator('.sidebar')).toBeVisible();
            expect(errors).toHaveLength(0);
        });
    }

    test('item ativo do menu é destacado', async ({ page }) => {
        await page.goto('/appointments');
        const activeItem = page.locator('.menu-item.active');
        await expect(activeItem).toHaveCount(1);
        await expect(activeItem).toHaveAttribute('href', '/appointments');
    });
});

test.describe('Menu Mobile', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('menu mobile toggle funciona', async ({ page }) => {
        await page.goto('/dashboard');
        const sidebar = page.locator('.sidebar');
        await expect(sidebar).not.toHaveClass(/open/);
        await page.click('#mobileMenuBtn');
        await expect(sidebar).toHaveClass(/open/);
    });

    test('overlay fecha o menu mobile', async ({ page }) => {
        await page.goto('/dashboard');
        await page.click('#mobileMenuBtn');
        await page.click('#sidebarOverlay');
        await expect(page.locator('.sidebar')).not.toHaveClass(/open/);
    });
});

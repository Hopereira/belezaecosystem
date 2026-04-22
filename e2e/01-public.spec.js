/**
 * E2E — Páginas Públicas
 * Landing, Login, Register, páginas legais
 */
import { test, expect } from '@playwright/test';
import { clearSession } from './helpers/auth.js';

test.beforeEach(async ({ page }) => {
    await clearSession(page);
});

test.describe('Landing Page', () => {
    test('abre sem erro JS', async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        expect(errors).toHaveLength(0);
    });

    test('renderiza hero e navbar', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.lp-hero__title')).toBeVisible();
        await expect(page.locator('.lp-nav__brand')).toBeVisible();
        await expect(page.locator('text=Gestão que liberta')).toBeVisible();
    });

    test('seção de planos carrega (fallback estático se API offline)', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        // Planos estáticos sempre renderizam
        await expect(page.locator('#plansContainer')).toBeVisible();
        await expect(page.locator('.lp-plan-card').first()).toBeVisible();
    });

    test('botão "Começar Gratuitamente" abre modal de cadastro', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.click('#btnStartNow');
        await expect(page.locator('#modal-register')).toBeVisible();
    });

    test('links de navegação interna funcionam (hash-scroll)', async ({ page }) => {
        await page.goto('/');
        await page.click('a[href="#planos"]');
        await expect(page.locator('#planos')).toBeInViewport({ ratio: 0.1 });
    });

    test('navbar "Entrar" navega para /login', async ({ page }) => {
        await page.goto('/');
        await page.click('.lp-nav__link-login');
        await expect(page).toHaveURL(/\/login/);
    });

    test('footer links são clicáveis', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('a[href="/terms-of-service"]').first()).toBeVisible();
        await expect(page.locator('a[href="/privacy-policy"]').first()).toBeVisible();
    });
});

test.describe('Login Page', () => {
    test('abre sem erro JS', async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        expect(errors).toHaveLength(0);
    });

    test('renderiza formulário com campos de email e senha', async ({ page }) => {
        await page.goto('/login');
        await expect(page.locator('#email')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
        await expect(page.locator('#loginSubmit')).toBeVisible();
    });

    test('link "Criar conta grátis" navega para /register', async ({ page }) => {
        await page.goto('/login');
        await page.click('a[href="/register"]');
        await expect(page).toHaveURL(/\/register/);
    });

    test('toggle de senha funciona', async ({ page }) => {
        await page.goto('/login');
        const pwInput = page.locator('#password');
        await expect(pwInput).toHaveAttribute('type', 'password');
        await page.click('#togglePassword');
        await expect(pwInput).toHaveAttribute('type', 'text');
        await page.click('#togglePassword');
        await expect(pwInput).toHaveAttribute('type', 'password');
    });

    test('submit com campos vazios não navega', async ({ page }) => {
        await page.goto('/login');
        await page.click('#loginSubmit');
        await expect(page).toHaveURL(/\/login/);
    });

    test('submit com credenciais inválidas mostra erro', async ({ page }) => {
        await page.goto('/login');
        await page.fill('#email', 'invalido@teste.com');
        await page.fill('#password', 'senhaerrada');
        await page.click('#loginSubmit');
        // Aguarda resposta (API ou mensagem de erro)
        await page.waitForTimeout(1500);
        // Permanece no login (não navega para dashboard)
        await expect(page).toHaveURL(/\/login/);
    });
});

test.describe('Register Page', () => {
    test('abre sem erro JS', async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('/register');
        await page.waitForLoadState('networkidle');
        expect(errors).toHaveLength(0);
    });

    test('renderiza seleção de perfil', async ({ page }) => {
        await page.goto('/register');
        await expect(page.locator('.auth-role-cards')).toBeVisible();
        await expect(page.locator('[data-role="estabelecimento"]')).toBeVisible();
        await expect(page.locator('[data-role="profissional"]')).toBeVisible();
    });

    test('link "Entrar" navega para /login', async ({ page }) => {
        await page.goto('/register');
        await page.click('a[href="/login"]');
        await expect(page).toHaveURL(/\/login/);
    });

    test('selecionar role mostra formulário', async ({ page }) => {
        await page.goto('/register');
        await page.click('[data-role="estabelecimento"]');
        await expect(page.locator('#registerForm')).toBeVisible();
    });
});

test.describe('Páginas Legais', () => {
    test('Termos de Serviço abre', async ({ page }) => {
        await page.goto('/terms-of-service');
        await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('Política de Privacidade abre', async ({ page }) => {
        await page.goto('/privacy-policy');
        await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('Exclusão de Dados abre', async ({ page }) => {
        await page.goto('/data-deletion');
        await expect(page.locator('h1, h2').first()).toBeVisible();
    });
});

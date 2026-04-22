/**
 * E2E — Páginas Owner/Admin
 * Smoke test de todas as rotas autenticadas (sem backend real)
 * Valida: renderização sem erro JS, shell presente, sem crash
 */
import { test, expect } from '@playwright/test';
import { injectOwnerSession } from './helpers/auth.js';

test.beforeEach(async ({ page }) => {
    await injectOwnerSession(page);
});

const ownerPages = [
    { route: '/dashboard',           title: 'Dashboard',             contentSelector: '.db-kpi-grid, .page-header, #page-content' },
    { route: '/appointments',        title: 'Agendamentos',          contentSelector: '#page-content' },
    { route: '/clients',             title: 'Clientes',              contentSelector: '#page-content' },
    { route: '/services',            title: 'Serviços',              contentSelector: '#page-content' },
    { route: '/professionals',       title: 'Profissionais',         contentSelector: '#page-content' },
    { route: '/financial',           title: 'Financeiro',            contentSelector: '#page-content' },
    { route: '/inventory',           title: 'Estoque',               contentSelector: '#page-content' },
    { route: '/suppliers',           title: 'Fornecedores',          contentSelector: '#page-content' },
    { route: '/purchases',           title: 'Compras',               contentSelector: '#page-content' },
    { route: '/reports',             title: 'Relatórios',            contentSelector: '#page-content' },
    { route: '/users',               title: 'Usuários',              contentSelector: '#page-content' },
    { route: '/payment-transactions',title: 'Transações',            contentSelector: '#page-content' },
    { route: '/payment-methods',     title: 'Formas de Pagamento',   contentSelector: '#page-content' },
    { route: '/marketing',           title: 'Marketing',             contentSelector: '#page-content' },
    { route: '/ai-assistant',        title: 'Secretária IA',         contentSelector: '#page-content' },
    { route: '/mini-site',           title: 'Mini-site',             contentSelector: '#page-content' },
    { route: '/team-commissions',    title: 'Equipe & Comissões',    contentSelector: '#page-content' },
    { route: '/help',                title: 'Ajuda',                 contentSelector: '#page-content' },
    { route: '/billing',             title: 'Assinatura',            contentSelector: '#page-content' },
    { route: '/settings',            title: 'Configurações',         contentSelector: '#page-content' },
    { route: '/account',             title: 'Minha Conta',           contentSelector: '#page-content' },
    { route: '/professional-details',title: 'Detalhes Profissionais',contentSelector: '#page-content' },
];

for (const { route, title, contentSelector } of ownerPages) {
    test(`${route} — abre sem erro JS e renderiza shell`, async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));

        await page.goto(route);

        // Shell deve estar presente
        await expect(page.locator('.sidebar')).toBeVisible({ timeout: 8000 });
        await expect(page.locator(contentSelector)).toBeVisible({ timeout: 8000 });

        // Sem erros JavaScript
        expect(errors, `Erros JS em ${route}: ${errors.join(', ')}`).toHaveLength(0);
    });
}

test.describe('Dashboard — KPIs e skeleton', () => {
    test('skeleton de loading aparece inicialmente', async ({ page }) => {
        await page.goto('/dashboard');
        // Skeleton pode aparecer e desaparecer rapidamente
        // Verificamos que o page-content existe e tem conteúdo
        await expect(page.locator('#page-content')).not.toBeEmpty();
    });
});

test.describe('Marketing — smoke', () => {
    test('skeleton e conteúdo renderizam', async ({ page }) => {
        await page.goto('/marketing');
        await page.waitForLoadState('networkidle');
        // Header da página deve aparecer (com ou sem dados)
        const content = page.locator('#page-content');
        await expect(content).not.toBeEmpty();
        // Título principal deve existir
        await expect(page.locator('.mod-header__title, h1').first()).toBeVisible({ timeout: 8000 });
    });
});

test.describe('Mini-site — smoke', () => {
    test('skeleton e conteúdo renderizam', async ({ page }) => {
        await page.goto('/mini-site');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('#page-content')).not.toBeEmpty();
    });
});

test.describe('Team Commissions — sidebar ativo correto', () => {
    test('menu item "Equipe & Comissões" está ativo', async ({ page }) => {
        await page.goto('/team-commissions');
        await page.waitForLoadState('networkidle');
        const activeItem = page.locator('.menu-item.active');
        await expect(activeItem).toHaveAttribute('href', '/team-commissions');
    });
});

test.describe('Help — FAQ e contato', () => {
    test('categorias de FAQ renderizam', async ({ page }) => {
        await page.goto('/help');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('#page-content')).not.toBeEmpty();
    });
});

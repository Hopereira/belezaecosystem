/**
 * App Shell - Dashboard layout wrapper
 * Renders sidebar + header + content area for authenticated pages
 */

import { getCurrentUser, isSubscriptionBlocked, getSubscriptionStatus } from '../../../core/state.js';
import { handleLogout } from '../../../core/auth.js';
import { navigateTo } from '../../../core/router.js';
import { openModal, closeModal } from '../modal/modal.js';
import { initSubscriptionBanner } from '../subscription-banner/subscription-banner.js';
import { SUBSCRIPTION_STATUS } from '../../../core/config.js';

/**
 * Render the full dashboard shell into #app
 * @param {string} activePage - Current page identifier for sidebar highlight
 * @param {string} contentHTML - Inner HTML for the main content area
 */
export function renderShell(activePage, contentHTML = '') {
    const user = getCurrentUser();
    const userName = user ? (user.first_name || user.firstName || user.name || 'Usuário') : 'Usuário';
    const avatar = user ? user.avatar || '' : '';
    const avatarInitial = userName.charAt(0).toUpperCase();
    const userRole = (user?.role || 'client').toLowerCase();

    const app = document.getElementById('app');
    if (!app) return;

    // Menu items with role-based visibility
    const menuItems = userRole === 'professional' ? [
        // Professional-specific menu
        { id: 'professional-dashboard', icon: 'fas fa-tachometer-alt', label: 'Meu Dashboard', path: '/professional/dashboard', roles: ['professional'] },
        { id: 'professional-appointments', icon: 'fas fa-calendar-check', label: 'Meus Agendamentos', path: '/professional/appointments', roles: ['professional'] },
        { id: 'professional-clients', icon: 'fas fa-user-friends', label: 'Meus Clientes', path: '/professional/clients', roles: ['professional'] },
        { id: 'professional-earnings', icon: 'fas fa-money-bill-wave', label: 'Meus Ganhos', path: '/professional/earnings', roles: ['professional'] },
        { id: 'professional-performance', icon: 'fas fa-chart-line', label: 'Minha Performance', path: '/professional/performance', roles: ['professional'] },
        { id: 'professional-availability', icon: 'fas fa-clock', label: 'Disponibilidade', path: '/professional/availability', roles: ['professional'] },
        { id: 'professional-profile', icon: 'fas fa-id-card', label: 'Meu Perfil', path: '/professional/profile', roles: ['professional'] },
    ] : [
        // Owner/Admin/Master menu
        { id: 'dashboard', icon: 'fas fa-home', label: 'Início', path: '/dashboard', roles: ['master', 'owner', 'admin', 'client'] },
        { id: 'clients', icon: 'fas fa-users', label: 'Clientes', path: '/clients', roles: ['master', 'owner', 'admin'] },
        { id: 'appointments', icon: 'fas fa-calendar-alt', label: 'Agendamentos', path: '/appointments', roles: ['master', 'owner', 'admin', 'client'] },
        { id: 'services', icon: 'fas fa-cut', label: 'Serviços', path: '/services', roles: ['master', 'owner', 'admin'] },
        { id: 'professionals', icon: 'fas fa-user-tie', label: 'Profissionais', path: '/professionals', roles: ['master', 'owner', 'admin'] },
        { id: 'financial', icon: 'fas fa-dollar-sign', label: 'Financeiro', path: '/financial', roles: ['master', 'owner', 'admin'] },
        { id: 'inventory', icon: 'fas fa-boxes', label: 'Estoque', path: '/inventory', roles: ['owner', 'admin'] },
        { id: 'suppliers', icon: 'fas fa-truck', label: 'Fornecedores', path: '/suppliers', roles: ['owner', 'admin'] },
        { id: 'purchases', icon: 'fas fa-shopping-cart', label: 'Compras', path: '/purchases', roles: ['owner', 'admin'] },
        { id: 'reports', icon: 'fas fa-chart-bar', label: 'Relatórios', path: '/reports', roles: ['owner', 'admin'] },
        { id: 'professional-details', icon: 'fas fa-id-badge', label: 'Detalhes Profissionais', path: '/professional-details', roles: ['owner', 'admin'] },
        { id: 'payment-transactions', icon: 'fas fa-exchange-alt', label: 'Transações', path: '/payment-transactions', roles: ['owner', 'admin'] },
        { id: 'payment-methods', icon: 'fas fa-wallet', label: 'Formas de Pagamento', path: '/payment-methods', roles: ['owner', 'admin'] },
        { id: 'users', icon: 'fas fa-user-shield', label: 'Usuários', path: '/users', roles: ['owner', 'admin'] },
        // Fase 5
        { id: 'team-commissions', icon: 'fas fa-medal', label: 'Equipe & Comissões', path: '/team-commissions', roles: ['owner', 'admin'] },
        { id: 'marketing', icon: 'fas fa-bullhorn', label: 'Marketing', path: '/marketing', roles: ['owner', 'admin'] },
        { id: 'ai-assistant', icon: 'fas fa-robot', label: 'Secretária IA', path: '/ai-assistant', roles: ['owner', 'admin'] },
        { id: 'mini-site', icon: 'fas fa-globe', label: 'Mini-site', path: '/mini-site', roles: ['owner', 'admin'] },
        { id: 'billing', icon: 'fas fa-credit-card', label: 'Assinatura', path: '/billing', roles: ['master', 'owner', 'admin'] },
        { id: 'settings', icon: 'fas fa-cog', label: 'Configurações', path: '/settings', roles: ['master', 'owner'] },
        { id: 'account', icon: 'fas fa-user-circle', label: 'Minha Conta', path: '/account', roles: ['master', 'owner', 'admin', 'client'] },
        { id: 'help', icon: 'fas fa-question-circle', label: 'Ajuda', path: '/help', roles: ['master', 'owner', 'admin', 'client'] },
        { id: 'master', icon: 'fas fa-crown', label: 'Master Admin', path: '/master', roles: ['master'] },
    ];

    // Filter menu items by role
    const visibleMenuItems = menuItems.filter(item => item.roles.includes(userRole));

    // Group menu items by section for visual hierarchy
    const sectionGroups = userRole === 'professional' ? [
        { label: null, ids: ['professional-dashboard', 'professional-appointments', 'professional-clients', 'professional-earnings', 'professional-performance'] },
        { label: 'Perfil', ids: ['professional-availability', 'professional-profile'] },
    ] : [
        { label: null, ids: ['dashboard'] },
        { label: 'Gestão', ids: ['appointments', 'clients', 'services', 'professionals'] },
        { label: 'Financeiro', ids: ['financial', 'reports', 'payment-transactions', 'payment-methods'] },
        { label: 'Estoque', ids: ['inventory', 'suppliers', 'purchases'] },
        { label: 'Crescimento', ids: ['team-commissions', 'marketing', 'ai-assistant', 'mini-site'] },
        { label: 'Conta', ids: ['billing', 'settings', 'account', 'users', 'professional-details'] },
        { label: 'Suporte', ids: ['help'] },
        { label: 'Master', ids: ['master'] },
    ];

    const menuItemMap = Object.fromEntries(visibleMenuItems.map(i => [i.id, i]));

    const sidebarMenuHTML = sectionGroups.map(({ label, ids }) => {
        const items = ids.map(id => menuItemMap[id]).filter(Boolean);
        if (!items.length) return '';
        const labelHTML = label ? `<div class="sidebar-section-label">${label}</div>` : '';
        const itemsHTML = items.map(item => `
            <a href="${item.path}" class="menu-item ${activePage === item.id ? 'active' : ''}" data-page="${item.id}">
                <i class="${item.icon}"></i>
                <span>${item.label}</span>
            </a>
        `).join('');
        return labelHTML + itemsHTML;
    }).join('');

    const avatarStyle = avatar
        ? `background-image: url('${avatar}'); background-size: cover; text-indent: -9999px;`
        : '';

    // Subscription blocked banner (inline for critical status)
    const subscription = getSubscriptionStatus();
    const isBlocked = isSubscriptionBlocked();
    const blockBannerHTML = isBlocked ? `
        <div class="subscription-block-banner">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Sua assinatura está ${subscription?.status === 'suspended' ? 'suspensa' : 'inativa'}. Funcionalidades de criação estão bloqueadas.</span>
            <a href="/billing" class="btn-sm btn-primary">Regularizar</a>
        </div>
    ` : '';

    const tenantName = user?.tenantName || user?.tenant_name || 'Meu Salão';
    const tenantInitial = tenantName.charAt(0).toUpperCase();
    const subscriptionLabel = (() => {
        const status = subscription?.status;
        if (status === 'active') return 'Plano Ativo';
        if (status === 'trial') return 'Período de Teste';
        if (status === 'suspended') return 'Suspenso';
        return 'Assinatura';
    })();

    app.innerHTML = `
        <div class="dashboard-container">
            <!-- Mobile Sidebar Overlay -->
            <div class="sidebar-overlay" id="sidebarOverlay"></div>

            <!-- Sidebar Clara -->
            <aside class="sidebar" id="sidebar" role="navigation" aria-label="Menu principal">
                <div class="sidebar-header">
                    <div class="logo-icon" aria-hidden="true"><span>Be</span></div>
                    <div class="logo-text">
                        Beleza Ecosystem
                        <small>Gestão que liberta.</small>
                    </div>
                </div>

                <nav class="sidebar-menu">
                    ${sidebarMenuHTML}
                </nav>

                <div class="sidebar-footer">
                    <div class="tenant-info">
                        <div class="tenant-avatar" aria-hidden="true">${tenantInitial}</div>
                        <div>
                            <div class="tenant-name">${tenantName}</div>
                            <div class="tenant-plan">${subscriptionLabel}</div>
                        </div>
                    </div>
                    <a href="#" class="logout-link" id="btn-logout" aria-label="Sair da conta">
                        <i class="fas fa-sign-out-alt" aria-hidden="true"></i>
                        <span>Sair</span>
                    </a>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="main-content">
                <header class="top-bar" role="banner">
                    <div class="top-bar__left">
                        <button class="mobile-menu-toggle" id="mobileMenuBtn" aria-label="Abrir menu" aria-expanded="false">
                            <i class="fas fa-bars" aria-hidden="true"></i>
                        </button>
                        <div class="greeting">
                            Olá, <span class="user-name">${userName}</span>
                        </div>
                    </div>
                    <div class="top-bar__right">
                        <button class="top-bar__icon-btn" title="Notificações" aria-label="Notificações">
                            <i class="fas fa-bell" aria-hidden="true"></i>
                        </button>
                        <div class="user-profile" id="userProfileBtn" aria-haspopup="true">
                            <div class="avatar" style="${avatarStyle}" aria-label="Perfil de ${userName}">${avatarInitial}</div>
                            <div class="profile-dropdown" id="profileDropdown" role="menu">
                                <a href="/account" role="menuitem"><i class="far fa-user" aria-hidden="true"></i> Minha conta</a>
                                <a href="/billing" role="menuitem"><i class="fas fa-credit-card" aria-hidden="true"></i> Assinatura</a>
                                <a href="#" id="dropdown-logout" role="menuitem"><i class="fas fa-sign-out-alt" aria-hidden="true"></i> Sair</a>
                            </div>
                        </div>
                    </div>
                </header>

                ${blockBannerHTML}

                <div class="content-wrapper" id="page-content">
                    ${contentHTML}
                </div>
            </main>
        </div>
    `;

    // Bind shell events
    bindShellEvents();
    
    // Initialize subscription banner
    initSubscriptionBanner();
}

/**
 * Get the page content container
 */
export function getContentArea() {
    return document.getElementById('page-content');
}

/**
 * Set inner HTML of the content area only (keeps shell intact)
 */
export function setContent(html) {
    const area = getContentArea();
    if (area) area.innerHTML = html;
}

// ============================================
// SHELL EVENT BINDINGS
// ============================================

function bindShellEvents() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    const bindClickAndTouch = (el, handler) => {
        ['click', 'touchstart'].forEach(evt => {
            el?.addEventListener(evt, (e) => {
                e.preventDefault();
                handler();
            }, { passive: false });
        });
    };

    const toggleMobileMenu = () => {
        const isOpen = sidebar?.classList.toggle('open');
        overlay?.classList.toggle('show');
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', String(!!isOpen));
    };

    const closeMobileMenu = () => {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('show');
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
    };

    bindClickAndTouch(mobileMenuBtn, toggleMobileMenu);
    bindClickAndTouch(overlay, closeMobileMenu);

    // Close mobile menu on navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        bindClickAndTouch(item, closeMobileMenu);
    });

    // Profile dropdown toggle
    const profileBtn = document.getElementById('userProfileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('profileDropdown');
            if (dropdown) dropdown.classList.toggle('show');
        });
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#userProfileBtn')) {
            const dropdown = document.getElementById('profileDropdown');
            if (dropdown) dropdown.classList.remove('show');
        }
    });

    // Logout buttons
    const logoutBtn = document.getElementById('btn-logout');
    const dropdownLogout = document.getElementById('dropdown-logout');

    const doLogout = async (e) => {
        e.preventDefault();
        await handleLogout();
        navigateTo('/login');
    };

    if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
    if (dropdownLogout) dropdownLogout.addEventListener('click', doLogout);

    // Make modal functions available globally for inline onclick handlers
    window.openModal = openModal;
    window.closeModal = closeModal;
}

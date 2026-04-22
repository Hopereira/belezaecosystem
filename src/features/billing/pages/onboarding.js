/**
 * Onboarding / Billing — Beleza Ecosystem — Fase 4
 * Pricing cards premium, toggle mensal/anual, trust bar, feedback visual
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { formatCurrency } from '../../../shared/utils/validation.js';
import { navigateTo } from '../../../core/router.js';

let plans = [];
let selectedPlan = null;
let billingInterval = 'monthly';

const PLAN_ICONS = {
    essencial: 'fas fa-seedling',
    starter:   'fas fa-seedling',
    profissional: 'fas fa-star',
    professional: 'fas fa-star',
    premium:   'fas fa-crown',
    business:  'fas fa-crown',
};

export function render() {
    renderShell('billing');
}

export async function init() {
    await loadPlans();
    renderContent();

    return () => {
        plans = [];
        selectedPlan = null;
        billingInterval = 'monthly';
    };
}

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

async function loadPlans() {
    const content = getContentArea();
    if (!content) return;
    content.innerHTML = `
        <div class="ob-feedback">
            <div class="ob-feedback__icon ob-feedback__icon--loading">
                <i class="fas fa-circle-notch fa-spin"></i>
            </div>
            <p class="ob-feedback__desc">Carregando planos disponíveis...</p>
        </div>
    `;

    try {
        const response = await api.get('/billing/plans');
        plans = response.data || [];
    } catch (err) {
        console.error('[Onboarding] loadPlans:', err);
        plans = [];
    }
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

function renderContent() {
    const content = getContentArea();
    if (!content) return;

    content.innerHTML = `
        <div class="onboarding-container">

            <!-- Header -->
            <div class="onboarding-header">
                <h1>Escolha o plano ideal para o seu salão.</h1>
                <p>Comece com 14 dias grátis. Sem cartão de crédito. Cancele quando quiser.</p>
            </div>

            <!-- Trust Bar -->
            <div class="ob-trust-bar">
                <div class="ob-trust-item"><i class="fas fa-check-circle"></i> 14 dias gratuitos</div>
                <div class="ob-trust-item"><i class="fas fa-check-circle"></i> Sem cartão de crédito</div>
                <div class="ob-trust-item"><i class="fas fa-check-circle"></i> Cancele quando quiser</div>
                <div class="ob-trust-item"><i class="fas fa-check-circle"></i> Suporte incluído</div>
                <div class="ob-trust-item"><i class="fas fa-check-circle"></i> Dados protegidos por SSL</div>
            </div>

            <!-- Billing Toggle -->
            <div class="ob-billing-toggle">
                <span class="ob-billing-toggle__label active" id="labelMonthly">Mensal</span>
                <div class="ob-billing-toggle__tabs">
                    <button class="ob-billing-tab active" data-interval="monthly" id="tabMonthly">Mensal</button>
                    <button class="ob-billing-tab" data-interval="yearly" id="tabYearly">
                        Anual <span class="ob-savings-badge">−15%</span>
                    </button>
                </div>
                <span class="ob-billing-toggle__label" id="labelYearly">Anual</span>
            </div>

            <!-- Plans Grid -->
            <div class="plans-grid" id="plansGrid">
                ${renderPlans()}
            </div>

            <!-- Included Features -->
            <div class="onboarding-features">
                <h3>Todos os planos incluem</h3>
                <div class="features-grid">
                    <div class="feature-item"><i class="fas fa-calendar-check"></i><span>Agendamento online</span></div>
                    <div class="feature-item"><i class="fas fa-users"></i><span>Gestão de clientes</span></div>
                    <div class="feature-item"><i class="fas fa-chart-line"></i><span>Relatórios financeiros</span></div>
                    <div class="feature-item"><i class="fas fa-bell"></i><span>Confirmações automáticas</span></div>
                    <div class="feature-item"><i class="fas fa-headset"></i><span>Suporte por chat</span></div>
                    <div class="feature-item"><i class="fas fa-lock"></i><span>Dados protegidos</span></div>
                </div>
            </div>

        </div>
    `;

    bindEvents();
}

function renderPlans() {
    if (!plans.length) {
        return '<div style="text-align:center;padding:2rem;font-family:var(--font-ui);color:var(--sidebar-text-muted);">Nenhum plano disponível no momento.</div>';
    }

    return plans.map(plan => renderPlanCard(plan)).join('');
}

function renderPlanCard(plan) {
    const limits   = plan.limits || {};
    const features = plan.features || [];
    const trialDays = plan.trial_days || 14;

    const slug = (plan.slug || plan.name || '').toLowerCase();
    const isPopular = plan.metadata?.popular || slug.includes('profissional') || slug.includes('professional');

    const price  = getPlanPrice(plan);
    const iconCls = PLAN_ICONS[slug] || 'fas fa-gem';

    const featureItems = buildFeatureList(limits, features);

    return `
        <div class="plan-card ${isPopular ? 'plan-card--popular' : ''}" data-plan-id="${plan.id}">
            ${isPopular ? '<div class="plan-badge">Mais popular</div>' : ''}

            <div class="plan-header">
                <div class="plan-icon"><i class="${iconCls}"></i></div>
                <h3 class="plan-name">${plan.name}</h3>
                <div class="plan-price">
                    <span class="price-currency">R$</span>
                    <span class="price-amount" data-monthly="${getPlanMonthlyPrice(plan)}" data-yearly="${getPlanYearlyPrice(plan)}">
                        ${price}
                    </span>
                    <span class="price-period">/mês</span>
                </div>
                ${plan.description ? `<p class="plan-description">${plan.description}</p>` : ''}
                <span class="plan-trial"><i class="fas fa-gift"></i> ${trialDays} dias grátis</span>
            </div>

            <div class="plan-body">
                <h4>O que está incluído</h4>
                <ul class="plan-features">
                    ${featureItems}
                </ul>
            </div>

            <div class="plan-footer">
                <button class="btn-primary btn-select-plan" data-plan-id="${plan.id}">
                    Começar com ${plan.name}
                </button>
                <div class="plan-safety">
                    <i class="fas fa-lock"></i> Seguro · Sem comprometimento
                </div>
            </div>
        </div>
    `;
}

function buildFeatureList(limits, features) {
    const items = [];

    if (limits.professionals) items.push(`Até ${limits.professionals} profissional${limits.professionals > 1 ? 'is' : ''}`);
    if (limits.clients)       items.push(`Até ${limits.clients} clientes`);
    if (limits.appointments_per_month) {
        items.push(limits.appointments_per_month > 5000
            ? 'Agendamentos ilimitados'
            : `${limits.appointments_per_month} agendamentos/mês`);
    } else if (limits.appointments) {
        items.push(`${limits.appointments} agendamentos/mês`);
    }
    if (limits.users)         items.push(`Até ${limits.users} usuários`);

    features.forEach(f => items.push(f));

    return items.map(item => `<li><i class="fas fa-check"></i> ${item}</li>`).join('');
}

function getPlanMonthlyPrice(plan) {
    return parseFloat(plan.pricing?.monthly ?? plan.price ?? 0).toFixed(0);
}

function getPlanYearlyPrice(plan) {
    if (plan.pricing?.yearly) {
        return (parseFloat(plan.pricing.yearly) / 12).toFixed(0);
    }
    return Math.round(parseFloat(plan.pricing?.monthly ?? plan.price ?? 0) * 0.85).toFixed(0);
}

function getPlanPrice(plan) {
    return billingInterval === 'yearly' ? getPlanYearlyPrice(plan) : getPlanMonthlyPrice(plan);
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────

function bindEvents() {
    document.querySelectorAll('.ob-billing-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            billingInterval = tab.dataset.interval;
            document.querySelectorAll('.ob-billing-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            document.getElementById('labelMonthly')?.classList.toggle('active', billingInterval === 'monthly');
            document.getElementById('labelYearly')?.classList.toggle('active', billingInterval === 'yearly');

            document.querySelectorAll('.price-amount[data-monthly]').forEach(el => {
                el.textContent = billingInterval === 'yearly'
                    ? el.dataset.yearly
                    : el.dataset.monthly;
            });
        });
    });

    document.querySelectorAll('.btn-select-plan').forEach(btn => {
        btn.addEventListener('click', e => selectPlan(btn.dataset.planId, e));
    });
}

// ─────────────────────────────────────────────
// SUBSCRIBE
// ─────────────────────────────────────────────

async function selectPlan(planId, event) {
    selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) return;

    const btn = event?.target?.closest('button');
    if (!btn) return;

    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processando...';

    try {
        await api.post('/billing/subscriptions', { plan_id: planId });

        const content = getContentArea();
        if (content) {
            content.innerHTML = `
                <div class="onboarding-container">
                    <div class="ob-feedback">
                        <div class="ob-feedback__icon ob-feedback__icon--success">
                            <i class="fas fa-check"></i>
                        </div>
                        <h2 class="ob-feedback__title">Assinatura ativada!</h2>
                        <p class="ob-feedback__desc">
                            Seu período de teste de <strong>${selectedPlan.trial_days || 14} dias</strong> começou agora.
                            Você tem acesso completo ao plano <strong>${selectedPlan.name}</strong>.
                        </p>
                        <button class="btn-primary" id="btnGoToDashboard">
                            <i class="fas fa-arrow-right"></i> Ir para o dashboard
                        </button>
                    </div>
                </div>
            `;
            document.getElementById('btnGoToDashboard')?.addEventListener('click', () => navigateTo('/dashboard'));
        }

        showToast(`Plano ${selectedPlan.name} ativado! Boas-vindas ao Beleza Ecosystem.`, 'success');
        setTimeout(() => navigateTo('/dashboard'), 4000);
    } catch (err) {
        console.error('[Onboarding] selectPlan:', err);
        showToast(err.message || 'Erro ao criar assinatura. Tente novamente.', 'error');
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

/**
 * Landing Page — Beleza Ecosystem
 * Página pública de conversão com identidade visual fiel ao Manual de Marca (Canva)
 * Referência: docs/brand-system.md + docs/product-language.md
 */

import { api } from '../../../shared/utils/http.js';
import { formatCurrency } from '../../../shared/utils/validation.js';
import { showToast } from '../../../shared/utils/toast.js';
import { API_BASE_URL, setTenantSlug } from '../../../core/config.js';
import { navigateTo } from '../../../core/router.js';

let plans = [];
let selectedPlan = null;

// Planos estáticos como fallback — nomenclatura oficial da marca (product-language.md)
const STATIC_PLANS = [
    {
        id: 'starter',
        slug: 'starter',
        name: 'Essencial',
        description: 'Para o profissional autônomo que quer começar com o pé direito.',
        pricing: { monthly: 49.90, yearly: 538.80 },
        currency: 'BRL',
        billing_interval: 'monthly',
        trial_days: 14,
        features: [
            'Agendamento online',
            'Gestão de clientes',
            'Confirmações automáticas',
            'Até 50 clientes',
            '100 agendamentos/mês',
        ],
        limits: { users: 2, professionals: 1, clients: 50, appointments_per_month: 100 },
        metadata: {},
    },
    {
        id: 'professional',
        slug: 'professional',
        name: 'Profissional',
        description: 'Para salões em crescimento que precisam de controle completo.',
        pricing: { monthly: 99.90, yearly: 1078.80 },
        currency: 'BRL',
        billing_interval: 'monthly',
        trial_days: 14,
        features: [
            'Tudo do Essencial +',
            'Controle financeiro',
            'Gestão de equipe',
            'Comissões automáticas',
            'Até 200 clientes',
            '500 agendamentos/mês',
        ],
        limits: { users: 5, professionals: 3, clients: 200, appointments_per_month: 500 },
        metadata: { popular: true },
    },
    {
        id: 'business',
        slug: 'business',
        name: 'Premium',
        description: 'Solução completa para salões e clínicas com múltiplos profissionais.',
        pricing: { monthly: 199.90, yearly: 2158.80 },
        currency: 'BRL',
        billing_interval: 'monthly',
        trial_days: 14,
        features: [
            'Tudo do Profissional +',
            'Secretária IA 24h',
            'Marketing automatizado',
            'Mini-site do salão',
            'Até 1.000 clientes',
            'Agendamentos ilimitados',
        ],
        limits: { users: 15, professionals: 10, clients: 1000, appointments_per_month: 2000 },
        metadata: {},
    },
];

export function render() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
        <div class="landing-page">

            <!-- ── Navbar ── -->
            <nav class="lp-nav" id="lp-nav">
                <div class="lp-nav__inner">
                    <a class="lp-nav__brand" href="/" aria-label="Beleza Ecosystem — página inicial">
                        <span class="lp-nav__logo-mark">Be</span>
                        <span class="lp-nav__logo-text">Beleza Ecosystem</span>
                    </a>
                    <div class="lp-nav__links">
                        <a href="#funcionalidades">Funcionalidades</a>
                        <a href="#planos">Planos</a>
                        <a href="#manifesto">Sobre</a>
                    </div>
                    <div class="lp-nav__actions">
                        <a href="/login" class="lp-nav__link-login" onclick="event.preventDefault(); window.navigateToLogin()">
                            Entrar
                        </a>
                        <button class="lp-btn lp-btn--cta" id="btnHeroRegister">
                            Começar Gratuitamente
                        </button>
                    </div>
                    <button class="lp-nav__hamburger" id="lp-hamburger" aria-label="Menu">
                        <span></span><span></span><span></span>
                    </button>
                </div>
            </nav>

            <!-- ── Hero ── -->
            <section class="lp-hero">
                <div class="lp-hero__inner">
                    <div class="lp-hero__eyebrow">
                        <span class="lp-badge">Plataforma SaaS B2B · Beleza &amp; Estética</span>
                    </div>
                    <h1 class="lp-hero__title">
                        Gestão que liberta.
                    </h1>
                    <p class="lp-hero__subtitle">
                        O sistema nervoso digital do seu negócio de beleza.
                    </p>
                    <p class="lp-hero__body">
                        Simplifique a gestão do seu salão com uma plataforma completa que une agendamento online,
                        controle financeiro, marketing automatizado e muito mais em um único lugar.
                    </p>
                    <div class="lp-hero__cta">
                        <button class="lp-btn lp-btn--hero" id="btnHeroPrimary">
                            Começar Gratuitamente
                        </button>
                        <a href="#planos" class="lp-btn lp-btn--ghost">
                            Ver planos e preços
                        </a>
                    </div>
                    <p class="lp-hero__note">
                        14 dias grátis · Sem cartão de crédito · Cancele quando quiser
                    </p>
                </div>
                <div class="lp-hero__visual" aria-hidden="true">
                    <div class="lp-hero__dashboard-preview">
                        <div class="lp-preview__topbar">
                            <span class="lp-preview__dot"></span>
                            <span class="lp-preview__dot"></span>
                            <span class="lp-preview__dot"></span>
                            <span class="lp-preview__label">Beleza Ecosystem — Visão Geral</span>
                        </div>
                        <div class="lp-preview__stats">
                            <div class="lp-preview__stat">
                                <span class="lp-preview__stat-label">AGENDAMENTOS DO MÊS</span>
                                <span class="lp-preview__stat-value">247</span>
                                <span class="lp-preview__stat-delta lp-preview__stat-delta--up">+18%</span>
                            </div>
                            <div class="lp-preview__stat">
                                <span class="lp-preview__stat-label">FATURAMENTO</span>
                                <span class="lp-preview__stat-value">R$ 12.840</span>
                                <span class="lp-preview__stat-delta lp-preview__stat-delta--up">+24%</span>
                            </div>
                            <div class="lp-preview__stat">
                                <span class="lp-preview__stat-label">CLIENTES ATIVOS</span>
                                <span class="lp-preview__stat-value">183</span>
                                <span class="lp-preview__stat-delta lp-preview__stat-delta--up">+7</span>
                            </div>
                        </div>
                        <div class="lp-preview__bar-chart" aria-hidden="true">
                            <div class="lp-preview__bar" style="height:45%"></div>
                            <div class="lp-preview__bar" style="height:62%"></div>
                            <div class="lp-preview__bar" style="height:78%"></div>
                            <div class="lp-preview__bar" style="height:55%"></div>
                            <div class="lp-preview__bar" style="height:90%"></div>
                            <div class="lp-preview__bar" style="height:72%"></div>
                            <div class="lp-preview__bar lp-preview__bar--active" style="height:100%"></div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ── Social Proof ── -->
            <section class="lp-proof">
                <div class="lp-proof__inner">
                    <p class="lp-proof__label">Atualizado em abril de 2026 · Versão 2.1 da plataforma · Dados do painel em tempo real</p>
                    <div class="lp-proof__numbers">
                        <div class="lp-proof__item">
                            <strong>+2.400</strong>
                            <span>salões cadastrados</span>
                        </div>
                        <div class="lp-proof__sep" aria-hidden="true"></div>
                        <div class="lp-proof__item">
                            <strong>+180 mil</strong>
                            <span>agendamentos/mês</span>
                        </div>
                        <div class="lp-proof__sep" aria-hidden="true"></div>
                        <div class="lp-proof__item">
                            <strong>98%</strong>
                            <span>de satisfação</span>
                        </div>
                        <div class="lp-proof__sep" aria-hidden="true"></div>
                        <div class="lp-proof__item">
                            <strong>14 dias</strong>
                            <span>grátis para testar</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ── Features ── -->
            <section id="funcionalidades" class="lp-features">
                <div class="lp-features__inner">
                    <div class="lp-section-header">
                        <span class="lp-section-eyebrow">Funcionalidades</span>
                        <h2 class="lp-section-title">Tudo que o seu negócio precisa,<br>em um só lugar.</h2>
                        <p class="lp-section-body">Uma plataforma que une agendamento inteligente, secretária com IA, gestão financeira, marketing automatizado e controle de estoque.</p>
                    </div>
                    <div class="lp-features__grid">
                        ${renderFeatures()}
                    </div>
                </div>
            </section>

            <!-- ── Manifesto ── -->
            <section id="manifesto" class="lp-manifesto">
                <div class="lp-manifesto__inner">
                    <p class="lp-manifesto__pre">Sobre o Beleza Ecosystem</p>
                    <blockquote class="lp-manifesto__quote">
                        <strong>Beleza não é apenas o que se vê.</strong><br>
                        É o que se constrói — com trabalho, com método, com intenção.
                    </blockquote>
                    <p class="lp-manifesto__body">
                        Cada salão que abre suas portas carrega uma história, um propósito, um sonho.
                        Cada profissional que escolhe a beleza como ofício escolhe também transformar vidas.
                    </p>
                    <p class="lp-manifesto__body">
                        O Beleza Ecosystem nasceu para ser o sistema nervoso digital dos negócios de beleza,
                        conectando agendamento, finanças, marketing e gestão em um único ecossistema inteligente e integrado.
                    </p>
                    <p class="lp-manifesto__signature">
                        <strong>Tecnologia com alma. Sofisticação acessível. Gestão que liberta.</strong>
                    </p>
                    <p class="lp-manifesto__call">
                        Seja parte. Seja crescimento. Seja Beleza.
                    </p>
                </div>
            </section>

            <!-- ── Pricing ── -->
            <section id="planos" class="lp-pricing">
                <div class="lp-pricing__inner">
                    <div class="lp-section-header lp-section-header--dark">
                        <span class="lp-section-eyebrow lp-section-eyebrow--light">Planos</span>
                        <h2 class="lp-section-title lp-section-title--light">Sofisticação acessível.</h2>
                        <p class="lp-section-body lp-section-body--muted">Escolha o plano ideal para o seu momento. Comece grátis por 14 dias, sem cartão de crédito.</p>
                    </div>
                    <div id="plansContainer" class="lp-plans__grid">
                        <div class="lp-loading">
                            <i class="fas fa-circle-notch fa-spin"></i>
                            <span>Carregando planos...</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ── CTA Final ── -->
            <section class="lp-cta-final">
                <div class="lp-cta-final__inner">
                    <h2 class="lp-cta-final__title">Quando o negócio flui, a arte floresce.</h2>
                    <p class="lp-cta-final__body">Comece seu período gratuito de 14 dias. Sem cartão de crédito.</p>
                    <button class="lp-btn lp-btn--hero" id="btnStartNow">
                        Começar Gratuitamente
                    </button>
                    <p class="lp-cta-final__note">Já tem conta? <a href="/login" onclick="event.preventDefault(); window.navigateToLogin()">Entrar</a></p>
                </div>
            </section>

            <!-- ── Footer ── -->
            <footer class="lp-footer">
                <div class="lp-footer__inner">
                    <div class="lp-footer__brand">
                        <span class="lp-nav__logo-mark">Be</span>
                        <span class="lp-footer__name">Beleza Ecosystem</span>
                    </div>
                    <div class="lp-footer__links">
                        <a href="/terms-of-service">Termos de Uso</a>
                        <a href="/privacy-policy">Privacidade</a>
                        <a href="/data-deletion">Exclusão de Dados</a>
                    </div>
                    <p class="lp-footer__copy">© 2026 Beleza Ecosystem — Todos os direitos reservados</p>
                </div>
            </footer>

            <!-- ── Modal de Cadastro ── -->
            <div class="lp-modal-overlay" id="modal-register" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="modal-register-title">
                <div class="lp-modal">
                    <div class="lp-modal__header">
                        <h3 id="modal-register-title">Criar minha conta</h3>
                        <button class="lp-modal__close" onclick="closeRegistrationModal()" aria-label="Fechar">&times;</button>
                    </div>
                    <form id="registrationForm" novalidate>
                        <div class="lp-modal__body">
                            ${renderRegistrationForm()}
                        </div>
                        <div class="lp-modal__footer">
                            <button type="button" class="lp-btn lp-btn--outline" onclick="closeRegistrationModal()">Cancelar</button>
                            <button type="submit" class="lp-btn lp-btn--primary">Criar conta e começar</button>
                        </div>
                    </form>
                </div>
            </div>

        </div>
    `;
}

export async function init() {
    await loadPlans();
    renderPlansSection();
    bindEvents();
    
    return () => {
        plans = [];
        selectedPlan = null;
    };
}

async function loadPlans() {
    try {
        // Buscar planos públicos (sem autenticação)
        const res = await fetch(`${API_BASE_URL}/public/plans`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        plans = data.data || [];
    } catch (error) {
        console.warn('[Landing] API plans failed, using static fallback:', error.message);
        plans = STATIC_PLANS;
    }
}

function renderFeatures() {
    const features = [
        {
            icon: 'fa-calendar-days',
            title: 'Agendamento Inteligente',
            description: 'Secretária IA disponível 24 horas para confirmar, reagendar e lembrar seus clientes automaticamente.'
        },
        {
            icon: 'fa-users',
            title: 'Gestão de Clientes',
            description: 'Cadastro completo, histórico de atendimentos e preferências para um atendimento verdadeiramente personalizado.'
        },
        {
            icon: 'fa-banknotes',
            title: 'Controle Financeiro',
            description: 'Receitas, despesas, comissões e relatórios em tempo real para você tomar decisões com segurança.'
        },
        {
            icon: 'fa-chart-bar',
            title: 'Relatórios e Insights',
            description: 'Dashboards com métricas do seu negócio. Entenda o que funciona e potencialize seus resultados.'
        },
        {
            icon: 'fa-user-group',
            title: 'Gestão de Equipe',
            description: 'Profissionais, comissões e desempenho em um único painel. Sua equipe organizada e motivada.'
        },
        {
            icon: 'fa-archive',
            title: 'Controle de Estoque',
            description: 'Nunca fique sem produto. Alertas automáticos, fornecedores e histórico de compras integrados.'
        },
        {
            icon: 'fa-bullhorn',
            title: 'Marketing Automatizado',
            description: 'Campanhas de retenção, aniversários e promoções sem esforço. Seus clientes sempre voltando.'
        },
        {
            icon: 'fa-globe',
            title: 'Meu Salão Online',
            description: 'Mini-site profissional com agendamento direto pelo link. Presença online sem custo adicional.'
        }
    ];

    return features.map(f => `
        <div class="lp-feature-card">
            <div class="lp-feature-card__icon">
                <i class="fas ${f.icon}"></i>
            </div>
            <h3 class="lp-feature-card__title">${f.title}</h3>
            <p class="lp-feature-card__desc">${f.description}</p>
        </div>
    `).join('');
}

function renderPlansSection() {
    const container = document.getElementById('plansContainer');
    if (!container) return;

    if (plans.length === 0) {
        container.innerHTML = `
            <div class="lp-plans__empty">
                <i class="fas fa-circle-exclamation"></i>
                <p>Não foi possível carregar os planos. Tente novamente em instantes.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = plans.map(plan => {
        const price = plan.pricing?.monthly || 0;
        const features = plan.features || [];
        const isPopular = plan.metadata?.popular || false;

        return `
            <div class="lp-plan-card ${isPopular ? 'lp-plan-card--popular' : ''}">
                ${isPopular ? '<div class="lp-plan-card__badge">Mais escolhido</div>' : ''}
                <div class="lp-plan-card__header">
                    <h3 class="lp-plan-card__name">${plan.name}</h3>
                    <p class="lp-plan-card__desc">${plan.description || ''}</p>
                    <div class="lp-plan-card__price">
                        <span class="lp-plan-card__currency">R$</span>
                        <span class="lp-plan-card__amount">${price.toFixed(2).replace('.', ',')}</span>
                        <span class="lp-plan-card__period">/mês</span>
                    </div>
                    ${plan.trial_days > 0 ? `<p class="lp-plan-card__trial">${plan.trial_days} dias grátis para começar</p>` : ''}
                </div>
                <ul class="lp-plan-card__features">
                    ${features.map(f => `
                        <li class="lp-plan-card__feature">
                            <i class="fas fa-check lp-plan-card__check"></i>
                            <span>${f}</span>
                        </li>
                    `).join('')}
                </ul>
                <button class="lp-plan-card__cta ${isPopular ? 'lp-btn--primary' : 'lp-btn--outline-dark'}" data-plan-id="${plan.id}">
                    Assinar agora
                </button>
            </div>
        `;
    }).join('');

    document.querySelectorAll('[data-plan-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const planId = e.currentTarget.dataset.planId;
            selectedPlan = plans.find(p => p.id === planId);
            openRegistrationModal();
        });
    });
}

function renderRegistrationForm() {
    return `
        <div class="registration-steps">
            <!-- Step 1: Tipo de Cadastro -->
            <div class="form-section">
                <h4>Tipo de Cadastro</h4>
                <div class="radio-group">
                    <label class="radio-card">
                        <input type="radio" name="accountType" value="establishment" checked>
                        <div class="radio-content">
                            <i class="fas fa-store"></i>
                            <div>
                                <strong>Estabelecimento</strong>
                                <p>Salão, clínica ou spa</p>
                            </div>
                        </div>
                    </label>
                    <label class="radio-card">
                        <input type="radio" name="accountType" value="professional">
                        <div class="radio-content">
                            <i class="fas fa-user-tie"></i>
                            <div>
                                <strong>Profissional Autônomo</strong>
                                <p>Trabalho individual</p>
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            <!-- Step 2: Dados do Negócio -->
            <div class="form-section" id="establishmentFields">
                <h4>Dados do Estabelecimento</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Nome do Estabelecimento *</label>
                        <input type="text" id="businessName" placeholder="Salão Beleza Pura">
                    </div>
                    <div class="form-group">
                        <label>CNPJ</label>
                        <input type="text" id="cnpj" placeholder="00.000.000/0000-00">
                    </div>
                    <div class="form-group">
                        <label>Telefone *</label>
                        <input type="tel" id="businessPhone" placeholder="(11) 99999-9999">
                    </div>
                    <div class="form-group">
                        <label>Email do Negócio *</label>
                        <input type="email" id="businessEmail" placeholder="contato@salaobelezapura.com.br">
                    </div>
                </div>
            </div>

            <!-- Step 3: Endereço -->
            <div class="form-section">
                <h4>Endereço</h4>
                <div class="form-grid">
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>CEP *</label>
                        <div style="position:relative;">
                            <input type="text" id="cep" required placeholder="00000-000"
                                maxlength="9"
                                style="padding-right:40px;">
                            <span id="cepStatus" style="
                                position:absolute;right:12px;top:50%;transform:translateY(-50%);
                                font-size:0.85rem;display:none;
                            "></span>
                        </div>
                        <small id="cepMsg" style="font-size:0.78rem;margin-top:4px;display:none;"></small>
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Rua *</label>
                        <input type="text" id="street" required placeholder="Rua das Flores">
                    </div>
                    <div class="form-group">
                        <label>Número *</label>
                        <input type="text" id="number" required placeholder="123">
                    </div>
                    <div class="form-group">
                        <label>Complemento</label>
                        <input type="text" id="complement" placeholder="Sala 1">
                    </div>
                    <div class="form-group">
                        <label>Bairro *</label>
                        <input type="text" id="neighborhood" required placeholder="Centro">
                    </div>
                    <div class="form-group">
                        <label>Cidade *</label>
                        <input type="text" id="city" required placeholder="São Paulo">
                    </div>
                    <div class="form-group">
                        <label>Estado *</label>
                        <select id="state" required>
                            <option value="">Selecione</option>
                            <option value="AC">AC – Acre</option>
                            <option value="AL">AL – Alagoas</option>
                            <option value="AP">AP – Amapá</option>
                            <option value="AM">AM – Amazonas</option>
                            <option value="BA">BA – Bahia</option>
                            <option value="CE">CE – Ceará</option>
                            <option value="DF">DF – Distrito Federal</option>
                            <option value="ES">ES – Espírito Santo</option>
                            <option value="GO">GO – Goiás</option>
                            <option value="MA">MA – Maranhão</option>
                            <option value="MT">MT – Mato Grosso</option>
                            <option value="MS">MS – Mato Grosso do Sul</option>
                            <option value="MG">MG – Minas Gerais</option>
                            <option value="PA">PA – Pará</option>
                            <option value="PB">PB – Paraíba</option>
                            <option value="PR">PR – Paraná</option>
                            <option value="PE">PE – Pernambuco</option>
                            <option value="PI">PI – Piauí</option>
                            <option value="RJ">RJ – Rio de Janeiro</option>
                            <option value="RN">RN – Rio Grande do Norte</option>
                            <option value="RS">RS – Rio Grande do Sul</option>
                            <option value="RO">RO – Rondônia</option>
                            <option value="RR">RR – Roraima</option>
                            <option value="SC">SC – Santa Catarina</option>
                            <option value="SP">SP – São Paulo</option>
                            <option value="SE">SE – Sergipe</option>
                            <option value="TO">TO – Tocantins</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Step 4: Dados do Responsável -->
            <div class="form-section">
                <h4>Dados do Responsável</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Nome Completo *</label>
                        <input type="text" id="ownerName" required placeholder="João Silva">
                    </div>
                    <div class="form-group">
                        <label>CPF *</label>
                        <input type="text" id="cpf" required placeholder="000.000.000-00">
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" id="ownerEmail" required placeholder="joao@email.com">
                    </div>
                    <div class="form-group">
                        <label>Telefone *</label>
                        <input type="tel" id="ownerPhone" required placeholder="(11) 99999-9999">
                    </div>
                    <div class="form-group">
                        <label>Senha *</label>
                        <input type="password" id="password" required placeholder="Mínimo 6 caracteres">
                    </div>
                    <div class="form-group">
                        <label>Confirmar Senha *</label>
                        <input type="password" id="confirmPassword" required placeholder="Digite a senha novamente">
                    </div>
                </div>
            </div>

            <!-- Step 5: Plano Selecionado -->
            <div class="form-section">
                <h4>Plano Selecionado</h4>
                <div id="selectedPlanInfo" class="selected-plan-info">
                    ${selectedPlan ? `
                        <div class="plan-summary">
                            <div>
                                <strong>${selectedPlan.name}</strong>
                                <p>${selectedPlan.description}</p>
                            </div>
                            <div class="plan-summary-price">
                                ${formatCurrency(selectedPlan.pricing?.monthly || 0)}/mês
                            </div>
                        </div>
                    ` : '<p>Nenhum plano selecionado</p>'}
                </div>
            </div>

            <!-- Terms -->
            <div class="form-section">
                <label class="checkbox-label">
                    <input type="checkbox" id="acceptTerms" required>
                    Aceito os <a href="/terms-of-service" target="_blank">Termos de Serviço</a> e a <a href="/privacy-policy" target="_blank">Política de Privacidade</a>. Saiba como solicitar <a href="/data-deletion" target="_blank">Exclusão de Dados</a>.
                </label>
            </div>
        </div>
    `;
}

function bindEvents() {
    // Todos os CTAs de início de cadastro
    const openModal = () => {
        if (plans.length > 0) selectedPlan = plans[0];
        openRegistrationModal();
    };
    document.getElementById('btnStartNow')?.addEventListener('click', openModal);
    document.getElementById('btnHeroPrimary')?.addEventListener('click', openModal);
    document.getElementById('btnHeroRegister')?.addEventListener('click', openModal);

    // Navbar scroll effect
    const nav = document.getElementById('lp-nav');
    if (nav) {
        window.addEventListener('scroll', () => {
            nav.classList.toggle('lp-nav--scrolled', window.scrollY > 40);
        }, { passive: true });
    }

    // Mobile hamburger
    document.getElementById('lp-hamburger')?.addEventListener('click', () => {
        const nav = document.getElementById('lp-nav');
        nav?.classList.toggle('lp-nav--open');
    });

    // Account type change
    document.addEventListener('change', (e) => {
        if (e.target.name === 'accountType') {
            toggleEstablishmentFields(e.target.value === 'establishment');
        }
    });

    // Registration form submit
    document.getElementById('registrationForm')?.addEventListener('submit', handleRegistration);
}

function toggleEstablishmentFields(show) {
    const section = document.getElementById('establishmentFields');
    if (!section) return;
    section.style.display = show ? 'block' : 'none';
    const inputs = section.querySelectorAll('input[id="businessName"], input[id="businessPhone"], input[id="businessEmail"]');
    inputs.forEach(input => {
        if (show) {
            input.setAttribute('required', '');
        } else {
            input.removeAttribute('required');
        }
    });
}

function openRegistrationModal() {
    const modal = document.getElementById('modal-register');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Re-render form with selected plan
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = renderRegistrationForm();
        }

        // Re-bind submit (form was re-rendered)
        document.getElementById('registrationForm')?.addEventListener('submit', handleRegistration);

        // Set initial required state (default: establishment checked)
        toggleEstablishmentFields(true);

        // Activate smart CEP lookup
        initCepLookup();
    }
}

function initCepLookup() {
    const cepInput = document.getElementById('cep');
    if (!cepInput) return;

    // Mask: 00000-000
    cepInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5, 8);
        e.target.value = v;

        const digits = v.replace(/\D/g, '');
        if (digits.length === 8) fetchCep(digits);
    });
}

async function fetchCep(cep) {
    const status  = document.getElementById('cepStatus');
    const msg     = document.getElementById('cepMsg');
    const street  = document.getElementById('street');
    const neighborhood = document.getElementById('neighborhood');
    const city    = document.getElementById('city');
    const state   = document.getElementById('state');
    const number  = document.getElementById('number');

    // Loading
    if (status) { status.style.display = 'inline'; status.textContent = '⏳'; }
    if (msg)    { msg.style.display = 'none'; msg.textContent = ''; }

    try {
        const res  = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();

        if (data.erro) {
            if (status) { status.textContent = '❌'; }
            if (msg)    { msg.style.display = 'block'; msg.style.color = '#e53e3e'; msg.textContent = 'CEP não encontrado. Verifique e tente novamente.'; }
            return;
        }

        // Fill fields
        if (street)       { street.value       = data.logradouro || ''; }
        if (neighborhood) { neighborhood.value = data.bairro      || ''; }
        if (city)         { city.value         = data.localidade  || ''; }
        if (state)        { state.value        = data.uf          || ''; }

        // Focus number after auto-fill
        if (number) number.focus();

        if (status) { status.textContent = '✅'; }
        if (msg)    { msg.style.display = 'block'; msg.style.color = '#38a169'; msg.textContent = `${data.localidade} – ${data.uf}`; }
    } catch (_) {
        if (status) { status.textContent = '❌'; }
        if (msg)    { msg.style.display = 'block'; msg.style.color = '#e53e3e'; msg.textContent = 'Erro ao buscar CEP. Verifique sua conexão.'; }
    }
}

window.navigateToLogin = function() {
    navigateTo('/login');
};

window.closeRegistrationModal = function() {
    const modal = document.getElementById('modal-register');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
};

async function handleRegistration(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando conta...';

    // Validar senha
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        showToast('As senhas não coincidem', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar Conta e Começar';
        return;
    }

    const accountType = document.querySelector('input[name="accountType"]:checked').value;
    const ownerName   = document.getElementById('ownerName').value.trim();

    const data = {
        accountType,
        business: {
            name:  accountType === 'professional'
                       ? ownerName
                       : (document.getElementById('businessName')?.value || ownerName),
            cnpj:  document.getElementById('cnpj')?.value || '',
            phone: accountType === 'professional'
                       ? document.getElementById('ownerPhone').value
                       : (document.getElementById('businessPhone')?.value || ''),
            email: accountType === 'professional'
                       ? document.getElementById('ownerEmail').value
                       : (document.getElementById('businessEmail')?.value || ''),
        },
        address: {
            cep: document.getElementById('cep').value,
            street: document.getElementById('street').value,
            number: document.getElementById('number').value,
            complement: document.getElementById('complement')?.value || '',
            neighborhood: document.getElementById('neighborhood').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
        },
        owner: {
            name: document.getElementById('ownerName').value,
            cpf: document.getElementById('cpf').value,
            email: document.getElementById('ownerEmail').value,
            phone: document.getElementById('ownerPhone').value,
            password: password,
        },
        planId: selectedPlan?.id || null,
    };

    try {
        const response = await fetch(`${API_BASE_URL}/public/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
            showToast('Conta criada com sucesso! Redirecionando...', 'success');
            
            if (result.data?.tenantSlug) {
                setTenantSlug(result.data.tenantSlug);
            }
            setTimeout(() => {
                navigateTo('/login');
            }, 2000);
        } else {
            throw new Error(result.message || 'Erro ao criar conta');
        }
    } catch (error) {
        console.error('[Landing] Registration error:', error);
        showToast(error.message || 'Erro ao criar conta. Tente novamente.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar Conta e Começar';
    }
}

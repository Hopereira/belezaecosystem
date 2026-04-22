/**
 * Ajuda & Suporte — Beleza Ecosystem — Fase 5
 * Categorias, FAQ, contato e canais de suporte
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';

const HELP_CATEGORIES = [
    { id: 'start',    icon: 'fas fa-rocket',        title: 'Primeiros passos',  count: 8,  desc: 'Como configurar seu salão, adicionar equipe e fazer seu primeiro agendamento.' },
    { id: 'appts',    icon: 'fas fa-calendar-alt',  title: 'Agendamentos',      count: 12, desc: 'Criar, editar, cancelar e gerenciar agendamentos e a agenda do salão.' },
    { id: 'clients',  icon: 'fas fa-users',         title: 'Clientes',          count: 7,  desc: 'Cadastro, histórico, aniversários e relacionamento com clientes.' },
    { id: 'finance',  icon: 'fas fa-dollar-sign',   title: 'Financeiro',        count: 9,  desc: 'Receitas, despesas, comissões, formas de pagamento e relatórios.' },
    { id: 'billing',  icon: 'fas fa-credit-card',   title: 'Assinatura',        count: 5,  desc: 'Planos, cobranças, cancelamento e período de teste.' },
    { id: 'team',     icon: 'fas fa-user-tie',      title: 'Equipe',            count: 6,  desc: 'Profissionais, permissões, comissões e desempenho da equipe.' },
    { id: 'marketing',icon: 'fas fa-bullhorn',      title: 'Marketing',         count: 4,  desc: 'Campanhas, automações, WhatsApp e engajamento de clientes.' },
    { id: 'account',  icon: 'fas fa-cog',           title: 'Conta & Config.',   count: 6,  desc: 'Configurações do salão, integrações e preferências do sistema.' },
];

const FAQ_ITEMS = [
    {
        q: 'Como adicionar um novo agendamento?',
        a: 'Acesse o menu "Agendamentos" na barra lateral, clique em "Novo agendamento" ou no botão "+" flutuante. Preencha cliente, serviço, profissional e horário. O sistema confirma automaticamente se a IA estiver ativa.',
    },
    {
        q: 'Como cadastrar um profissional?',
        a: 'Vá em "Profissionais" no menu lateral, clique em "Adicionar profissional". Preencha nome, e-mail e função. O sistema enviará um convite de acesso por e-mail.',
    },
    {
        q: 'Posso cancelar minha assinatura a qualquer momento?',
        a: 'Sim. Acesse "Assinatura" no menu, clique em "Gerenciar assinatura" e selecione a opção de cancelamento. Seus dados ficam disponíveis por 30 dias após o cancelamento.',
    },
    {
        q: 'Como funciona o período de teste?',
        a: 'Você tem 14 dias para explorar todas as funcionalidades gratuitamente, sem precisar inserir cartão de crédito. No fim do período, escolha o plano que melhor se encaixa no seu negócio.',
    },
    {
        q: 'Como exportar os dados dos clientes?',
        a: 'Acesse "Clientes", clique no ícone de exportação (planilha) no canto superior direito. Os dados são exportados em formato CSV compatível com Excel e Google Sheets.',
    },
    {
        q: 'Como configurar os serviços do salão?',
        a: 'Acesse "Serviços" no menu lateral. Clique em "Adicionar serviço", defina o nome, duração, valor e quais profissionais oferecem aquele serviço.',
    },
    {
        q: 'Como ver o relatório financeiro do mês?',
        a: 'No menu lateral, acesse "Financeiro" → "Relatórios". Selecione o período desejado. Você verá receitas, despesas, comissões e saldo separados por categoria.',
    },
    {
        q: 'É possível ter múltiplos usuários com acessos diferentes?',
        a: 'Sim. Em "Usuários" você pode convidar membros da equipe e definir o papel de cada um: Proprietário, Administrador ou Profissional, cada um com permissões específicas.',
    },
];

const SUPPORT_CHANNELS = [
    { icon: 'fab fa-whatsapp', title: 'WhatsApp', desc: 'Atendimento rápido de seg. a sex., 9h–18h.', action: 'Abrir WhatsApp', href: 'https://wa.me/5500000000000', color: 'green' },
    { icon: 'fas fa-envelope', title: 'E-mail',   desc: 'Resposta em até 24h úteis.', action: 'Enviar e-mail', href: 'mailto:suporte@belezaecosystem.com', color: 'blue' },
    { icon: 'fas fa-book',     title: 'Base de conhecimento', desc: 'Artigos detalhados e tutoriais em vídeo.', action: 'Acessar docs', href: '#docs', color: 'brown' },
];

export function render() {
    renderShell('help');
}

export async function init() {
    await loadData();
    renderContent();
    return () => {};
}

async function loadData() {
    try {
        const [catRes, faqRes] = await Promise.all([
            api.get('/help/categories').catch(() => null),
            api.get('/help/faq').catch(() => null),
        ]);
        if (catRes?.data?.length) {
            HELP_CATEGORIES.length = 0;
            catRes.data.forEach(c => HELP_CATEGORIES.push({
                id: c.id, icon: c.icon, title: c.title,
                count: c.article_count || 0, desc: '',
            }));
        }
        if (faqRes?.data?.length) {
            FAQ_ITEMS.length = 0;
            faqRes.data.forEach(f => FAQ_ITEMS.push({ q: f.question, a: f.answer }));
        }
    } catch (_) { /* use static defaults */ }
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

function renderContent() {
    const c = getContentArea();
    if (!c) return;

    c.innerHTML = `
        <!-- Header -->
        <div class="mod-header" style="justify-content:center;text-align:center;flex-direction:column;align-items:center;padding-bottom:0.5rem;">
            <div class="mod-header__text" style="text-align:center;">
                <p class="mod-header__eyebrow">Central de ajuda</p>
                <h1 class="mod-header__title">Como podemos ajudar?</h1>
                <p class="mod-header__subtitle">Encontre respostas rápidas ou fale com nosso time.</p>
            </div>
        </div>

        <!-- Busca -->
        <div class="mod-search">
            <i class="fas fa-search mod-search__icon"></i>
            <input type="text" id="helpSearch" placeholder="Pesquise por agendamentos, clientes, financeiro..." autocomplete="off">
        </div>

        <!-- Categorias -->
        <div class="mod-toolbar">
            <span class="mod-toolbar__title">Categorias</span>
        </div>
        <div class="mod-grid-4" style="margin-bottom:2.5rem;">
            ${HELP_CATEGORIES.map(cat => `
                <a href="#cat-${cat.id}" class="mod-help-cat" data-cat="${cat.id}">
                    <div class="mod-help-cat__icon"><i class="${cat.icon}"></i></div>
                    <div class="mod-help-cat__body">
                        <div class="mod-help-cat__title">${cat.title}</div>
                        <div class="mod-help-cat__count">${cat.count} artigos</div>
                    </div>
                    <i class="fas fa-chevron-right mod-help-cat__arrow"></i>
                </a>
            `).join('')}
        </div>

        <!-- FAQ -->
        <div class="mod-toolbar" style="margin-bottom:1rem;">
            <span class="mod-toolbar__title">Perguntas frequentes</span>
            <span style="font-family:var(--font-ui);font-size:0.75rem;color:var(--sidebar-text-muted);">${FAQ_ITEMS.length} perguntas</span>
        </div>
        <div class="mod-panel" style="margin-bottom:2rem;">
            <div class="mod-panel__body" style="padding:0 1.375rem;">
                ${FAQ_ITEMS.map((item, i) => `
                    <div class="mod-faq-item ${i === 0 ? 'open' : ''}" data-faq="${i}">
                        <button class="mod-faq-item__question" aria-expanded="${i === 0}">
                            ${item.q}
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="mod-faq-item__answer">${item.a}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Canais de suporte -->
        <div class="mod-toolbar" style="margin-bottom:1rem;">
            <span class="mod-toolbar__title">Fale com o suporte</span>
        </div>
        <div class="mod-grid-3" style="margin-bottom:2rem;">
            ${SUPPORT_CHANNELS.map(ch => `
                <a href="${ch.href}" class="mod-support-card" target="_blank" rel="noopener" style="text-decoration:none;">
                    <div class="mod-support-card__icon" style="${ch.color === 'green' ? 'background:rgba(45,139,107,0.1);color:var(--chart-positive);' : ch.color === 'blue' ? 'background:rgba(30,107,160,0.1);color:var(--color-info);' : ''}">
                        <i class="${ch.icon}"></i>
                    </div>
                    <div class="mod-support-card__title">${ch.title}</div>
                    <div class="mod-support-card__desc">${ch.desc}</div>
                    <span class="btn-ghost btn-sm" style="margin-top:0.25rem;">${ch.action} <i class="fas fa-arrow-right"></i></span>
                </a>
            `).join('')}
        </div>

        <!-- Status do sistema -->
        <div class="mod-panel" style="margin-bottom:0;">
            <div class="mod-panel__header">
                <span class="mod-panel__title">Status do sistema</span>
                <span class="mod-badge mod-badge--active">Todos os serviços operacionais</span>
            </div>
            <div class="mod-panel__body" style="display:flex;flex-wrap:wrap;gap:1rem;">
                ${['Dashboard', 'Agendamentos', 'Financeiro', 'Notificações', 'Secretária IA', 'Mini-site'].map(svc => `
                    <div style="display:flex;align-items:center;gap:0.5rem;font-family:var(--font-ui);font-size:0.8125rem;color:var(--sidebar-text);">
                        <span style="width:8px;height:8px;border-radius:50%;background:var(--chart-positive);display:inline-block;"></span>
                        ${svc}
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    bindEvents();
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────

function bindEvents() {
    // FAQ accordion
    document.querySelectorAll('.mod-faq-item__question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.mod-faq-item');
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.mod-faq-item').forEach(i => i.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
            btn.setAttribute('aria-expanded', String(!isOpen));
        });
    });

    // Category links
    document.querySelectorAll('.mod-help-cat').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            showToast('Artigos desta categoria disponíveis em breve.', 'info');
        });
    });

    // Contact form
    document.getElementById('helpContactForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form    = e.target;
        const btn     = form.querySelector('button[type=submit]');
        const payload = {
            name:    form.elements.name?.value?.trim(),
            email:   form.elements.email?.value?.trim(),
            subject: form.elements.subject?.value?.trim(),
            message: form.elements.message?.value?.trim(),
            category:'account',
        };
        if (!payload.name || !payload.email || !payload.subject || !payload.message) {
            showToast('Preencha todos os campos.', 'error');
            return;
        }
        if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
        try {
            await api.post('/help/contact', payload);
            showToast('Mensagem enviada! Retornaremos em breve.', 'success');
            form.reset();
        } catch (err) {
            const msg = err?.message || 'Erro ao enviar. Tente novamente.';
            showToast(msg, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Enviar mensagem'; }
        }
    });

    // Search
    const searchInput = document.getElementById('helpSearch');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => filterFAQ(searchInput.value), 200);
        });
    }
}

function filterFAQ(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll('.mod-faq-item').forEach(item => {
        const text = item.querySelector('.mod-faq-item__question')?.textContent?.toLowerCase() || '';
        item.style.display = (!q || text.includes(q)) ? '' : 'none';
    });
}

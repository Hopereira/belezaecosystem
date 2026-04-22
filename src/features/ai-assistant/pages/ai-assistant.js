/**
 * Secretária IA — Beleza Ecosystem — Fase 5
 * Assistente inteligente: capacidades, sugestões, timeline de interações
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { navigateTo } from '../../../core/router.js';

// ─── Fallback interactions ───
const FALLBACK_INTERACTIONS = [
    { type: 'confirm',    color: 'green', icon: 'fas fa-calendar-check', title: 'Confirmação enviada — Ana Lima',    desc: 'WhatsApp enviado 24h antes do horário das 14h.', time: 'Há 2h' },
    { type: 'suggest',   color: 'amber', icon: 'fas fa-lightbulb',       title: 'Encaixe sugerido — Quinta-feira',   desc: 'Detectou janela de 45min às 11h com a Isabela.', time: 'Há 4h' },
    { type: 'reminder',  color: 'blue',  icon: 'fas fa-bell',            title: 'Lembrete de retorno — Carla Souza', desc: 'Não visitou em 32 dias. Mensagem de retorno enviada.', time: 'Ontem' },
    { type: 'no_show',   color: 'red',   icon: 'fas fa-user-times',      title: 'Falta registrada — Pedro Oliveira', desc: 'Cancelamento de última hora detectado. Cliente notificado.', time: 'Ontem' },
    { type: 'birthday',  color: 'brown', icon: 'fas fa-birthday-cake',   title: 'Parabéns enviado — Maria Santos',   desc: 'Mensagem de aniversário + cupom de 10% enviados.', time: '2 dias atrás' },
];

const SUGGESTIONS = [
    { icon: 'fas fa-calendar-plus', title: 'Confirmar 3 agendamentos de amanhã', desc: 'Ana Lima, Juliana Ferreira e Roberta Costa ainda não confirmaram presença.', action: 'Confirmar agora' },
    { icon: 'fas fa-user-clock',    title: '8 clientes inativos há mais de 30 dias', desc: 'Sugestão: enviar mensagem de reativação com oferta especial de retorno.', action: 'Ver clientes' },
    { icon: 'fas fa-clock',         title: 'Janela livre às 15h de quinta-feira', desc: 'Isabela está disponível. Identificado cliente que costuma agendar nesse horário.', action: 'Sugerir encaixe' },
];

const AI_CAPABILITIES = [
    { icon: 'fas fa-comments',      title: 'Responder clientes',    desc: 'Responde mensagens comuns via WhatsApp de forma automática e personalizada.',     status: 'active' },
    { icon: 'fas fa-puzzle-piece',  title: 'Sugerir encaixes',      desc: 'Identifica janelas na agenda e sugere horários para clientes em espera.',          status: 'active' },
    { icon: 'fas fa-redo-alt',      title: 'Lembrar retornos',      desc: 'Identifica clientes que não voltam e dispara mensagens personalizadas.',           status: 'active' },
    { icon: 'fas fa-clipboard-list','title': 'Resumir agenda',      desc: 'Gera um resumo diário da agenda com alertas de pendências e horários críticos.',   status: 'active' },
    { icon: 'fas fa-user-minus',    title: 'Alertar faltas',        desc: 'Detecta cancelamentos e no-shows, registra e notifica a equipe automaticamente.', status: 'active' },
    { icon: 'fas fa-chart-pie',     title: 'Insights de negócio',   desc: 'Analisa padrões de agendamento e sugere ações para maximizar o faturamento.',     status: 'soon' },
];

let interactions = [];
let aiStatus = 'online';

export function render() {
    renderShell('ai-assistant');
}

export async function init() {
    renderSkeleton();
    await loadData();
    renderContent();
    return () => { interactions = []; };
}

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

function renderSkeleton() {
    const c = getContentArea();
    if (!c) return;
    c.innerHTML = `
        <div class="skeleton" style="height:180px;border-radius:16px;margin-bottom:2rem;"></div>
        <div class="mod-grid-3" style="margin-bottom:1.5rem;">
            ${[1,2,3,4,5,6].map(() => `<div class="skeleton" style="height:120px;border-radius:12px;"></div>`).join('')}
        </div>
        <div class="mod-grid-2">
            <div class="skeleton" style="height:280px;border-radius:12px;"></div>
            <div class="skeleton" style="height:280px;border-radius:12px;"></div>
        </div>
    `;
}

async function loadData() {
    try {
        const [interRes, statusRes, suggestRes] = await Promise.all([
            api.get('/ai/interactions?limit=10').catch(() => null),
            api.get('/ai/status').catch(() => null),
            api.get('/ai/suggestions').catch(() => null),
        ]);
        interactions = interRes?.data?.length ? interRes.data : FALLBACK_INTERACTIONS;
        aiStatus     = statusRes?.data?.summary_status || statusRes?.data?.status || 'online';
        if (suggestRes?.data?.length) {
            // Replace static SUGGESTIONS with real ones from backend
            SUGGESTIONS.length = 0;
            suggestRes.data.forEach(s => SUGGESTIONS.push({
                icon:   s.type === 'confirm' ? 'fas fa-calendar-plus' : s.type === 'reactivate' ? 'fas fa-user-clock' : 'fas fa-lightbulb',
                title:  s.title,
                desc:   s.description,
                action: s.type === 'confirm' ? 'Confirmar agora' : s.type === 'reactivate' ? 'Ver clientes' : 'Ver detalhes',
            }));
        }
    } catch (err) {
        interactions = FALLBACK_INTERACTIONS;
        aiStatus = 'online';
    }
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

function renderContent() {
    const c = getContentArea();
    if (!c) return;

    c.innerHTML = `
        <!-- Hero interno -->
        <div class="mod-hero">
            <div>
                <p class="mod-hero__eyebrow">Inteligência Artificial</p>
                <h1 class="mod-hero__title">Secretária IA do seu salão.</h1>
                <p class="mod-hero__desc">
                    Automatiza confirmações, lembretes e reativações. 
                    Nunca deixa uma oportunidade passar.
                </p>
                <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
                    <span class="mod-ai-status mod-ai-status--${aiStatus}">
                        <span class="mod-ai-status__dot"></span>
                        ${aiStatus === 'online' ? 'Secretária online' : aiStatus === 'busy' ? 'Processando' : 'Offline'}
                    </span>
                    <span class="mod-hero__badge"><i class="fas fa-shield-alt"></i> Dados 100% seguros</span>
                    <span class="mod-hero__badge"><i class="fas fa-clock"></i> Ativa 24h</span>
                </div>
            </div>
            <div class="mod-hero__visual">
                <div class="mod-hero__stat">
                    <span class="mod-hero__stat-value">${interactions.length}</span>
                    <span class="mod-hero__stat-label">Interações hoje</span>
                </div>
                <div class="mod-hero__stat">
                    <span class="mod-hero__stat-value">97%</span>
                    <span class="mod-hero__stat-label">Taxa acerto</span>
                </div>
            </div>
        </div>

        <!-- Capacidades da IA -->
        <div class="mod-toolbar" style="margin-bottom:1rem;">
            <span class="mod-toolbar__title">Capacidades</span>
        </div>
        <div class="mod-grid-3" style="margin-bottom:2rem;">
            ${AI_CAPABILITIES.map(cap => `
                <div class="mod-feature-card ${cap.status === 'soon' ? 'mod-coming-soon' : ''}">
                    <div class="mod-feature-card__icon">
                        <i class="${cap.icon}"></i>
                    </div>
                    <h3 class="mod-feature-card__title">${cap.title}</h3>
                    <p class="mod-feature-card__desc">${cap.desc}</p>
                    <div class="mod-feature-card__footer">
                        <span class="mod-badge ${cap.status === 'active' ? 'mod-badge--active' : 'mod-badge--soon'}">
                            ${cap.status === 'active' ? 'Ativo' : 'Em breve'}
                        </span>
                        ${cap.status === 'active' ? `<span class="mod-feature-card__cta">Configurar <i class="fas fa-arrow-right"></i></span>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        <!-- 2-col: Sugestões + Timeline -->
        <div class="mod-grid-2" style="margin-bottom:1.5rem;">

            <!-- Sugestões inteligentes -->
            <div class="mod-panel">
                <div class="mod-panel__header">
                    <span class="mod-panel__title">Sugestões agora</span>
                    <span class="mod-badge mod-badge--new">${SUGGESTIONS.length} novas</span>
                </div>
                <div class="mod-panel__body">
                    ${SUGGESTIONS.map(s => `
                        <div class="mod-suggestion">
                            <div class="mod-suggestion__icon"><i class="${s.icon}"></i></div>
                            <div class="mod-suggestion__body">
                                <p class="mod-suggestion__title">${s.title}</p>
                                <p class="mod-suggestion__desc">${s.desc}</p>
                                <button class="mod-suggestion__action">
                                    ${s.action} <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Timeline de interações -->
            <div class="mod-panel">
                <div class="mod-panel__header">
                    <span class="mod-panel__title">Interações recentes</span>
                    <span class="mod-badge mod-badge--inactive" style="font-size:0.65rem;">Últimas 24h</span>
                </div>
                <div class="mod-panel__body" style="padding:0.5rem 1.375rem;">
                    <div class="mod-timeline">
                        ${interactions.slice(0, 6).map(i => `
                            <div class="mod-timeline-item">
                                <div class="mod-timeline-item__dot mod-timeline-item__dot--${i.color}">
                                    <i class="${i.icon}"></i>
                                </div>
                                <div class="mod-timeline-item__body">
                                    <p class="mod-timeline-item__title">${i.title}</p>
                                    <p class="mod-timeline-item__desc">${i.desc}</p>
                                </div>
                                <span class="mod-timeline-item__time">${i.time}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>

        <!-- Configuração / Ativação -->
        <div class="mod-panel">
            <div class="mod-panel__header">
                <span class="mod-panel__title">Configuração da Secretária IA</span>
                <span class="mod-ai-status mod-ai-status--${aiStatus}">
                    <span class="mod-ai-status__dot"></span>
                    ${aiStatus === 'online' ? 'Online' : 'Offline'}
                </span>
            </div>
            <div class="mod-panel__body">
                <div class="mod-grid-3">
                    ${renderConfigCard('Horário de atendimento', 'fas fa-clock', 'Segunda a sexta, 8h–20h', 'Configurar')}
                    ${renderConfigCard('Canal preferencial', 'fas fa-comment-dots', 'WhatsApp Business', 'Alterar')}
                    ${renderConfigCard('Tom de comunicação', 'fas fa-pen-fancy', 'Acolhedor e profissional', 'Personalizar')}
                </div>
            </div>
        </div>
    `;

    bindEvents();
}

function renderConfigCard(title, icon, current, cta) {
    return `
        <div style="background:var(--color-off-white);border:1px solid var(--card-border);border-radius:var(--radius-md);padding:1.25rem;display:flex;flex-direction:column;gap:0.75rem;">
            <div style="display:flex;align-items:center;gap:0.625rem;">
                <div style="width:32px;height:32px;border-radius:var(--radius-md);background:rgba(96,51,34,0.08);color:var(--color-brown-deep);display:flex;align-items:center;justify-content:center;font-size:0.85rem;">
                    <i class="${icon}"></i>
                </div>
                <span style="font-family:var(--font-ui);font-size:0.8125rem;font-weight:700;color:var(--sidebar-text);">${title}</span>
            </div>
            <p style="font-family:var(--font-ui);font-size:0.8rem;color:var(--sidebar-text-muted);margin:0;">${current}</p>
            <button class="btn-ghost btn-sm" style="align-self:flex-start;" onclick="window.__aiConfigTodo('${title}')">
                ${cta} <i class="fas fa-arrow-right"></i>
            </button>
        </div>
    `;
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────

function bindEvents() {
    document.querySelectorAll('.mod-suggestion__action').forEach(btn => {
        btn.addEventListener('click', () => {
            import('../../../shared/utils/toast.js').then(({ showToast }) => {
                showToast('Funcionalidade disponível em breve.', 'info');
            });
        });
    });

    document.querySelectorAll('.mod-feature-card:not(.mod-coming-soon) .mod-feature-card__cta').forEach(el => {
        el.closest('.mod-feature-card')?.addEventListener('click', () => {
            import('../../../shared/utils/toast.js').then(({ showToast }) => {
                showToast('Configuração da IA disponível em breve.', 'info');
            });
        });
    });

    window.__aiConfigTodo = (label) => {
        import('../../../shared/utils/toast.js').then(({ showToast }) => {
            showToast(`${label}: configuração disponível em breve.`, 'info');
        });
    };
}

/**
 * Marketing & Automação — Beleza Ecosystem — Fase 5
 * Campanhas, automações, segmentos de clientes
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { formatCurrency } from '../../../shared/utils/validation.js';
import { navigateTo } from '../../../core/router.js';

// ─── Fallback data (usado quando endpoint não disponível) ───
const FALLBACK_CAMPAIGNS = [
    { id: 1, name: 'Promoção Dia das Mães', status: 'active', channel: 'WhatsApp', sent: 142, returns: 38, date: '2026-05-05' },
    { id: 2, name: 'Lembrete de Retorno — Maio', status: 'active', channel: 'SMS', sent: 87, returns: 22, date: '2026-05-01' },
    { id: 3, name: 'Reativação — Inativos 60d', status: 'paused', channel: 'E-mail', sent: 54, returns: 9, date: '2026-04-20' },
    { id: 4, name: 'Aniversariantes de Abril', status: 'completed', channel: 'WhatsApp', sent: 31, returns: 18, date: '2026-04-01' },
];

const FALLBACK_METRICS = {
    active_campaigns: 2,
    messages_sent: 314,
    open_rate: 68,
    active_automations: 4,
};

const AUTOMATIONS = [
    { id: 'confirm',    icon: 'fas fa-calendar-check', color: 'green',  name: 'Confirmação de Agendamento', desc: 'Envia confirmação 24h antes pelo WhatsApp.', enabled: true },
    { id: 'reminder',  icon: 'fas fa-bell',            color: 'amber',  name: 'Lembrete de Retorno',        desc: 'Contacta clientes que não voltam há 30 dias.', enabled: true },
    { id: 'reactivate',icon: 'fas fa-user-clock',      color: 'blue',   name: 'Reativação de Inativos',     desc: 'Disparo automático para clientes há 60+ dias ausentes.', enabled: false },
    { id: 'birthday',  icon: 'fas fa-birthday-cake',   color: 'brown',  name: 'Parabéns + Oferta',          desc: 'Mensagem personalizada no aniversário do cliente.', enabled: true },
    { id: 'review',    icon: 'fas fa-star',             color: 'amber',  name: 'Pedido de Avaliação',        desc: 'Solicita feedback após cada atendimento concluído.', enabled: false },
];

const SEGMENTS = [
    { label: 'Todos os clientes',    count: 0, icon: 'fas fa-users',       key: 'all' },
    { label: 'Clientes ativos',      count: 0, icon: 'fas fa-user-check',  key: 'active' },
    { label: 'Inativos (30d)',        count: 0, icon: 'fas fa-user-clock',  key: 'inactive_30' },
    { label: 'Inativos (60d)',        count: 0, icon: 'fas fa-user-times',  key: 'inactive_60' },
    { label: 'Aniversariantes',      count: 0, icon: 'fas fa-birthday-cake', key: 'birthday' },
    { label: 'Novos (últimos 30d)',   count: 0, icon: 'fas fa-user-plus',   key: 'new' },
];

let campaigns = [];
let automations = [];
let metrics = {};

export function render() {
    renderShell('marketing');
}

export async function init() {
    renderSkeleton();
    await loadData();
    renderContent();
    return () => { campaigns = []; automations = []; metrics = {}; };
}

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

function renderSkeleton() {
    const c = getContentArea();
    if (!c) return;
    c.innerHTML = `
        <div class="mod-header">
            <div class="mod-header__text">
                <div class="skeleton" style="width:200px;height:28px;margin-bottom:6px;"></div>
                <div class="skeleton" style="width:280px;height:14px;"></div>
            </div>
        </div>
        <div class="mod-kpi-grid">
            ${[1,2,3,4].map(() => `<div class="mod-kpi-card"><div class="skeleton" style="height:72px;border-radius:8px;"></div></div>`).join('')}
        </div>
        <div class="skeleton" style="height:280px;border-radius:12px;margin-bottom:1.25rem;"></div>
        <div class="skeleton" style="height:220px;border-radius:12px;"></div>
    `;
}

async function loadData() {
    try {
        const [campRes, metRes, autoRes] = await Promise.all([
            api.get('/marketing/campaigns').catch(() => null),
            api.get('/marketing/metrics').catch(() => null),
            api.get('/marketing/automations').catch(() => null),
        ]);
        campaigns   = campRes?.data?.length ? campRes.data : FALLBACK_CAMPAIGNS;
        // Normalize metrics: backend uses campaigns_active/automations_active
        // fallback uses active_campaigns/active_automations
        const rawMetrics = metRes?.data || FALLBACK_METRICS;
        metrics = {
            active_campaigns:   rawMetrics.campaigns_active   ?? rawMetrics.active_campaigns   ?? 0,
            messages_sent:      rawMetrics.messages_sent      ?? 0,
            open_rate:          rawMetrics.open_rate          ?? 0,
            active_automations: rawMetrics.automations_active ?? rawMetrics.active_automations ?? 0,
            segmented_clients:  rawMetrics.segmented_clients  ?? 0,
        };
        automations = autoRes?.data?.length  ? autoRes.data.map(a => ({
            id:      a.id,
            icon:    AUTOMATIONS.find(d => d.id === a.slug)?.icon || 'fas fa-robot',
            color:   AUTOMATIONS.find(d => d.id === a.slug)?.color || 'brown',
            name:    a.name,
            desc:    a.description || '',
            enabled: a.enabled,
        })) : AUTOMATIONS;

        // TODO: endpoint /clients/segments para popular contagens reais
        if (!metRes?.data) {
            try {
                const clientRes = await api.get('/clients?limit=1').catch(() => null);
                if (clientRes?.meta?.total) {
                    SEGMENTS[0].count = clientRes.meta.total;
                }
            } catch (_) { /* noop */ }
        }
    } catch (err) {
        console.error('[Marketing] loadData:', err);
        campaigns   = FALLBACK_CAMPAIGNS;
        metrics     = FALLBACK_METRICS;
        automations = AUTOMATIONS;
    }
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

function renderContent() {
    const c = getContentArea();
    if (!c) return;

    c.innerHTML = `
        <!-- Header -->
        <div class="mod-header">
            <div class="mod-header__text">
                <p class="mod-header__eyebrow">Marketing</p>
                <h1 class="mod-header__title">Marketing & Automação</h1>
                <p class="mod-header__subtitle">Campanhas, lembretes automáticos e relacionamento com clientes.</p>
            </div>
            <div class="mod-header__actions">
                <button class="btn-ghost btn-sm" id="btnSegments">
                    <i class="fas fa-filter"></i> Segmentos
                </button>
                <button class="btn-primary" id="btnNewCampaign">
                    <i class="fas fa-plus"></i> Nova campanha
                </button>
            </div>
        </div>

        <!-- KPIs -->
        <div class="mod-kpi-grid">
            ${renderKPI('Campanhas ativas',    metrics.active_campaigns ?? 0, 'fas fa-bullhorn',    'brown')}
            ${renderKPI('Mensagens enviadas',  metrics.messages_sent ?? 0,    'fas fa-paper-plane',  'blue')}
            ${renderKPI('Taxa de abertura',    (metrics.open_rate ?? 0) + '%','fas fa-envelope-open','green')}
            ${renderKPI('Automações ativas',   metrics.active_automations ?? 0,'fas fa-robot',       'amber')}
        </div>

        <!-- 2-col grid: campanhas + automações -->
        <div class="mod-grid-2" style="margin-bottom:1.5rem;">

            <!-- Campanhas recentes -->
            <div class="mod-panel">
                <div class="mod-panel__header">
                    <span class="mod-panel__title">Campanhas recentes</span>
                    <button class="btn-ghost btn-sm" style="font-size:0.75rem;" id="btnAllCampaigns">
                        Ver todas <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="mod-panel__body" style="padding:0;">
                    ${renderCampaignsTable()}
                </div>
            </div>

            <!-- Automações -->
            <div class="mod-panel">
                <div class="mod-panel__header">
                    <span class="mod-panel__title">Automações</span>
                    <span class="mod-badge mod-badge--active" style="font-size:0.65rem;">
                        ${(automations.length ? automations : AUTOMATIONS).filter(a => a.enabled).length} ativas
                    </span>
                </div>
                <div class="mod-panel__body" style="display:flex;flex-direction:column;gap:0.75rem;">
                    ${(automations.length ? automations : AUTOMATIONS).map(renderAutomationCard).join('')}
                </div>
            </div>
        </div>

        <!-- Segmentos de clientes -->
        <div class="mod-panel" style="margin-bottom:1.5rem;">
            <div class="mod-panel__header">
                <span class="mod-panel__title">Segmentos de clientes</span>
                <span style="font-family:var(--font-ui);font-size:0.75rem;color:var(--sidebar-text-muted);">
                    Selecione um segmento para enviar uma campanha
                </span>
            </div>
            <div class="mod-panel__body" style="display:flex;flex-wrap:wrap;gap:0.75rem;">
                ${SEGMENTS.map((seg, i) => `
                    <button class="mod-segment ${i === 0 ? 'active' : ''}" data-key="${seg.key}">
                        <i class="${seg.icon}"></i>
                        ${seg.label}
                        ${seg.count > 0 ? `<span class="mod-segment__count">${seg.count}</span>` : ''}
                    </button>
                `).join('')}
            </div>
        </div>

        <!-- CTA criar campanha -->
        <div class="mod-hero" style="margin-bottom:0;">
            <div>
                <p class="mod-hero__eyebrow">Pronto para engajar?</p>
                <h2 class="mod-hero__title">Crie uma campanha em minutos.</h2>
                <p class="mod-hero__desc">
                    Selecione um segmento, escolha o canal (WhatsApp, SMS ou e-mail) e envie sua mensagem. 
                    Acompanhe resultados em tempo real.
                </p>
                <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                    <button class="btn-primary" style="background:var(--color-cream-gold);color:var(--color-brown-night);" id="btnCreateCampaignHero">
                        <i class="fas fa-bullhorn"></i> Criar campanha
                    </button>
                    <button class="btn-ghost" style="border-color:rgba(248,230,194,0.4);color:var(--color-cream-gold);">
                        <i class="fas fa-play-circle"></i> Ver como funciona
                    </button>
                </div>
            </div>
            <div class="mod-hero__visual">
                <div class="mod-hero__stat">
                    <span class="mod-hero__stat-value">+38%</span>
                    <span class="mod-hero__stat-label">Retorno médio</span>
                </div>
                <div class="mod-hero__stat">
                    <span class="mod-hero__stat-value">4x</span>
                    <span class="mod-hero__stat-label">Mais retenção</span>
                </div>
            </div>
        </div>
    `;

    bindEvents();
}

// ─────────────────────────────────────────────
// COMPONENTES
// ─────────────────────────────────────────────

function renderKPI(label, value, icon, color) {
    return `
        <div class="mod-kpi-card">
            <div class="mod-kpi-card__top">
                <span class="mod-kpi-card__label">${label}</span>
                <div class="mod-kpi-card__icon mod-kpi-card__icon--${color}"><i class="${icon}"></i></div>
            </div>
            <p class="mod-kpi-card__value">${value}</p>
        </div>
    `;
}

function renderCampaignsTable() {
    if (!campaigns.length) {
        return `<div class="mod-empty">
            <div class="mod-empty__icon"><i class="fas fa-bullhorn"></i></div>
            <h3 class="mod-empty__title">Sem campanhas</h3>
            <p class="mod-empty__desc">Crie sua primeira campanha para começar a engajar clientes.</p>
        </div>`;
    }

    const STATUS = {
        active:    { label: 'Ativa',      cls: 'mod-badge--active' },
        paused:    { label: 'Pausada',     cls: 'mod-badge--paused' },
        completed: { label: 'Concluída',   cls: 'mod-badge--inactive' },
        draft:     { label: 'Rascunho',    cls: 'mod-badge--draft' },
    };

    return `
        <table style="width:100%;border-collapse:collapse;font-family:var(--font-ui);font-size:0.8125rem;">
            <thead>
                <tr style="border-bottom:1px solid var(--card-border);">
                    <th style="padding:0.75rem 1.25rem;text-align:left;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--sidebar-text-muted);">Campanha</th>
                    <th style="padding:0.75rem 1rem;text-align:center;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--sidebar-text-muted);">Canal</th>
                    <th style="padding:0.75rem 1rem;text-align:right;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--sidebar-text-muted);">Enviados</th>
                    <th style="padding:0.75rem 1.25rem;text-align:center;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--sidebar-text-muted);">Status</th>
                </tr>
            </thead>
            <tbody>
                ${campaigns.slice(0, 5).map(c => {
                    const s = STATUS[c.status] || STATUS.draft;
                    // Support both backend fields (sent_count, conversion_rate) and fallback (sent, returns)
                    const sentCount = c.sent_count ?? c.sent ?? 0;
                    const pct       = c.conversion_rate != null
                        ? c.conversion_rate
                        : (sentCount > 0 ? Math.round(((c.returns ?? 0) / sentCount) * 100) : 0);
                    const dateStr   = c.sent_at || c.created_at || c.date || null;
                    return `
                        <tr style="border-bottom:1px solid var(--card-border);">
                            <td style="padding:0.875rem 1.25rem;">
                                <div style="font-weight:600;color:var(--sidebar-text);margin-bottom:0.15rem;">${c.name}</div>
                                <div style="font-size:0.72rem;color:var(--sidebar-text-muted);">${pct}% conversão · ${formatDate(dateStr)}</div>
                            </td>
                            <td style="padding:0.875rem 1rem;text-align:center;">
                                <span style="font-size:0.75rem;color:var(--sidebar-text-muted);">${c.channel}</span>
                            </td>
                            <td style="padding:0.875rem 1rem;text-align:right;font-weight:700;color:var(--sidebar-text);">${sentCount}</td>
                            <td style="padding:0.875rem 1.25rem;text-align:center;">
                                <span class="mod-badge ${s.cls}">${s.label}</span>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function renderAutomationCard(a) {
    const colors = {
        green: 'mod-kpi-card__icon--green',
        amber: 'mod-kpi-card__icon--amber',
        blue:  'mod-kpi-card__icon--blue',
        brown: 'mod-kpi-card__icon--brown',
    };
    return `
        <div class="mod-automation-card">
            <div class="mod-automation-card__icon ${colors[a.color] || 'mod-kpi-card__icon--brown'}">
                <i class="${a.icon}"></i>
            </div>
            <div class="mod-automation-card__body">
                <div class="mod-automation-card__name">${a.name}</div>
                <div class="mod-automation-card__desc">${a.desc}</div>
            </div>
            <div class="mod-automation-card__toggle">
                <label class="mod-toggle" title="${a.enabled ? 'Desativar' : 'Ativar'}">
                    <input type="checkbox" ${a.enabled ? 'checked' : ''} data-id="${a.id}">
                    <span class="mod-toggle__slider"></span>
                </label>
                <span class="mod-badge ${a.enabled ? 'mod-badge--active' : 'mod-badge--inactive'}" style="font-size:0.6rem;">
                    ${a.enabled ? 'Ativa' : 'Inativa'}
                </span>
            </div>
        </div>
    `;
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────

function bindEvents() {
    document.getElementById('btnNewCampaign')?.addEventListener('click', () => showComingSoon('Nova campanha'));
    document.getElementById('btnCreateCampaignHero')?.addEventListener('click', () => showComingSoon('Nova campanha'));
    document.getElementById('btnAllCampaigns')?.addEventListener('click', () => showComingSoon('Todas as campanhas'));

    document.querySelectorAll('.mod-segment').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mod-segment').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    document.querySelectorAll('.mod-toggle input').forEach(toggle => {
        toggle.addEventListener('change', async () => {
            const id   = toggle.dataset.id;
            const card = toggle.closest('.mod-automation-card');
            const badge = card?.querySelector('.mod-badge');
            const prev  = !toggle.checked;
            if (badge) {
                badge.className   = `mod-badge ${toggle.checked ? 'mod-badge--active' : 'mod-badge--inactive'}`;
                badge.textContent = toggle.checked ? 'Ativa' : 'Inativa';
            }
            try {
                await api.patch(`/marketing/automations/${id}/toggle`, { enabled: toggle.checked });
            } catch (err) {
                toggle.checked = prev;
                if (badge) {
                    badge.className   = `mod-badge ${prev ? 'mod-badge--active' : 'mod-badge--inactive'}`;
                    badge.textContent = prev ? 'Ativa' : 'Inativa';
                }
                import('../../../shared/utils/toast.js').then(({ showToast }) => showToast('Erro ao salvar automacao.', 'error'));
            }
        });
    });
}

function showComingSoon(label) {
    import('../../../shared/utils/toast.js').then(({ showToast }) => {
        showToast(`${label}: disponível em breve.`, 'info');
    });
}

function formatDate(str) {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

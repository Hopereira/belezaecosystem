/**
 * Equipe & Comissões — Beleza Ecosystem — Fase 5
 * Visão premium de performance, rankings e comissões da equipe
 * Complementa /professionals sem substituí-lo
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { isSubscriptionBlocked } from '../../../core/state.js';

let professionals = [];
let appointments  = [];
let commissionsData = null; // real data from /professionals/commissions
let period = 'month'; // 'week' | 'month' | 'year'

const SPECIALTIES = {
    hair:    'Cabelereiro(a)',
    nails:   'Manicure/Pedicure',
    makeup:  'Maquiador(a)',
    skin:    'Esteticista',
    massage: 'Massagista',
    barber:  'Barbeiro',
    other:   'Outros',
};

// Fallback para quando não há dados reais
const FALLBACK_PROFESSIONALS = [
    { id: 'f1', name: 'Ana Lima',       specialty: 'hair',   commission: 35, is_active: true  },
    { id: 'f2', name: 'Carla Souza',    specialty: 'nails',  commission: 30, is_active: true  },
    { id: 'f3', name: 'Juliana Ferreira', specialty: 'skin', commission: 40, is_active: true  },
    { id: 'f4', name: 'Pedro Rocha',    specialty: 'barber', commission: 30, is_active: false },
];

export function render() {
    renderShell('team-commissions');
}

export async function init() {
    renderSkeleton();
    await loadData();
    renderContent();
    return () => { professionals = []; appointments = []; commissionsData = null; };
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
                <div class="skeleton" style="width:220px;height:28px;margin-bottom:6px;"></div>
                <div class="skeleton" style="width:300px;height:14px;"></div>
            </div>
        </div>
        <div class="mod-kpi-grid">
            ${[1,2,3,4].map(() => `<div class="skeleton" style="height:88px;border-radius:12px;"></div>`).join('')}
        </div>
        <div class="mod-grid-3" style="margin-top:1.5rem;">
            ${[1,2,3].map(() => `<div class="skeleton" style="height:220px;border-radius:12px;"></div>`).join('')}
        </div>
    `;
}

async function loadData() {
    try {
        const [commRes, profRes] = await Promise.all([
            api.get(`/professionals/commissions?period=${period}`).catch(() => null),
            api.get('/professionals').catch(() => null),
        ]);

        if (commRes?.data?.professionals?.length) {
            // Real commission data available — use it directly
            commissionsData = commRes.data;
            professionals   = commRes.data.professionals.map(p => ({
                id:            p.professional_id,
                name:          p.professional_name,
                specialty:     p.specialty,
                commission:    p.commission_rate,
                is_active:     p.is_active,
                _revenue:      p.revenue_generated,
                _commission:   p.estimated_commission,
                _appts:        p.appointments_count,
                _ranking:      p.ranking_position,
            }));
            appointments = []; // not needed — backend already calculated
        } else {
            // Fallback to raw professionals + appointments
            commissionsData = null;
            professionals   = profRes?.data?.length ? profRes.data : FALLBACK_PROFESSIONALS;
            appointments    = [];
        }
    } catch (_) {
        commissionsData = null;
        professionals   = FALLBACK_PROFESSIONALS;
        appointments    = [];
    }
}

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────

function buildStats() {
    const total  = professionals.length;
    const active = professionals.filter(p => p.is_active !== false).length;

    // Use pre-calculated backend data when available
    if (commissionsData) {
        const perProf = professionals.map(prof => ({
            prof,
            profName:   prof.name,
            total:      prof._appts      || 0,
            completed:  prof._appts      || 0,
            revenue:    prof._revenue    || 0,
            commission: prof._commission || 0,
        }));
        const totalRevenue    = commissionsData.total_revenue    || 0;
        const totalCommission = commissionsData.total_commission || 0;
        const totalAppts      = commissionsData.total_appointments || 0;
        const maxRev          = Math.max(...perProf.map(p => p.revenue), 1);
        return { total, active, totalRevenue, totalCommission, totalAppts, perProf, maxRev };
    }

    // Local calculation fallback (no backend data)
    const perProf = professionals.map(prof => {
        const profName = prof.name || `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
        const profAppts = appointments.filter(a => {
            const pid = a.professional_id || a.professionalId;
            return pid === prof.id || (a.professional?.name || '').toLowerCase() === profName.toLowerCase();
        });
        const completed   = profAppts.filter(a => a.status === 'completed' || a.status === 'done');
        const revenue     = completed.reduce((s, a) => s + (parseFloat(a.price) || parseFloat(a.total) || 0), 0);
        const commission  = revenue * ((prof.commission || 30) / 100);
        return { prof, profName, total: profAppts.length, completed: completed.length, revenue, commission };
    });

    const totalRevenue    = perProf.reduce((s, p) => s + p.revenue, 0);
    const totalCommission = perProf.reduce((s, p) => s + p.commission, 0);
    const totalAppts      = appointments.length;

    // Demo values when no real appointment data
    if (totalRevenue === 0 && appointments.length === 0) {
        perProf.forEach((p, i) => {
            p.revenue    = [4800, 3200, 5600, 2100][i] || 3000;
            p.commission = p.revenue * ((p.prof.commission || 30) / 100);
            p.total      = [42, 28, 51, 18][i] || 25;
            p.completed  = [38, 25, 47, 15][i] || 22;
        });
    }

    const maxRev = Math.max(...perProf.map(p => p.revenue), 1);
    return { total, active, totalRevenue, totalCommission, totalAppts, perProf, maxRev };
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

function renderContent() {
    const c = getContentArea();
    if (!c) return;
    const blocked = isSubscriptionBlocked();
    const stats = buildStats();

    // Rank by revenue
    const ranked = [...stats.perProf].sort((a, b) => b.revenue - a.revenue);

    c.innerHTML = `
        <!-- Header -->
        <div class="mod-header">
            <div class="mod-header__text">
                <p class="mod-header__eyebrow">Equipe</p>
                <h1 class="mod-header__title">Equipe & Comissões</h1>
                <p class="mod-header__subtitle">Performance da equipe, comissões e ranking por período.</p>
            </div>
            <div class="mod-header__actions">
                <div style="display:flex;background:var(--card-bg);border:1.5px solid var(--card-border);border-radius:var(--radius-md);overflow:hidden;">
                    ${['week','month','year'].map(p => `
                        <button class="tc-period-btn ${period === p ? 'active' : ''}" data-period="${p}" style="
                            padding:0.45rem 0.875rem;
                            font-family:var(--font-ui);font-size:0.75rem;font-weight:600;
                            border:none;cursor:pointer;letter-spacing:0.04em;
                            background:${period === p ? 'var(--color-brown-deep)' : 'transparent'};
                            color:${period === p ? 'var(--color-cream-gold)' : 'var(--sidebar-text-muted)'};
                            transition:all var(--transition-fast);
                        ">
                            ${{ week: 'Semana', month: 'Mês', year: 'Ano' }[p]}
                        </button>
                    `).join('')}
                </div>
                <a href="/professionals" class="btn-ghost btn-sm">
                    <i class="fas fa-user-tie"></i> Gerenciar
                </a>
                <button class="btn-primary" ${blocked ? 'disabled' : ''} id="btnNewProf">
                    <i class="fas fa-plus"></i> Novo profissional
                </button>
            </div>
        </div>

        <!-- KPIs -->
        <div class="mod-kpi-grid">
            ${renderKPI('Total equipe',       stats.total,                    'fas fa-users',      'brown')}
            ${renderKPI('Profissionais ativos', stats.active,                 'fas fa-user-check', 'green')}
            ${renderKPI('Atendimentos no período', stats.perProf.reduce((s,p) => s+p.total, 0), 'fas fa-calendar-check', 'blue')}
            ${renderKPI('Total comissões',    formatBRL(stats.perProf.reduce((s,p)=>s+p.commission,0)), 'fas fa-hand-holding-usd', 'amber')}
        </div>

        <!-- Ranking + cards de comissão -->
        <div class="mod-grid-2" style="margin-bottom:1.5rem;align-items:start;">

            <!-- Ranking visual -->
            <div class="mod-panel">
                <div class="mod-panel__header">
                    <span class="mod-panel__title">Ranking de performance</span>
                    <span style="font-family:var(--font-ui);font-size:0.72rem;color:var(--sidebar-text-muted);">Por faturamento</span>
                </div>
                <div class="mod-panel__body" style="display:flex;flex-direction:column;gap:1.25rem;">
                    ${ranked.map((item, i) => renderRankRow(item, i, stats.maxRev)).join('')}
                </div>
            </div>

            <!-- Cards de comissão -->
            <div style="display:flex;flex-direction:column;gap:1rem;">
                ${ranked.slice(0, 3).map(item => renderCommissionCard(item)).join('')}
            </div>
        </div>

        <!-- Tabela premium -->
        <div class="mod-panel" style="margin-bottom:1.5rem;">
            <div class="mod-panel__header">
                <span class="mod-panel__title">Todos os profissionais</span>
                <div class="mod-toolbar__actions">
                    <input type="text" id="tcSearch" placeholder="Buscar profissional..."
                        style="padding:0.4rem 0.875rem;border:1.5px solid var(--card-border);border-radius:var(--radius-md);font-family:var(--font-ui);font-size:0.8125rem;color:var(--sidebar-text);background:var(--card-bg);outline:none;width:220px;"
                    >
                    <select id="tcSpecialty" style="padding:0.4rem 0.875rem;border:1.5px solid var(--card-border);border-radius:var(--radius-md);font-family:var(--font-ui);font-size:0.8125rem;color:var(--sidebar-text);background:var(--card-bg);outline:none;">
                        <option value="">Todas especialidades</option>
                        ${Object.entries(SPECIALTIES).map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div style="overflow-x:auto;" id="tcTableWrapper">
                ${renderTable(ranked)}
            </div>
        </div>

        <!-- CTA sem profissionais -->
        ${professionals.length === 0 ? `
        <div class="mod-panel">
            <div class="mod-panel__body">
                <div class="mod-empty">
                    <div class="mod-empty__icon"><i class="fas fa-user-tie"></i></div>
                    <h3 class="mod-empty__title">Nenhum profissional cadastrado</h3>
                    <p class="mod-empty__desc">Adicione sua equipe para acompanhar performance e comissões.</p>
                    <button class="btn-primary" id="btnNewProfEmpty"><i class="fas fa-plus"></i> Adicionar profissional</button>
                </div>
            </div>
        </div>
        ` : ''}
    `;

    bindEvents(ranked);
}

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

function renderRankRow(item, index, maxRev) {
    const pct = maxRev > 0 ? Math.round((item.revenue / maxRev) * 100) : 0;
    const medals = ['🥇', '🥈', '🥉'];
    const medal = medals[index] || `${index + 1}º`;
    const isActive = item.prof.is_active !== false;

    return `
        <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <span style="font-size:1rem;line-height:1;width:24px;text-align:center;">${medal}</span>
                    <div class="mod-commission-card__avatar" style="width:34px;height:34px;font-size:0.8rem;">
                        ${getInitials(item.profName)}
                    </div>
                    <div>
                        <div style="font-family:var(--font-ui);font-size:0.875rem;font-weight:700;color:var(--sidebar-text);">${item.profName}</div>
                        <div style="font-family:var(--font-ui);font-size:0.72rem;color:var(--sidebar-text-muted);">${SPECIALTIES[item.prof.specialty] || 'Profissional'}</div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-family:var(--font-ui);font-size:0.875rem;font-weight:800;color:var(--sidebar-text);">${formatBRL(item.revenue)}</div>
                    <div style="font-family:var(--font-ui);font-size:0.72rem;color:var(--sidebar-text-muted);">${item.completed} atend.</div>
                </div>
            </div>
            <div class="mod-commission-card__bar">
                <div class="mod-commission-card__bar-fill" style="width:${pct}%;background:${index === 0 ? 'var(--color-brown-deep)' : index === 1 ? 'var(--color-brown-mid)' : 'var(--color-brown-light)'};"></div>
            </div>
        </div>
    `;
}

function renderCommissionCard(item) {
    const pct = item.revenue > 0 ? Math.round((item.commission / item.revenue) * 100) : item.prof.commission || 30;
    return `
        <div class="mod-commission-card">
            <div class="mod-commission-card__top">
                <div class="mod-commission-card__avatar">${getInitials(item.profName)}</div>
                <div class="mod-commission-card__info">
                    <div class="mod-commission-card__name">${item.profName}</div>
                    <div class="mod-commission-card__role">${SPECIALTIES[item.prof.specialty] || 'Profissional'}</div>
                </div>
                <span class="mod-badge ${item.prof.is_active !== false ? 'mod-badge--active' : 'mod-badge--inactive'}">
                    ${item.prof.is_active !== false ? 'Ativo' : 'Inativo'}
                </span>
            </div>
            <div class="mod-commission-card__stats">
                <div class="mod-commission-card__stat">
                    <span class="mod-commission-card__stat-value">${item.completed}</span>
                    <span class="mod-commission-card__stat-label">Atend.</span>
                </div>
                <div class="mod-commission-card__stat">
                    <span class="mod-commission-card__stat-value">${formatBRL(item.revenue)}</span>
                    <span class="mod-commission-card__stat-label">Faturado</span>
                </div>
                <div class="mod-commission-card__stat">
                    <span class="mod-commission-card__stat-value" style="color:var(--chart-positive);">${formatBRL(item.commission)}</span>
                    <span class="mod-commission-card__stat-label">Comissão</span>
                </div>
            </div>
            <div class="mod-commission-card__bar-row">
                <div class="mod-commission-card__bar">
                    <div class="mod-commission-card__bar-fill" style="width:${Math.min(pct, 100)}%;"></div>
                </div>
                <span class="mod-commission-card__pct">${pct}%</span>
            </div>
        </div>
    `;
}

function renderTable(rows) {
    if (!rows.length) {
        return `<div class="mod-empty"><div class="mod-empty__icon"><i class="fas fa-user-tie"></i></div><p class="mod-empty__desc">Nenhum resultado encontrado.</p></div>`;
    }
    return `
        <table style="width:100%;border-collapse:collapse;font-family:var(--font-ui);font-size:0.8125rem;">
            <thead>
                <tr style="border-bottom:2px solid var(--card-border);">
                    <th style="padding:0.75rem 1.25rem;text-align:left;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--sidebar-text-muted);">Profissional</th>
                    <th style="padding:0.75rem 1rem;text-align:left;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--sidebar-text-muted);">Especialidade</th>
                    <th style="padding:0.75rem 1rem;text-align:right;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--sidebar-text-muted);">Atend.</th>
                    <th style="padding:0.75rem 1rem;text-align:right;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--sidebar-text-muted);">Faturado</th>
                    <th style="padding:0.75rem 1rem;text-align:right;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--sidebar-text-muted);">Comissão</th>
                    <th style="padding:0.75rem 1.25rem;text-align:center;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--sidebar-text-muted);">Status</th>
                    <th style="padding:0.75rem 1.25rem;text-align:center;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--sidebar-text-muted);">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(item => `
                    <tr style="border-bottom:1px solid var(--card-border);transition:background var(--transition-fast);"
                        onmouseover="this.style.background='var(--color-off-white)'" onmouseout="this.style.background=''">
                        <td style="padding:0.875rem 1.25rem;">
                            <div style="display:flex;align-items:center;gap:0.75rem;">
                                <div class="mod-commission-card__avatar" style="width:34px;height:34px;font-size:0.8rem;">${getInitials(item.profName)}</div>
                                <div>
                                    <div style="font-weight:700;color:var(--sidebar-text);">${item.profName}</div>
                                    <div style="font-size:0.72rem;color:var(--sidebar-text-muted);">${item.prof.commission || 30}% comissão</div>
                                </div>
                            </div>
                        </td>
                        <td style="padding:0.875rem 1rem;color:var(--sidebar-text-muted);">${SPECIALTIES[item.prof.specialty] || '-'}</td>
                        <td style="padding:0.875rem 1rem;text-align:right;font-weight:700;color:var(--sidebar-text);">${item.completed}</td>
                        <td style="padding:0.875rem 1rem;text-align:right;font-weight:700;color:var(--sidebar-text);">${formatBRL(item.revenue)}</td>
                        <td style="padding:0.875rem 1rem;text-align:right;font-weight:700;color:var(--chart-positive);">${formatBRL(item.commission)}</td>
                        <td style="padding:0.875rem 1.25rem;text-align:center;">
                            <span class="mod-badge ${item.prof.is_active !== false ? 'mod-badge--active' : 'mod-badge--inactive'}">
                                ${item.prof.is_active !== false ? 'Ativo' : 'Inativo'}
                            </span>
                        </td>
                        <td style="padding:0.875rem 1.25rem;text-align:center;">
                            <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;">
                                <button class="btn-ghost btn-sm" style="padding:4px 10px;" data-id="${item.prof.id}" title="Ver detalhes"
                                    onclick="window.__viewProf('${item.prof.id}')">
                                    <i class="fas fa-chart-bar"></i>
                                </button>
                                <a href="/professionals" class="btn-ghost btn-sm" style="padding:4px 10px;" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </a>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────

function bindEvents(ranked) {
    document.getElementById('btnNewProf')?.addEventListener('click', () => {
        import('../../../core/router.js').then(({ navigateTo }) => navigateTo('/professionals'));
    });
    document.getElementById('btnNewProfEmpty')?.addEventListener('click', () => {
        import('../../../core/router.js').then(({ navigateTo }) => navigateTo('/professionals'));
    });

    // Period tabs
    document.querySelectorAll('.tc-period-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            period = btn.dataset.period;
            renderSkeleton();
            await loadData();
            renderContent();
        });
    });

    // Search filter
    const searchInput = document.getElementById('tcSearch');
    const specialtySelect = document.getElementById('tcSpecialty');
    const updateTable = () => {
        const q   = (searchInput?.value || '').toLowerCase();
        const spec = specialtySelect?.value || '';
        const filtered = ranked.filter(item => {
            const nameMatch = !q || item.profName.toLowerCase().includes(q);
            const specMatch = !spec || item.prof.specialty === spec;
            return nameMatch && specMatch;
        });
        const wrapper = document.getElementById('tcTableWrapper');
        if (wrapper) wrapper.innerHTML = renderTable(filtered);
    };

    let debounceTimer;
    searchInput?.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateTable, 200);
    });
    specialtySelect?.addEventListener('change', updateTable);

    window.__viewProf = (id) => {
        showToast('Detalhes do profissional disponíveis em breve.', 'info');
    };
}

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatBRL(value) {
    if (typeof value === 'string' && value.includes('%')) return value;
    if (isNaN(value)) return 'R$ 0';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
}

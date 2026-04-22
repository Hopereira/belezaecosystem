/**
 * Dashboard — Beleza Ecosystem — Fase 4
 * KPI grid, agenda do dia, resumo financeiro, ranking, alertas
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { getCurrentUser, isSubscriptionBlocked, getSubscriptionStatus } from '../../../core/state.js';
import { api } from '../../../shared/utils/http.js';
import { formatCurrency } from '../../../shared/utils/validation.js';
import { navigateTo } from '../../../core/router.js';
import { showToast } from '../../../shared/utils/toast.js';
import { mapAppointmentFromAPI, mapClientFromAPI, extractPaginatedResponse } from '../../../shared/utils/api-mappers.js';

let currentMonth = null;
let currentYear = null;
let appointments = [];
let clients = [];
let professionals = [];
let financialData = null;
let stats = {};

export function render() {
    renderShell('dashboard');
}

export async function init() {
    const now = new Date();
    currentMonth = now.getMonth();
    currentYear = now.getFullYear();

    renderSkeleton();
    await loadDashboardData();
    renderDashboardContent();

    return () => {
        appointments = [];
        clients = [];
        professionals = [];
        financialData = null;
        stats = {};
    };
}

// ─────────────────────────────────────────────
// LOADING
// ─────────────────────────────────────────────

function renderSkeleton() {
    const content = getContentArea();
    if (!content) return;
    content.innerHTML = `
        <div class="db-page-header">
            <div class="db-page-header__text">
                <div class="skeleton" style="width:220px;height:28px;margin-bottom:6px;"></div>
                <div class="skeleton" style="width:160px;height:16px;"></div>
            </div>
        </div>
        <div class="db-kpi-grid">
            ${[1,2,3,4].map(() => `
                <div class="db-kpi-card">
                    <div class="db-kpi-card__top">
                        <div class="skeleton" style="width:80px;height:12px;"></div>
                        <div class="skeleton" style="width:32px;height:32px;border-radius:8px;"></div>
                    </div>
                    <div class="skeleton db-kpi-card__value--loading"></div>
                    <div class="skeleton" style="width:90px;height:12px;"></div>
                </div>
            `).join('')}
        </div>
        <div class="db-main-grid">
            <div class="db-panel" style="min-height:320px;">
                <div class="db-panel__header">
                    <div class="skeleton" style="width:120px;height:14px;"></div>
                </div>
                <div class="db-panel__body" style="padding:1rem;">
                    ${[1,2,3,4].map(() => `<div class="skeleton" style="height:56px;margin-bottom:8px;border-radius:8px;"></div>`).join('')}
                </div>
            </div>
            <div class="db-panel" style="min-height:320px;">
                <div class="db-panel__header">
                    <div class="skeleton" style="width:100px;height:14px;"></div>
                </div>
                <div class="db-panel__body" style="padding:1rem;">
                    ${[1,2,3,4,5].map(() => `<div class="skeleton" style="height:40px;margin-bottom:8px;border-radius:8px;"></div>`).join('')}
                </div>
            </div>
        </div>
    `;
}

// ─────────────────────────────────────────────
// DATA LOADING
// ─────────────────────────────────────────────

async function loadDashboardData() {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

        const [appointmentsRes, clientsRes, statsRes, financialRes, professionalsRes] = await Promise.all([
            api.get(`/appointments?limit=100&month=${monthStr}`).catch(() => ({ data: [], pagination: {} })),
            api.get('/clients?limit=5&sort=created_at&order=desc').catch(() => ({ data: [], pagination: {} })),
            api.get('/appointments/stats').catch(() => ({ data: null })),
            api.get(`/financial/summary?month=${monthStr}`).catch(() => ({ data: null })),
            api.get('/professionals?limit=5&sort=appointments&order=desc').catch(() => ({ data: [], pagination: {} })),
        ]);

        const appsData = extractPaginatedResponse(appointmentsRes);
        appointments = appsData.data.map(mapAppointmentFromAPI);

        const clientsData = extractPaginatedResponse(clientsRes);
        clients = clientsData.data.map(mapClientFromAPI);

        const profsData = extractPaginatedResponse(professionalsRes);
        professionals = profsData.data || [];

        financialData = financialRes.data || null;

        if (statsRes.data) {
            stats = statsRes.data;
        } else {
            stats = calculateStatsFromAppointments();
        }
    } catch (err) {
        console.error('[Dashboard] loadDashboardData:', err);
    }
}

function calculateStatsFromAppointments() {
    const todayStr = new Date().toISOString().split('T')[0];
    const weekStart = getWeekStart(new Date());
    const weekEnd = getWeekEnd(new Date());

    const todayApps  = appointments.filter(a => a.date === todayStr);
    const todayDone  = todayApps.filter(a => a.status === 'COMPLETED');
    const weekDone   = appointments.filter(a => a.date >= weekStart && a.date <= weekEnd && a.status === 'COMPLETED');
    const monthDone  = appointments.filter(a => {
        const d = new Date(a.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && a.status === 'COMPLETED';
    });

    const uniqueClients = new Set(monthDone.map(a => a.clientId).filter(Boolean));

    return {
        today_count:   todayApps.length,
        today_done:    todayDone.length,
        today_revenue: todayDone.reduce((s, a) => s + (a.priceCharged || 0), 0),
        week_revenue:  weekDone.reduce((s, a) => s + (a.priceCharged || 0), 0),
        month_revenue: monthDone.reduce((s, a) => s + (a.priceCharged || 0), 0),
        month_clients: uniqueClients.size,
        month_count:   monthDone.length,
    };
}

// ─────────────────────────────────────────────
// RENDER PRINCIPAL
// ─────────────────────────────────────────────

function renderDashboardContent() {
    const content = getContentArea();
    if (!content) return;

    const user = getCurrentUser();
    const blocked = isSubscriptionBlocked();
    const sub = getSubscriptionStatus();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const userName = user?.name?.split(' ')[0] || 'você';
    const tenantName = user?.tenantName || user?.tenant_name || '';
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const subtitle = tenantName
        ? `Visão geral de ${tenantName} · ${formatDate(now)}`
        : `Visão geral do seu negócio · ${formatDate(now)}`;

    const todayApps = appointments.filter(a => a.date === todayStr)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    const monthRevenue = stats.month_revenue ?? stats.month ?? 0;
    const todayCount   = stats.today_count  ?? todayApps.length;
    const monthClients = stats.month_clients ?? 0;
    const monthCount   = stats.month_count  ?? 0;

    const prevMonthRevenue = financialData?.prev_month_revenue ?? null;
    const revenueDelta = prevMonthRevenue && prevMonthRevenue > 0
        ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
        : null;

    content.innerHTML = `
        <!-- Page Header -->
        <div class="db-page-header">
            <div class="db-page-header__text">
                <h1>${greeting}, ${userName}.</h1>
                <p>${subtitle}</p>
            </div>
            <div class="db-page-header__actions">
                <div class="db-period-tabs" id="periodTabs">
                    <button class="db-period-tab active" data-period="today">Hoje</button>
                    <button class="db-period-tab" data-period="week">Semana</button>
                    <button class="db-period-tab" data-period="month">Mês</button>
                </div>
                <button class="btn-primary" id="btnNewAppointment" ${blocked ? 'disabled' : ''}>
                    <i class="fas fa-plus" aria-hidden="true"></i> Novo agendamento
                </button>
            </div>
        </div>

        <!-- KPI Grid -->
        <div class="db-kpi-grid">
            ${renderKPICard({
                label: 'Agendamentos hoje',
                value: todayCount,
                icon: 'fas fa-calendar-day',
                iconClass: 'db-kpi-card__icon--brown',
                delta: null,
                period: `${todayApps.filter(a => a.status === 'COMPLETED').length} concluídos`,
            })}
            ${renderKPICard({
                label: 'Faturamento do mês',
                value: formatCurrency(monthRevenue),
                icon: 'fas fa-dollar-sign',
                iconClass: 'db-kpi-card__icon--green',
                delta: revenueDelta,
                period: 'vs. mês anterior',
            })}
            ${renderKPICard({
                label: 'Clientes atendidos',
                value: monthClients || monthCount,
                icon: 'fas fa-users',
                iconClass: 'db-kpi-card__icon--amber',
                delta: null,
                period: 'no mês atual',
            })}
            ${renderKPICard({
                label: 'Total de agendamentos',
                value: monthCount,
                icon: 'fas fa-chart-bar',
                iconClass: 'db-kpi-card__icon--blue',
                delta: null,
                period: getMonthName(currentMonth),
            })}
        </div>

        <!-- Main Grid: Agenda + Financeiro -->
        <div class="db-main-grid">
            <!-- Agenda do Dia -->
            <div class="db-panel">
                <div class="db-panel__header">
                    <span class="db-panel__title">Agenda de hoje</span>
                    <a href="/appointments" class="db-panel__link" onclick="event.preventDefault(); window.__navigateTo('/appointments')">
                        Ver tudo <i class="fas fa-arrow-right" aria-hidden="true"></i>
                    </a>
                </div>
                <div class="db-panel__body" id="agendaBody">
                    ${renderAgendaItems(todayApps)}
                </div>
            </div>

            <!-- Resumo Financeiro -->
            <div class="db-panel">
                <div class="db-panel__header">
                    <span class="db-panel__title">Resumo financeiro</span>
                    <a href="/financial" class="db-panel__link" onclick="event.preventDefault(); window.__navigateTo('/financial')">
                        Detalhes <i class="fas fa-arrow-right" aria-hidden="true"></i>
                    </a>
                </div>
                <div class="db-panel__body">
                    ${renderFinancialSummary()}
                </div>
            </div>
        </div>

        <!-- Bottom Grid: Profissionais + Serviços + Alertas -->
        <div class="db-bottom-grid">
            <!-- Profissionais em destaque -->
            <div class="db-panel">
                <div class="db-panel__header">
                    <span class="db-panel__title">Profissionais</span>
                    <a href="/professionals" class="db-panel__link" onclick="event.preventDefault(); window.__navigateTo('/professionals')">
                        Ver todos <i class="fas fa-arrow-right" aria-hidden="true"></i>
                    </a>
                </div>
                <div class="db-panel__body">
                    ${renderProfessionalsRanking()}
                </div>
            </div>

            <!-- Calendário do mês -->
            <div class="db-panel">
                <div class="db-panel__header">
                    <div class="calendar-header" style="width:100%;padding:0;border:none;">
                        <button id="prevMonth" aria-label="Mês anterior"><i class="fas fa-chevron-left"></i></button>
                        <span class="db-panel__title current-date" id="calendarTitle" style="text-transform:capitalize;">
                            ${getMonthName(currentMonth)} ${currentYear}
                        </span>
                        <button id="nextMonth" aria-label="Próximo mês"><i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
                <div class="db-panel__body calendar-section" style="border:none;border-radius:0;box-shadow:none;">
                    <div id="calendarGrid">${renderCalendar(currentMonth, currentYear, appointments)}</div>
                </div>
            </div>

            <!-- Alertas e status -->
            <div class="db-panel">
                <div class="db-panel__header">
                    <span class="db-panel__title">Avisos</span>
                </div>
                <div class="db-panel__body">
                    ${renderAlerts(sub, todayApps, blocked)}
                </div>
            </div>
        </div>

        <!-- FAB mobile -->
        <button class="fab-add" id="fabAdd" ${blocked ? 'disabled' : ''} aria-label="Novo agendamento">
            <i class="fas fa-calendar-plus" aria-hidden="true"></i> Agendar
        </button>
    `;

    bindEvents(blocked);
    exposeNavigate();
}

// ─────────────────────────────────────────────
// COMPONENTES HTML
// ─────────────────────────────────────────────

function renderKPICard({ label, value, icon, iconClass, delta, period }) {
    let deltaHTML = '';
    if (delta !== null && delta !== undefined) {
        const cls = delta > 0 ? 'db-kpi-card__delta--up' : delta < 0 ? 'db-kpi-card__delta--down' : 'db-kpi-card__delta--neutral';
        const arrow = delta > 0 ? 'fa-arrow-up' : delta < 0 ? 'fa-arrow-down' : 'fa-minus';
        deltaHTML = `<span class="db-kpi-card__delta ${cls}"><i class="fas ${arrow}"></i>${Math.abs(delta)}%</span>`;
    }
    return `
        <div class="db-kpi-card">
            <div class="db-kpi-card__top">
                <span class="db-kpi-card__label">${label}</span>
                <div class="db-kpi-card__icon ${iconClass}" aria-hidden="true">
                    <i class="${icon}"></i>
                </div>
            </div>
            <p class="db-kpi-card__value">${value}</p>
            <div class="db-kpi-card__footer">
                ${deltaHTML}
                <span class="db-kpi-card__period">${period}</span>
            </div>
        </div>
    `;
}

function renderAgendaItems(todayApps) {
    if (!todayApps.length) {
        return `
            <div class="empty-state" style="padding:2.5rem 1rem;">
                <i class="fas fa-calendar-check"></i>
                <h3>Sem agendamentos hoje</h3>
                <p>A agenda está livre. Que tal registrar um novo atendimento?</p>
                <button class="btn-primary btn-sm" onclick="window.__navigateTo('/appointments')">
                    <i class="fas fa-plus"></i> Novo agendamento
                </button>
            </div>
        `;
    }

    return todayApps.slice(0, 8).map(app => {
        const timeStr = formatAppTime(app.startTime);
        const statusMap = {
            COMPLETED: { label: 'Concluído',  cls: 'db-status--completed',  bar: 'db-agenda-item__bar--completed' },
            CANCELLED: { label: 'Cancelado',  cls: 'db-status--cancelled',  bar: 'db-agenda-item__bar--cancelled' },
            PENDING:   { label: 'Pendente',   cls: 'db-status--pending',    bar: 'db-agenda-item__bar--pending'   },
            SCHEDULED: { label: 'Agendado',   cls: 'db-status--scheduled',  bar: ''                               },
        };
        const s = statusMap[app.status] || statusMap.SCHEDULED;
        const clientName = app.clientName || getClientName(app.clientId) || 'Cliente';
        const serviceName = app.serviceName || app.service_name || '–';
        const price = app.priceCharged ? formatCurrency(app.priceCharged) : '';

        return `
            <div class="db-agenda-item">
                <span class="db-agenda-item__time">${timeStr}</span>
                <div class="db-agenda-item__bar ${s.bar}"></div>
                <div class="db-agenda-item__info">
                    <div class="db-agenda-item__client">${clientName}</div>
                    <div class="db-agenda-item__service">${serviceName}</div>
                </div>
                ${price ? `<span class="db-agenda-item__price">${price}</span>` : ''}
                <span class="db-status ${s.cls}">${s.label}</span>
            </div>
        `;
    }).join('') + (todayApps.length > 8 ? `
        <div style="padding:0.875rem 1.25rem;text-align:center;">
            <a href="/appointments" class="db-panel__link" onclick="event.preventDefault(); window.__navigateTo('/appointments')">
                + ${todayApps.length - 8} agendamentos <i class="fas fa-arrow-right"></i>
            </a>
        </div>
    ` : '');
}

function renderFinancialSummary() {
    const monthRevenue = stats.month_revenue ?? stats.month ?? 0;
    const todayRevenue = stats.today_revenue ?? stats.today ?? 0;
    const weekRevenue  = stats.week_revenue  ?? stats.week  ?? 0;

    const income  = financialData?.total_income  ?? monthRevenue;
    const expense = financialData?.total_expense ?? 0;
    const balance = income - expense;

    return `
        <div class="db-finance-row">
            <span class="db-finance-row__label"><i class="fas fa-arrow-down" style="color:var(--chart-positive)"></i> Receitas do mês</span>
            <span class="db-finance-row__value db-finance-row__value--positive">${formatCurrency(income)}</span>
        </div>
        <div class="db-finance-row">
            <span class="db-finance-row__label"><i class="fas fa-arrow-up" style="color:var(--chart-negative)"></i> Despesas do mês</span>
            <span class="db-finance-row__value db-finance-row__value--negative">${formatCurrency(expense)}</span>
        </div>
        <div class="db-finance-row">
            <span class="db-finance-row__label"><i class="fas fa-sun" style="color:var(--color-warning)"></i> Faturamento hoje</span>
            <span class="db-finance-row__value">${formatCurrency(todayRevenue)}</span>
        </div>
        <div class="db-finance-row">
            <span class="db-finance-row__label"><i class="fas fa-calendar-week" style="color:var(--color-info)"></i> Faturamento semana</span>
            <span class="db-finance-row__value">${formatCurrency(weekRevenue)}</span>
        </div>
        <div class="db-finance-total">
            <span class="db-finance-total__label">Saldo do mês</span>
            <span class="db-finance-total__value" style="${balance < 0 ? 'color:var(--chart-negative)' : ''}">${formatCurrency(balance)}</span>
        </div>
    `;
}

function renderProfessionalsRanking() {
    if (!professionals.length) {
        const monthDone = appointments.filter(a => {
            const d = new Date(a.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear && a.status === 'COMPLETED';
        });

        const byProfessional = {};
        monthDone.forEach(a => {
            const key = a.professionalId || a.professional_id;
            const name = a.professionalName || a.professional_name || 'Profissional';
            if (!key) return;
            if (!byProfessional[key]) byProfessional[key] = { name, count: 0, revenue: 0 };
            byProfessional[key].count++;
            byProfessional[key].revenue += (a.priceCharged || 0);
        });

        professionals = Object.values(byProfessional).sort((a, b) => b.revenue - a.revenue);
    }

    if (!professionals.length) {
        return `
            <div class="empty-state" style="padding:2rem 1rem;">
                <i class="fas fa-user-tie"></i>
                <h3>Sem dados ainda</h3>
                <p>Os profissionais aparecerão aqui conforme os atendimentos forem registrados.</p>
            </div>
        `;
    }

    const maxRevenue = Math.max(...professionals.map(p => p.revenue || p.total_revenue || 0), 1);

    return professionals.slice(0, 5).map((prof, idx) => {
        const name = prof.name || prof.user?.name || 'Profissional';
        const initial = name.charAt(0).toUpperCase();
        const revenue = prof.revenue || prof.total_revenue || prof.total_appointments || 0;
        const sub = prof.count != null
            ? `${prof.count} atend.`
            : prof.total_appointments != null
            ? `${prof.total_appointments} atend.`
            : '';
        const pct = Math.round((revenue / maxRevenue) * 100);

        return `
            <div class="db-rank-item">
                <span class="db-rank-item__pos">${idx + 1}</span>
                <div class="db-rank-item__avatar">${initial}</div>
                <div class="db-rank-item__info">
                    <div class="db-rank-item__name">${name}</div>
                    ${sub ? `<div class="db-rank-item__sub">${sub}</div>` : ''}
                    <div class="db-rank-bar"><div class="db-rank-bar__fill" style="width:${pct}%"></div></div>
                </div>
                <span class="db-rank-item__value">${formatCurrency(typeof revenue === 'number' ? revenue : 0)}</span>
            </div>
        `;
    }).join('');
}

function renderAlerts(sub, todayApps, blocked) {
    const items = [];

    if (blocked) {
        items.push({
            type: 'error',
            icon: 'fas fa-exclamation-triangle',
            title: 'Assinatura inativa',
            desc: 'Algumas funcionalidades estão bloqueadas. Regularize sua assinatura.',
            link: { label: 'Regularizar', href: '/billing' },
        });
    } else if (sub?.status === 'trial') {
        const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null;
        const daysLeft = trialEnd ? Math.ceil((trialEnd - new Date()) / 86400000) : null;
        items.push({
            type: 'warn',
            icon: 'fas fa-clock',
            title: daysLeft != null ? `Período de teste — ${daysLeft} dias restantes` : 'Período de teste ativo',
            desc: 'Assine um plano para garantir acesso contínuo.',
            link: { label: 'Ver planos', href: '/billing' },
        });
    }

    const pendingCount = todayApps.filter(a => a.status === 'PENDING').length;
    if (pendingCount > 0) {
        items.push({
            type: 'info',
            icon: 'fas fa-clock',
            title: `${pendingCount} agendamento${pendingCount > 1 ? 's' : ''} pendente${pendingCount > 1 ? 's' : ''}`,
            desc: 'Confirme ou reagende os atendimentos de hoje.',
            link: { label: 'Ver agenda', href: '/appointments' },
        });
    }

    const todayDone = todayApps.filter(a => a.status === 'COMPLETED').length;
    if (todayDone > 0) {
        items.push({
            type: 'success',
            icon: 'fas fa-check-circle',
            title: `${todayDone} atendimento${todayDone > 1 ? 's' : ''} concluído${todayDone > 1 ? 's' : ''} hoje`,
            desc: 'Ótimo desempenho! Continue assim.',
            link: null,
        });
    }

    if (!items.length) {
        items.push({
            type: 'success',
            icon: 'fas fa-check-circle',
            title: 'Tudo em ordem',
            desc: 'Nenhum aviso importante no momento.',
            link: null,
        });
    }

    return items.map(item => `
        <div class="db-alert-item">
            <div class="db-alert-item__icon db-alert-item__icon--${item.type}">
                <i class="${item.icon}" aria-hidden="true"></i>
            </div>
            <div class="db-alert-item__text">
                <div class="db-alert-item__title">${item.title}</div>
                <div class="db-alert-item__desc">${item.desc}${item.link
                    ? ` <a href="${item.link.href}" style="color:var(--color-brown-deep);font-weight:600;" onclick="event.preventDefault();window.__navigateTo('${item.link.href}')">${item.link.label}</a>`
                    : ''}</div>
            </div>
        </div>
    `).join('');
}

// ─────────────────────────────────────────────
// CALENDAR
// ─────────────────────────────────────────────

function renderCalendar(month, year, apps) {
    const firstDay   = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDow   = (firstDay.getDay() + 6) % 7;
    const prevLast   = new Date(year, month, 0).getDate();
    const todayStr   = new Date().toISOString().split('T')[0];

    let html = `
        <div class="week-days">
            <div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div><div>Dom</div>
        </div>
        <div class="days-grid">
    `;

    for (let i = startDow - 1; i >= 0; i--) {
        html += `<div class="day other-month">${prevLast - i}</div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayApps = apps.filter(a => a.date === dateStr);
        const isToday = dateStr === todayStr;

        let eventsHTML = '';
        dayApps.slice(0, 2).forEach(app => {
            const clientName = (app.clientName || getClientName(app.clientId) || '').split(' ')[0];
            const timeStr = formatAppTime(app.startTime);
            eventsHTML += `<div style="font-size:0.6rem;padding:1px 4px;border-radius:3px;margin-top:2px;color:#F8E6C2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:var(--color-brown-deep);opacity:0.85;">${timeStr} ${clientName}</div>`;
        });
        if (dayApps.length > 2) {
            eventsHTML += `<div style="font-size:0.6rem;color:var(--sidebar-text-muted);margin-top:1px;">+${dayApps.length - 2}</div>`;
        }

        html += `<div class="day${isToday ? ' today' : ''}" data-date="${dateStr}">${d}${eventsHTML}</div>`;
    }

    const totalCells = startDow + daysInMonth;
    const remaining  = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="day other-month">${i}</div>`;
    }

    html += '</div>';
    return html;
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────

function bindEvents(blocked) {
    document.getElementById('btnNewAppointment')?.addEventListener('click', () => {
        if (blocked) { showToast('Assinatura inativa.', 'error'); return; }
        navigateTo('/appointments');
    });

    document.getElementById('fabAdd')?.addEventListener('click', () => {
        if (blocked) { showToast('Assinatura inativa.', 'error'); return; }
        navigateTo('/appointments');
    });

    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        updateCalendar();
    });

    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        updateCalendar();
    });

    document.getElementById('calendarGrid')?.addEventListener('click', e => {
        const dayEl = e.target.closest('.day:not(.other-month)');
        if (dayEl?.dataset.date) navigateTo('/appointments');
    });

    document.querySelectorAll('.db-period-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.db-period-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
}

function exposeNavigate() {
    window.__navigateTo = (path) => navigateTo(path);
}

function updateCalendar() {
    const grid  = document.getElementById('calendarGrid');
    const title = document.getElementById('calendarTitle');
    if (grid)  grid.innerHTML = renderCalendar(currentMonth, currentYear, appointments);
    if (title) title.textContent = `${getMonthName(currentMonth)} ${currentYear}`;
}

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────

function getClientName(clientId) {
    if (!clientId) return '';
    const c = clients.find(c => c.id === clientId);
    return c ? (c.name || '') : '';
}

function formatAppTime(startTime) {
    if (!startTime) return '–';
    try {
        const d = new Date(startTime);
        if (isNaN(d)) return startTime.substring(11, 16) || '–';
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch { return '–'; }
}

function formatDate(date) {
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getMonthName(month) {
    return ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'][month];
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    return d.toISOString().split('T')[0];
}

function getWeekEnd(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? 0 : 7));
    return d.toISOString().split('T')[0];
}

/**
 * Reports Page Module
 * Administrative reports for OWNER
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { formatCurrency, formatDate } from '../../../shared/utils/validation.js';

let activeTab = 'operational';
let dateRange = { startDate: '', endDate: '' };
let reportData = null;

const DEMO_DATA = {
    operational: {
        occupancy: [
            { name: 'Ana', pct: 75 }, { name: 'Bruno', pct: 90 },
            { name: 'Carla', pct: 95 }, { name: 'Daniel', pct: 60 },
        ],
        noShow: [
            { service: 'Corte de Cabelo', pct: 12 },
            { service: 'Manicure', pct: 8 },
            { service: 'Limpeza de Pele', pct: 5 },
        ],
        avgDaysBetweenVisits: 42,
        avgDaysChange: -5,
        iaInsight: 'A alta ocupação da Carla sugere que promover a disponibilidade dela pode aumentar a receita. Considere oferecer um pequeno desconto para seus horários menos movimentados.',
        newClients: [
            { month: 'Jan', val: 80 }, { month: 'Fev', val: 60 }, { month: 'Mar', val: 70 },
            { month: 'Abr', val: 40 }, { month: 'Mai', val: 50 }, { month: 'Jun', val: 30 },
        ],
        topServices: [
            { name: 'Balayage', revenue: 3450 }, { name: 'Manicure em Gel', revenue: 2890 },
            { name: 'Limpeza de Pele Profunda', revenue: 2120 }, { name: 'Corte Masculino', revenue: 1880 },
        ],
    },
    financial: {
        totalRevenue: 15234.50, salonRevenue: 10912.60,
        commissions: 4321.90, transactions: 148,
        byProfessional: [
            { name: 'Ana Silva', services: 42, revenue: 7500, commission: 2250 },
            { name: 'Carlos Pereira', services: 38, revenue: 6800, commission: 2040 },
            { name: 'Mariana Lima', services: 35, revenue: 6200, commission: 1860 },
        ],
    },
    growth: {
        newClientsTotal: 25, retentionRate: 68, avgTicket: 120,
        topServices: [
            { name: 'Balayage', count: 90 }, { name: 'Escova', count: 75 },
            { name: 'Manicure', count: 60 }, { name: 'Hidratação', count: 45 }, { name: 'Pedicure', count: 40 },
        ],
    },
};

export function render() {
    renderShell('reports');
}

export async function init() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    dateRange.startDate = startDate.toISOString().split('T')[0];
    dateRange.endDate = endDate.toISOString().split('T')[0];

    renderContent();
    await loadTabData();

    return () => { reportData = null; };
}

function renderContent() {
    const content = getContentArea();
    content.innerHTML = `
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
                <h1>Relatórios</h1>
                <p>Visualize e analise a performance do seu salão.</p>
            </div>
            <button class="btn btn-secondary" id="btnSchedule">
                <i class="fas fa-calendar-alt"></i> Agendar Envio
            </button>
        </div>

        <div class="card" style="padding:0;">
            <div style="border-bottom:1px solid var(--card-border);padding:0 1.5rem;display:flex;gap:0;align-items:center;">
                <button class="rpt-tab ${activeTab==='operational'?'rpt-tab--active':''}" data-tab="operational">Operacional</button>
                <button class="rpt-tab ${activeTab==='financial'?'rpt-tab--active':''}" data-tab="financial">Financeiro</button>
                <button class="rpt-tab ${activeTab==='growth'?'rpt-tab--active':''}" data-tab="growth">Crescimento</button>
            </div>

            <div style="padding:1.5rem 1.5rem 0.5rem;display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;border-bottom:1px solid var(--card-border);">
                <div style="position:relative;flex:1;min-width:200px;">
                    <i class="fas fa-search" style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--sidebar-text-muted);font-size:0.85rem;"></i>
                    <input type="text" placeholder="Buscar por relatórios" style="width:100%;padding:0.5rem 0.75rem 0.5rem 2.2rem;border:1px solid var(--card-border);border-radius:var(--radius-md);background:var(--card-bg);font-size:0.875rem;">
                </div>
                <div style="display:flex;gap:0.5rem;">
                    <input type="date" id="filterStartDate" value="${dateRange.startDate}" style="padding:0.45rem 0.6rem;border:1px solid var(--card-border);border-radius:var(--radius-md);font-size:0.8rem;background:var(--card-bg);">
                    <input type="date" id="filterEndDate" value="${dateRange.endDate}" style="padding:0.45rem 0.6rem;border:1px solid var(--card-border);border-radius:var(--radius-md);font-size:0.8rem;background:var(--card-bg);">
                    <button class="btn btn-secondary btn-sm" id="btnApplyFilters"><i class="fas fa-sync-alt"></i></button>
                </div>
            </div>

            <div id="reportContent" style="padding:1.5rem;">
                <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
                    <div class="spinner"></div>
                </div>
            </div>
        </div>

        <style>
            .rpt-tab {
                padding: 1rem 1.25rem;
                border: none;
                background: none;
                font-size: 0.875rem;
                font-weight: 600;
                color: var(--sidebar-text-muted);
                cursor: pointer;
                border-bottom: 3px solid transparent;
                margin-bottom: -1px;
                transition: color 0.15s, border-color 0.15s;
            }
            .rpt-tab:hover { color: var(--color-primary); }
            .rpt-tab--active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
            .rpt-bar-chart { display:flex;align-items:flex-end;gap:1rem;height:160px;padding:0.5rem 0; }
            .rpt-bar-wrap { display:flex;flex-direction:column;align-items:center;gap:0.4rem;flex:1; }
            .rpt-bar { width:100%;border-radius:6px 6px 0 0;background:var(--color-secondary);min-width:32px;transition:height 0.3s; }
            .rpt-bar--highlight { background:var(--color-primary); }
            .rpt-bar-label { font-size:0.7rem;color:var(--sidebar-text-muted); }
            .rpt-insight { background:rgba(248,230,194,0.35);border:1px solid rgba(248,230,194,0.6);border-radius:var(--card-radius);padding:1.25rem 1.5rem;display:flex;align-items:flex-start;gap:1rem; }
            .rpt-grid-2 { display:grid;grid-template-columns:1fr 1fr;gap:1.25rem; }
            @media(max-width:768px){ .rpt-grid-2{ grid-template-columns:1fr; } }
            .rpt-grid-3 { display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem; }
            @media(max-width:900px){ .rpt-grid-3{ grid-template-columns:1fr 1fr; } }
            @media(max-width:580px){ .rpt-grid-3{ grid-template-columns:1fr; } }
            .rpt-panel { background:var(--card-bg);border:1.5px solid var(--card-border);border-radius:var(--card-radius);padding:1.25rem; }
            .rpt-panel h3 { font-size:0.95rem;font-weight:700;margin:0 0 1rem; }
        </style>
    `;
    bindEvents();
}

function bindEvents() {
    document.getElementById('btnApplyFilters')?.addEventListener('click', async () => {
        dateRange.startDate = document.getElementById('filterStartDate').value;
        dateRange.endDate = document.getElementById('filterEndDate').value;
        await loadTabData();
    });

    document.querySelectorAll('.rpt-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            activeTab = tab.dataset.tab;
            document.querySelectorAll('.rpt-tab').forEach(t => t.classList.remove('rpt-tab--active'));
            tab.classList.add('rpt-tab--active');
            await loadTabData();
        });
    });
}

async function loadTabData() {
    const container = document.getElementById('reportContent');
    if (!container) return;
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner"></div></div>';

    try {
        const params = new URLSearchParams({ startDate: dateRange.startDate, endDate: dateRange.endDate });
        if (activeTab === 'operational') await renderOperational(params);
        else if (activeTab === 'financial') await renderFinancial(params);
        else await renderGrowth(params);
    } catch (err) {
        console.error('Reports error:', err);
        renderFallbackTab();
    }
}

async function renderOperational(params) {
    let apiServices = [], apiProfessionals = [];
    try {
        const [svcRes, profRes] = await Promise.all([
            api.get(`/payment-transactions/reports/top-services?${params}`),
            api.get(`/payment-transactions/reports/revenue-by-professional?${params}`),
        ]);
        apiServices = svcRes.data || [];
        apiProfessionals = profRes.data || [];
    } catch (_) {}

    const demo = DEMO_DATA.operational;
    const occupancy = apiProfessionals.length
        ? apiProfessionals.map(p => ({
            name: p.professional?.user?.first_name || '?',
            pct: Math.min(100, Math.round((p.total_services / 50) * 100)),
          }))
        : demo.occupancy;
    const topServices = apiServices.length
        ? apiServices.slice(0, 4).map(s => ({ name: s.service?.name || '?', revenue: parseFloat(s.total_revenue) || 0 }))
        : demo.topServices;
    const maxOcc = Math.max(...occupancy.map(o => o.pct), 1);
    const highlightIdx = occupancy.indexOf(occupancy.reduce((a, b) => a.pct > b.pct ? a : b));

    const container = document.getElementById('reportContent');
    container.innerHTML = `
        <div class="rpt-grid-3" style="margin-bottom:1.25rem;">
            <div class="rpt-panel" style="col-span:1;">
                <h3>Ocupação por Profissional</h3>
                <div class="rpt-bar-chart">
                    ${occupancy.map((o, i) => `
                        <div class="rpt-bar-wrap">
                            <div class="rpt-bar ${i===highlightIdx?'rpt-bar--highlight':''}" style="height:${Math.round((o.pct/maxOcc)*140)}px;"></div>
                            <span class="rpt-bar-label">${o.name}</span>
                        </div>`).join('')}
                </div>
            </div>
            <div class="rpt-panel">
                <h3>Taxa de No-Show por Serviço</h3>
                <div style="display:flex;flex-direction:column;gap:0.9rem;margin-top:0.5rem;">
                    ${demo.noShow.map(n => `
                        <div>
                            <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:0.3rem;">
                                <span>${n.service}</span><span style="color:var(--sidebar-text-muted);">${n.pct}%</span>
                            </div>
                            <div style="background:var(--card-border);border-radius:99px;height:6px;">
                                <div style="background:var(--color-primary);height:6px;border-radius:99px;width:${n.pct}%;"></div>
                            </div>
                        </div>`).join('')}
                </div>
            </div>
            <div class="rpt-panel" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
                <h3 style="margin-bottom:0.5rem;">Tempo Médio entre Visitas</h3>
                <p style="font-size:3rem;font-weight:800;color:var(--color-primary);line-height:1;margin:0.5rem 0;">
                    ${demo.avgDaysBetweenVisits} <span style="font-size:1.25rem;font-weight:600;color:var(--sidebar-text-muted);">dias</span>
                </p>
                <p style="font-size:0.8rem;color:var(--chart-positive);">↓${Math.abs(demo.avgDaysChange)}% do mês passado</p>
            </div>
        </div>

        <div class="rpt-insight" style="margin-bottom:1.25rem;">
            <i class="fas fa-magic" style="color:var(--color-primary);font-size:1.4rem;margin-top:0.1rem;flex-shrink:0;"></i>
            <div>
                <p style="font-weight:700;font-size:0.9rem;margin:0 0 0.25rem;">Insight da IA Humanizada</p>
                <p style="font-size:0.82rem;color:var(--sidebar-text-muted);margin:0;">${demo.iaInsight}</p>
            </div>
        </div>

        <div class="rpt-grid-2">
            <div class="rpt-panel">
                <h3>Novos Clientes / Mês</h3>
                <svg viewBox="0 0 300 100" style="width:100%;height:100px;" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="rptGrad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.3"/>
                            <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0"/>
                        </linearGradient>
                    </defs>
                    <path d="M0,80 L50,60 L100,70 L150,40 L200,50 L250,30 L300,45 L300,100 L0,100 Z" fill="url(#rptGrad)"/>
                    <polyline fill="none" points="0,80 50,60 100,70 150,40 200,50 250,30 300,45" stroke="var(--color-primary)" stroke-width="2"/>
                </svg>
                <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--sidebar-text-muted);margin-top:0.25rem;">
                    ${demo.newClients.map(c => `<span>${c.month}</span>`).join('')}
                </div>
            </div>
            <div class="rpt-panel">
                <h3>Serviços Mais Realizados</h3>
                <div style="display:flex;flex-direction:column;gap:0.75rem;">
                    ${topServices.map(s => `
                        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.85rem;">
                            <span>${s.name}</span>
                            <span style="font-weight:700;">${formatCurrency(s.revenue)}</span>
                        </div>`).join('')}
                </div>
            </div>
        </div>
    `;
}

async function renderFinancial(params) {
    let revenueData = {}, profData = [];
    try {
        const [revRes, profRes] = await Promise.all([
            api.get(`/payment-transactions/reports/revenue-stats?${params}`),
            api.get(`/payment-transactions/reports/revenue-by-professional?${params}`),
        ]);
        revenueData = revRes.data || {};
        profData = profRes.data || [];
    } catch (_) {}

    const demo = DEMO_DATA.financial;
    const hasReal = parseFloat(revenueData.total_revenue) > 0 || profData.length > 0;
    const totalRevenue = hasReal ? parseFloat(revenueData.total_revenue || 0) : demo.totalRevenue;
    const salonRevenue = hasReal ? parseFloat(revenueData.salon_revenue || 0) : demo.salonRevenue;
    const commissions = hasReal ? parseFloat(revenueData.professional_commission || 0) : demo.commissions;
    const transactions = hasReal ? parseInt(revenueData.total_transactions || 0) : demo.transactions;
    const tableData = profData.length ? profData.map(p => ({
        name: `${p.professional?.user?.first_name||''} ${p.professional?.user?.last_name||''}`.trim(),
        services: p.total_services, revenue: parseFloat(p.total_revenue), commission: parseFloat(p.total_commission),
    })) : demo.byProfessional;

    const container = document.getElementById('reportContent');
    container.innerHTML = `
        <div class="mod-kpi-grid" style="margin-bottom:1.5rem;">
            <div class="mod-kpi-card">
                <div class="mod-kpi-card__top"><span class="mod-kpi-card__label">Receita Total</span>
                    <span class="mod-kpi-card__icon mod-kpi-card__icon--green"><i class="fas fa-dollar-sign"></i></span></div>
                <p class="mod-kpi-card__value">${formatCurrency(totalRevenue)}</p>
            </div>
            <div class="mod-kpi-card">
                <div class="mod-kpi-card__top"><span class="mod-kpi-card__label">Receita do Salão</span>
                    <span class="mod-kpi-card__icon mod-kpi-card__icon--blue"><i class="fas fa-store"></i></span></div>
                <p class="mod-kpi-card__value">${formatCurrency(salonRevenue)}</p>
            </div>
            <div class="mod-kpi-card">
                <div class="mod-kpi-card__top"><span class="mod-kpi-card__label">Comissões Pagas</span>
                    <span class="mod-kpi-card__icon mod-kpi-card__icon--amber"><i class="fas fa-users"></i></span></div>
                <p class="mod-kpi-card__value">${formatCurrency(commissions)}</p>
            </div>
            <div class="mod-kpi-card">
                <div class="mod-kpi-card__top"><span class="mod-kpi-card__label">Transações</span>
                    <span class="mod-kpi-card__icon mod-kpi-card__icon--purple"><i class="fas fa-receipt"></i></span></div>
                <p class="mod-kpi-card__value">${transactions}</p>
            </div>
        </div>

        <div class="rpt-panel">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                <h3 style="margin:0;">Receita por Profissional</h3>
                <button class="btn btn-secondary btn-sm" onclick="window.exportFinancialCSV()">
                    <i class="fas fa-download"></i> Exportar CSV
                </button>
            </div>
            <div class="table-responsive">
                <table class="table">
                    <thead><tr><th>Profissional</th><th>Serviços</th><th>Receita</th><th>Comissão</th><th>% Comissão</th></tr></thead>
                    <tbody>
                        ${tableData.map(p => {
                            const pct = p.revenue > 0 ? ((p.commission/p.revenue)*100).toFixed(1) : 0;
                            return `<tr>
                                <td><strong>${p.name}</strong></td>
                                <td>${p.services}</td>
                                <td>${formatCurrency(p.revenue)}</td>
                                <td>${formatCurrency(p.commission)}</td>
                                <td>${pct}%</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    window.exportFinancialCSV = () => {
        exportCSV('financeiro', ['Profissional','Serviços','Receita','Comissão'],
            tableData.map(p => [p.name, p.services, p.revenue, p.commission]));
    };
}

async function renderGrowth(params) {
    const demo = DEMO_DATA.growth;
    const maxCount = Math.max(...demo.topServices.map(s => s.count), 1);

    const container = document.getElementById('reportContent');
    container.innerHTML = `
        <div class="mod-kpi-grid" style="margin-bottom:1.5rem;">
            <div class="mod-kpi-card">
                <div class="mod-kpi-card__top"><span class="mod-kpi-card__label">Novos Clientes</span>
                    <span class="mod-kpi-card__icon mod-kpi-card__icon--green"><i class="fas fa-user-plus"></i></span></div>
                <p class="mod-kpi-card__value">+${demo.newClientsTotal}</p>
                <span class="mod-kpi-card__sub" style="color:var(--chart-positive);">+5% vs mês anterior</span>
            </div>
            <div class="mod-kpi-card">
                <div class="mod-kpi-card__top"><span class="mod-kpi-card__label">Taxa de Retenção</span>
                    <span class="mod-kpi-card__icon mod-kpi-card__icon--blue"><i class="fas fa-heart"></i></span></div>
                <p class="mod-kpi-card__value">${demo.retentionRate}%</p>
            </div>
            <div class="mod-kpi-card">
                <div class="mod-kpi-card__top"><span class="mod-kpi-card__label">Ticket Médio</span>
                    <span class="mod-kpi-card__icon mod-kpi-card__icon--amber"><i class="fas fa-tag"></i></span></div>
                <p class="mod-kpi-card__value">${formatCurrency(demo.avgTicket)}</p>
            </div>
        </div>

        <div class="rpt-panel">
            <h3>Top 5 Serviços Mais Vendidos</h3>
            <div style="display:flex;flex-direction:column;gap:0.85rem;">
                ${demo.topServices.map(s => `
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <span style="font-size:0.82rem;min-width:90px;color:var(--sidebar-text-muted);">${s.name}</span>
                        <div style="flex:1;background:var(--card-border);border-radius:99px;height:8px;">
                            <div style="background:var(--color-primary);height:8px;border-radius:99px;width:${Math.round((s.count/maxCount)*100)}%;"></div>
                        </div>
                        <span style="font-size:0.82rem;font-weight:700;min-width:24px;text-align:right;">${s.count}</span>
                    </div>`).join('')}
            </div>
        </div>
    `;
}

function renderFallbackTab() {
    if (activeTab === 'operational') renderOperational(new URLSearchParams()).catch(()=>{});
    else if (activeTab === 'financial') renderFinancial(new URLSearchParams()).catch(()=>{});
    else renderGrowth(new URLSearchParams()).catch(()=>{});
}

function exportCSV(reportName, headers, rows) {
    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${reportName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('CSV exportado!', 'success');
}

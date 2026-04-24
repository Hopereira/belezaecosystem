/**
 * Professionals Page Module
 * CRUD for professionals with specialties, commission, and schedules
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { isSubscriptionBlocked } from '../../../core/state.js';

let professionals = [];
let services = [];
let filters = { search: '', specialty: '', status: '' };
let isLoading = false;

const SPECIALTIES = [
    { value: 'hair', label: 'Cabelereiro(a)' },
    { value: 'nails', label: 'Manicure/Pedicure' },
    { value: 'makeup', label: 'Maquiador(a)' },
    { value: 'skin', label: 'Esteticista' },
    { value: 'massage', label: 'Massagista' },
    { value: 'barber', label: 'Barbeiro' },
    { value: 'other', label: 'Outros' },
];

export function render() {
    renderShell('professionals');
}

export async function init() {
    await loadData();
    renderContent();
    
    return () => {
        professionals = [];
        services = [];
        filters = { search: '', specialty: '', status: '' };
    };
}

async function loadData() {
    const content = getContentArea();
    content.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
            <div class="spinner"></div>
        </div>
    `;

    try {
        const [profRes, servicesRes] = await Promise.all([
            api.get('/professionals'),
            api.get('/services').catch(() => ({ data: [] })),
        ]);

        professionals = profRes.data || [];
        services = servicesRes.data || [];
    } catch (error) {
        console.error('[Professionals] Error loading data:', error);
        showToast('Erro ao carregar profissionais', 'error');
        professionals = [];
    }
}

function renderContent() {
    const content = getContentArea();
    if (!content) return;

    const blocked = isSubscriptionBlocked();
    const filteredProfessionals = applyFilters(professionals);

    content.innerHTML = `
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
                <h1>Cadastro e Gerenciamento de Profissionais</h1>
                <p>Adicione novos profissionais, configure suas permissões e acompanhe seu desempenho.</p>
            </div>
            <button class="btn btn-primary" id="btnNewProfessional" ${blocked ? 'disabled title="Assinatura inativa"' : ''}>
                <i class="fas fa-plus"></i> Novo Profissional
            </button>
        </div>

        <div class="filter-bar" style="margin-bottom:1.5rem;">
            <input type="text" class="filter-input" id="searchInput" placeholder="Buscar profissional..." value="${filters.search}">
            <select class="filter-select" id="specialtyFilter">
                <option value="">Todas especialidades</option>
                ${SPECIALTIES.map(s => `<option value="${s.value}" ${filters.specialty === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
            <select class="filter-select" id="statusFilter">
                <option value="">Todos status</option>
                <option value="active" ${filters.status === 'active' ? 'selected' : ''}>Ativos</option>
                <option value="inactive" ${filters.status === 'inactive' ? 'selected' : ''}>Inativos</option>
            </select>
        </div>

        ${filteredProfessionals.length ? `
            <div class="prof-grid-3">
                ${filteredProfessionals.map(prof => renderProfessionalCard(prof, blocked)).join('')}
            </div>
        ` : `
            <div class="empty-state">
                <i class="fas fa-user-tie"></i>
                <h3>Nenhum profissional encontrado</h3>
                <p>Cadastre seu primeiro profissional para começar</p>
            </div>
        `}

        <style>
            .prof-grid-3 { display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:1.5rem; }
            .prof-card { background:var(--card-bg);border:1.5px solid var(--card-border);border-radius:var(--card-radius);padding:1.5rem;display:flex;flex-direction:column;gap:1rem; }
            .prof-card-header { display:flex;align-items:center;gap:1rem;padding-bottom:1rem;border-bottom:1px solid var(--card-border); }
            .prof-card-avatar { width:48px;height:48px;border-radius:50%;background:var(--color-secondary);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--color-primary);font-size:1.1rem; }
            .prof-card-info h3 { margin:0;font-size:1rem;font-weight:700; }
            .prof-card-info p { margin:0.25rem 0 0;font-size:0.85rem;color:var(--text-muted); }
            .prof-card-body { display:flex;flex-direction:column;gap:0.75rem; }
            .prof-card-row { display:flex;justify-content:space-between;font-size:0.875rem; }
            .prof-card-row span:first-child { color:var(--text-muted); }
            .prof-card-actions { display:flex;gap:0.5rem;margin-top:auto;padding-top:1rem;border-top:1px solid var(--card-border); }
            .prof-card-actions button { flex:1; }
        </style>
    `;

    bindEvents();
}

function renderProfessionalCard(prof, blocked) {
    const name = prof.name || `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
    return `
        <div class="prof-card">
            <div class="prof-card-header">
                <div class="prof-card-avatar">${getInitials(prof)}</div>
                <div class="prof-card-info">
                    <h3>${name}</h3>
                    <p>${prof.email || prof.phone || ''}</p>
                </div>
            </div>
            <div class="prof-card-body">
                <div class="prof-card-row">
                    <span>Especialidade</span>
                    <strong>${getSpecialtyLabel(prof.specialty)}</strong>
                </div>
                <div class="prof-card-row">
                    <span>Comissão</span>
                    <strong>${prof.commission || 0}%</strong>
                </div>
                <div class="prof-card-row">
                    <span>Serviços</span>
                    <strong>${prof.services_count || prof.service_ids?.length || 0}</strong>
                </div>
                <div class="prof-card-row">
                    <span>Horário</span>
                    <strong>${prof.work_start || '09:00'} - ${prof.work_end || '18:00'}</strong>
                </div>
                <div class="prof-card-row">
                    <span>Status</span>
                    <span class="status-badge status-badge--${prof.is_active !== false ? 'success' : 'default'}">
                        ${prof.is_active !== false ? 'Ativo' : 'Inativo'}
                    </span>
                </div>
            </div>
            <div class="prof-card-actions">
                <button class="btn btn-secondary edit-btn" data-id="${prof.id}">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-secondary delete-btn" data-id="${prof.id}" ${blocked ? 'disabled' : ''}>
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `;
}

function applyFilters(data) {
    return data.filter(item => {
        const name = item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim();
        if (filters.search && !name.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.specialty && item.specialty !== filters.specialty) return false;
        if (filters.status === 'active' && item.is_active === false) return false;
        if (filters.status === 'inactive' && item.is_active !== false) return false;
        return true;
    });
}

function bindEvents() {
    // New professional button
    document.getElementById('btnNewProfessional')?.addEventListener('click', () => showProfessionalModal());

    // Search input
    document.getElementById('searchInput')?.addEventListener('input', debounce((e) => {
        filters.search = e.target.value;
        renderContent();
    }, 300));

    // Specialty filter
    document.getElementById('specialtyFilter')?.addEventListener('change', (e) => {
        filters.specialty = e.target.value;
        renderContent();
    });

    // Status filter
    document.getElementById('statusFilter')?.addEventListener('change', (e) => {
        filters.status = e.target.value;
        renderContent();
    });

    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const prof = professionals.find(p => p.id === btn.dataset.id);
            if (prof) showProfessionalModal(prof);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => handleDelete(btn.dataset.id));
    });
}

function showProfessionalModal(professional = null) {
    const isEdit = !!professional;
    const name = professional?.name || `${professional?.first_name || ''} ${professional?.last_name || ''}`.trim();
    
    const modalHTML = `
        <div class="modal-overlay" id="professionalModal" style="display:flex;align-items:center;justify-content:center;overflow-y:auto;">
            <div class="modal-content" style="max-width:1200px;width:95%;max-height:90vh;overflow-y:auto;">
                <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;">
                    <h2>${isEdit ? 'Editar Profissional' : 'Novo Profissional'}</h2>
                    <button type="button" onclick="document.getElementById('professionalModal').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">&times;</button>
                </div>
                <form id="professionalForm">
                    <div style="display:grid;grid-template-columns:2fr 1fr;gap:1.5rem;">
                        <div style="display:flex;flex-direction:column;gap:1.5rem;">
                            <!-- Dados do Profissional -->
                            <div class="mod-panel" style="padding:1.5rem;">
                                <h3 style="margin:0 0 1rem;">Dados do Profissional</h3>
                                <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem;">Informações básicas do profissional.</p>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                                    <div>
                                        <label style="font-size:0.875rem;font-weight:600;display:block;margin-bottom:0.5rem;">Nome Completo</label>
                                        <input type="text" class="modal-input" id="profFirstName" value="${professional?.first_name || professional?.name?.split(' ')[0] || ''}" placeholder="Nome" required>
                                    </div>
                                    <div>
                                        <label style="font-size:0.875rem;font-weight:600;display:block;margin-bottom:0.5rem;">Sobrenome</label>
                                        <input type="text" class="modal-input" id="profLastName" value="${professional?.last_name || professional?.name?.split(' ').slice(1).join(' ') || ''}" placeholder="Sobrenome">
                                    </div>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem;">
                                    <div>
                                        <label style="font-size:0.875rem;font-weight:600;display:block;margin-bottom:0.5rem;">Email</label>
                                        <input type="email" class="modal-input" id="profEmail" value="${professional?.email || ''}" placeholder="email@exemplo.com">
                                    </div>
                                    <div>
                                        <label style="font-size:0.875rem;font-weight:600;display:block;margin-bottom:0.5rem;">WhatsApp Interno</label>
                                        <input type="tel" class="modal-input" id="profPhone" value="${professional?.phone || ''}" placeholder="(00) 90000-0000">
                                    </div>
                                </div>
                                <div style="margin-top:1rem;">
                                    <label style="font-size:0.875rem;font-weight:600;display:block;margin-bottom:0.5rem;">Especialidade Principal</label>
                                    <select class="modal-input" id="profSpecialty" required>
                                        <option value="">Selecione</option>
                                        ${SPECIALTIES.map(s => `<option value="${s.value}" ${professional?.specialty === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <!-- Agenda e Metas -->
                            <div class="mod-panel" style="padding:1.5rem;">
                                <h3 style="margin:0 0 1rem;">Agenda e Metas</h3>
                                <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem;">Configure os horários de trabalho e metas de desempenho.</p>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
                                    <div>
                                        <h4 style="font-size:0.875rem;font-weight:600;margin-bottom:0.5rem;">Dias de Trabalho</h4>
                                        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                                            ${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((day, i) => `
                                                <button type="button" class="day-toggle" data-day="${i}" style="padding:0.375rem 0.75rem;font-size:0.875rem;border-radius:99px;border:1px solid var(--card-border);background:var(--card-bg);cursor:pointer;">${day}</button>
                                            `).join('')}
                                        </div>
                                        <div style="display:flex;gap:1rem;margin-top:1rem;">
                                            <div style="flex:1;">
                                                <label style="font-size:0.875rem;font-weight:600;display:block;margin-bottom:0.5rem;">Início</label>
                                                <input type="time" class="modal-input" id="profWorkStart" value="${professional?.work_start || '09:00'}">
                                            </div>
                                            <div style="flex:1;">
                                                <label style="font-size:0.875rem;font-weight:600;display:block;margin-bottom:0.5rem;">Fim</label>
                                                <input type="time" class="modal-input" id="profWorkEnd" value="${professional?.work_end || '18:00'}">
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 style="font-size:0.875rem;font-weight:600;margin-bottom:0.5rem;">Metas Mensais</h4>
                                        <div style="margin-bottom:0.75rem;">
                                            <label style="font-size:0.875rem;font-weight:600;display:block;margin-bottom:0.5rem;">Faturamento (R$)</label>
                                            <input type="number" class="modal-input" id="profRevenueGoal" placeholder="Ex: 5000" value="${professional?.revenue_goal || ''}">
                                        </div>
                                        <div>
                                            <label style="font-size:0.875rem;font-weight:600;display:block;margin-bottom:0.5rem;">Número de Clientes</label>
                                            <input type="number" class="modal-input" id="profClientGoal" placeholder="Ex: 50" value="${professional?.client_goal || ''}">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Acesso e Remuneração -->
                            <div class="mod-panel" style="padding:1.5rem;">
                                <h3 style="margin:0 0 1rem;">Acesso e Remuneração</h3>
                                <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem;">Defina as permissões de acesso e as regras de comissionamento.</p>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
                                    <div>
                                        <h4 style="font-size:0.875rem;font-weight:600;margin-bottom:0.5rem;">Permissão de Acesso</h4>
                                        <div style="display:flex;flex-direction:column;gap:0.5rem;">
                                            <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;border:1px solid var(--card-border);border-radius:var(--radius-md);cursor:pointer;">
                                                <input type="radio" name="role" value="professional" checked>
                                                <span style="font-size:0.875rem;">Profissional</span>
                                            </label>
                                            <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;border:1px solid var(--card-border);border-radius:var(--radius-md);cursor:pointer;">
                                                <input type="radio" name="role" value="reception">
                                                <span style="font-size:0.875rem;">Recepção</span>
                                            </label>
                                            <label style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;border:1px solid var(--card-border);border-radius:var(--radius-md);cursor-pointer;">
                                                <input type="radio" name="role" value="manager">
                                                <span style="font-size:0.875rem;">Gerente</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 style="font-size:0.875rem;font-weight:600;margin-bottom:0.5rem;">Comissão (%)</h4>
                                        <input type="number" class="modal-input" id="profCommission" value="${professional?.commission || 30}" min="0" max="100" style="margin-bottom:1rem;">
                                        <div>
                                            <label style="font-size:0.875rem;font-weight:600;display:block;margin-bottom:0.5rem;">Serviços que realiza</label>
                                            <div style="max-height:150px;overflow-y:auto;border:1px solid var(--card-border);border-radius:var(--radius-md);padding:0.5rem;">
                                                ${services.map(s => `
                                                    <label style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;cursor:pointer;font-size:0.875rem;">
                                                        <input type="checkbox" name="services" value="${s.id}" ${professional?.service_ids?.includes(s.id) ? 'checked' : ''}>
                                                        ${s.name}
                                                    </label>
                                                `).join('') || '<p style="padding:0.5rem;font-size:0.875rem;color:var(--text-muted);">Nenhum serviço cadastrado</p>'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Sidebar: Métricas -->
                        <div style="display:flex;flex-direction:column;gap:1.5rem;">
                            <div class="mod-panel" style="padding:1.5rem;">
                                <h3 style="margin:0 0 1rem;">Métricas de Desempenho</h3>
                                <div style="margin-bottom:1rem;">
                                    <h4 style="font-size:0.875rem;font-weight:600;margin-bottom:0.5rem;">Ranking de Desempenho</h4>
                                    <div style="display:flex;flex-direction:column;gap:0.5rem;">
                                        ${professionals.slice(0, 3).map((p, i) => `
                                            <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem;background:${i===0?'var(--color-secondary)':'transparent'};border-radius:var(--radius-md);">
                                                <span style="font-weight:700;color:${i===0?'var(--color-primary)':'var(--text-muted)'};">${i+1}º</span>
                                                <div class="prof-card-avatar" style="width:32px;height:32px;font-size:0.85rem;">${getInitials(p)}</div>
                                                <span style="flex:1;font-size:0.875rem;">${p.name || `${p.first_name||''} ${p.last_name||''}`.trim()}</span>
                                                <span style="font-size:0.875rem;color:var(--text-muted);">R$ ${(p.revenue || 0).toLocaleString('pt-BR')}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                <div>
                                    <h4 style="font-size:0.875rem;font-weight:600;margin-bottom:0.5rem;">Pontualidade</h4>
                                    <div style="display:flex;align-items:center;gap:1rem;">
                                        <div style="width:60px;height:60px;border-radius:50%;border:4px solid var(--card-border);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--color-primary);">95%</div>
                                        <p style="font-size:0.8rem;color:var(--text-muted);">Taxa de check-ins realizados no horário agendado nos últimos 30 dias.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="mod-panel" style="background:var(--color-secondary);text-align:center;padding:1.5rem;">
                                <i class="fas fa-magic" style="font-size:2rem;color:var(--color-primary);margin-bottom:0.5rem;"></i>
                                <h3 style="margin:0 0 0.25rem;">Otimize com IA</h3>
                                <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;">Nossa IA pode sugerir as melhores metas e regras de comissão.</p>
                                <button type="button" class="btn btn-primary" style="width:100%;">Receber Sugestões</button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-actions" style="margin-top:1.5rem;">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('professionalModal').remove()">Cancelar</button>
                        <button type="submit" class="btn btn-primary" id="btnSaveProfessional">
                            ${isEdit ? 'Salvar Alterações' : 'Salvar Profissional'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        <style>
            .day-toggle.selected { background:var(--color-secondary);border-color:var(--color-primary);color:var(--color-primary); }
        </style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.querySelectorAll('.day-toggle').forEach(btn => {
        btn.addEventListener('click', () => btn.classList.toggle('selected'));
    });

    document.getElementById('professionalForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSave(professional?.id);
    });
}

async function handleSave(professionalId = null) {
    const btn = document.getElementById('btnSaveProfessional');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div>';

    const selectedServices = Array.from(document.querySelectorAll('input[name="services"]:checked'))
        .map(cb => cb.value);
    const selectedDays = Array.from(document.querySelectorAll('.day-toggle.selected'))
        .map(btn => btn.dataset.day);

    const data = {
        first_name: document.getElementById('profFirstName').value,
        last_name: document.getElementById('profLastName').value,
        name: `${document.getElementById('profFirstName').value} ${document.getElementById('profLastName').value}`.trim(),
        email: document.getElementById('profEmail').value || undefined,
        phone: document.getElementById('profPhone').value || undefined,
        specialty: document.getElementById('profSpecialty').value,
        commission: parseFloat(document.getElementById('profCommission').value) || 0,
        service_ids: selectedServices,
        work_start: document.getElementById('profWorkStart').value,
        work_end: document.getElementById('profWorkEnd').value,
        work_days: selectedDays,
        revenue_goal: parseFloat(document.getElementById('profRevenueGoal')?.value) || null,
        client_goal: parseInt(document.getElementById('profClientGoal')?.value) || null,
        is_active: true,
    };

    try {
        if (professionalId) {
            await api.put(`/professionals/${professionalId}`, data);
            showToast('Profissional atualizado com sucesso!', 'success');
        } else {
            await api.post('/professionals', data);
            showToast('Profissional criado com sucesso!', 'success');
        }

        document.getElementById('professionalModal')?.remove();
        await loadData();
        renderContent();
    } catch (error) {
        console.error('[Professionals] Save error:', error);
        showToast(error.message || 'Erro ao salvar profissional', 'error');
        btn.disabled = false;
        btn.innerHTML = professionalId ? 'Salvar Alterações' : 'Salvar Profissional';
    }
}

async function handleDelete(professionalId) {
    if (!confirm('Tem certeza que deseja excluir este profissional?')) return;

    try {
        await api.delete(`/professionals/${professionalId}`);
        showToast('Profissional excluído com sucesso!', 'success');
        await loadData();
        renderContent();
    } catch (error) {
        console.error('[Professionals] Delete error:', error);
        showToast(error.message || 'Erro ao excluir profissional', 'error');
    }
}

function getInitials(prof) {
    const name = prof.name || `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
    const parts = name.split(' ');
    return parts.length > 1 
        ? `${parts[0][0]}${parts[parts.length-1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
}

function getSpecialtyLabel(value) {
    return SPECIALTIES.find(s => s.value === value)?.label || value || '-';
}

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

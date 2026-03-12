/**
 * Professional Details Page Module
 * CRUD for professional details management (Owner/Admin)
 * Backend: CRUD /api/professional-details
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { formatDate } from '../../../shared/utils/validation.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';
import { showToast } from '../../../shared/utils/toast.js';
import { isSubscriptionBlocked } from '../../../core/state.js';

let professionals = [];
let tenantUsers = [];
let editingId = null;
let isLoading = false;

const CONTRACT_TYPES = [
    { value: 'CLT', label: 'CLT' },
    { value: 'AUTONOMO', label: 'Autônomo' },
    { value: 'PARCEIRO', label: 'Parceiro' },
];

export function render() {
    renderShell('professional-details');
}

export async function init() {
    editingId = null;
    await loadData();
    renderPage();
    return () => {
        editingId = null;
        professionals = [];
        tenantUsers = [];
    };
}

async function loadData() {
    isLoading = true;
    const content = getContentArea();
    if (content) {
        content.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
                <div class="spinner"></div>
            </div>
        `;
    }

    try {
        const [profRes, usersRes] = await Promise.all([
            api.get('/professional-details'),
            api.get('/users?role=professional&limit=100').catch(() => ({ data: [] })),
        ]);
        professionals = profRes.data || [];
        tenantUsers = usersRes.data || [];
    } catch (error) {
        console.error('[ProfessionalDetails] Error loading:', error);
        showToast('Erro ao carregar detalhes profissionais', 'error');
        professionals = [];
    } finally {
        isLoading = false;
    }
}

function renderPage() {
    const content = getContentArea();
    if (!content) return;

    const contractOptions = CONTRACT_TYPES.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
    const userOptions = tenantUsers.map(u => {
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
        return `<option value="${u.id}">${name} (${u.email})</option>`;
    }).join('');

    content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;gap:1rem;flex-wrap:wrap;">
            <h2 style="font-size:1.5rem;font-weight:700;color:var(--text-dark);margin:0;">Detalhes Profissionais</h2>
            <button id="btnAddProfDetail" style="
                background:var(--primary-color);color:white;border:none;padding:10px 24px;border-radius:8px;
                font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:0.5rem;height:44px;white-space:nowrap;
            "><i class="fas fa-plus"></i> Novo profissional</button>
        </div>

        <div id="profDetailsContainer" style="background:white;border-radius:12px;padding:1.5rem;border:1px solid #e0e0e0;"></div>

        <!-- Professional Detail Modal -->
        <div id="modal-prof-detail" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:500px;box-shadow:0 10px 25px rgba(0,0,0,0.1);position:relative;max-height:90vh;overflow-y:auto;">
                <button id="modalCloseProfDetail" style="position:absolute;top:1.5rem;right:1.5rem;background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted);">
                    <i class="fas fa-times"></i>
                </button>
                <h2 id="profDetailModalTitle" style="margin:0 0 1.5rem 0;color:var(--text-dark);font-size:1.5rem;">Novo profissional</h2>
                <form id="profDetailForm">
                    <div id="userIdField" style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Usuário *</label>
                        <select id="profUserId" required style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                            <option value="">Selecione um usuário</option>
                            ${userOptions}
                        </select>
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">CPF</label>
                        <input type="text" id="profCpf" placeholder="000.000.000-00" maxlength="14" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Tipo de Contrato *</label>
                        <select id="profContractType" required style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                            ${contractOptions}
                        </select>
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Comissão base (%)</label>
                        <input type="number" id="profCommission" min="0" max="100" step="0.01" value="0" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Data de contratação</label>
                        <input type="date" id="profHireDate" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                            <input type="checkbox" id="profActive" checked style="width:18px;height:18px;">
                            <span style="font-size:0.9rem;color:var(--text-muted);font-weight:500;">Ativo</span>
                        </label>
                    </div>
                    <div style="display:flex;gap:1rem;margin-top:2rem;">
                        <button type="button" id="btnCancelProfDetail" style="flex:1;padding:14px;background:white;border:1px solid #ddd;border-radius:8px;font-weight:600;cursor:pointer;">Cancelar</button>
                        <button type="submit" style="flex:2;padding:14px;background:var(--primary-color);color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:1rem;">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Confirmation -->
        <div id="modal-delete-prof-detail" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:400px;text-align:center;">
                <h2 style="margin-bottom:1rem;color:var(--text-dark);">Confirmar exclusão</h2>
                <p style="color:var(--text-muted);margin-bottom:2rem;">Tem certeza que deseja excluir este registro profissional?</p>
                <div style="display:flex;gap:1rem;">
                    <button id="btnCancelDeleteProfDetail" style="flex:1;padding:12px;background:white;border:1px solid #ddd;border-radius:8px;font-weight:600;cursor:pointer;">Cancelar</button>
                    <button id="btnConfirmDeleteProfDetail" style="flex:1;padding:12px;background:#E91E63;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Excluir</button>
                </div>
            </div>
        </div>
    `;

    renderTable();
    bindEvents();
}

function renderTable() {
    const container = document.getElementById('profDetailsContainer');
    if (!container) return;

    if (professionals.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:3rem 1rem;">
                <i class="fas fa-id-badge" style="font-size:3rem;color:#e0e0e0;margin-bottom:1rem;display:block;"></i>
                <h3 style="color:var(--text-muted);margin-bottom:0.5rem;">Nenhum detalhe profissional cadastrado</h3>
                <p style="color:var(--text-muted);font-size:0.9rem;">Vincule detalhes contratuais aos profissionais do seu estabelecimento</p>
            </div>
        `;
        return;
    }

    const contractLabels = { CLT: 'CLT', AUTONOMO: 'Autônomo', PARCEIRO: 'Parceiro' };
    const contractStyles = {
        CLT: 'background:#E3F2FD;color:#2196F3;',
        AUTONOMO: 'background:#FFF3E0;color:#FF9800;',
        PARCEIRO: 'background:#E8F5E9;color:#4CAF50;',
    };

    let html = `<table style="width:100%;border-collapse:collapse;">
        <thead style="background:#f8f9fa;">
            <tr>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Profissional</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">CPF</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Contrato</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Comissão</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Status</th>
                <th style="padding:1rem;border-bottom:2px solid #e0e0e0;"></th>
            </tr>
        </thead>
        <tbody>`;

    professionals.forEach(p => {
        const userName = p.user ? `${p.user.first_name || ''} ${p.user.last_name || ''}`.trim() : (p.user_id || '-');
        const contract = p.contract_type || 'AUTONOMO';
        const activeStyle = p.active !== false ? 'color:#4CAF50;background:#E8F5E9;' : 'color:#F44336;background:#FFEBEE;';
        const activeLabel = p.active !== false ? 'Ativo' : 'Inativo';

        html += `<tr style="border-bottom:1px solid #f0f0f0;">
            <td style="padding:1rem;font-weight:600;color:var(--text-dark);">${userName}</td>
            <td style="padding:1rem;color:var(--text-muted);">${p.cpf || '-'}</td>
            <td style="padding:1rem;"><span style="padding:4px 12px;border-radius:12px;font-size:0.85rem;font-weight:600;${contractStyles[contract] || ''}">${contractLabels[contract] || contract}</span></td>
            <td style="padding:1rem;font-weight:600;color:var(--text-dark);">${parseFloat(p.base_commission_percentage || 0).toFixed(1)}%</td>
            <td style="padding:1rem;"><span style="padding:4px 12px;border-radius:12px;font-size:0.85rem;font-weight:600;${activeStyle}">${activeLabel}</span></td>
            <td style="padding:1rem;">
                <button class="btn-edit-prof" data-id="${p.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0.25rem;margin-right:0.5rem;" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-delete-prof" data-id="${p.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0.25rem;" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function openProfDetailModal(prof = null) {
    if (isSubscriptionBlocked() && !prof) {
        showToast('Assinatura inativa.', 'error');
        return;
    }

    editingId = prof ? prof.id : null;
    const title = document.getElementById('profDetailModalTitle');
    if (title) title.textContent = prof ? 'Editar profissional' : 'Novo profissional';

    // Hide user select on edit
    const userIdField = document.getElementById('userIdField');
    const userIdSelect = document.getElementById('profUserId');
    if (prof) {
        userIdField.style.display = 'none';
        userIdSelect.removeAttribute('required');
    } else {
        userIdField.style.display = 'block';
        userIdSelect.setAttribute('required', 'required');
        userIdSelect.value = '';
    }

    document.getElementById('profCpf').value = prof?.cpf || '';
    document.getElementById('profContractType').value = prof?.contract_type || 'AUTONOMO';
    document.getElementById('profCommission').value = prof?.base_commission_percentage || 0;
    document.getElementById('profHireDate').value = prof?.hire_date ? prof.hire_date.split('T')[0] : '';
    document.getElementById('profActive').checked = prof?.active !== false;

    openModal('prof-detail');
}

function bindEvents() {
    // Add
    document.getElementById('btnAddProfDetail')?.addEventListener('click', () => openProfDetailModal());

    // Close
    document.getElementById('modalCloseProfDetail')?.addEventListener('click', () => closeModal('prof-detail'));
    document.getElementById('btnCancelProfDetail')?.addEventListener('click', () => closeModal('prof-detail'));

    // Form submit
    document.getElementById('profDetailForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProfDetail();
    });

    // Edit / Delete delegation
    document.getElementById('profDetailsContainer')?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-prof');
        const deleteBtn = e.target.closest('.btn-delete-prof');

        if (editBtn) {
            const id = editBtn.dataset.id;
            const prof = professionals.find(p => p.id === id);
            if (prof) openProfDetailModal(prof);
        }

        if (deleteBtn) {
            if (isSubscriptionBlocked()) {
                showToast('Assinatura inativa.', 'error');
                return;
            }
            editingId = deleteBtn.dataset.id;
            openModal('delete-prof-detail');
        }
    });

    // Delete confirmation
    document.getElementById('btnCancelDeleteProfDetail')?.addEventListener('click', () => {
        editingId = null;
        closeModal('delete-prof-detail');
    });
    document.getElementById('btnConfirmDeleteProfDetail')?.addEventListener('click', async () => {
        if (editingId) {
            try {
                await api.delete(`/professional-details/${editingId}`);
                showToast('Registro excluído.', 'success');
                editingId = null;
                closeModal('delete-prof-detail');
                await loadData();
                renderTable();
            } catch (error) {
                console.error('[ProfDetails] Delete error:', error);
                showToast(error.message || 'Erro ao excluir', 'error');
            }
        }
    });
}

async function saveProfDetail() {
    const submitBtn = document.querySelector('#profDetailForm button[type="submit"]');
    const originalText = submitBtn?.textContent || 'Salvar';

    const formData = {
        cpf: document.getElementById('profCpf').value.trim() || null,
        contract_type: document.getElementById('profContractType').value,
        base_commission_percentage: parseFloat(document.getElementById('profCommission').value) || 0,
        hire_date: document.getElementById('profHireDate').value || null,
        active: document.getElementById('profActive').checked,
    };

    if (!editingId) {
        formData.user_id = document.getElementById('profUserId').value;
        if (!formData.user_id) {
            showToast('Selecione um usuário.', 'error');
            return;
        }
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner spinner-sm" style="display:inline-block;width:16px;height:16px;margin-right:8px;"></div>Salvando...';
    }

    try {
        if (editingId) {
            await api.put(`/professional-details/${editingId}`, formData);
            showToast('Profissional atualizado!', 'success');
        } else {
            await api.post('/professional-details', formData);
            showToast('Profissional cadastrado!', 'success');
        }

        editingId = null;
        closeModal('prof-detail');
        await loadData();
        renderTable();
    } catch (error) {
        console.error('[ProfDetails] Save error:', error);
        showToast(error.message || 'Erro ao salvar', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

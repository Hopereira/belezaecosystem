/**
 * Payment Methods Management Page Module
 * CRUD for payment methods
 * Backend: GET/POST/PUT/DELETE /api/financial/payment-methods
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';
import { showToast } from '../../../shared/utils/toast.js';
import { isSubscriptionBlocked } from '../../../core/state.js';

let paymentMethods = [];
let editingId = null;
let isLoading = false;

export function render() {
    renderShell('payment-methods');
}

export async function init() {
    editingId = null;
    await loadPaymentMethods();
    renderPage();
    return () => {
        editingId = null;
        paymentMethods = [];
    };
}

async function loadPaymentMethods() {
    isLoading = true;
    const content = getContentArea();
    if (content && !document.getElementById('pmContainer')) {
        content.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
                <div class="spinner"></div>
            </div>
        `;
    }

    try {
        const response = await api.get('/financial/payment-methods');
        paymentMethods = response.data || [];
    } catch (error) {
        console.error('[PaymentMethods] Error loading:', error);
        showToast('Erro ao carregar formas de pagamento', 'error');
        paymentMethods = [];
    } finally {
        isLoading = false;
    }
}

function renderPage() {
    const content = getContentArea();
    if (!content) return;

    content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;gap:1rem;flex-wrap:wrap;">
            <h2 style="font-size:1.5rem;font-weight:700;color:var(--text-dark);margin:0;">Formas de Pagamento</h2>
            <button id="btnAddPM" style="
                background:var(--primary-color);color:white;border:none;padding:10px 24px;border-radius:8px;
                font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:0.5rem;height:44px;white-space:nowrap;
            "><i class="fas fa-plus"></i> Nova forma</button>
        </div>

        <div id="pmContainer" style="background:white;border-radius:12px;padding:1.5rem;border:1px solid #e0e0e0;"></div>

        <!-- Payment Method Modal -->
        <div id="modal-pm" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:450px;box-shadow:0 10px 25px rgba(0,0,0,0.1);position:relative;max-height:90vh;overflow-y:auto;">
                <button id="modalClosePM" style="position:absolute;top:1.5rem;right:1.5rem;background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted);">
                    <i class="fas fa-times"></i>
                </button>
                <h2 id="pmModalTitle" style="margin:0 0 1.5rem 0;color:var(--text-dark);font-size:1.5rem;">Nova forma de pagamento</h2>
                <form id="pmForm">
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Nome *</label>
                        <input type="text" id="pmName" required placeholder="Ex: Dinheiro, PIX, Cartão de Crédito" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                            <input type="checkbox" id="pmActive" checked style="width:18px;height:18px;">
                            <span style="font-size:0.9rem;color:var(--text-muted);font-weight:500;">Ativo</span>
                        </label>
                    </div>
                    <div style="display:flex;gap:1rem;margin-top:2rem;">
                        <button type="button" id="btnCancelPM" style="flex:1;padding:14px;background:white;border:1px solid #ddd;border-radius:8px;font-weight:600;cursor:pointer;">Cancelar</button>
                        <button type="submit" style="flex:2;padding:14px;background:var(--primary-color);color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:1rem;">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Confirmation -->
        <div id="modal-delete-pm" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:400px;text-align:center;">
                <h2 style="margin-bottom:1rem;color:var(--text-dark);">Confirmar exclusão</h2>
                <p style="color:var(--text-muted);margin-bottom:2rem;">Tem certeza que deseja excluir esta forma de pagamento?</p>
                <div style="display:flex;gap:1rem;">
                    <button id="btnCancelDeletePM" style="flex:1;padding:12px;background:white;border:1px solid #ddd;border-radius:8px;font-weight:600;cursor:pointer;">Cancelar</button>
                    <button id="btnConfirmDeletePM" style="flex:1;padding:12px;background:#E91E63;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Excluir</button>
                </div>
            </div>
        </div>
    `;

    renderTable();
    bindEvents();
}

function renderTable() {
    const container = document.getElementById('pmContainer');
    if (!container) return;

    if (paymentMethods.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:3rem 1rem;">
                <i class="fas fa-credit-card" style="font-size:3rem;color:#e0e0e0;margin-bottom:1rem;display:block;"></i>
                <h3 style="color:var(--text-muted);margin-bottom:0.5rem;">Nenhuma forma de pagamento cadastrada</h3>
                <p style="color:var(--text-muted);font-size:0.9rem;">Adicione formas de pagamento aceitas pelo seu estabelecimento</p>
            </div>
        `;
        return;
    }

    let html = `<table style="width:100%;border-collapse:collapse;">
        <thead style="background:#f8f9fa;">
            <tr>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Nome</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Status</th>
                <th style="padding:1rem;border-bottom:2px solid #e0e0e0;"></th>
            </tr>
        </thead>
        <tbody>`;

    paymentMethods.forEach(pm => {
        const isActive = pm.active !== false;
        const statusStyle = isActive ? 'color:#4CAF50;background:#E8F5E9;' : 'color:#F44336;background:#FFEBEE;';
        const statusLabel = isActive ? 'Ativo' : 'Inativo';

        html += `<tr style="border-bottom:1px solid #f0f0f0;">
            <td style="padding:1rem;font-weight:600;color:var(--text-dark);">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#E3F2FD;color:#2196F3;font-size:0.9rem;">
                        <i class="fas fa-wallet"></i>
                    </div>
                    ${pm.name}
                </div>
            </td>
            <td style="padding:1rem;"><span style="padding:4px 12px;border-radius:12px;font-size:0.85rem;font-weight:600;${statusStyle}">${statusLabel}</span></td>
            <td style="padding:1rem;">
                <button class="btn-edit-pm" data-id="${pm.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0.25rem;margin-right:0.5rem;" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-delete-pm" data-id="${pm.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0.25rem;" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function openPMModal(pm = null) {
    if (isSubscriptionBlocked() && !pm) {
        showToast('Assinatura inativa.', 'error');
        return;
    }

    editingId = pm ? pm.id : null;
    const title = document.getElementById('pmModalTitle');
    if (title) title.textContent = pm ? 'Editar forma de pagamento' : 'Nova forma de pagamento';

    document.getElementById('pmName').value = pm?.name || '';
    document.getElementById('pmActive').checked = pm?.active !== false;

    openModal('pm');
}

function bindEvents() {
    // Add
    document.getElementById('btnAddPM')?.addEventListener('click', () => openPMModal());

    // Close
    document.getElementById('modalClosePM')?.addEventListener('click', () => closeModal('pm'));
    document.getElementById('btnCancelPM')?.addEventListener('click', () => closeModal('pm'));

    // Form submit
    document.getElementById('pmForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await savePM();
    });

    // Edit / Delete delegation
    document.getElementById('pmContainer')?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-pm');
        const deleteBtn = e.target.closest('.btn-delete-pm');

        if (editBtn) {
            const pm = paymentMethods.find(p => p.id === editBtn.dataset.id);
            if (pm) openPMModal(pm);
        }

        if (deleteBtn) {
            if (isSubscriptionBlocked()) {
                showToast('Assinatura inativa.', 'error');
                return;
            }
            editingId = deleteBtn.dataset.id;
            openModal('delete-pm');
        }
    });

    // Delete confirmation
    document.getElementById('btnCancelDeletePM')?.addEventListener('click', () => {
        editingId = null;
        closeModal('delete-pm');
    });
    document.getElementById('btnConfirmDeletePM')?.addEventListener('click', async () => {
        if (editingId) {
            try {
                await api.delete(`/financial/payment-methods/${editingId}`);
                showToast('Forma de pagamento excluída.', 'success');
                editingId = null;
                closeModal('delete-pm');
                await loadPaymentMethods();
                renderTable();
            } catch (error) {
                console.error('[PaymentMethods] Delete error:', error);
                showToast(error.message || 'Erro ao excluir', 'error');
            }
        }
    });
}

async function savePM() {
    const submitBtn = document.querySelector('#pmForm button[type="submit"]');
    const originalText = submitBtn?.textContent || 'Salvar';

    const formData = {
        name: document.getElementById('pmName').value.trim(),
        active: document.getElementById('pmActive').checked,
    };

    if (!formData.name) {
        showToast('Informe o nome da forma de pagamento.', 'error');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner spinner-sm" style="display:inline-block;width:16px;height:16px;margin-right:8px;"></div>Salvando...';
    }

    try {
        if (editingId) {
            await api.put(`/financial/payment-methods/${editingId}`, formData);
            showToast('Forma de pagamento atualizada!', 'success');
        } else {
            await api.post('/financial/payment-methods', formData);
            showToast('Forma de pagamento criada!', 'success');
        }

        editingId = null;
        closeModal('pm');
        await loadPaymentMethods();
        renderTable();
    } catch (error) {
        console.error('[PaymentMethods] Save error:', error);
        showToast(error.message || 'Erro ao salvar', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

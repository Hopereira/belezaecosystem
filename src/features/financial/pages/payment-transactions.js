/**
 * Payment Transactions Page Module
 * List and manage payment transactions (service payments with split)
 * Backend: GET/POST/DELETE /api/payment-transactions
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { formatCurrency, formatDate } from '../../../shared/utils/validation.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';
import { showToast } from '../../../shared/utils/toast.js';
import { isSubscriptionBlocked } from '../../../core/state.js';

let transactions = [];
let viewingTransaction = null;
let editingId = null;
let isLoading = false;

// Filter state
let filterStartDate = '';
let filterEndDate = '';
let filterProfessional = '';
let filterStatus = '';

const STATUS_LABELS = {
    PENDING: 'Pendente',
    PAID: 'Pago',
    CANCELLED: 'Cancelado',
    REFUNDED: 'Reembolsado',
};
const STATUS_STYLES = {
    PENDING: 'color:#F57C00;background:#FFF3E0;',
    PAID: 'color:#4CAF50;background:#E8F5E9;',
    CANCELLED: 'color:#F44336;background:#FFEBEE;',
    REFUNDED: 'color:#9C27B0;background:#F3E5F5;',
};

const PAYMENT_METHODS = {
    DINHEIRO: 'Dinheiro',
    DEBITO: 'Débito',
    CREDITO: 'Crédito',
    PIX: 'Pix',
    TRANSFERENCIA: 'Transferência',
};

export function render() {
    renderShell('payment-transactions');
}

export async function init() {
    editingId = null;
    viewingTransaction = null;
    filterStartDate = '';
    filterEndDate = '';
    filterProfessional = '';
    filterStatus = '';
    await loadTransactions();
    renderPage();
    return () => {
        editingId = null;
        viewingTransaction = null;
        transactions = [];
    };
}

async function loadTransactions() {
    isLoading = true;
    const content = getContentArea();
    if (content && !document.getElementById('transactionsContainer')) {
        content.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
                <div class="spinner"></div>
            </div>
        `;
    }

    try {
        const params = new URLSearchParams();
        if (filterStartDate) params.set('startDate', filterStartDate);
        if (filterEndDate) params.set('endDate', filterEndDate);
        if (filterProfessional) params.set('professional_id', filterProfessional);
        if (filterStatus) params.set('payment_status', filterStatus);
        params.set('limit', '200');

        const response = await api.get(`/payment-transactions?${params.toString()}`);
        transactions = response.data || [];
    } catch (error) {
        console.error('[PaymentTransactions] Error loading:', error);
        showToast('Erro ao carregar transações', 'error');
        transactions = [];
    } finally {
        isLoading = false;
    }
}

function renderPage() {
    const content = getContentArea();
    if (!content) return;

    content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;gap:1rem;flex-wrap:wrap;">
            <h2 style="font-size:1.5rem;font-weight:700;color:var(--text-dark);margin:0;">Transações de Pagamento</h2>
        </div>

        <!-- Filters -->
        <div style="background:white;border-radius:12px;padding:1.5rem;border:1px solid #e0e0e0;margin-bottom:1.5rem;">
            <div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap;">
                <div style="display:flex;flex-direction:column;gap:0.25rem;">
                    <label style="font-size:0.85rem;color:var(--text-muted);font-weight:500;">Data início</label>
                    <input type="date" id="txFilterStartDate" style="padding:10px 16px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem;height:44px;">
                </div>
                <div style="display:flex;flex-direction:column;gap:0.25rem;">
                    <label style="font-size:0.85rem;color:var(--text-muted);font-weight:500;">Data final</label>
                    <input type="date" id="txFilterEndDate" style="padding:10px 16px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem;height:44px;">
                </div>
                <div style="display:flex;flex-direction:column;gap:0.25rem;">
                    <label style="font-size:0.85rem;color:var(--text-muted);font-weight:500;">Status</label>
                    <select id="txFilterStatus" style="padding:10px 16px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem;height:44px;">
                        <option value="">Todos</option>
                        <option value="PENDING">Pendente</option>
                        <option value="PAID">Pago</option>
                        <option value="CANCELLED">Cancelado</option>
                        <option value="REFUNDED">Reembolsado</option>
                    </select>
                </div>
                <button id="btnTxFilter" style="padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;height:44px;border:none;background:var(--primary-color);color:white;">Filtrar</button>
                <button id="btnTxClear" style="padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;height:44px;border:none;background:#333;color:white;">Limpar</button>
            </div>
        </div>

        <!-- Summary -->
        <div id="txSummaryCards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-bottom:1.5rem;"></div>

        <!-- Table -->
        <div id="transactionsContainer" style="background:white;border-radius:12px;padding:1.5rem;border:1px solid #e0e0e0;"></div>

        <!-- Transaction Detail Modal -->
        <div id="modal-tx-detail" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:550px;box-shadow:0 10px 25px rgba(0,0,0,0.1);position:relative;max-height:90vh;overflow-y:auto;">
                <button id="modalCloseTxDetail" style="position:absolute;top:1.5rem;right:1.5rem;background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted);">
                    <i class="fas fa-times"></i>
                </button>
                <h2 style="margin:0 0 1.5rem 0;color:var(--text-dark);font-size:1.5rem;">Detalhes da Transação</h2>
                <div id="txDetailContent"></div>
                <div style="display:flex;gap:1rem;margin-top:2rem;">
                    <button type="button" id="btnCloseTxDetail" style="flex:1;padding:14px;background:white;border:1px solid #ddd;border-radius:8px;font-weight:600;cursor:pointer;">Fechar</button>
                </div>
            </div>
        </div>

        <!-- Delete Confirmation -->
        <div id="modal-delete-tx" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:400px;text-align:center;">
                <h2 style="margin-bottom:1rem;color:var(--text-dark);">Confirmar exclusão</h2>
                <p style="color:var(--text-muted);margin-bottom:2rem;">Tem certeza que deseja excluir esta transação?</p>
                <div style="display:flex;gap:1rem;">
                    <button id="btnCancelDeleteTx" style="flex:1;padding:12px;background:white;border:1px solid #ddd;border-radius:8px;font-weight:600;cursor:pointer;">Cancelar</button>
                    <button id="btnConfirmDeleteTx" style="flex:1;padding:12px;background:#E91E63;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Excluir</button>
                </div>
            </div>
        </div>
    `;

    renderSummary();
    renderTable();
    bindEvents();
}

function renderSummary() {
    const container = document.getElementById('txSummaryCards');
    if (!container) return;

    const total = transactions.reduce((s, t) => s + parseFloat(t.total_amount || 0), 0);
    const paid = transactions.filter(t => t.payment_status === 'PAID');
    const totalPaid = paid.reduce((s, t) => s + parseFloat(t.total_amount || 0), 0);
    const totalProfessional = paid.reduce((s, t) => s + parseFloat(t.professional_amount || 0), 0);
    const totalSalon = paid.reduce((s, t) => s + parseFloat(t.salon_amount || 0), 0);

    container.innerHTML = `
        <div style="background:white;border-radius:12px;padding:1.25rem;border:1px solid #e0e0e0;">
            <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.5rem;">Total Bruto</div>
            <div style="font-size:1.5rem;font-weight:700;color:var(--text-dark);">${formatCurrency(total)}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem;">${transactions.length} transações</div>
        </div>
        <div style="background:white;border-radius:12px;padding:1.25rem;border:1px solid #e0e0e0;">
            <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.5rem;">Total Pago</div>
            <div style="font-size:1.5rem;font-weight:700;color:#4CAF50;">${formatCurrency(totalPaid)}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem;">${paid.length} pagas</div>
        </div>
        <div style="background:white;border-radius:12px;padding:1.25rem;border:1px solid #e0e0e0;">
            <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.5rem;">Parte Salão</div>
            <div style="font-size:1.5rem;font-weight:700;color:#2196F3;">${formatCurrency(totalSalon)}</div>
        </div>
        <div style="background:white;border-radius:12px;padding:1.25rem;border:1px solid #e0e0e0;">
            <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.5rem;">Parte Profissional</div>
            <div style="font-size:1.5rem;font-weight:700;color:#FF9800;">${formatCurrency(totalProfessional)}</div>
        </div>
    `;
}

function renderTable() {
    const container = document.getElementById('transactionsContainer');
    if (!container) return;

    if (transactions.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:3rem 1rem;">
                <i class="fas fa-exchange-alt" style="font-size:3rem;color:#e0e0e0;margin-bottom:1rem;display:block;"></i>
                <h3 style="color:var(--text-muted);margin-bottom:0.5rem;">Nenhuma transação encontrada</h3>
                <p style="color:var(--text-muted);font-size:0.9rem;">As transações de pagamento de serviços aparecerão aqui</p>
            </div>
        `;
        return;
    }

    let html = `<table style="width:100%;border-collapse:collapse;">
        <thead style="background:#f8f9fa;">
            <tr>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Data</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Valor Total</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Pagamento</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Status</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Salão</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Profissional</th>
                <th style="padding:1rem;border-bottom:2px solid #e0e0e0;"></th>
            </tr>
        </thead>
        <tbody>`;

    transactions.forEach(t => {
        const status = t.payment_status || 'PENDING';
        const method = PAYMENT_METHODS[t.payment_method] || t.payment_method || '-';

        html += `<tr style="border-bottom:1px solid #f0f0f0;">
            <td style="padding:1rem;color:var(--text-muted);">${formatDate(t.created_at)}</td>
            <td style="padding:1rem;font-weight:600;color:var(--text-dark);">${formatCurrency(parseFloat(t.total_amount || 0))}</td>
            <td style="padding:1rem;color:var(--text-muted);">${method}</td>
            <td style="padding:1rem;"><span style="padding:4px 12px;border-radius:12px;font-size:0.85rem;font-weight:600;${STATUS_STYLES[status] || ''}">${STATUS_LABELS[status] || status}</span></td>
            <td style="padding:1rem;color:#2196F3;font-weight:600;">${formatCurrency(parseFloat(t.salon_amount || 0))}</td>
            <td style="padding:1rem;color:#FF9800;font-weight:600;">${formatCurrency(parseFloat(t.professional_amount || 0))}</td>
            <td style="padding:1rem;">
                <button class="btn-view-tx" data-id="${t.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0.25rem;margin-right:0.5rem;" title="Detalhes"><i class="fas fa-eye"></i></button>
                <button class="btn-delete-tx" data-id="${t.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0.25rem;" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function showTransactionDetail(tx) {
    const container = document.getElementById('txDetailContent');
    if (!container) return;

    const method = PAYMENT_METHODS[tx.payment_method] || tx.payment_method || '-';
    const status = tx.payment_status || 'PENDING';

    container.innerHTML = `
        <div style="display:grid;gap:1rem;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                    <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.25rem;">Valor Total</div>
                    <div style="font-size:1.3rem;font-weight:700;color:var(--text-dark);">${formatCurrency(parseFloat(tx.total_amount || 0))}</div>
                </div>
                <div>
                    <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.25rem;">Valor Líquido</div>
                    <div style="font-size:1.3rem;font-weight:700;color:var(--text-dark);">${formatCurrency(parseFloat(tx.net_amount || 0))}</div>
                </div>
            </div>
            <div style="border-top:1px solid #f0f0f0;padding-top:1rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                    <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.25rem;">Parte Salão (${tx.salon_percentage || 0}%)</div>
                    <div style="font-weight:600;color:#2196F3;">${formatCurrency(parseFloat(tx.salon_amount || 0))}</div>
                </div>
                <div>
                    <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.25rem;">Parte Profissional (${tx.professional_percentage || 0}%)</div>
                    <div style="font-weight:600;color:#FF9800;">${formatCurrency(parseFloat(tx.professional_amount || 0))}</div>
                </div>
            </div>
            <div style="border-top:1px solid #f0f0f0;padding-top:1rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                    <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.25rem;">Forma de Pagamento</div>
                    <div style="font-weight:600;">${method}</div>
                </div>
                <div>
                    <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.25rem;">Status</div>
                    <span style="padding:4px 12px;border-radius:12px;font-size:0.85rem;font-weight:600;${STATUS_STYLES[status] || ''}">${STATUS_LABELS[status] || status}</span>
                </div>
            </div>
            <div style="border-top:1px solid #f0f0f0;padding-top:1rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                    <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.25rem;">Taxa Gateway</div>
                    <div style="font-weight:600;">${formatCurrency(parseFloat(tx.gateway_fee || 0))}</div>
                </div>
                <div>
                    <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.25rem;">Data Pagamento</div>
                    <div style="font-weight:600;">${tx.paid_at ? formatDate(tx.paid_at) : '-'}</div>
                </div>
            </div>
            ${tx.notes ? `
            <div style="border-top:1px solid #f0f0f0;padding-top:1rem;">
                <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.25rem;">Observações</div>
                <div style="color:var(--text-dark);">${tx.notes}</div>
            </div>` : ''}
        </div>
    `;

    openModal('tx-detail');
}

function bindEvents() {
    // Filters
    document.getElementById('btnTxFilter')?.addEventListener('click', async () => {
        filterStartDate = document.getElementById('txFilterStartDate')?.value || '';
        filterEndDate = document.getElementById('txFilterEndDate')?.value || '';
        filterStatus = document.getElementById('txFilterStatus')?.value || '';
        await loadTransactions();
        renderSummary();
        renderTable();
    });

    document.getElementById('btnTxClear')?.addEventListener('click', async () => {
        document.getElementById('txFilterStartDate').value = '';
        document.getElementById('txFilterEndDate').value = '';
        document.getElementById('txFilterStatus').value = '';
        filterStartDate = '';
        filterEndDate = '';
        filterStatus = '';
        await loadTransactions();
        renderSummary();
        renderTable();
    });

    // View / Delete delegation
    document.getElementById('transactionsContainer')?.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.btn-view-tx');
        const deleteBtn = e.target.closest('.btn-delete-tx');

        if (viewBtn) {
            const tx = transactions.find(t => t.id === viewBtn.dataset.id);
            if (tx) showTransactionDetail(tx);
        }

        if (deleteBtn) {
            if (isSubscriptionBlocked()) {
                showToast('Assinatura inativa.', 'error');
                return;
            }
            editingId = deleteBtn.dataset.id;
            openModal('delete-tx');
        }
    });

    // Detail modal close
    document.getElementById('modalCloseTxDetail')?.addEventListener('click', () => closeModal('tx-detail'));
    document.getElementById('btnCloseTxDetail')?.addEventListener('click', () => closeModal('tx-detail'));

    // Delete confirmation
    document.getElementById('btnCancelDeleteTx')?.addEventListener('click', () => {
        editingId = null;
        closeModal('delete-tx');
    });
    document.getElementById('btnConfirmDeleteTx')?.addEventListener('click', async () => {
        if (editingId) {
            try {
                await api.delete(`/payment-transactions/${editingId}`);
                showToast('Transação excluída.', 'success');
                editingId = null;
                closeModal('delete-tx');
                await loadTransactions();
                renderSummary();
                renderTable();
            } catch (error) {
                console.error('[PaymentTransactions] Delete error:', error);
                showToast(error.message || 'Erro ao excluir', 'error');
            }
        }
    });
}

/**
 * Purchases Page Module
 * Purchase management with automatic stock update
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { formatCurrency, formatDate } from '../../../shared/utils/validation.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';

let purchases = [];
let suppliers = [];
let products = [];
let filters = { supplier_id: '', payment_status: '' };
let purchaseItems = [];

export function render() {
    renderShell('purchases');
}

export async function init() {
    await loadData();
    renderContent();
    
    return () => {
        purchases = [];
        suppliers = [];
        products = [];
        purchaseItems = [];
    };
}

async function loadData() {
    const content = getContentArea();
    content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner"></div></div>';

    try {
        const params = new URLSearchParams();
        if (filters.supplier_id) params.append('supplier_id', filters.supplier_id);
        if (filters.payment_status) params.append('payment_status', filters.payment_status);

        const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
            api.get(`/purchases?${params}`),
            api.get('/suppliers'),
            api.get('/products'),
        ]);

        purchases = purchasesRes.data || [];
        suppliers = suppliersRes.data || [];
        products = productsRes.data || [];
    } catch (error) {
        console.error('Error loading purchases:', error);
        showToast('Erro ao carregar compras', 'error');
    }
}

function renderContent() {
    const content = getContentArea();
    
    const totalPurchases = purchases.length;
    const totalValue = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const pendingCount = purchases.filter(p => p.payment_status === 'PENDING').length;
    
    content.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:2rem;">
            <h1 style="font-size:2.25rem;font-weight:900;letter-spacing:-0.033em;">Compras</h1>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                <button class="btn btn-primary" id="btnAddPurchase" style="display:flex;align-items:center;gap:0.5rem;padding:0.75rem 1.5rem;border-radius:8px;background:var(--color-secondary);color:var(--color-primary);font-weight:700;font-size:0.875rem;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);border:none;cursor:pointer;">
                    <i class="fas fa-plus"></i> Nova Compra
                </button>
                <button class="btn btn-secondary" id="btnExportCSV" style="display:flex;align-items:center;gap:0.5rem;padding:0.75rem 1.5rem;border-radius:8px;background:#fff;border:1px solid #e5e0dc;font-weight:700;font-size:0.875rem;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);cursor:pointer;">
                    <i class="fas fa-download"></i> Exportar
                </button>
            </div>
        </div>

        <!-- KPI Cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.5rem;margin-bottom:2rem;">
            <div class="kpi-card">
                <span class="kpi-card__label">Total de Compras</span>
                <span class="kpi-card__value">${totalPurchases}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-card__label">Valor Total</span>
                <span class="kpi-card__value">${formatCurrency(totalValue)}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-card__label">Pendentes</span>
                <span class="kpi-card__value" style="color:${pendingCount > 0 ? '#f59e0b' : ''}">${pendingCount}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-card__label">Fornecedores</span>
                <span class="kpi-card__value">${suppliers.length}</span>
            </div>
        </div>

        <!-- Filters -->
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1.5rem;padding:1rem;border-radius:8px;border:1px solid #e5e0dc;background:#fff;">
            <select id="filterSupplier" style="padding:0.5rem 0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;">
                <option value="">Todos fornecedores</option>
                ${suppliers.map(s => `<option value="${s.id}" ${filters.supplier_id === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
            <select id="filterStatus" style="padding:0.5rem 0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;">
                <option value="">Todos status</option>
                <option value="PENDING" ${filters.payment_status === 'PENDING' ? 'selected' : ''}>Pendente</option>
                <option value="PAID" ${filters.payment_status === 'PAID' ? 'selected' : ''}>Pago</option>
                <option value="PARTIAL" ${filters.payment_status === 'PARTIAL' ? 'selected' : ''}>Parcial</option>
                <option value="CANCELLED" ${filters.payment_status === 'CANCELLED' ? 'selected' : ''}>Cancelado</option>
            </select>
            <button class="btn btn-secondary" id="btnApplyFilters" style="padding:0.5rem 1rem;border-radius:6px;background:var(--color-secondary);color:var(--color-primary);font-weight:600;font-size:0.875rem;border:none;cursor:pointer;">
                Filtrar
            </button>
        </div>

        <!-- Purchase Cards Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:1.5rem;">
            ${renderPurchaseCards()}
        </div>

        ${renderPurchaseModal()}

        <style>
            .kpi-card { display:flex;flex-direction:column;gap:0.5rem;padding:1.5rem;border-radius:8px;border:1px solid #e5e0dc;background:#fff;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05); }
            .kpi-card__label { font-size:1rem;font-weight:500;color:#666; }
            .kpi-card__value { font-size:1.875rem;font-weight:700; }
            .purchase-card { border-radius:8px;border:1px solid #e5e0dc;background:#fff;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);padding:1.5rem;display:flex;flex-direction:column;gap:1rem; }
            .purchase-card__header { display:flex;justify-content:space-between;align-items:flex-start; }
            .purchase-card__supplier { font-weight:700;font-size:1rem; }
            .purchase-card__date { font-size:0.875rem;color:#666; }
            .purchase-card__status { padding:0.25rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:600; }
            .purchase-card__status--PENDING { background:#fef3c7;color:#d97706; }
            .purchase-card__status--PAID { background:#dcfce7;color:#16a34a; }
            .purchase-card__status--PARTIAL { background:#dbeafe;color:#2563eb; }
            .purchase-card__status--CANCELLED { background:#fee2e2;color:#dc2626; }
            .purchase-card__total { font-size:1.5rem;font-weight:700; }
            .purchase-card__items { font-size:0.875rem;color:#666; }
            .purchase-card__payment { font-size:0.875rem;color:#666; }
            .purchase-card__actions { display:flex;gap:0.5rem;margin-top:auto; }
            .purchase-card__btn { flex:1;padding:0.5rem;border-radius:6px;border:1px solid #e5e0dc;background:#fff;font-size:0.875rem;font-weight:600;cursor:pointer; }
            .purchase-card__btn--primary { background:var(--color-secondary);color:var(--color-primary);border:none; }
            .purchase-card__btn--danger { color:#dc2626; }
        </style>
    `;

    bindEvents();
}

function renderPurchaseCards() {
    if (purchases.length === 0) {
        return '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#666;"><i class="fas fa-shopping-cart" style="font-size:3rem;margin-bottom:1rem;"></i><h3>Nenhuma compra encontrada</h3><p>Registre sua primeira compra para começar</p></div>';
    }

    return purchases.map(purchase => {
        const statusClass = `purchase-card__status--${purchase.payment_status}`;
        
        return `
            <div class="purchase-card">
                <div class="purchase-card__header">
                    <div>
                        <div class="purchase-card__supplier">${purchase.supplier?.name || 'Fornecedor não informado'}</div>
                        <div class="purchase-card__date">${formatDate(purchase.purchase_date)}</div>
                    </div>
                    <span class="purchase-card__status ${statusClass}">${purchase.payment_status}</span>
                </div>
                <div class="purchase-card__total">${formatCurrency(purchase.total_amount)}</div>
                <div class="purchase-card__items">${purchase.items?.length || 0} itens</div>
                <div class="purchase-card__payment">Pagamento: ${purchase.payment_method}</div>
                <div class="purchase-card__actions">
                    <button class="purchase-card__btn purchase-card__btn--primary btn-view" data-id="${purchase.id}">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="purchase-card__btn purchase-card__btn--danger btn-delete" data-id="${purchase.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderPurchaseModal() {
    return `
        <div class="modal-overlay" id="modal-purchase" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;z-index:1000;">
            <div class="modal" style="background:#fff;border-radius:12px;box-shadow:0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);max-width:800px;width:90%;max-height:90vh;overflow-y:auto;">
                <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:1.5rem;border-bottom:1px solid #e5e0dc;">
                    <h3 style="font-size:1.25rem;font-weight:700;margin:0;">Nova Compra</h3>
                    <button class="modal-close" data-modal="purchase" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#666;">&times;</button>
                </div>
                <form id="purchaseForm">
                    <div class="modal-body" style="padding:1.5rem;">
                        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Fornecedor *</label>
                                <select id="purchaseSupplier" required style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                                    <option value="">Selecione</option>
                                    ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Método de Pagamento *</label>
                                <select id="purchasePaymentMethod" required style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                                    <option value="DINHEIRO">Dinheiro</option>
                                    <option value="DEBITO">Débito</option>
                                    <option value="CREDITO">Crédito</option>
                                    <option value="PIX">PIX</option>
                                    <option value="TRANSFERENCIA">Transferência</option>
                                    <option value="BOLETO">Boleto</option>
                                    <option value="A_PRAZO">A Prazo</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group" style="margin-bottom:1rem;">
                            <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Observações</label>
                            <textarea id="purchaseNotes" rows="2" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;resize:vertical;"></textarea>
                        </div>

                        <hr style="border:none;border-top:1px solid #e5e0dc;margin:1.5rem 0;">
                        <h4 style="font-size:1rem;font-weight:700;margin-bottom:1rem;">Itens da Compra</h4>
                        
                        <div class="form-row" style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:0.75rem;margin-bottom:1rem;align-items:end;">
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Produto</label>
                                <select id="itemProduct" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                                    <option value="">Selecione</option>
                                    ${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Quantidade</label>
                                <input type="number" id="itemQuantity" min="1" value="1" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                            </div>
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Custo Unitário</label>
                                <input type="number" id="itemCost" step="0.01" min="0" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                            </div>
                            <div class="form-group">
                                <button type="button" class="btn btn-secondary" id="btnAddItem" style="padding:0.75rem 1rem;border-radius:6px;background:var(--color-secondary);color:var(--color-primary);font-weight:600;font-size:0.875rem;border:none;cursor:pointer;">
                                    <i class="fas fa-plus"></i> Adicionar
                                </button>
                            </div>
                        </div>

                        <div id="itemsList" style="margin-top: 1rem;">
                            <!-- Items will be rendered here -->
                        </div>

                        <div style="margin-top: 1rem; text-align: right; padding:1rem;background:#fee4d3/30;border-radius:6px;">
                            <strong style="font-size:1.125rem;">Total: <span id="purchaseTotal" style="font-size:1.25rem;">R$ 0,00</span></strong>
                        </div>
                    </div>
                    <div class="modal-footer" style="display:flex;gap:0.75rem;justify-content:flex-end;padding:1.5rem;border-top:1px solid #e5e0dc;">
                        <button type="button" class="btn btn-secondary" data-modal="purchase" style="padding:0.75rem 1.5rem;border-radius:6px;border:1px solid #e5e0dc;background:#fff;font-weight:600;font-size:0.875rem;cursor:pointer;">Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="padding:0.75rem 1.5rem;border-radius:6px;background:var(--color-secondary);color:var(--color-primary);font-weight:700;font-size:0.875rem;border:none;cursor:pointer;">Salvar Compra</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function bindEvents() {
    document.getElementById('btnAddPurchase')?.addEventListener('click', () => {
        purchaseItems = [];
        document.getElementById('purchaseForm').reset();
        updateItemsList();
        openModal('purchase');
    });

    document.getElementById('btnApplyFilters')?.addEventListener('click', async () => {
        filters.supplier_id = document.getElementById('filterSupplier').value;
        filters.payment_status = document.getElementById('filterStatus').value;
        await loadData();
        renderContent();
    });

    document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);

    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => viewPurchase(btn.dataset.id));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deletePurchase(btn.dataset.id));
    });

    document.getElementById('btnAddItem')?.addEventListener('click', addItem);
    document.getElementById('purchaseForm')?.addEventListener('submit', handlePurchaseSubmit);

    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });
}

function addItem() {
    const productId = document.getElementById('itemProduct').value;
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const unitCost = parseFloat(document.getElementById('itemCost').value);

    if (!productId || !quantity || !unitCost) {
        showToast('Preencha todos os campos do item', 'warning');
        return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    purchaseItems.push({
        product_id: productId,
        product_name: product.name,
        quantity,
        unit_cost: unitCost,
        total_cost: quantity * unitCost,
    });

    document.getElementById('itemProduct').value = '';
    document.getElementById('itemQuantity').value = '1';
    document.getElementById('itemCost').value = '';

    updateItemsList();
}

function updateItemsList() {
    const container = document.getElementById('itemsList');
    if (!container) return;

    if (purchaseItems.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;padding:1rem;background:#f9fafb;border-radius:6px;">Nenhum item adicionado</p>';
        document.getElementById('purchaseTotal').textContent = 'R$ 0,00';
        return;
    }

    const total = purchaseItems.reduce((sum, item) => sum + item.total_cost, 0);

    container.innerHTML = `
        <table style="width:100%;border-collapse:collapse;">
            <thead>
                <tr style="border-bottom:1px solid #e5e0dc;">
                    <th style="padding:0.75rem;text-align:left;font-size:0.875rem;font-weight:600;color:#333;">Produto</th>
                    <th style="padding:0.75rem;text-align:center;font-size:0.875rem;font-weight:600;color:#333;">Qtd</th>
                    <th style="padding:0.75rem;text-align:right;font-size:0.875rem;font-weight:600;color:#333;">Custo Unit.</th>
                    <th style="padding:0.75rem;text-align:right;font-size:0.875rem;font-weight:600;color:#333;">Total</th>
                    <th style="padding:0.75rem;text-align:center;font-size:0.875rem;font-weight:600;color:#333;"></th>
                </tr>
            </thead>
            <tbody>
                ${purchaseItems.map((item, index) => `
                    <tr style="border-bottom:1px solid #e5e0dc/50;">
                        <td style="padding:0.75rem;font-size:0.875rem;color:#333;">${item.product_name}</td>
                        <td style="padding:0.75rem;text-align:center;font-size:0.875rem;color:#333;">${item.quantity}</td>
                        <td style="padding:0.75rem;text-align:right;font-size:0.875rem;color:#333;">${formatCurrency(item.unit_cost)}</td>
                        <td style="padding:0.75rem;text-align:right;font-size:0.875rem;font-weight:600;color:#333;">${formatCurrency(item.total_cost)}</td>
                        <td style="padding:0.75rem;text-align:center;">
                            <button type="button" onclick="window.removeItem(${index})" style="padding:0.5rem;border-radius:6px;border:1px solid #fee2e2;background:#fee2e2;color:#dc2626;font-size:0.75rem;font-weight:600;cursor:pointer;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('purchaseTotal').textContent = formatCurrency(total);
}

window.removeItem = (index) => {
    purchaseItems.splice(index, 1);
    updateItemsList();
};

async function handlePurchaseSubmit(e) {
    e.preventDefault();

    if (purchaseItems.length === 0) {
        showToast('Adicione pelo menos um item', 'warning');
        return;
    }

    const data = {
        supplier_id: document.getElementById('purchaseSupplier').value,
        payment_method: document.getElementById('purchasePaymentMethod').value,
        notes: document.getElementById('purchaseNotes').value,
        items: purchaseItems,
    };

    try {
        await api.post('/purchases', data);
        showToast('Compra registrada! Estoque atualizado.', 'success');
        closeModal('purchase');
        await loadData();
        renderContent();
    } catch (error) {
        showToast(error.message || 'Erro ao registrar compra', 'error');
    }
}

async function viewPurchase(id) {
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return;

    const itemsHtml = purchase.items?.map(item => `
        <tr>
            <td>${item.product?.name || '-'}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.unit_cost)}</td>
            <td>${formatCurrency(item.total_cost)}</td>
        </tr>
    `).join('') || '';

    showToast(`
        <div style="text-align:left;">
            <h4>Compra #${purchase.id.slice(0, 8)}</h4>
            <p><strong>Fornecedor:</strong> ${purchase.supplier?.name}</p>
            <p><strong>Data:</strong> ${formatDate(purchase.purchase_date)}</p>
            <p><strong>Total:</strong> ${formatCurrency(purchase.total_amount)}</p>
            <table class="table" style="margin-top:1rem;">
                <thead><tr><th>Produto</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
        </div>
    `, 'info');
}

async function deletePurchase(id) {
    if (!confirm('Deseja realmente excluir esta compra?')) return;

    try {
        await api.delete(`/purchases/${id}`);
        showToast('Compra excluída!', 'success');
        await loadData();
        renderContent();
    } catch (error) {
        showToast(error.message || 'Erro ao excluir compra', 'error');
    }
}

function exportCSV() {
    if (purchases.length === 0) {
        showToast('Nenhum dado para exportar', 'warning');
        return;
    }

    const headers = ['Data', 'Fornecedor', 'Total', 'Pagamento', 'Status'];
    const rows = purchases.map(p => [
        formatDate(p.purchase_date),
        p.supplier?.name || '',
        p.total_amount,
        p.payment_method,
        p.payment_status,
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `compras_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('CSV exportado!', 'success');
}

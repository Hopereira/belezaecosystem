/**
 * Inventory Page Module
 * Product management with stock control
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { formatCurrency, formatDate } from '../../../shared/utils/validation.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';

let products = [];
let suppliers = [];
let filters = { category: '', low_stock: false, search: '' };
let editingProduct = null;

export function render() {
    renderShell('inventory');
}

export async function init() {
    await loadData();
    renderContent();
    
    return () => {
        products = [];
        suppliers = [];
        editingProduct = null;
    };
}

async function loadData() {
    const content = getContentArea();
    content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner"></div></div>';

    try {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.low_stock) params.append('low_stock', 'true');
        if (filters.search) params.append('search', filters.search);

        const [productsRes, suppliersRes] = await Promise.all([
            api.get(`/products?${params}`),
            api.get('/suppliers'),
        ]);

        products = productsRes.data || [];
        suppliers = suppliersRes.data || [];
    } catch (error) {
        console.error('Error loading inventory:', error);
        showToast('Erro ao carregar estoque', 'error');
    }
}

function renderContent() {
    const content = getContentArea();
    
    const lowStockCount = products.filter(p => p.stock_quantity <= p.minimum_stock).length;
    const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.cost_price), 0);
    
    content.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:2rem;">
            <h1 style="font-size:2.25rem;font-weight:900;letter-spacing:-0.033em;">Estoque</h1>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                <button class="btn btn-primary" id="btnAddProduct" style="display:flex;align-items:center;gap:0.5rem;padding:0.75rem 1.5rem;border-radius:8px;background:var(--color-secondary);color:var(--color-primary);font-weight:700;font-size:0.875rem;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);border:none;cursor:pointer;">
                    <i class="fas fa-plus"></i> Novo Produto
                </button>
                <button class="btn btn-secondary" id="btnExportCSV" style="display:flex;align-items:center;gap:0.5rem;padding:0.75rem 1.5rem;border-radius:8px;background:#fff;border:1px solid #e5e0dc;font-weight:700;font-size:0.875rem;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);cursor:pointer;">
                    <i class="fas fa-download"></i> Exportar
                </button>
            </div>
        </div>

        <!-- KPI Cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.5rem;margin-bottom:2rem;">
            <div class="kpi-card">
                <span class="kpi-card__label">Total de Produtos</span>
                <span class="kpi-card__value">${products.length}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-card__label">Estoque Baixo</span>
                <span class="kpi-card__value" style="color:${lowStockCount > 0 ? '#dc2626' : ''}">${lowStockCount}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-card__label">Valor Total</span>
                <span class="kpi-card__value">${formatCurrency(totalValue)}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-card__label">Fornecedores</span>
                <span class="kpi-card__value">${suppliers.length}</span>
            </div>
        </div>

        <!-- Filters -->
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1.5rem;padding:1rem;border-radius:8px;border:1px solid #e5e0dc;background:#fff;">
            <input type="text" id="filterSearch" placeholder="Buscar produto..." value="${filters.search}" style="flex:1;min-width:200px;padding:0.5rem 0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;">
            <select id="filterCategory" style="padding:0.5rem 0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;">
                <option value="">Todas categorias</option>
                <option value="Shampoo" ${filters.category === 'Shampoo' ? 'selected' : ''}>Shampoo</option>
                <option value="Condicionador" ${filters.category === 'Condicionador' ? 'selected' : ''}>Condicionador</option>
                <option value="Tintura" ${filters.category === 'Tintura' ? 'selected' : ''}>Tintura</option>
                <option value="Esmalte" ${filters.category === 'Esmalte' ? 'selected' : ''}>Esmalte</option>
                <option value="Outros" ${filters.category === 'Outros' ? 'selected' : ''}>Outros</option>
            </select>
            <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.875rem;">
                <input type="checkbox" id="filterLowStock" ${filters.low_stock ? 'checked' : ''}>
                Estoque baixo
            </label>
            <button class="btn btn-secondary" id="btnApplyFilters" style="padding:0.5rem 1rem;border-radius:6px;background:var(--color-secondary);color:var(--color-primary);font-weight:600;font-size:0.875rem;border:none;cursor:pointer;">
                Filtrar
            </button>
        </div>

        <!-- Product Cards Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.5rem;">
            ${renderProductCards()}
        </div>

        ${renderProductModal()}
        ${renderStockAdjustModal()}

        <style>
            .kpi-card { display:flex;flex-direction:column;gap:0.5rem;padding:1.5rem;border-radius:8px;border:1px solid #e5e0dc;background:#fff;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05); }
            .kpi-card__label { font-size:1rem;font-weight:500;color:#666; }
            .kpi-card__value { font-size:1.875rem;font-weight:700; }
            .product-card { border-radius:8px;border:1px solid #e5e0dc;background:#fff;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);padding:1.5rem;display:flex;flex-direction:column;gap:1rem; }
            .product-card__header { display:flex;justify-content:space-between;align-items:flex-start; }
            .product-card__name { font-weight:700;font-size:1rem; }
            .product-card__category { font-size:0.875rem;color:#666; }
            .product-card__stock { display:flex;align-items:center;gap:0.5rem; }
            .product-card__stock-badge { padding:0.25rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:600; }
            .product-card__stock-badge--low { background:#fee2e2;color:#dc2626; }
            .product-card__stock-badge--ok { background:#dcfce7;color:#16a34a; }
            .product-card__prices { display:flex;justify-content:space-between;font-size:0.875rem; }
            .product-card__price-label { color:#666; }
            .product-card__price-value { font-weight:600; }
            .product-card__actions { display:flex;gap:0.5rem;margin-top:auto; }
            .product-card__btn { flex:1;padding:0.5rem;border-radius:6px;border:1px solid #e5e0dc;background:#fff;font-size:0.875rem;font-weight:600;cursor:pointer; }
            .product-card__btn--primary { background:var(--color-secondary);color:var(--color-primary);border:none; }
            .product-card__btn--danger { color:#dc2626; }
        </style>
    `;

    bindEvents();
}

function renderProductCards() {
    if (products.length === 0) {
        return '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#666;"><i class="fas fa-box" style="font-size:3rem;margin-bottom:1rem;"></i><h3>Nenhum produto encontrado</h3><p>Cadastre seu primeiro produto para começar</p></div>';
    }

    return products.map(product => {
        const lowStock = product.stock_quantity <= product.minimum_stock;
        const stockBadgeClass = lowStock ? 'product-card__stock-badge--low' : 'product-card__stock-badge--ok';
        
        return `
            <div class="product-card">
                <div class="product-card__header">
                    <div>
                        <div class="product-card__name">${product.name}</div>
                        <div class="product-card__category">${product.category || 'Sem categoria'}</div>
                    </div>
                    <div class="product-card__stock">
                        <span class="product-card__stock-badge ${stockBadgeClass}">${product.stock_quantity} un</span>
                    </div>
                </div>
                <div class="product-card__prices">
                    <div>
                        <div class="product-card__price-label">Custo</div>
                        <div class="product-card__price-value">${formatCurrency(product.cost_price)}</div>
                    </div>
                    <div>
                        <div class="product-card__price-label">Venda</div>
                        <div class="product-card__price-value">${formatCurrency(product.sale_price)}</div>
                    </div>
                </div>
                <div style="font-size:0.875rem;color:#666;">
                    <div>Fornecedor: ${product.supplier?.name || '-'}</div>
                    <div>Mínimo: ${product.minimum_stock} un</div>
                    ${product.expiration_date ? `<div>Validade: ${formatDate(product.expiration_date)}</div>` : ''}
                </div>
                <div class="product-card__actions">
                    <button class="product-card__btn product-card__btn--primary btn-edit" data-id="${product.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="product-card__btn btn-adjust-stock" data-id="${product.id}">
                        <i class="fas fa-boxes"></i> Ajustar
                    </button>
                    <button class="product-card__btn product-card__btn--danger btn-delete" data-id="${product.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderProductModal() {
    return `
        <div class="modal-overlay" id="modal-product" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;z-index:1000;">
            <div class="modal" style="background:#fff;border-radius:12px;box-shadow:0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);max-width:600px;width:90%;max-height:90vh;overflow-y:auto;">
                <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:1.5rem;border-bottom:1px solid #e5e0dc;">
                    <h3 id="productModalTitle" style="font-size:1.25rem;font-weight:700;margin:0;">Novo Produto</h3>
                    <button class="modal-close" data-modal="product" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#666;">&times;</button>
                </div>
                <form id="productForm">
                    <div class="modal-body" style="padding:1.5rem;">
                        <div class="form-group" style="margin-bottom:1rem;">
                            <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Nome do Produto *</label>
                            <input type="text" id="productName" required style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                        </div>
                        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Categoria</label>
                                <select id="productCategory" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                                    <option value="">Selecione</option>
                                    <option value="Shampoo">Shampoo</option>
                                    <option value="Condicionador">Condicionador</option>
                                    <option value="Tintura">Tintura</option>
                                    <option value="Esmalte">Esmalte</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Fornecedor</label>
                                <select id="productSupplier" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                                    <option value="">Selecione</option>
                                    ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Código Interno</label>
                                <input type="text" id="productCode" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                            </div>
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Código de Barras</label>
                                <input type="text" id="productBarcode" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                            </div>
                        </div>
                        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Preço de Custo *</label>
                                <input type="number" id="productCost" step="0.01" required style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                            </div>
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Preço de Venda *</label>
                                <input type="number" id="productPrice" step="0.01" required style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                            </div>
                        </div>
                        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Estoque Inicial</label>
                                <input type="number" id="productStock" value="0" min="0" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                            </div>
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Estoque Mínimo</label>
                                <input type="number" id="productMinStock" value="0" min="0" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                            </div>
                        </div>
                        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Data de Validade</label>
                                <input type="date" id="productExpiration" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                            </div>
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Lote</label>
                                <input type="text" id="productBatch" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="display:flex;gap:0.75rem;justify-content:flex-end;padding:1.5rem;border-top:1px solid #e5e0dc;">
                        <button type="button" class="btn btn-secondary" data-modal="product" style="padding:0.75rem 1.5rem;border-radius:6px;border:1px solid #e5e0dc;background:#fff;font-weight:600;font-size:0.875rem;cursor:pointer;">Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="padding:0.75rem 1.5rem;border-radius:6px;background:var(--color-secondary);color:var(--color-primary);font-weight:700;font-size:0.875rem;border:none;cursor:pointer;">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderStockAdjustModal() {
    return `
        <div class="modal-overlay" id="modal-adjust-stock" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;z-index:1000;">
            <div class="modal" style="background:#fff;border-radius:12px;box-shadow:0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);max-width:500px;width:90%;">
                <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:1.5rem;border-bottom:1px solid #e5e0dc;">
                    <h3 style="font-size:1.25rem;font-weight:700;margin:0;">Ajustar Estoque</h3>
                    <button class="modal-close" data-modal="adjust-stock" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#666;">&times;</button>
                </div>
                <form id="adjustStockForm">
                    <div class="modal-body" style="padding:1.5rem;">
                        <div class="form-group" style="margin-bottom:1rem;">
                            <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Quantidade (use - para reduzir)</label>
                            <input type="number" id="adjustQuantity" required style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                            <small style="display:block;margin-top:0.25rem;color:#666;font-size:0.75rem;">Ex: 10 para adicionar, -5 para remover</small>
                        </div>
                        <div class="form-group" style="margin-bottom:1rem;">
                            <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Observações</label>
                            <textarea id="adjustNotes" rows="3" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;resize:vertical;"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer" style="display:flex;gap:0.75rem;justify-content:flex-end;padding:1.5rem;border-top:1px solid #e5e0dc;">
                        <button type="button" class="btn btn-secondary" data-modal="adjust-stock" style="padding:0.75rem 1.5rem;border-radius:6px;border:1px solid #e5e0dc;background:#fff;font-weight:600;font-size:0.875rem;cursor:pointer;">Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="padding:0.75rem 1.5rem;border-radius:6px;background:var(--color-secondary);color:var(--color-primary);font-weight:700;font-size:0.875rem;border:none;cursor:pointer;">Ajustar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function bindEvents() {
    // Add product
    document.getElementById('btnAddProduct')?.addEventListener('click', () => {
        editingProduct = null;
        document.getElementById('productModalTitle').textContent = 'Novo Produto';
        document.getElementById('productForm').reset();
        openModal('product');
    });

    // Filters
    document.getElementById('btnApplyFilters')?.addEventListener('click', async () => {
        filters.search = document.getElementById('filterSearch').value;
        filters.category = document.getElementById('filterCategory').value;
        filters.low_stock = document.getElementById('filterLowStock').checked;
        await loadData();
        renderContent();
    });

    // Export CSV
    document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);

    // Table actions
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editProduct(btn.dataset.id));
    });

    document.querySelectorAll('.btn-adjust-stock').forEach(btn => {
        btn.addEventListener('click', () => adjustStock(btn.dataset.id));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });

    // Product form submit
    document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);

    // Adjust stock form submit
    document.getElementById('adjustStockForm')?.addEventListener('submit', handleAdjustStockSubmit);

    // Modal close buttons
    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });
}

async function editProduct(id) {
    editingProduct = products.find(p => p.id === id);
    if (!editingProduct) return;

    document.getElementById('productModalTitle').textContent = 'Editar Produto';
    document.getElementById('productName').value = editingProduct.name;
    document.getElementById('productCategory').value = editingProduct.category || '';
    document.getElementById('productSupplier').value = editingProduct.supplier_id || '';
    document.getElementById('productCode').value = editingProduct.internal_code || '';
    document.getElementById('productBarcode').value = editingProduct.barcode || '';
    document.getElementById('productCost').value = editingProduct.cost_price;
    document.getElementById('productPrice').value = editingProduct.sale_price;
    document.getElementById('productStock').value = editingProduct.stock_quantity;
    document.getElementById('productMinStock').value = editingProduct.minimum_stock;
    document.getElementById('productExpiration').value = editingProduct.expiration_date ? editingProduct.expiration_date.split('T')[0] : '';
    document.getElementById('productBatch').value = editingProduct.batch_number || '';

    openModal('product');
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        supplier_id: document.getElementById('productSupplier').value || null,
        internal_code: document.getElementById('productCode').value,
        barcode: document.getElementById('productBarcode').value,
        cost_price: parseFloat(document.getElementById('productCost').value),
        sale_price: parseFloat(document.getElementById('productPrice').value),
        stock_quantity: parseInt(document.getElementById('productStock').value),
        minimum_stock: parseInt(document.getElementById('productMinStock').value),
        expiration_date: document.getElementById('productExpiration').value || null,
        batch_number: document.getElementById('productBatch').value,
    };

    try {
        if (editingProduct) {
            await api.put(`/products/${editingProduct.id}`, data);
            showToast('Produto atualizado!', 'success');
        } else {
            await api.post('/products', data);
            showToast('Produto criado!', 'success');
        }

        closeModal('product');
        await loadData();
        renderContent();
    } catch (error) {
        showToast(error.message || 'Erro ao salvar produto', 'error');
    }
}

let adjustingProductId = null;

function adjustStock(id) {
    adjustingProductId = id;
    document.getElementById('adjustStockForm').reset();
    openModal('adjust-stock');
}

async function handleAdjustStockSubmit(e) {
    e.preventDefault();

    const quantity = parseInt(document.getElementById('adjustQuantity').value);
    const notes = document.getElementById('adjustNotes').value;

    try {
        await api.post(`/products/${adjustingProductId}/adjust-stock`, { quantity, notes });
        showToast('Estoque ajustado!', 'success');
        closeModal('adjust-stock');
        await loadData();
        renderContent();
    } catch (error) {
        showToast(error.message || 'Erro ao ajustar estoque', 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('Deseja realmente excluir este produto?')) return;

    try {
        await api.delete(`/products/${id}`);
        showToast('Produto excluído!', 'success');
        await loadData();
        renderContent();
    } catch (error) {
        showToast(error.message || 'Erro ao excluir produto', 'error');
    }
}

function exportCSV() {
    if (products.length === 0) {
        showToast('Nenhum dado para exportar', 'warning');
        return;
    }

    const headers = ['Nome', 'Categoria', 'Fornecedor', 'Estoque', 'Mín', 'Custo', 'Venda', 'Validade'];
    const rows = products.map(p => [
        p.name,
        p.category || '',
        p.supplier?.name || '',
        p.stock_quantity,
        p.minimum_stock,
        p.cost_price,
        p.sale_price,
        p.expiration_date || '',
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `estoque_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('CSV exportado!', 'success');
}

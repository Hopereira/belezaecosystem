/**
 * Suppliers Page Module
 * Supplier management
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';

let suppliers = [];
let filters = { search: '' };
let editingSupplier = null;

export function render() {
    renderShell('suppliers');
}

export async function init() {
    await loadData();
    renderContent();
    
    return () => {
        suppliers = [];
        editingSupplier = null;
    };
}

async function loadData() {
    const content = getContentArea();
    content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner"></div></div>';

    try {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);

        const res = await api.get(`/suppliers?${params}`);
        suppliers = res.data || [];
    } catch (error) {
        console.error('Error loading suppliers:', error);
        showToast('Erro ao carregar fornecedores', 'error');
    }
}

function renderContent() {
    const content = getContentArea();
    
    content.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:2rem;">
            <h1 style="font-size:2.25rem;font-weight:900;letter-spacing:-0.033em;">Fornecedores</h1>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                <button class="btn btn-primary" id="btnAddSupplier" style="display:flex;align-items:center;gap:0.5rem;padding:0.75rem 1.5rem;border-radius:8px;background:var(--color-secondary);color:var(--color-primary);font-weight:700;font-size:0.875rem;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);border:none;cursor:pointer;">
                    <i class="fas fa-plus"></i> Novo Fornecedor
                </button>
                <button class="btn btn-secondary" id="btnExportCSV" style="display:flex;align-items:center;gap:0.5rem;padding:0.75rem 1.5rem;border-radius:8px;background:#fff;border:1px solid #e5e0dc;font-weight:700;font-size:0.875rem;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);cursor:pointer;">
                    <i class="fas fa-download"></i> Exportar
                </button>
            </div>
        </div>

        <!-- KPI Card -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.5rem;margin-bottom:2rem;">
            <div class="kpi-card">
                <span class="kpi-card__label">Total de Fornecedores</span>
                <span class="kpi-card__value">${suppliers.length}</span>
            </div>
        </div>

        <!-- Filters -->
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1.5rem;padding:1rem;border-radius:8px;border:1px solid #e5e0dc;background:#fff;">
            <input type="text" id="filterSearch" placeholder="Buscar fornecedor..." value="${filters.search}" style="flex:1;min-width:200px;padding:0.5rem 0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;">
            <button class="btn btn-secondary" id="btnApplyFilters" style="padding:0.5rem 1rem;border-radius:6px;background:var(--color-secondary);color:var(--color-primary);font-weight:600;font-size:0.875rem;border:none;cursor:pointer;">
                Filtrar
            </button>
        </div>

        <!-- Supplier Cards Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.5rem;">
            ${renderSupplierCards()}
        </div>

        ${renderSupplierModal()}

        <style>
            .kpi-card { display:flex;flex-direction:column;gap:0.5rem;padding:1.5rem;border-radius:8px;border:1px solid #e5e0dc;background:#fff;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05); }
            .kpi-card__label { font-size:1rem;font-weight:500;color:#666; }
            .kpi-card__value { font-size:1.875rem;font-weight:700; }
            .supplier-card { border-radius:8px;border:1px solid #e5e0dc;background:#fff;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);padding:1.5rem;display:flex;flex-direction:column;gap:1rem; }
            .supplier-card__header { display:flex;align-items:center;gap:1rem; }
            .supplier-card__avatar { width:48px;height:48px;border-radius:50%;background:var(--color-secondary);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--color-primary);font-size:1.25rem; }
            .supplier-card__name { font-weight:700;font-size:1rem; }
            .supplier-card__contact { font-size:0.875rem;color:#666; }
            .supplier-card__info { font-size:0.875rem;color:#666; }
            .supplier-card__actions { display:flex;gap:0.5rem;margin-top:auto; }
            .supplier-card__btn { flex:1;padding:0.5rem;border-radius:6px;border:1px solid #e5e0dc;background:#fff;font-size:0.875rem;font-weight:600;cursor:pointer; }
            .supplier-card__btn--primary { background:var(--color-secondary);color:var(--color-primary);border:none; }
            .supplier-card__btn--danger { color:#dc2626; }
        </style>
    `;

    bindEvents();
}

function renderSupplierCards() {
    if (suppliers.length === 0) {
        return '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#666;"><i class="fas fa-truck" style="font-size:3rem;margin-bottom:1rem;"></i><h3>Nenhum fornecedor encontrado</h3><p>Cadastre seu primeiro fornecedor para começar</p></div>';
    }

    return suppliers.map(supplier => {
        const initial = supplier.name.charAt(0).toUpperCase();
        
        return `
            <div class="supplier-card">
                <div class="supplier-card__header">
                    <div class="supplier-card__avatar">${initial}</div>
                    <div>
                        <div class="supplier-card__name">${supplier.name}</div>
                        <div class="supplier-card__contact">${supplier.phone || supplier.email || 'Sem contato'}</div>
                    </div>
                </div>
                <div class="supplier-card__info">
                    ${supplier.document ? `<div>CPF/CNPJ: ${supplier.document}</div>` : ''}
                    ${supplier.address ? `<div>Endereço: ${supplier.address}</div>` : ''}
                </div>
                <div class="supplier-card__actions">
                    <button class="supplier-card__btn supplier-card__btn--primary btn-edit" data-id="${supplier.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="supplier-card__btn supplier-card__btn--danger btn-delete" data-id="${supplier.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderSupplierModal() {
    return `
        <div class="modal-overlay" id="modal-supplier" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;z-index:1000;">
            <div class="modal" style="background:#fff;border-radius:12px;box-shadow:0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);max-width:600px;width:90%;max-height:90vh;overflow-y:auto;">
                <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:1.5rem;border-bottom:1px solid #e5e0dc;">
                    <h3 id="supplierModalTitle" style="font-size:1.25rem;font-weight:700;margin:0;">Novo Fornecedor</h3>
                    <button class="modal-close" data-modal="supplier" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#666;">&times;</button>
                </div>
                <form id="supplierForm">
                    <div class="modal-body" style="padding:1.5rem;">
                        <div class="form-group" style="margin-bottom:1rem;">
                            <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Nome *</label>
                            <input type="text" id="supplierName" required style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                        </div>
                        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">CPF/CNPJ</label>
                                <input type="text" id="supplierDocument" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                            </div>
                            <div class="form-group">
                                <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Telefone</label>
                                <input type="text" id="supplierPhone" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                            </div>
                        </div>
                        <div class="form-group" style="margin-bottom:1rem;">
                            <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Email</label>
                            <input type="email" id="supplierEmail" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;">
                        </div>
                        <div class="form-group" style="margin-bottom:1rem;">
                            <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Endereço</label>
                            <textarea id="supplierAddress" rows="2" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;resize:vertical;"></textarea>
                        </div>
                        <div class="form-group" style="margin-bottom:1rem;">
                            <label style="display:block;font-weight:600;font-size:0.875rem;margin-bottom:0.5rem;color:#333;">Observações</label>
                            <textarea id="supplierNotes" rows="3" style="width:100%;padding:0.75rem;border:1px solid #e5e0dc;border-radius:6px;font-size:0.875rem;background:#fff;resize:vertical;"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer" style="display:flex;gap:0.75rem;justify-content:flex-end;padding:1.5rem;border-top:1px solid #e5e0dc;">
                        <button type="button" class="btn btn-secondary" data-modal="supplier" style="padding:0.75rem 1.5rem;border-radius:6px;border:1px solid #e5e0dc;background:#fff;font-weight:600;font-size:0.875rem;cursor:pointer;">Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="padding:0.75rem 1.5rem;border-radius:6px;background:var(--color-secondary);color:var(--color-primary);font-weight:700;font-size:0.875rem;border:none;cursor:pointer;">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function bindEvents() {
    document.getElementById('btnAddSupplier')?.addEventListener('click', () => {
        editingSupplier = null;
        document.getElementById('supplierModalTitle').textContent = 'Novo Fornecedor';
        document.getElementById('supplierForm').reset();
        openModal('supplier');
    });

    document.getElementById('btnApplyFilters')?.addEventListener('click', async () => {
        filters.search = document.getElementById('filterSearch').value;
        await loadData();
        renderContent();
    });

    document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editSupplier(btn.dataset.id));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteSupplier(btn.dataset.id));
    });

    document.getElementById('supplierForm')?.addEventListener('submit', handleSupplierSubmit);

    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });
}

async function editSupplier(id) {
    editingSupplier = suppliers.find(s => s.id === id);
    if (!editingSupplier) return;

    document.getElementById('supplierModalTitle').textContent = 'Editar Fornecedor';
    document.getElementById('supplierName').value = editingSupplier.name;
    document.getElementById('supplierDocument').value = editingSupplier.document || '';
    document.getElementById('supplierPhone').value = editingSupplier.phone || '';
    document.getElementById('supplierEmail').value = editingSupplier.email || '';
    document.getElementById('supplierAddress').value = editingSupplier.address || '';
    document.getElementById('supplierNotes').value = editingSupplier.notes || '';

    openModal('supplier');
}

async function handleSupplierSubmit(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('supplierName').value,
        document: document.getElementById('supplierDocument').value,
        phone: document.getElementById('supplierPhone').value,
        email: document.getElementById('supplierEmail').value,
        address: document.getElementById('supplierAddress').value,
        notes: document.getElementById('supplierNotes').value,
    };

    try {
        if (editingSupplier) {
            await api.put(`/suppliers/${editingSupplier.id}`, data);
            showToast('Fornecedor atualizado!', 'success');
        } else {
            await api.post('/suppliers', data);
            showToast('Fornecedor criado!', 'success');
        }

        closeModal('supplier');
        await loadData();
        renderContent();
    } catch (error) {
        showToast(error.message || 'Erro ao salvar fornecedor', 'error');
    }
}

async function deleteSupplier(id) {
    if (!confirm('Deseja realmente excluir este fornecedor?')) return;

    try {
        await api.delete(`/suppliers/${id}`);
        showToast('Fornecedor excluído!', 'success');
        await loadData();
        renderContent();
    } catch (error) {
        showToast(error.message || 'Erro ao excluir fornecedor', 'error');
    }
}

function exportCSV() {
    if (suppliers.length === 0) {
        showToast('Nenhum dado para exportar', 'warning');
        return;
    }

    const headers = ['Nome', 'Documento', 'Telefone', 'Email', 'Endereço'];
    const rows = suppliers.map(s => [
        s.name,
        s.document || '',
        s.phone || '',
        s.email || '',
        s.address || '',
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fornecedores_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('CSV exportado!', 'success');
}

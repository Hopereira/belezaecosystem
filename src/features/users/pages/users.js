/**
 * Users Management Page Module
 * Full CRUD for user management (Admin+)
 * Backend: GET/POST/PUT/DELETE /api/users
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { formatDate } from '../../../shared/utils/validation.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';
import { showToast } from '../../../shared/utils/toast.js';
import { isSubscriptionBlocked } from '../../../core/state.js';

let users = [];
let editingId = null;
let searchTerm = '';
let filterRole = '';
let currentPage = 1;
let totalPages = 1;
let totalUsers = 0;
let isLoading = false;
const PAGE_SIZE = 15;

const ROLES = [
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Admin' },
    { value: 'professional', label: 'Profissional' },
    { value: 'client', label: 'Cliente' },
];

const ROLE_STYLES = {
    owner: 'background:#E8EAF6;color:#3F51B5;',
    admin: 'background:#E3F2FD;color:#2196F3;',
    professional: 'background:#E8F5E9;color:#4CAF50;',
    client: 'background:#FFF3E0;color:#FF9800;',
    master: 'background:#FCE4EC;color:#E91E63;',
};

export function render() {
    renderShell('users');
}

export async function init() {
    editingId = null;
    searchTerm = '';
    filterRole = '';
    currentPage = 1;
    await loadUsers();
    renderPage();
    return () => {
        editingId = null;
        users = [];
    };
}

async function loadUsers() {
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
        const params = new URLSearchParams();
        params.set('page', currentPage);
        params.set('limit', PAGE_SIZE);
        if (searchTerm) params.set('search', searchTerm);
        if (filterRole) params.set('role', filterRole);

        const response = await api.get(`/users?${params.toString()}`);
        const data = response.data || [];
        const pagination = response.pagination || {};
        users = data;
        totalPages = pagination.pages || 1;
        totalUsers = pagination.total || users.length;
    } catch (error) {
        console.error('[Users] Error loading:', error);
        showToast('Erro ao carregar usuários', 'error');
        users = [];
        totalPages = 1;
        totalUsers = 0;
    } finally {
        isLoading = false;
    }
}

function renderPage() {
    const content = getContentArea();
    if (!content) return;

    const roleOptions = ROLES.map(r => `<option value="${r.value}">${r.label}</option>`).join('');

    content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;gap:1rem;flex-wrap:wrap;">
            <h2 style="font-size:1.5rem;font-weight:700;color:var(--text-dark);margin:0;">Usuários</h2>
            <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;">
                <div style="position:relative;">
                    <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);"></i>
                    <input type="text" id="userSearch" placeholder="Buscar por nome ou email..." style="padding:10px 12px 10px 36px;border:1px solid #ddd;border-radius:25px;font-size:0.9rem;width:250px;">
                </div>
                <select id="filterRole" style="padding:10px 16px;border:1px solid #ddd;border-radius:8px;font-size:0.9rem;height:44px;">
                    <option value="">Todas as roles</option>
                    ${roleOptions}
                </select>
                <button id="btnAddUser" style="
                    background:var(--primary-color);color:white;border:none;padding:10px 24px;border-radius:8px;
                    font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:0.5rem;height:44px;white-space:nowrap;
                "><i class="fas fa-plus"></i> Novo usuário</button>
            </div>
        </div>

        <div id="usersTableContainer" style="background:white;border-radius:12px;padding:1.5rem;border:1px solid #e0e0e0;"></div>

        <div id="paginationContainer" style="margin-top:1rem;"></div>

        <!-- User Modal -->
        <div id="modal-user" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:500px;box-shadow:0 10px 25px rgba(0,0,0,0.1);position:relative;max-height:90vh;overflow-y:auto;">
                <button id="modalCloseUser" style="position:absolute;top:1.5rem;right:1.5rem;background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted);">
                    <i class="fas fa-times"></i>
                </button>
                <h2 id="userModalTitle" style="margin:0 0 1.5rem 0;color:var(--text-dark);font-size:1.5rem;">Novo usuário</h2>
                <form id="userForm">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem;">
                        <div>
                            <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Nome *</label>
                            <input type="text" id="userFirstName" required style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Sobrenome *</label>
                            <input type="text" id="userLastName" required style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                        </div>
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Email *</label>
                        <input type="email" id="userEmail" required style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Telefone</label>
                        <input type="tel" id="userPhone" placeholder="11999990000" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Role *</label>
                        <select id="userRole" required style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                            ${roleOptions}
                        </select>
                    </div>
                    <div id="passwordFields" style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Senha *</label>
                        <input type="password" id="userPassword" minlength="6" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;" placeholder="Mínimo 6 caracteres">
                    </div>
                    <div style="display:flex;gap:1rem;margin-top:2rem;">
                        <button type="button" id="btnCancelUser" style="flex:1;padding:14px;background:white;border:1px solid #ddd;border-radius:8px;font-weight:600;cursor:pointer;">Cancelar</button>
                        <button type="submit" style="flex:2;padding:14px;background:var(--primary-color);color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:1rem;">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Confirmation -->
        <div id="modal-delete-user" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:400px;text-align:center;">
                <h2 style="margin-bottom:1rem;color:var(--text-dark);">Confirmar exclusão</h2>
                <p style="color:var(--text-muted);margin-bottom:2rem;">Tem certeza que deseja excluir este usuário?</p>
                <div style="display:flex;gap:1rem;">
                    <button id="btnCancelDeleteUser" style="flex:1;padding:12px;background:white;border:1px solid #ddd;border-radius:8px;font-weight:600;cursor:pointer;">Cancelar</button>
                    <button id="btnConfirmDeleteUser" style="flex:1;padding:12px;background:#E91E63;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Excluir</button>
                </div>
            </div>
        </div>
    `;

    renderUsersTable();
    bindEvents();
}

function renderUsersTable() {
    const container = document.getElementById('usersTableContainer');
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:3rem 1rem;">
                <i class="fas fa-user-shield" style="font-size:3rem;color:#e0e0e0;margin-bottom:1rem;display:block;"></i>
                <h3 style="color:var(--text-muted);margin-bottom:0.5rem;">Nenhum usuário encontrado</h3>
                <p style="color:var(--text-muted);font-size:0.9rem;">Clique em "Novo usuário" para adicionar</p>
            </div>
        `;
        renderPagination();
        return;
    }

    let html = `<table style="width:100%;border-collapse:collapse;">
        <thead style="background:#f8f9fa;">
            <tr>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Nome</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Email</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Role</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Status</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Cadastro</th>
                <th style="padding:1rem;border-bottom:2px solid #e0e0e0;"></th>
            </tr>
        </thead>
        <tbody>`;

    users.forEach(u => {
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
        const role = (u.role || 'client').toLowerCase();
        const roleStyle = ROLE_STYLES[role] || '';
        const isActive = u.is_active !== false;
        const statusStyle = isActive ? 'color:#4CAF50;background:#E8F5E9;' : 'color:#F44336;background:#FFEBEE;';
        const statusLabel = isActive ? 'Ativo' : 'Inativo';

        html += `<tr style="border-bottom:1px solid #f0f0f0;">
            <td style="padding:1rem;font-weight:600;color:var(--text-dark);">${name}</td>
            <td style="padding:1rem;color:#2196F3;">${u.email || '-'}</td>
            <td style="padding:1rem;"><span style="padding:4px 12px;border-radius:12px;font-size:0.85rem;font-weight:600;${roleStyle}">${role}</span></td>
            <td style="padding:1rem;"><span style="padding:4px 12px;border-radius:12px;font-size:0.85rem;font-weight:600;${statusStyle}">${statusLabel}</span></td>
            <td style="padding:1rem;color:var(--text-muted);">${formatDate(u.created_at)}</td>
            <td style="padding:1rem;">
                <button class="btn-edit-user" data-id="${u.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0.25rem;margin-right:0.5rem;" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-toggle-user" data-id="${u.id}" data-active="${isActive}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0.25rem;margin-right:0.5rem;" title="${isActive ? 'Desativar' : 'Ativar'}"><i class="fas fa-${isActive ? 'ban' : 'check-circle'}"></i></button>
                <button class="btn-delete-user" data-id="${u.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0.25rem;" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
    renderPagination();
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = `<div style="text-align:center;font-size:0.85rem;color:var(--text-muted);">${totalUsers} usuário${totalUsers !== 1 ? 's' : ''}</div>`;
        return;
    }

    let html = `<div class="pagination">`;
    html += `<button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    html += `<span class="pagination-info">${totalUsers} usuário${totalUsers !== 1 ? 's' : ''}</span>`;
    html += `</div>`;
    container.innerHTML = html;

    container.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const page = parseInt(btn.dataset.page);
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
                await loadUsers();
                renderUsersTable();
            }
        });
    });
}

function openUserModal(user = null) {
    if (isSubscriptionBlocked() && !user) {
        showToast('Assinatura inativa. Não é possível criar novos usuários.', 'error');
        return;
    }

    editingId = user ? user.id : null;
    const title = document.getElementById('userModalTitle');
    if (title) title.textContent = user ? 'Editar usuário' : 'Novo usuário';

    document.getElementById('userFirstName').value = user?.first_name || '';
    document.getElementById('userLastName').value = user?.last_name || '';
    document.getElementById('userEmail').value = user?.email || '';
    document.getElementById('userPhone').value = user?.phone || '';
    document.getElementById('userRole').value = user?.role?.toLowerCase() || 'professional';

    // Password required only for create
    const pwField = document.getElementById('passwordFields');
    const pwInput = document.getElementById('userPassword');
    if (user) {
        pwField.style.display = 'none';
        pwInput.removeAttribute('required');
    } else {
        pwField.style.display = 'block';
        pwInput.setAttribute('required', 'required');
    }

    openModal('user');
}

function bindEvents() {
    // Search
    let searchTimeout;
    document.getElementById('userSearch')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            searchTerm = e.target.value.trim();
            currentPage = 1;
            await loadUsers();
            renderUsersTable();
        }, 300);
    });

    // Role filter
    document.getElementById('filterRole')?.addEventListener('change', async (e) => {
        filterRole = e.target.value;
        currentPage = 1;
        await loadUsers();
        renderUsersTable();
    });

    // Add
    document.getElementById('btnAddUser')?.addEventListener('click', () => openUserModal());

    // Close modal
    document.getElementById('modalCloseUser')?.addEventListener('click', () => closeModal('user'));
    document.getElementById('btnCancelUser')?.addEventListener('click', () => closeModal('user'));

    // Form submit
    document.getElementById('userForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveUser();
    });

    // Edit / Delete / Toggle delegation
    document.getElementById('usersTableContainer')?.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit-user');
        const deleteBtn = e.target.closest('.btn-delete-user');
        const toggleBtn = e.target.closest('.btn-toggle-user');

        if (editBtn) {
            const id = editBtn.dataset.id;
            const user = users.find(u => u.id === id);
            if (user) openUserModal(user);
        }

        if (deleteBtn) {
            if (isSubscriptionBlocked()) {
                showToast('Assinatura inativa.', 'error');
                return;
            }
            editingId = deleteBtn.dataset.id;
            openModal('delete-user');
        }

        if (toggleBtn) {
            const id = toggleBtn.dataset.id;
            const isActive = toggleBtn.dataset.active === 'true';
            try {
                const endpoint = isActive ? `/users/${id}/deactivate` : `/users/${id}/activate`;
                await api.post(endpoint);
                showToast(isActive ? 'Usuário desativado.' : 'Usuário ativado.', 'success');
                await loadUsers();
                renderUsersTable();
            } catch (error) {
                console.error('[Users] Toggle error:', error);
                showToast(error.message || 'Erro ao alterar status', 'error');
            }
        }
    });

    // Delete confirmation
    document.getElementById('btnCancelDeleteUser')?.addEventListener('click', () => {
        editingId = null;
        closeModal('delete-user');
    });
    document.getElementById('btnConfirmDeleteUser')?.addEventListener('click', async () => {
        if (editingId) {
            try {
                await api.delete(`/users/${editingId}`);
                showToast('Usuário excluído.', 'success');
                editingId = null;
                closeModal('delete-user');
                await loadUsers();
                renderUsersTable();
            } catch (error) {
                console.error('[Users] Delete error:', error);
                showToast(error.message || 'Erro ao excluir usuário', 'error');
            }
        }
    });
}

async function saveUser() {
    const submitBtn = document.querySelector('#userForm button[type="submit"]');
    const originalText = submitBtn?.textContent || 'Salvar';

    const formData = {
        first_name: document.getElementById('userFirstName').value.trim(),
        last_name: document.getElementById('userLastName').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        phone: document.getElementById('userPhone').value.trim() || undefined,
        role: document.getElementById('userRole').value,
    };

    if (!editingId) {
        formData.password = document.getElementById('userPassword').value;
        if (!formData.password || formData.password.length < 6) {
            showToast('Senha deve ter no mínimo 6 caracteres.', 'error');
            return;
        }
    }

    if (!formData.first_name || !formData.last_name || !formData.email) {
        showToast('Preencha nome, sobrenome e email.', 'error');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner spinner-sm" style="display:inline-block;width:16px;height:16px;margin-right:8px;"></div>Salvando...';
    }

    try {
        if (editingId) {
            await api.put(`/users/${editingId}`, formData);
            showToast('Usuário atualizado!', 'success');
        } else {
            await api.post('/users', formData);
            showToast('Usuário criado!', 'success');
        }

        editingId = null;
        closeModal('user');
        await loadUsers();
        renderUsersTable();
    } catch (error) {
        console.error('[Users] Save error:', error);
        showToast(error.message || 'Erro ao salvar usuário', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

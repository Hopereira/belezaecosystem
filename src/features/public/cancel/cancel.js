/**
 * Public Cancellation Page — /cancel/:token
 * No auth required. Uses cancel_token to cancel an appointment.
 */

const BASE_URL = '/api';

let cancelToken = null;

export function render() {
    const app = document.getElementById('app');
    if (!app) return;

    // Extract token from path: /cancel/<token>
    const match = /^\/cancel\/([a-f0-9]{64})$/i.exec(window.location.pathname);
    cancelToken = match ? match[1] : null;

    document.title = 'Cancelar agendamento — BelezaEcosystem';
    app.innerHTML = renderShell();
}

export async function init() {
    if (!cancelToken) {
        showState('error', 'Link de cancelamento inválido ou expirado.');
        return;
    }
    showState('confirm');
    bindEvents();
    return () => {};
}

// ─── States ───────────────────────────────────────────────────────────────────

function showState(state, message = '') {
    const area = document.getElementById('cancelArea');
    if (!area) return;

    if (state === 'confirm') {
        area.innerHTML = `
            <div class="cancel-icon cancel-icon--warn">
                <i class="fas fa-calendar-times"></i>
            </div>
            <h2 class="cancel-title">Cancelar agendamento</h2>
            <p class="cancel-text">Tem certeza que deseja cancelar este agendamento?<br>Esta ação não pode ser desfeita.</p>
            <div class="cancel-actions">
                <button class="cancel-btn cancel-btn--ghost" id="btnBack" onclick="history.back()">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>
                <button class="cancel-btn cancel-btn--danger" id="btnConfirmCancel">
                    <i class="fas fa-times-circle"></i> Confirmar cancelamento
                </button>
            </div>`;
        bindEvents();
    } else if (state === 'loading') {
        area.innerHTML = `
            <div class="cancel-loading">
                <div class="spinner"></div>
                <p>Processando cancelamento...</p>
            </div>`;
    } else if (state === 'success') {
        area.innerHTML = `
            <div class="cancel-icon cancel-icon--success">
                <i class="fas fa-check-circle"></i>
            </div>
            <h2 class="cancel-title">Agendamento cancelado</h2>
            <p class="cancel-text">Seu agendamento foi cancelado com sucesso.<br>O estabelecimento foi notificado.</p>
            <a href="/" class="cancel-btn cancel-btn--primary">
                <i class="fas fa-home"></i> Ir para o início
            </a>`;
    } else if (state === 'error') {
        area.innerHTML = `
            <div class="cancel-icon cancel-icon--error">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h2 class="cancel-title">Não foi possível cancelar</h2>
            <p class="cancel-text">${message || 'Ocorreu um erro. Tente novamente ou entre em contato com o estabelecimento.'}</p>
            <a href="/" class="cancel-btn cancel-btn--ghost">
                <i class="fas fa-home"></i> Voltar ao início
            </a>`;
    }
}

// ─── Events ───────────────────────────────────────────────────────────────────

function bindEvents() {
    const btn = document.getElementById('btnConfirmCancel');
    if (!btn) return;
    btn.addEventListener('click', handleCancel);
}

async function handleCancel() {
    showState('loading');

    try {
        const res = await fetch(`${BASE_URL}/public/appointments/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: cancelToken }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showState('success');
        } else if (res.status === 410) {
            showState('error', data.message || 'Este link expirou ou já foi utilizado.');
        } else if (res.status === 409) {
            showState('error', data.message || 'Este agendamento não pode ser cancelado.');
        } else {
            showState('error', data.message || 'Erro ao cancelar. Tente novamente.');
        }
    } catch {
        showState('error', 'Erro de conexão. Verifique sua internet e tente novamente.');
    }
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function renderShell() {
    return `
        <div class="cancel-page">
            <header class="cancel-header">
                <div class="cancel-header__brand">
                    <i class="fas fa-leaf" style="color:#603322;font-size:1.4rem;"></i>
                    <span>BelezaEcosystem</span>
                </div>
            </header>
            <main class="cancel-main">
                <div class="cancel-card" id="cancelArea">
                    <div class="cancel-loading">
                        <div class="spinner"></div>
                        <p>Carregando...</p>
                    </div>
                </div>
            </main>
        </div>`;
}

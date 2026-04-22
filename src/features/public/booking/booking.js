/**
 * Public Booking Page — /booking/:slug
 * Cliente final escolhe serviço, data/hora e confirma agendamento
 * Sem autenticação, sem pagamento
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ── State ──────────────────────────────────────────────────────────────────
let slug = '';
let services = [];
let selectedService = null;
let selectedDate = null;
let selectedSlot = null;
let availableSlots = [];
let step = 1; // 1=serviço, 2=data/hora, 3=dados, 4=confirmação

// ── Render ─────────────────────────────────────────────────────────────────

export function render() {
    slug = window.location.pathname.split('/booking/')[1] || '';
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="booking-page">
            <header class="booking-header">
                <a class="booking-brand" href="/">
                    <span class="booking-brand__mark">Be</span>
                    <span class="booking-brand__name">Beleza Ecosystem</span>
                </a>
            </header>

            <main class="booking-main">
                <div class="booking-card" id="bookingCard">
                    <div class="booking-loader">
                        <div class="spinner"></div>
                        <p>Carregando...</p>
                    </div>
                </div>
            </main>
        </div>
    `;
}

// ── Init ───────────────────────────────────────────────────────────────────

export async function init() {
    if (!slug) {
        renderError('Link de agendamento inválido.');
        return;
    }
    await loadServices();
}

// ── Data loading ───────────────────────────────────────────────────────────

async function loadServices() {
    try {
        const res = await fetch(`${BASE_URL}/public/appointments/services/${slug}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
            renderError(data.message || 'Estabelecimento não encontrado.');
            return;
        }
        services = data.data || [];
        if (!services.length) {
            renderError('Nenhum serviço disponível no momento.');
            return;
        }
        renderStep1();
    } catch (e) {
        renderError('Erro ao carregar os serviços. Verifique sua conexão.');
    }
}

async function loadSlots() {
    if (!selectedDate || !selectedService) return;
    const slotsSection = document.getElementById('slotsSection');
    const grid = document.getElementById('slotsGrid');
    if (grid) grid.innerHTML = '<div class="booking-slots-loading"><div class="spinner spinner-sm"></div><span>Verificando horários...</span></div>';

    try {
        const res = await fetch(
            `${BASE_URL}/public/appointments/availability/${slug}?date=${selectedDate}&service_id=${selectedService.id}`
        );
        const data = await res.json();
        if (data.success && data.data?.closed) {
            availableSlots = [];
            if (slotsSection) slotsSection.style.display = 'block';
            if (grid) grid.innerHTML = `
                <div class="booking-day-closed">
                    <i class="fas fa-store-slash"></i>
                    <p>${data.data.message || 'Estabelecimento fechado neste dia'}</p>
                    <small>Escolha outro dia no calendário.</small>
                </div>`;
            document.getElementById('btnNext2').disabled = true;
            return;
        }
        availableSlots = data.success ? (data.data?.slots || []) : [];
        // Store business hours for display
        const bh = data.data?.business_hours;
        const slotsTitle = document.querySelector('.booking-slots-title');
        if (slotsTitle && bh) {
            slotsTitle.textContent = `Horários disponíveis — expediente ${bh.open}–${bh.close}`;
        }
    } catch {
        availableSlots = [];
    }
    renderSlotsGrid();
}

// ── Steps ──────────────────────────────────────────────────────────────────

function renderStep1() {
    step = 1;
    const card = document.getElementById('bookingCard');
    card.innerHTML = `
        <div class="booking-progress">
            ${progressBar(1)}
        </div>
        <h2 class="booking-title">Escolha o serviço</h2>
        <div class="booking-services" id="serviceList">
            ${services.map(s => `
                <button class="booking-service-btn" data-id="${s.id}">
                    <div class="booking-service-info">
                        <span class="booking-service-name">${esc(s.name)}</span>
                        ${s.description ? `<span class="booking-service-desc">${esc(s.description)}</span>` : ''}
                    </div>
                    <div class="booking-service-meta">
                        ${s.duration ? `<span><i class="fas fa-clock"></i> ${s.duration} min</span>` : ''}
                        ${s.price ? `<span><i class="fas fa-tag"></i> R$ ${Number(s.price).toFixed(2).replace('.', ',')}</span>` : ''}
                    </div>
                </button>
            `).join('')}
        </div>
    `;

    document.getElementById('serviceList').addEventListener('click', e => {
        const btn = e.target.closest('.booking-service-btn');
        if (!btn) return;
        selectedService = services.find(s => s.id === btn.dataset.id);
        document.querySelectorAll('.booking-service-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setTimeout(renderStep2, 300);
    });
}

function renderStep2() {
    step = 2;
    const card = document.getElementById('bookingCard');

    // Build calendar: next 30 days from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = [];
    for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push(d);
    }

    card.innerHTML = `
        <div class="booking-progress">${progressBar(2)}</div>
        <h2 class="booking-title">Escolha a data</h2>
        <p class="booking-subtitle">Serviço: <strong>${esc(selectedService.name)}</strong></p>
        <div class="booking-calendar" id="dateGrid">
            ${dates.map(d => {
                const iso = toLocalDate(d);
                const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
                return `<button class="booking-date-btn" data-date="${iso}">${label}</button>`;
            }).join('')}
        </div>
        <div id="slotsSection" style="display:none">
            <h3 class="booking-slots-title">Horários disponíveis</h3>
            <div class="booking-slots-grid" id="slotsGrid"></div>
        </div>
        <div class="booking-nav">
            <button class="booking-btn booking-btn--ghost" id="btnBack2">
                <i class="fas fa-arrow-left"></i> Voltar
            </button>
            <button class="booking-btn booking-btn--primary" id="btnNext2" disabled>
                Continuar <i class="fas fa-arrow-right"></i>
            </button>
        </div>
    `;

    document.getElementById('btnBack2').addEventListener('click', renderStep1);
    document.getElementById('btnNext2').addEventListener('click', renderStep3);

    document.getElementById('dateGrid').addEventListener('click', async e => {
        const btn = e.target.closest('.booking-date-btn');
        if (!btn) return;
        selectedDate = btn.dataset.date;
        selectedSlot = null;
        document.querySelectorAll('.booking-date-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('slotsSection').style.display = 'block';
        document.getElementById('btnNext2').disabled = true;
        await loadSlots();
    });
}

function renderSlotsGrid() {
    const grid = document.getElementById('slotsGrid');
    if (!grid) return;

    if (!availableSlots.length) {
        grid.innerHTML = '<p class="booking-no-slots">Nenhum horário disponível nesta data. Escolha outro dia.</p>';
        return;
    }

    grid.innerHTML = availableSlots.map(slot => {
        const time = new Date(slot).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `<button class="booking-slot-btn" data-slot="${slot}">${time}</button>`;
    }).join('');

    grid.addEventListener('click', e => {
        const btn = e.target.closest('.booking-slot-btn');
        if (!btn) return;
        selectedSlot = btn.dataset.slot;
        document.querySelectorAll('.booking-slot-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('btnNext2').disabled = false;
    });
}

function renderStep3() {
    step = 3;
    const card = document.getElementById('bookingCard');
    const timeLabel = new Date(selectedSlot).toLocaleString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
    });

    card.innerHTML = `
        <div class="booking-progress">${progressBar(3)}</div>
        <h2 class="booking-title">Seus dados</h2>
        <div class="booking-summary-mini">
            <i class="fas fa-calendar-check"></i>
            <span>${esc(selectedService.name)} — ${timeLabel}</span>
        </div>
        <form id="bookingForm" class="booking-form" novalidate>
            <div class="booking-field">
                <label class="booking-label">Nome completo *</label>
                <input class="booking-input" type="text" id="clientName" placeholder="Seu nome" required autocomplete="name">
            </div>
            <div class="booking-field">
                <label class="booking-label">WhatsApp / Telefone *</label>
                <input class="booking-input" type="tel" id="clientPhone" placeholder="(11) 91234-5678" required autocomplete="tel">
            </div>
            <div class="booking-nav">
                <button type="button" class="booking-btn booking-btn--ghost" id="btnBack3">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>
                <button type="submit" class="booking-btn booking-btn--primary" id="btnSubmit">
                    Confirmar <i class="fas fa-check"></i>
                </button>
            </div>
        </form>
    `;

    document.getElementById('btnBack3').addEventListener('click', renderStep2);
    document.getElementById('bookingForm').addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
    e.preventDefault();
    const name  = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const btn   = document.getElementById('btnSubmit');

    if (!name || !phone) {
        showBookingToast('Preencha nome e telefone.', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div> Confirmando...';

    try {
        const res = await fetch(`${BASE_URL}/public/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, name, phone, service_id: selectedService.id, datetime: toLocalISOString(new Date(selectedSlot)) }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
            renderStep4(data.data);
            return;
        }

        // Handle specific backend error codes
        const errCode = data.error?.code;
        let userMsg = data.message || 'Erro ao agendar. Tente novamente.';

        if (errCode === 'CONFLICT') {
            userMsg = 'Horário já foi reservado por outro cliente. Volte e escolha outro horário.';
            showBookingToast(userMsg, 'error');
            // Auto-return to step 2 after 2.5s
            setTimeout(() => renderStep2(), 2500);
        } else if (errCode === 'OUTSIDE_BUSINESS_HOURS') {
            userMsg = data.message;
            showBookingToast(userMsg, 'error');
            setTimeout(() => renderStep2(), 2500);
        } else if (errCode === 'EXCEEDS_BUSINESS_HOURS') {
            userMsg = data.message;
            showBookingToast(userMsg, 'error');
            setTimeout(() => renderStep2(), 2500);
        } else if (res.status === 429) {
            userMsg = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
            showBookingToast(userMsg, 'error');
        } else {
            showBookingToast(userMsg, 'error');
        }

        btn.disabled = false;
        btn.innerHTML = 'Confirmar <i class="fas fa-check"></i>';
    } catch {
        showBookingToast('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Confirmar <i class="fas fa-check"></i>';
    }
}

function renderStep4(appointment) {
    step = 4;
    const timeLabel = new Date(appointment.datetime).toLocaleString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
    });
    const cancelUrl = appointment.cancel_token ? `/cancel/${appointment.cancel_token}` : null;
    const card = document.getElementById('bookingCard');
    card.innerHTML = `
        <div class="booking-success">
            <div class="booking-success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h2 class="booking-success-title">Solicitação enviada!</h2>
            <p class="booking-success-sub">
                Em breve entraremos em contato para confirmar seu agendamento.
            </p>
            <div class="booking-success-details">
                <div class="booking-success-row">
                    <span><i class="fas fa-cut"></i> Serviço</span>
                    <strong>${esc(appointment.service)}</strong>
                </div>
                <div class="booking-success-row">
                    <span><i class="fas fa-calendar"></i> Data e hora</span>
                    <strong>${timeLabel}</strong>
                </div>
                <div class="booking-success-row">
                    <span><i class="fas fa-info-circle"></i> Status</span>
                    <strong class="booking-badge--pending">Aguardando confirmação</strong>
                </div>
            </div>
            ${cancelUrl ? `
            <p class="booking-cancel-hint">
                <i class="fas fa-times-circle"></i>
                Precisando cancelar? <a href="${cancelUrl}" class="booking-cancel-link">Cancelar este agendamento</a>
                <br><small>Este link é válido por 48 horas.</small>
            </p>` : ''}
            <button class="booking-btn booking-btn--ghost" onclick="history.back()" style="margin-top:1rem;">
                <i class="fas fa-arrow-left"></i> Voltar ao site
            </button>
        </div>
    `;
}

function renderError(msg) {
    const card = document.getElementById('bookingCard');
    if (!card) return;
    card.innerHTML = `
        <div class="booking-error">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>Ops!</h2>
            <p>${esc(msg)}</p>
            <a href="/" class="booking-btn booking-btn--ghost">Voltar ao início</a>
        </div>
    `;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function progressBar(current) {
    const steps = ['Serviço', 'Data & Hora', 'Dados', 'Confirmação'];
    return `<div class="booking-steps">
        ${steps.map((label, i) => `
            <div class="booking-step ${i + 1 === current ? 'active' : ''} ${i + 1 < current ? 'done' : ''}">
                <div class="booking-step__dot">${i + 1 < current ? '<i class="fas fa-check"></i>' : i + 1}</div>
                <span class="booking-step__label">${label}</span>
            </div>
            ${i < steps.length - 1 ? '<div class="booking-step__line"></div>' : ''}
        `).join('')}
    </div>`;
}

function toLocalDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Convert Date to ISO string with local timezone offset.
 * e.g. "2026-04-21T10:00:00-03:00"
 * This lets the backend know the client's local time, avoiding UTC mis-alignment.
 */
function toLocalISOString(d) {
    const pad = n => String(n).padStart(2, '0');
    const offMin = d.getTimezoneOffset();
    const sign   = offMin <= 0 ? '+' : '-';
    const absOff = Math.abs(offMin);
    const offH   = pad(Math.floor(absOff / 60));
    const offM   = pad(absOff % 60);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
           `T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${offH}:${offM}`;
}

function esc(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showBookingToast(msg, type = 'info') {
    const existing = document.getElementById('bookingToast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'bookingToast';
    toast.className = `booking-toast booking-toast--${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

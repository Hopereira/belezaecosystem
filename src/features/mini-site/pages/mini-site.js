/**
 * Mini-site do Salão — Beleza Ecosystem — Fase 5
 * Preview, configurações, status de publicação, agenda online
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { getCurrentUser } from '../../../core/state.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';

let siteData = null;

const DEFAULT_SITE = {
    published: false,
    slug: '',
    cover_color: '#603322',
    name: '',
    description: '',
    phone: '',
    address: '',
    services_featured: [],
    booking_enabled: false,
    payment_enabled: false,
};

export function render() {
    renderShell('mini-site');
}

export async function init() {
    renderSkeleton();
    await loadData();
    renderContent();
    return () => { siteData = null; };
}

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

function renderSkeleton() {
    const c = getContentArea();
    if (!c) return;
    c.innerHTML = `
        <div class="mod-header">
            <div class="mod-header__text">
                <div class="skeleton" style="width:180px;height:28px;margin-bottom:6px;"></div>
                <div class="skeleton" style="width:280px;height:14px;"></div>
            </div>
        </div>
        <div class="mod-grid-2" style="margin-bottom:1.5rem;">
            <div class="skeleton" style="height:360px;border-radius:16px;"></div>
            <div style="display:flex;flex-direction:column;gap:1rem;">
                ${[1,2,3,4].map(() => `<div class="skeleton" style="height:72px;border-radius:12px;"></div>`).join('')}
            </div>
        </div>
    `;
}

async function loadData() {
    try {
        const res = await api.get('/mini-site').catch(() => null);
        const user = getCurrentUser();
        const raw = res?.data;
        if (raw) {
            // Normalize backend field names to frontend conventions
            siteData = {
                ...DEFAULT_SITE,
                ...raw,
                name:            raw.title           || raw.name           || user?.tenantName || 'Meu Salão',
                phone:           raw.contact_phone   || raw.phone          || '',
                payment_enabled: raw.online_payment_enabled ?? raw.payment_enabled ?? false,
            };
        } else {
            siteData = {
                ...DEFAULT_SITE,
                name: user?.tenantName || user?.tenant_name || 'Meu Salão',
                slug: slugify(user?.tenantName || user?.tenant_name || 'meu-salao'),
            };
        }
    } catch (err) {
        const user = getCurrentUser();
        siteData = {
            ...DEFAULT_SITE,
            name: user?.tenantName || user?.tenant_name || 'Meu Salão',
            slug: slugify(user?.tenantName || user?.tenant_name || 'meu-salao'),
        };
    }
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

function renderContent() {
    const c = getContentArea();
    if (!c) return;

    const publicUrl = `belezaecosystem.com/${siteData.slug || 'meu-salao'}`;
    const isPublished = siteData.published;

    c.innerHTML = `
        <!-- Header -->
        <div class="mod-header">
            <div class="mod-header__text">
                <p class="mod-header__eyebrow">Presença digital</p>
                <h1 class="mod-header__title">Mini-site do Salão</h1>
                <p class="mod-header__subtitle">Página pública do seu salão com agendamento online.</p>
            </div>
            <div class="mod-header__actions">
                <a href="https://${publicUrl}" target="_blank" rel="noopener" class="btn-ghost btn-sm">
                    <i class="fas fa-external-link-alt"></i> Visualizar
                </a>
                <button class="btn-primary" id="btnPublish">
                    <i class="fas fa-${isPublished ? 'sync-alt' : 'upload'}"></i>
                    ${isPublished ? 'Atualizar site' : 'Publicar site'}
                </button>
            </div>
        </div>

        <!-- Status bar -->
        <div class="mod-panel" style="margin-bottom:1.5rem;">
            <div class="mod-panel__body" style="display:flex;align-items:center;flex-wrap:wrap;gap:1.5rem;padding:1rem 1.375rem;">
                <div style="display:flex;align-items:center;gap:0.625rem;flex:1;min-width:200px;">
                    <i class="fas fa-link" style="color:var(--color-brown-light);"></i>
                    <span style="font-family:var(--font-ui);font-size:0.8125rem;color:var(--sidebar-text-muted);">Link público:</span>
                    <span style="font-family:var(--font-ui);font-size:0.8125rem;font-weight:600;color:var(--color-brown-deep);">
                        <a href="https://${publicUrl}" target="_blank" style="color:var(--color-brown-deep);text-decoration:none;">${publicUrl}</a>
                    </span>
                    <button class="btn-ghost btn-sm" id="btnCopyLink" style="padding:3px 8px;font-size:0.72rem;">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div style="display:flex;align-items:center;gap:1.25rem;flex-wrap:wrap;">
                    <span class="mod-badge ${isPublished ? 'mod-badge--active' : 'mod-badge--draft'}">
                        <i class="fas fa-${isPublished ? 'globe' : 'eye-slash'}"></i>
                        ${isPublished ? 'Publicado' : 'Rascunho'}
                    </span>
                    <span class="mod-badge ${siteData.booking_enabled ? 'mod-badge--active' : 'mod-badge--inactive'}">
                        <i class="fas fa-calendar"></i>
                        Agendamento ${siteData.booking_enabled ? 'ativo' : 'inativo'}
                    </span>
                    <span class="mod-badge ${siteData.payment_enabled ? 'mod-badge--active' : 'mod-badge--inactive'}">
                        <i class="fas fa-credit-card"></i>
                        Pagamento ${siteData.payment_enabled ? 'ativo' : 'inativo'}
                    </span>
                </div>
            </div>
        </div>

        <!-- Main: Preview + Config -->
        <div class="mod-grid-2" style="margin-bottom:1.5rem;align-items:start;">

            <!-- Preview browser frame -->
            <div>
                <div class="mod-toolbar" style="margin-bottom:0.75rem;">
                    <span class="mod-toolbar__title">Preview</span>
                    <span style="font-family:var(--font-ui);font-size:0.75rem;color:var(--sidebar-text-muted);">Aparência pública do site</span>
                </div>
                <div class="mod-site-preview">
                    <div class="mod-site-preview__bar">
                        <div class="mod-site-preview__dot"></div>
                        <div class="mod-site-preview__dot"></div>
                        <div class="mod-site-preview__dot"></div>
                        <div class="mod-site-preview__url">${publicUrl}</div>
                    </div>
                    <div class="mod-site-preview__body">
                        ${renderSitePreviewBody()}
                    </div>
                </div>
            </div>

            <!-- Configurações rápidas -->
            <div style="display:flex;flex-direction:column;gap:1.25rem;">

                <!-- Info do site -->
                <div class="mod-panel">
                    <div class="mod-panel__header">
                        <span class="mod-panel__title">Informações</span>
                        <button class="mod-panel__link btn-ghost btn-sm" id="btnEditInfo" style="font-size:0.75rem;">
                            <i class="fas fa-pen"></i> Editar
                        </button>
                    </div>
                    <div class="mod-panel__body" style="display:flex;flex-direction:column;gap:0.75rem;">
                        ${renderInfoRow('fas fa-store',        'Nome',       siteData.name || 'Não definido')}
                        ${renderInfoRow('fas fa-align-left',   'Descrição',  siteData.description || 'Não definida')}
                        ${renderInfoRow('fas fa-phone',        'Telefone',   siteData.phone || 'Não definido')}
                        ${renderInfoRow('fas fa-map-marker-alt','Endereço',  siteData.address || 'Não definido')}
                    </div>
                </div>

                <!-- Funcionalidades -->
                <div class="mod-panel">
                    <div class="mod-panel__header">
                        <span class="mod-panel__title">Funcionalidades</span>
                    </div>
                    <div class="mod-panel__body" style="display:flex;flex-direction:column;gap:0.875rem;">
                        ${renderToggleRow('fas fa-calendar-check', 'Agendamento online', 'Clientes agendam diretamente pelo site.', 'booking_enabled',         siteData.booking_enabled)}
                        ${renderToggleRow('fas fa-credit-card',    'Pagamento online',   'Aceite pagamentos antecipados pelo site.', 'online_payment_enabled', siteData.payment_enabled)}
                        ${renderToggleRow('fas fa-star',           'Avaliações',         'Exibe avaliações de clientes no site.', 'reviews_enabled',          siteData.reviews_enabled)}
                        ${renderToggleRow('fas fa-globe',          'Site publicado',     'Torna o site visível para o público.', 'published',                isPublished)}
                    </div>
                </div>

                <!-- Seções do site -->
                <div class="mod-panel">
                    <div class="mod-panel__header">
                        <span class="mod-panel__title">Seções do site</span>
                    </div>
                    <div class="mod-panel__body" style="display:flex;flex-direction:column;gap:0.625rem;">
                        ${['Capa e foto de capa', 'Serviços em destaque', 'Equipe', 'Localização no mapa', 'Botão de agendamento'].map(s => `
                            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;">
                                <span style="font-family:var(--font-ui);font-size:0.8375rem;color:var(--sidebar-text);">
                                    <i class="fas fa-grip-vertical" style="color:var(--sidebar-text-muted);margin-right:0.5rem;font-size:0.75rem;"></i>
                                    ${s}
                                </span>
                                <button class="btn-ghost btn-sm" style="font-size:0.72rem;padding:3px 8px;" onclick="window.__editSection('${s}')">
                                    Editar
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>

        <!-- CTA de publicação -->
        ${!isPublished ? `
        <div class="mod-hero" style="margin-bottom:0;background:linear-gradient(135deg,#2D6B44 0%,#3D8B55 100%);">
            <div>
                <p class="mod-hero__eyebrow">Tudo pronto?</p>
                <h2 class="mod-hero__title">Publique seu salão para o mundo.</h2>
                <p class="mod-hero__desc">
                    Seu mini-site fica no ar em segundos. Clientes poderão encontrar e agendar diretamente pelo link.
                </p>
                <button class="btn-primary" style="background:white;color:#2D6B44;" id="btnPublishHero">
                    <i class="fas fa-upload"></i> Publicar agora
                </button>
            </div>
            <div class="mod-hero__visual">
                <div class="mod-hero__stat">
                    <span class="mod-hero__stat-value">Grátis</span>
                    <span class="mod-hero__stat-label">Incluído no plano</span>
                </div>
                <div class="mod-hero__stat">
                    <span class="mod-hero__stat-value">24h</span>
                    <span class="mod-hero__stat-label">No ar em</span>
                </div>
            </div>
        </div>` : ''}
    `;

    bindEvents();
}

function renderSitePreviewBody() {
    const bgColor = siteData.cover_color || '#603322';
    const name = siteData.name || 'Meu Salão';
    return `
        <div style="background:${bgColor};padding:2rem 1.5rem;text-align:center;color:#F8E6C2;">
            <div style="width:56px;height:56px;border-radius:50%;background:rgba(248,230,194,0.2);border:2px solid rgba(248,230,194,0.4);display:flex;align-items:center;justify-content:center;margin:0 auto 0.875rem;font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:600;color:#F8E6C2;">
                ${name.charAt(0)}
            </div>
            <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:600;color:#F8E6C2;margin:0 0 0.5rem;">${name}</h3>
            <p style="font-family:'Manrope',sans-serif;font-size:0.75rem;color:rgba(248,230,194,0.75);margin:0 0 1.25rem;">${siteData.description || 'Beleza com cuidado e excelência.'}</p>
            <div style="display:inline-block;background:#F8E6C2;color:${bgColor};padding:0.5rem 1.25rem;border-radius:100px;font-family:'Manrope',sans-serif;font-size:0.75rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">
                Agendar horário
            </div>
        </div>
        <div style="padding:1rem 1.25rem;background:white;">
            <div style="font-family:'Manrope',sans-serif;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#8B7B72;margin-bottom:0.75rem;">Serviços em destaque</div>
            ${['Corte feminino', 'Coloração', 'Manicure'].map(s => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid #F0EBE5;font-family:'Manrope',sans-serif;font-size:0.75rem;color:#3D1F12;">
                    <span>${s}</span><span style="color:#8B7B72;">a partir de R$ 60</span>
                </div>
            `).join('')}
        </div>
    `;
}

function renderInfoRow(icon, label, value) {
    return `
        <div style="display:flex;align-items:flex-start;gap:0.625rem;">
            <i class="${icon}" style="color:var(--sidebar-text-muted);font-size:0.8rem;margin-top:3px;width:14px;flex-shrink:0;"></i>
            <div>
                <div style="font-family:var(--font-ui);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--sidebar-text-muted);font-weight:700;">${label}</div>
                <div style="font-family:var(--font-ui);font-size:0.8375rem;color:var(--sidebar-text);margin-top:1px;">${value}</div>
            </div>
        </div>
    `;
}

function renderToggleRow(icon, title, desc, key, checked) {
    return `
        <div style="display:flex;align-items:center;gap:0.875rem;">
            <div style="width:32px;height:32px;border-radius:var(--radius-md);background:rgba(96,51,34,0.07);color:var(--color-brown-deep);display:flex;align-items:center;justify-content:center;font-size:0.8rem;flex-shrink:0;">
                <i class="${icon}"></i>
            </div>
            <div style="flex:1;">
                <div style="font-family:var(--font-ui);font-size:0.875rem;font-weight:600;color:var(--sidebar-text);">${title}</div>
                <div style="font-family:var(--font-ui);font-size:0.75rem;color:var(--sidebar-text-muted);">${desc}</div>
            </div>
            <label class="mod-toggle">
                <input type="checkbox" ${checked ? 'checked' : ''} data-setting="${key}">
                <span class="mod-toggle__slider"></span>
            </label>
        </div>
    `;
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────

function bindEvents() {
    document.getElementById('btnPublish')?.addEventListener('click', publishSite);
    document.getElementById('btnPublishHero')?.addEventListener('click', publishSite);

    document.getElementById('btnCopyLink')?.addEventListener('click', () => {
        const url = `https://belezaecosystem.com/${siteData.slug || 'meu-salao'}`;
        navigator.clipboard?.writeText(url).then(() => {
            showToast('Link copiado!', 'success');
        }).catch(() => showToast('Copie manualmente: ' + url, 'info'));
    });

    document.getElementById('btnEditInfo')?.addEventListener('click', () => {
        showToast('Editor de informações disponível em breve.', 'info');
    });

    document.querySelectorAll('.mod-toggle input[data-setting]').forEach(toggle => {
        toggle.addEventListener('change', async () => {
            const setting = toggle.dataset.setting;
            const prev = !toggle.checked;
            try {
                if (setting === 'published') {
                    // Published state must go through publish/unpublish endpoints
                    const endpoint = toggle.checked ? '/mini-site/publish' : '/mini-site/unpublish';
                    const res = await api.post(endpoint);
                    siteData = res?.data ? { ...siteData, ...res.data } : { ...siteData, published: toggle.checked };
                    showToast(toggle.checked ? 'Site publicado!' : 'Site despublicado.', 'success');
                    renderContent();
                } else {
                    await api.patch('/mini-site', { [setting]: toggle.checked });
                    siteData[setting] = toggle.checked;
                    showToast(`${toggle.checked ? 'Ativado' : 'Desativado'} com sucesso.`, 'success');
                }
            } catch (err) {
                toggle.checked = prev;
                showToast(err?.message || 'Erro ao salvar configuração.', 'error');
            }
        });
    });

    window.__editSection = (section) => {
        showToast(`Edição de "${section}" disponível em breve.`, 'info');
    };
}

async function publishSite() {
    const btn = document.getElementById('btnPublish');
    const isPublished = siteData.published;
    const endpoint = isPublished ? '/mini-site/unpublish' : '/mini-site/publish';
    const label    = isPublished ? 'Despublicando...' : 'Publicando...';
    const success  = isPublished ? 'Site despublicado.' : 'Site publicado com sucesso!';
    if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ${label}`; }
    try {
        const res = await api.post(endpoint);
        siteData = res?.data || { ...siteData, published: !isPublished };
        showToast(success, 'success');
        renderContent();
    } catch (err) {
        const msg = err?.message || 'Erro ao salvar. Tente novamente.';
        showToast(msg, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = isPublished ? '<i class="fas fa-eye-slash"></i> Despublicar' : '<i class="fas fa-upload"></i> Publicar site'; }
    }
}

function slugify(str) {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 40);
}

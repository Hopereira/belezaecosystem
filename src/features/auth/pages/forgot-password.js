/**
 * Forgot Password Page — Beleza Ecosystem
 * Solicita link de recuperação de senha por e-mail.
 */

import { api } from '../../../shared/utils/http.js';
import { navigateTo } from '../../../core/router.js';
import { showToast } from '../../../shared/utils/toast.js';

export function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="auth-layout">

            <!-- ── Painel Esquerdo — Formulário ── -->
            <main class="auth-form-panel">
                <div class="auth-form-wrap">

                    <a class="auth-brand" href="/" aria-label="Beleza Ecosystem">
                        <span class="auth-brand__mark">Be</span>
                        <span class="auth-brand__name">Beleza Ecosystem</span>
                    </a>

                    <div class="auth-form-header">
                        <h1 class="auth-form-title">Recuperar senha</h1>
                        <p class="auth-form-sub">
                            Informe seu e-mail e enviaremos um link para você criar uma nova senha.
                        </p>
                    </div>

                    <!-- Estado: formulário -->
                    <div id="forgotFormState">
                        <form id="forgotForm" novalidate>

                            <div class="auth-field">
                                <label class="auth-label" for="email">E-mail</label>
                                <input class="auth-input" type="email" id="email" name="email"
                                    placeholder="seu@email.com" autocomplete="email" required>
                            </div>

                            <button type="submit" class="auth-btn auth-btn--primary" id="forgotSubmit">
                                Enviar link de recuperação
                            </button>

                        </form>
                    </div>

                    <!-- Estado: sucesso -->
                    <div id="forgotSuccessState" style="display:none;">
                        <div style="text-align:center;padding:1.5rem 0;">
                            <div style="
                                width:64px;height:64px;border-radius:50%;
                                background:var(--color-success,#27ae60);
                                display:flex;align-items:center;justify-content:center;
                                margin:0 auto 1.25rem;
                            ">
                                <i class="fas fa-envelope" style="color:#fff;font-size:1.5rem;"></i>
                            </div>
                            <h2 style="font-size:1.15rem;font-weight:700;margin:0 0 0.75rem;">E-mail enviado!</h2>
                            <p style="font-size:0.9rem;color:var(--auth-text-muted,#6b7280);line-height:1.6;margin:0 0 1.5rem;">
                                Se houver uma conta com esse e-mail, você receberá as instruções em breve.
                                Verifique também sua pasta de spam.
                            </p>
                            <button class="auth-btn auth-btn--primary" id="backToLoginBtn" style="width:100%;">
                                Voltar para o login
                            </button>
                        </div>
                    </div>

                    <p class="auth-alt" id="forgotAltLink">
                        Lembrou a senha?
                        <a href="/login">Entrar</a>
                    </p>

                </div>
            </main>

            <!-- ── Painel Direito — Brand ── -->
            <aside class="auth-brand-panel" aria-hidden="true">
                <div class="auth-brand-panel__inner">
                    <div class="auth-brand-panel__logo"><span>Be</span></div>
                    <h2 class="auth-brand-panel__title">Segurança em primeiro lugar.</h2>
                    <p class="auth-brand-panel__sub">
                        Seu acesso é protegido com as<br>melhores práticas de segurança.
                    </p>
                    <div class="auth-brand-panel__pills">
                        <span>Criptografia</span>
                        <span>Token único</span>
                        <span>Expira em 1h</span>
                    </div>
                </div>
            </aside>

        </div>
    `;
}

export function init() {
    const form = document.getElementById('forgotForm');
    if (!form) return null;

    const submitBtn = document.getElementById('forgotSubmit');
    const originalText = submitBtn?.textContent || 'Enviar link de recuperação';

    const handleSubmit = async (e) => {
        e.preventDefault();

        const email = document.getElementById('email')?.value.trim();
        if (!email) {
            showToast('Informe seu e-mail.', 'warning');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Formato de e-mail inválido.', 'warning');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Enviando...';
        }

        try {
            await api.post('/auth/forgot-password', { email }, { skipAuth: true, skipTenant: true });

            // Always show success regardless of whether email exists (anti-enumeration)
            document.getElementById('forgotFormState').style.display = 'none';
            document.getElementById('forgotSuccessState').style.display = 'block';
            document.getElementById('forgotAltLink').style.display = 'none';

        } catch (err) {
            // Rate limit hit
            if (err.status === 429) {
                showToast('Muitas tentativas. Aguarde 1 hora antes de tentar novamente.', 'error');
            } else {
                // Show generic success even on backend error (anti-enumeration)
                document.getElementById('forgotFormState').style.display = 'none';
                document.getElementById('forgotSuccessState').style.display = 'block';
                document.getElementById('forgotAltLink').style.display = 'none';
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    };

    form.addEventListener('submit', handleSubmit);

    const backBtn = document.getElementById('backToLoginBtn');
    backBtn?.addEventListener('click', () => navigateTo('/login'));

    return () => {
        form.removeEventListener('submit', handleSubmit);
    };
}

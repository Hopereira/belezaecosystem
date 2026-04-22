/**
 * Reset Password Page — Beleza Ecosystem
 * Lê ?token= da URL e permite definir nova senha.
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

                    <!-- Estado: token ausente -->
                    <div id="resetNoTokenState" style="display:none;">
                        <div class="auth-form-header">
                            <h1 class="auth-form-title">Link inválido</h1>
                            <p class="auth-form-sub" style="color:#dc2626;">
                                Este link de redefinição é inválido ou está incompleto.
                                Solicite um novo link de recuperação.
                            </p>
                        </div>
                        <button class="auth-btn auth-btn--primary" id="goToForgotBtn" style="width:100%;">
                            Solicitar novo link
                        </button>
                    </div>

                    <!-- Estado: formulário -->
                    <div id="resetFormState" style="display:none;">
                        <div class="auth-form-header">
                            <h1 class="auth-form-title">Nova senha</h1>
                            <p class="auth-form-sub">
                                Escolha uma senha segura com pelo menos 6 caracteres.
                            </p>
                        </div>

                        <form id="resetForm" novalidate>

                            <div class="auth-field">
                                <label class="auth-label" for="password">Nova senha</label>
                                <div class="auth-input-wrap">
                                    <input class="auth-input" type="password" id="password" name="password"
                                        autocomplete="new-password" placeholder="Mínimo 6 caracteres" required>
                                    <button type="button" class="auth-toggle-pw" id="togglePassword" aria-label="Mostrar senha">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="auth-field">
                                <label class="auth-label" for="confirmPassword">Confirmar senha</label>
                                <div class="auth-input-wrap">
                                    <input class="auth-input" type="password" id="confirmPassword" name="confirmPassword"
                                        autocomplete="new-password" placeholder="Repita a senha" required>
                                    <button type="button" class="auth-toggle-pw" id="toggleConfirm" aria-label="Mostrar senha">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- Indicador de força -->
                            <div id="strengthBar" style="height:4px;border-radius:2px;background:#e5e7eb;
                                                         margin:-0.5rem 0 1rem;overflow:hidden;">
                                <div id="strengthFill" style="height:100%;width:0;
                                     background:#dc2626;transition:width 0.3s,background 0.3s;"></div>
                            </div>

                            <button type="submit" class="auth-btn auth-btn--primary" id="resetSubmit">
                                <i class="fas fa-lock"></i> Redefinir senha
                            </button>

                        </form>
                    </div>

                    <!-- Estado: sucesso -->
                    <div id="resetSuccessState" style="display:none;">
                        <div style="text-align:center;padding:1.5rem 0;">
                            <div style="
                                width:64px;height:64px;border-radius:50%;
                                background:#27ae60;
                                display:flex;align-items:center;justify-content:center;
                                margin:0 auto 1.25rem;
                            ">
                                <i class="fas fa-check" style="color:#fff;font-size:1.5rem;"></i>
                            </div>
                            <h2 style="font-size:1.15rem;font-weight:700;margin:0 0 0.75rem;">Senha redefinida!</h2>
                            <p style="font-size:0.9rem;color:var(--auth-text-muted,#6b7280);line-height:1.6;margin:0 0 1.5rem;">
                                Sua senha foi atualizada com sucesso.
                                Faça login com sua nova senha para continuar.
                            </p>
                            <button class="auth-btn auth-btn--primary" id="goToLoginBtn" style="width:100%;">
                                Ir para o login
                            </button>
                        </div>
                    </div>

                </div>
            </main>

            <!-- ── Painel Direito — Brand ── -->
            <aside class="auth-brand-panel" aria-hidden="true">
                <div class="auth-brand-panel__inner">
                    <div class="auth-brand-panel__logo"><span>Be</span></div>
                    <h2 class="auth-brand-panel__title">Quase lá.</h2>
                    <p class="auth-brand-panel__sub">
                        Defina uma senha forte para proteger<br>seu negócio de beleza.
                    </p>
                    <div class="auth-brand-panel__pills">
                        <span>Token único</span>
                        <span>Uso único</span>
                        <span>Seguro</span>
                    </div>
                </div>
            </aside>

        </div>
    `;
}

export function init() {
    // Extract token from URL query string
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
        document.getElementById('resetNoTokenState').style.display = 'block';

        document.getElementById('goToForgotBtn')?.addEventListener('click', () => {
            navigateTo('/forgot-password');
        });
        return null;
    }

    document.getElementById('resetFormState').style.display = 'block';

    const form = document.getElementById('resetForm');
    const submitBtn = document.getElementById('resetSubmit');
    const originalText = submitBtn?.innerHTML || '<i class="fas fa-lock"></i> Redefinir senha';

    // Password visibility toggles
    const setupToggle = (btnId, inputId) => {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (btn && input) {
            btn.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        }
    };
    setupToggle('togglePassword', 'password');
    setupToggle('toggleConfirm', 'confirmPassword');

    // Password strength indicator
    const passwordInput = document.getElementById('password');
    const strengthFill = document.getElementById('strengthFill');
    if (passwordInput && strengthFill) {
        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            let score = 0;
            if (val.length >= 6) score++;
            if (val.length >= 10) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;
            const pct = (score / 5) * 100;
            const color = score <= 1 ? '#dc2626' : score <= 3 ? '#f59e0b' : '#16a34a';
            strengthFill.style.width = `${pct}%`;
            strengthFill.style.background = color;
        });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        if (!password || password.length < 6) {
            showToast('A senha deve ter no mínimo 6 caracteres.', 'warning');
            return;
        }

        if (password !== confirmPassword) {
            showToast('As senhas não conferem.', 'warning');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Salvando...';
        }

        try {
            await api.post('/auth/reset-password', { token, password }, { skipAuth: true, skipTenant: true });

            document.getElementById('resetFormState').style.display = 'none';
            document.getElementById('resetSuccessState').style.display = 'block';

            // Auto-redirect to login after 4s
            setTimeout(() => navigateTo('/login'), 4000);

        } catch (err) {
            const code = err.code || '';
            if (code === 'RESET_TOKEN_EXPIRED') {
                showToast('Este link expirou. Solicite um novo.', 'error');
                setTimeout(() => navigateTo('/forgot-password'), 2000);
            } else if (code === 'RESET_TOKEN_USED') {
                showToast('Este link já foi utilizado. Solicite um novo.', 'error');
                setTimeout(() => navigateTo('/forgot-password'), 2000);
            } else if (code === 'RESET_TOKEN_INVALID') {
                showToast('Link inválido. Solicite um novo.', 'error');
                setTimeout(() => navigateTo('/forgot-password'), 2000);
            } else if (err.status === 429) {
                showToast('Muitas tentativas. Aguarde 1 hora antes de tentar novamente.', 'error');
            } else {
                showToast(err.message || 'Erro ao redefinir senha. Tente novamente.', 'error');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    };

    form?.addEventListener('submit', handleSubmit);

    document.getElementById('goToLoginBtn')?.addEventListener('click', () => navigateTo('/login'));

    return () => {
        form?.removeEventListener('submit', handleSubmit);
    };
}

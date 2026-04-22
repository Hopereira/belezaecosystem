/**
 * Login Page — Beleza Ecosystem
 * Identidade visual fiel ao Manual de Marca (Canva)
 * Referência: docs/brand-system.md · docs/product-language.md
 */

import { handleLogin } from '../../../core/auth.js';
import { navigateTo } from '../../../core/router.js';
import { showToast } from '../../../shared/utils/toast.js';
import { getCurrentUser } from '../../../core/state.js';
import { validateForm, validateRequired, validateEmail } from '../../../shared/utils/validation.js';

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
                        <h1 class="auth-form-title">Entrar</h1>
                        <p class="auth-form-sub">Bem-vindo de volta. Continue de onde parou.</p>
                    </div>

                    <form id="loginForm" novalidate>

                        <div class="auth-field">
                            <label class="auth-label" for="email">Email</label>
                            <input class="auth-input" type="email" id="email" name="email"
                                placeholder="seu@email.com" autocomplete="email" required>
                        </div>

                        <div class="auth-field">
                            <label class="auth-label" for="password">Senha</label>
                            <div class="auth-input-wrap">
                                <input class="auth-input" type="password" id="password" name="password"
                                    autocomplete="current-password" required>
                                <button type="button" class="auth-toggle-pw" id="togglePassword" aria-label="Mostrar senha">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>

                        <div class="auth-row">
                            <label class="auth-remember">
                                <input type="checkbox" checked>
                                <span>Lembrar acesso</span>
                            </label>
                            <a href="#" class="auth-forgot">Esqueceu a senha?</a>
                        </div>

                        <button type="submit" class="auth-btn auth-btn--primary" id="loginSubmit">
                            Entrar
                        </button>

                        <p class="auth-alt">
                            Não tem conta?
                            <a href="/register">
                                Criar conta grátis
                            </a>
                        </p>

                    </form>
                </div>
            </main>

            <!-- ── Painel Direito — Brand ── -->
            <aside class="auth-brand-panel" aria-hidden="true">
                <div class="auth-brand-panel__inner">
                    <div class="auth-brand-panel__logo">
                        <span>Be</span>
                    </div>
                    <h2 class="auth-brand-panel__title">Gestão que liberta.</h2>
                    <p class="auth-brand-panel__sub">
                        O sistema nervoso digital<br>do seu negócio de beleza.
                    </p>
                    <div class="auth-brand-panel__pills">
                        <span>Agendamento</span>
                        <span>Finanças</span>
                        <span>Marketing</span>
                        <span>IA 24h</span>
                    </div>
                </div>
            </aside>

        </div>
    `;
}

export function init() {
    const form = document.getElementById('loginForm');
    if (!form) return null;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn?.textContent || 'Entrar';

    // Password visibility toggle
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            toggleBtn.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Disable button and show loading
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Entrando...';
        }

        try {
            const result = await handleLogin(email, password);

            if (result.success) {
                showToast('Login realizado com sucesso!', 'success');
                const user = getCurrentUser();
                const userRole = (user?.role || '').toLowerCase();
                if (userRole === 'master') {
                    navigateTo('/master');
                } else {
                    navigateTo('/dashboard');
                }
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('[Login] Error:', error);
            showToast(error.message || 'Erro ao fazer login', 'error');
        } finally {
            // Re-enable button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }
    };

    form.addEventListener('submit', handleSubmit);

    return () => {
        form.removeEventListener('submit', handleSubmit);
    };
}

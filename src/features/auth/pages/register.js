/**
 * Register Page — Beleza Ecosystem
 * Identidade visual fiel ao Manual de Marca (Canva)
 * Referência: docs/brand-system.md · docs/product-language.md
 */

import { handleRegister } from '../../../core/auth.js';
import { navigateTo } from '../../../core/router.js';
import { showToast } from '../../../shared/utils/toast.js';

let currentRole = '';

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

                    <!-- Passo 1: Seleção de perfil -->
                    <div id="roleSelectionStep">
                        <div class="auth-form-header">
                            <h1 class="auth-form-title">Criar conta</h1>
                            <p class="auth-form-sub">Como você deseja usar o Beleza Ecosystem?</p>
                        </div>

                        <div class="auth-role-cards" id="roleCards">
                            <button class="auth-role-card" data-role="estabelecimento" type="button">
                                <span class="auth-role-card__icon"><i class="fas fa-store"></i></span>
                                <div class="auth-role-card__body">
                                    <p class="auth-role-card__name">Estabelecimento</p>
                                    <p class="auth-role-card__desc">Dono de salão ou clínica de estética</p>
                                </div>
                            </button>
                            <button class="auth-role-card" data-role="profissional" type="button">
                                <span class="auth-role-card__icon"><i class="fas fa-cut"></i></span>
                                <div class="auth-role-card__body">
                                    <p class="auth-role-card__name">Profissional</p>
                                    <p class="auth-role-card__desc">Especialista autônomo ou freelancer</p>
                                </div>
                            </button>
                            <button class="auth-role-card" data-role="cliente" type="button">
                                <span class="auth-role-card__icon"><i class="fas fa-user"></i></span>
                                <div class="auth-role-card__body">
                                    <p class="auth-role-card__name">Cliente</p>
                                    <p class="auth-role-card__desc">Quero agendar serviços com facilidade</p>
                                </div>
                            </button>
                        </div>

                        <p class="auth-alt">
                            Já tem conta?
                            <a href="/login">
                                Entrar
                            </a>
                        </p>
                    </div>

                    <!-- Passo 2: Formulário de cadastro -->
                    <form id="registerForm" novalidate style="display:none;">
                        <div class="auth-form-header">
                            <button type="button" id="backToRoles" class="auth-back-btn">
                                <i class="fas fa-arrow-left"></i> Voltar
                            </button>
                            <h1 class="auth-form-title" id="formTitle">Cadastro</h1>
                            <p class="auth-form-sub" id="formSubtitle">Preencha seus dados para começar.</p>
                        </div>

                        <div class="auth-field">
                            <label class="auth-label" for="reg-name">Nome completo</label>
                            <input class="auth-input" type="text" id="reg-name" name="name"
                                autocomplete="name" required>
                        </div>

                        <div class="auth-field">
                            <label class="auth-label" for="reg-email">Email</label>
                            <input class="auth-input" type="email" id="reg-email" name="email"
                                autocomplete="email" required>
                        </div>

                        <div id="estabelecimentoFields" style="display:none;">
                            <div class="auth-field">
                                <label class="auth-label" for="salonName">Nome do salão</label>
                                <input class="auth-input" type="text" id="salonName"
                                    placeholder="Ex: Studio Bella">
                            </div>
                            <div class="auth-field">
                                <label class="auth-label" for="cnpj">CNPJ <span class="auth-label--opt">(opcional)</span></label>
                                <input class="auth-input" type="text" id="cnpj"
                                    placeholder="00.000.000/0001-00">
                            </div>
                        </div>

                        <div id="profissionalFields" style="display:none;">
                            <div class="auth-field">
                                <label class="auth-label" for="specialty">Especialidade</label>
                                <input class="auth-input" type="text" id="specialty"
                                    placeholder="Ex: Cabelo, Manicure, Maquiagem">
                            </div>
                        </div>

                        <div class="auth-field">
                            <label class="auth-label" for="reg-password">Senha</label>
                            <div class="auth-input-wrap">
                                <input class="auth-input" type="password" id="reg-password" name="password"
                                    autocomplete="new-password" required>
                                <button type="button" class="auth-toggle-pw toggle-pw-btn"
                                    data-target="reg-password" aria-label="Mostrar senha">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>

                        <div class="auth-field">
                            <label class="auth-label" for="reg-confirm">Confirmar senha</label>
                            <div class="auth-input-wrap">
                                <input class="auth-input" type="password" id="reg-confirm" name="confirmPassword"
                                    autocomplete="new-password" required>
                                <button type="button" class="auth-toggle-pw toggle-pw-btn"
                                    data-target="reg-confirm" aria-label="Mostrar senha">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>

                        <button type="submit" class="auth-btn auth-btn--primary" id="registerSubmit">
                            Criar conta
                        </button>

                        <p class="auth-alt">
                            Já tem conta?
                            <a href="/login">
                                Entrar
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
                    <h2 class="auth-brand-panel__title">Seja parte.<br>Seja Beleza.</h2>
                    <p class="auth-brand-panel__dynamic" id="dynamicRoleText">
                        Tecnologia com alma.<br>Sofisticação acessível.
                    </p>
                    <div class="auth-brand-panel__pills">
                        <span>14 dias grátis</span>
                        <span>Sem cartão</span>
                        <span>Cancele quando quiser</span>
                    </div>
                </div>
            </aside>

        </div>
    `;
}

export function init() {
    currentRole = '';

    // Role card selection
    const roleCards = document.getElementById('roleCards');
    if (roleCards) {
        roleCards.addEventListener('click', (e) => {
            const card = e.target.closest('[data-role]');
            if (card) selectRole(card.dataset.role);
        });
    }

    // Back to roles
    const backBtn = document.getElementById('backToRoles');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            goBack();
        });
    }

    // Password visibility toggles
    document.querySelectorAll('.toggle-pw-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (input) {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            }
        });
    });

    // Form submit
    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }

    return () => {
        currentRole = '';
    };
}

function selectRole(role) {
    currentRole = role;

    document.getElementById('roleSelectionStep').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';

    document.getElementById('estabelecimentoFields').style.display = 'none';
    document.getElementById('profissionalFields').style.display = 'none';

    const title = document.getElementById('formTitle');
    const subtitle = document.getElementById('formSubtitle');
    const sideText = document.getElementById('dynamicRoleText');

    if (role === 'estabelecimento') {
        document.getElementById('estabelecimentoFields').style.display = 'block';
        if (title) title.innerText = 'Seu estabelecimento';
        if (subtitle) subtitle.innerText = 'Configure o seu salão ou clínica no Beleza Ecosystem.';
        if (sideText) sideText.innerHTML = 'Gestão completa<br>para o seu salão.';
    } else if (role === 'profissional') {
        document.getElementById('profissionalFields').style.display = 'block';
        if (title) title.innerText = 'Seu perfil profissional';
        if (subtitle) subtitle.innerText = 'Gerencie sua agenda e clientes com inteligência.';
        if (sideText) sideText.innerHTML = 'Agenda inteligente<br>para especialistas.';
    } else if (role === 'cliente') {
        if (title) title.innerText = 'Sua conta de cliente';
        if (subtitle) subtitle.innerText = 'Agende serviços nos melhores salões com facilidade.';
        if (sideText) sideText.innerHTML = 'Agendamento online<br>rápido e seguro.';
    }
}

function goBack() {
    document.getElementById('roleSelectionStep').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    const sideText = document.getElementById('dynamicRoleText');
    if (sideText) sideText.innerHTML = 'Tecnologia com alma.<br>Sofisticação acessível.';
    currentRole = '';
}

async function handleSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('registerSubmit');
    const originalText = submitBtn?.textContent || 'Criar conta';

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Criando conta...';
    }

    const data = {
        name: document.getElementById('reg-name').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        password: document.getElementById('reg-password').value,
        confirmPassword: document.getElementById('reg-confirm').value,
        role: currentRole,
        salonName: document.getElementById('salonName')?.value.trim() || '',
        cnpj: document.getElementById('cnpj')?.value.trim() || '',
        specialty: document.getElementById('specialty')?.value.trim() || '',
    };

    try {
        const result = await handleRegister(data);
        if (result.success) {
            showToast('Conta criada com sucesso! Faça login.', 'success');
            navigateTo('/login');
        } else {
            showToast(result.message, 'error');
        }
    } catch (err) {
        showToast(err.message || 'Erro ao criar conta.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

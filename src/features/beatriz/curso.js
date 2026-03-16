/**
 * Página: Curso — Ana Beatriz Xavier
 * biaxavier.com.br/curso
 *
 * Página em construção — lançamento em breve.
 */

import './curso.css';

const WHATSAPP_NUMBER = '5524988243174';
const WHATSAPP_URL    = `https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20o%20curso!`;

export function render() {
    const app = document.getElementById('app');
    if (!app) return;

    document.title = 'Curso — Ana Beatriz Xavier';

    app.innerHTML = `
        <div class="cx-page">

            <!-- ── NAV ── -->
            <nav class="cx-nav">
                <a href="/" class="cx-nav__brand">
                    <img src="/assets/logos/logo.png" alt="Beatriz Xavier" class="cx-nav__logo">
                </a>
                <a href="/" class="cx-nav__back">
                    <i class="fas fa-arrow-left"></i> Voltar ao início
                </a>
            </nav>

            <!-- ── HERO EM BREVE ── -->
            <main class="cx-hero">
                <div class="cx-hero__content">

                    <span class="cx-badge">
                        <i class="fas fa-tools"></i> Página em construção
                    </span>

                    <h1 class="cx-hero__title">
                        Cursos<br>
                        <span class="cx-hero__title--accent">Profissionais de Beleza</span>
                    </h1>

                    <p class="cx-hero__desc">
                        Em breve vou compartilhar anos de experiência em 3 modalidades:
                        extensão de cílios, design de sobrancelhas e depilação.
                        Técnica, prática e segredos para você se destacar.
                    </p>

                    <div class="cx-features">
                        <div class="cx-feature">
                            <i class="fas fa-graduation-cap"></i>
                            <span>Técnica profissional</span>
                        </div>
                        <div class="cx-feature">
                            <i class="fas fa-video"></i>
                            <span>Aulas em vídeo</span>
                        </div>
                        <div class="cx-feature">
                            <i class="fas fa-certificate"></i>
                            <span>Certificado</span>
                        </div>
                        <div class="cx-feature">
                            <i class="fas fa-comments"></i>
                            <span>Suporte direto</span>
                        </div>
                    </div>

                    <div class="cx-cta-group">
                        <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer"
                           class="cx-btn cx-btn--primary">
                            <i class="fab fa-whatsapp"></i>
                            Avise-me quando lançar
                        </a>
                        <a href="/" class="cx-btn cx-btn--ghost">
                            <i class="fas fa-home"></i>
                            Voltar ao site
                        </a>
                    </div>

                </div>

                <div class="cx-hero__visual">
                    <div class="cx-construction">
                        <div class="cx-construction__icon">
                            <i class="fas fa-graduation-cap"></i>
                        </div>
                        <div class="cx-construction__rings">
                            <div class="cx-ring cx-ring--1"></div>
                            <div class="cx-ring cx-ring--2"></div>
                            <div class="cx-ring cx-ring--3"></div>
                        </div>
                    </div>
                    <p class="cx-soon-label">Em breve</p>
                </div>
            </main>

            <!-- ── MODALIDADES ── -->
            <section class="cx-modalities">
                <span class="cx-badge" style="margin-bottom:1rem;">
                    <i class="fas fa-list-alt"></i> Modalidades disponíveis
                </span>
                <h2 class="cx-modalities__title">O que você vai aprender</h2>
                <p class="cx-modalities__sub">Cada curso com aulas práticas, certificado e suporte direto comigo</p>

                <div class="cx-modalities__grid">

                    <div class="cx-mod-card">
                        <div class="cx-mod-card__icon">
                            <i class="fas fa-eye"></i>
                        </div>
                        <div class="cx-mod-card__body">
                            <h3>Extensão de Cílios</h3>
                            <p>Volume, naturalidade e técnica apurada para realçar o olhar das suas clientes com os melhores materiais.</p>
                            <ul class="cx-mod-card__topics">
                                <li><i class="fas fa-check"></i> Fio a fio e volumes</li>
                                <li><i class="fas fa-check"></i> Mapeamento de olhar</li>
                                <li><i class="fas fa-check"></i> Manutenção e remoção</li>
                                <li><i class="fas fa-check"></i> Biossegurança</li>
                            </ul>
                        </div>
                        <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer" class="cx-mod-card__cta">
                            <i class="fab fa-whatsapp"></i> Quero ser avisada
                        </a>
                    </div>

                    <div class="cx-mod-card">
                        <div class="cx-mod-card__icon">
                            <i class="fas fa-star"></i>
                        </div>
                        <div class="cx-mod-card__body">
                            <h3>Design de Sobrancelhas</h3>
                            <p>Sobrancelhas moldadas para harmonizar o rosto e expressar a personalidade única de cada cliente.</p>
                            <ul class="cx-mod-card__topics">
                                <li><i class="fas fa-check"></i> Mapeamento facial</li>
                                <li><i class="fas fa-check"></i> Henna e coloração</li>
                                <li><i class="fas fa-check"></i> Laminação</li>
                                <li><i class="fas fa-check"></i> Correção de falhas</li>
                            </ul>
                        </div>
                        <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer" class="cx-mod-card__cta">
                            <i class="fab fa-whatsapp"></i> Quero ser avisada
                        </a>
                    </div>

                    <div class="cx-mod-card">
                        <div class="cx-mod-card__icon">
                            <i class="fas fa-spa"></i>
                        </div>
                        <div class="cx-mod-card__body">
                            <h3>Depilação</h3>
                            <p>Tratamento completo com conforto, higiene e produtos selecionados para o cuidado profissional da pele.</p>
                            <ul class="cx-mod-card__topics">
                                <li><i class="fas fa-check"></i> Cera quente e fria</li>
                                <li><i class="fas fa-check"></i> Linha e pinça</li>
                                <li><i class="fas fa-check"></i> Cuidados pré e pós</li>
                                <li><i class="fas fa-check"></i> Atendimento feminino</li>
                            </ul>
                        </div>
                        <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer" class="cx-mod-card__cta">
                            <i class="fab fa-whatsapp"></i> Quero ser avisada
                        </a>
                    </div>

                </div>
            </section>

            <footer class="cx-footer">
                <p>© ${new Date().getFullYear()} Ana Beatriz Xavier · Todos os direitos reservados</p>
            </footer>

        </div>
    `;
}

export function init() {
    return null;
}

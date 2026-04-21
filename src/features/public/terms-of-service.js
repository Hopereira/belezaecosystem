/**
 * Public Page — Termos de Serviço
 * Segue paleta e layout simplificado da landing
 */

export function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div style="min-height:100vh;background:linear-gradient(135deg,#f8f9ff 0%,#ffffff 100%);padding:3rem 1.5rem;display:flex;justify-content:center;">
            <div style="width:100%;max-width:960px;background:white;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,0.06);padding:2.5rem 2rem;">
                <header style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
                    <div>
                        <h1 style="margin:0;font-size:1.9rem;color:#0f172a;font-weight:800;letter-spacing:-0.02em;">Termos de Serviço</h1>
                        <p style="margin:0.35rem 0 0;color:#475569;font-size:0.98rem;">Regras de uso da plataforma BelezaEcosystem para tenants e usuários.</p>
                    </div>
                </header>

                <div style="display:grid;gap:1.25rem;font-size:0.98rem;line-height:1.7;color:#334155;">
                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">1. Uso da Plataforma</h2>
                        <p>Acesso condicionado à assinatura ativa e uso autorizado por tenant. É proibido compartilhar credenciais ou burlar controles de acesso.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">2. Responsabilidades</h2>
                        <p>Você é responsável pelas informações cadastradas, conformidade fiscal e pelo uso adequado dos dados dos seus clientes e profissionais.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">3. Pagamentos e Assinatura</h2>
                        <p>Planos são cobrados conforme condições apresentadas. A suspensão por inadimplência pode ocorrer após aviso prévio. Cancelamentos seguem política de ciclo vigente.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">4. Privacidade e Dados</h2>
                        <p>Tratamos dados conforme nossa <a href="/privacy-policy" style="color:#2563eb;font-weight:600;">Política de Privacidade</a>. Você deve obter consentimento dos titulares quando aplicável.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">5. Suporte e SLA</h2>
                        <p>Suporte em horário comercial (GMT-3). Manutenções programadas serão comunicadas com antecedência sempre que possível.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">6. Rescisão</h2>
                        <p>Podemos encerrar o serviço em caso de violação grave, abuso ou uso fraudulento. Dados podem ser exportados ou excluídos conforme nossa política de exclusão.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">7. Contato</h2>
                        <p>Dúvidas sobre estes termos: <a href="mailto:suporte@belezaecosystem.com" style="color:#2563eb;font-weight:600;">suporte@belezaecosystem.com</a></p>
                    </section>
                </div>

                <footer style="margin-top:2rem;padding-top:1rem;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
                    <span style="color:#64748b;font-size:0.9rem;">Última atualização: 11/03/2026</span>
                    <a href="/" style="color:#2563eb;font-weight:700;text-decoration:none;">Voltar para a home</a>
                </footer>
            </div>
        </div>
    `;
}

export function init() {
    return () => {};
}

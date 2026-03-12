/**
 * Public Page — Exclusão de Dados do Usuário
 * Segue paleta e layout simplificado da landing
 */

export function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div style="min-height:100vh;background:linear-gradient(135deg,#f8f9ff 0%,#ffffff 100%);padding:3rem 1.5rem;display:flex;justify-content:center;">
            <div style="width:100%;max-width:960px;background:white;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,0.06);padding:2.5rem 2rem;">
                <header style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
                    <div>
                        <h1 style="margin:0;font-size:1.9rem;color:#0f172a;font-weight:800;letter-spacing:-0.02em;">Exclusão de Dados do Usuário</h1>
                        <p style="margin:0.35rem 0 0;color:#475569;font-size:0.98rem;">Saiba como solicitar a remoção dos seus dados na BeautyHub.</p>
                    </div>
                </header>

                <div style="display:grid;gap:1.25rem;font-size:0.98rem;line-height:1.7;color:#334155;">
                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">1. Como solicitar</h2>
                        <p>Envie uma solicitação para <a href="mailto:privacidade@beautyhub.com" style="color:#2563eb;font-weight:600;">privacidade@beautyhub.com</a> informando email da conta e tenant (slug). Você receberá confirmação e um ticket de acompanhamento.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">2. O que será removido</h2>
                        <p>Dados pessoais da conta (nome, email, telefone), registros de agendamento e relacionamento ao tenant. Logs e faturas são retidos apenas conforme obrigação legal e podem ser anonimizados.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">3. Prazos</h2>
                        <p>Respondemos em até 7 dias corridos e concluímos exclusão/anonimização em até 30 dias, salvo obrigações legais de retenção.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">4. Dados que não podem ser apagados imediatamente</h2>
                        <p>Notas fiscais, registros financeiros e logs de segurança podem ser retidos pelo prazo legal; quando possível, anonimizamos os identificadores pessoais.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">5. Verificação de identidade</h2>
                        <p>Para sua segurança, podemos solicitar confirmação via email cadastrado ou documento válido antes de processar a exclusão.</p>
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

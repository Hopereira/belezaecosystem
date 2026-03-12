/**
 * Public Page — Política de Privacidade
 * Segue paleta e layout simplificado da landing
 */

export function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div style="min-height:100vh;background:linear-gradient(135deg,#f8f9ff 0%,#ffffff 100%);padding:3rem 1.5rem;display:flex;justify-content:center;">
            <div style="width:100%;max-width:960px;background:white;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,0.06);padding:2.5rem 2rem;">
                <header style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
                    <div>
                        <h1 style="margin:0;font-size:1.9rem;color:#0f172a;font-weight:800;letter-spacing:-0.02em;">Política de Privacidade</h1>
                        <p style="margin:0.35rem 0 0;color:#475569;font-size:0.98rem;">Entenda como coletamos, usamos e protegemos seus dados na BeautyHub.</p>
                    </div>
                </header>

                <div style="display:grid;gap:1.25rem;font-size:0.98rem;line-height:1.7;color:#334155;">
                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">1. Dados que Coletamos</h2>
                        <p>Coletamos dados de conta (nome, email, telefone), dados de negócio (CNPJ, endereço), dados de uso do sistema (logs, device/UA) e dados de pagamento apenas quando necessário para cobrança.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">2. Finalidade e Base Legal</h2>
                        <p>Usamos os dados para prover o serviço, faturar, oferecer suporte e garantir segurança. A base legal inclui execução de contrato, legítimo interesse e consentimento quando aplicável (ex.: comunicações de marketing).</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">3. Compartilhamento</h2>
                        <p>Compartilhamos apenas com provedores essenciais (infra, pagamentos, emails) sob contrato e conformidade com proteção de dados. Não vendemos dados a terceiros.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">4. Segurança e Retenção</h2>
                        <p>Aplicamos autenticação JWT, segregação por tenant e backups. Retemos dados pelo tempo necessário ao contrato e obrigações legais; depois, anonimizamos ou excluímos.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">5. Seus Direitos</h2>
                        <p>Você pode solicitar acesso, correção, portabilidade, restrição ou exclusão de dados. Para exercer, abra chamado ou envie email para <a href="mailto:privacidade@beautyhub.com" style="color:#2563eb;font-weight:600;">privacidade@beautyhub.com</a>.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">6. Cookies</h2>
                        <p>Usamos cookies estritamente necessários para autenticação e sessão. Não utilizamos cookies de publicidade de terceiros.</p>
                    </section>

                    <section>
                        <h2 style="font-size:1.2rem;color:#0f172a;margin:0 0 0.35rem;">7. Contato do DPO</h2>
                        <p>DPO: BeautyHub Segurança & Conformidade — <a href="mailto:dpo@beautyhub.com" style="color:#2563eb;font-weight:600;">dpo@beautyhub.com</a></p>
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

/**
 * Email Service
 * Sends transactional emails via Resend REST API (no extra npm dependency).
 * Falls back to console logging in development when RESEND_API_KEY is absent.
 */

const https = require('https');
const env = require('../../config/env');
const logger = require('../utils/logger');

const RESEND_API_ENDPOINT = 'api.resend.com';
const RESEND_API_PATH = '/emails';

/**
 * Send a transactional email via Resend REST API.
 * @param {{ to: string, subject: string, html: string, text?: string }} opts
 * @returns {Promise<{ id: string } | null>}
 */
async function sendEmail({ to, subject, html, text }) {
  const apiKey = env.email.resendApiKey;

  if (!apiKey) {
    logger.warn('[Email] RESEND_API_KEY not set — skipping real send, logging email instead', {
      to,
      subject,
      preview: text?.slice(0, 200) || html?.slice(0, 200),
    });
    return null;
  }

  const payload = JSON.stringify({
    from: env.email.from,
    to: [to],
    subject,
    html,
    ...(text ? { text } : {}),
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: RESEND_API_ENDPOINT,
        port: 443,
        path: RESEND_API_PATH,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              logger.info('[Email] Sent successfully', { to, subject, id: data.id });
              resolve(data);
            } else {
              logger.error('[Email] Resend API error', { status: res.statusCode, body: data });
              reject(new Error(`Email send failed: ${data.message || res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Email response parse error: ${e.message}`));
          }
        });
      }
    );

    req.on('error', (err) => {
      logger.error('[Email] Network error', { error: err.message });
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Send password reset email with a signed link.
 * @param {{ to: string, name: string, resetUrl: string }} opts
 */
async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const displayName = name || 'Usuário';
  const expirationMinutes = env.email.resetTokenExpirationMinutes;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinição de Senha</title>
</head>
<body style="margin:0;padding:0;background:#f9f5ee;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f5ee;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 2px 12px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background:#603322;padding:32px 40px;text-align:center;">
              <span style="font-family:'Cormorant Garamond',Georgia,serif;
                           font-size:28px;color:#F8E6C2;font-weight:700;
                           letter-spacing:0.05em;">
                Beleza Ecosystem
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px;color:#2d2d2d;">
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#603322;">
                Redefinição de senha
              </h2>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                Olá, <strong>${displayName}</strong>!
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta.
                Clique no botão abaixo para criar uma nova senha.
                Este link expira em <strong>${expirationMinutes} minutos</strong>.
              </p>
              <div style="text-align:center;margin:0 0 32px;">
                <a href="${resetUrl}"
                   style="display:inline-block;background:#603322;color:#F8E6C2;
                          text-decoration:none;padding:14px 36px;
                          border-radius:8px;font-size:15px;font-weight:700;
                          letter-spacing:0.03em;">
                  Redefinir minha senha
                </a>
              </div>
              <p style="margin:0 0 12px;font-size:13px;color:#777;line-height:1.6;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
              </p>
              <p style="margin:0 0 24px;font-size:13px;word-break:break-all;color:#603322;">
                ${resetUrl}
              </p>
              <p style="margin:0;font-size:13px;color:#999;line-height:1.6;">
                Se você não solicitou a redefinição de senha, ignore este e-mail.
                Sua senha permanece a mesma e nenhuma ação é necessária.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background:#faf7f2;border-top:1px solid #ede9e0;
                       text-align:center;font-size:12px;color:#999;">
              © ${new Date().getFullYear()} Beleza Ecosystem — Todos os direitos reservados.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `Redefinição de senha — Beleza Ecosystem

Olá, ${displayName}!

Recebemos uma solicitação para redefinir a senha da sua conta.
Acesse o link abaixo para criar uma nova senha (expira em ${expirationMinutes} minutos):

${resetUrl}

Se você não solicitou a redefinição, ignore este e-mail.`;

  return sendEmail({
    to,
    subject: 'Redefinição de senha — Beleza Ecosystem',
    html,
    text,
  });
}

module.exports = { sendEmail, sendPasswordResetEmail };

export function getResetPasswordEmailHtml(userName: string, resetToken: string): string {
    const resetLink = `https://app.iaeon.site/reset-password?token=${resetToken}`;

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eon Pro - Redefinição de Senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0e18; color: #ffffff;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0e18;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0f1525; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px; background: linear-gradient(135deg, #ff444f 0%, #cc3540 100%);">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">
                                Eon Pro
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; font-size: 28px; font-weight: 600; color: #ff444f;">
                                Redefinir Senha 🔐
                            </h2>

                            <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
                                Olá, ${userName}!
                            </p>

                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
                                Recebemos uma solicitação para redefinir a senha da sua conta na <strong style="color: #00d4aa;">Eon Pro</strong>. Clique no botão abaixo para criar uma nova senha:
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ff444f 0%, #cc3540 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(255, 68, 79, 0.3); transition: all 0.3s ease;">
                                            Redefinir Senha →
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Warning Box -->
                            <div style="margin: 30px 0; padding: 20px; background-color: rgba(255, 68, 79, 0.1); border-left: 4px solid #ff444f; border-radius: 8px;">
                                <p style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #ff444f;">
                                    ⏱️ Este link expira em 1 hora
                                </p>
                                <p style="margin: 0; font-size: 14px; color: #e0e0e0; line-height: 1.6;">
                                    Por motivos de segurança, este link de redefinição de senha é válido por apenas 60 minutos. Se expirar, você precisará solicitar um novo link.
                                </p>
                            </div>

                            <p style="margin: 24px 0 0; font-size: 15px; line-height: 1.6; color: #b0b0b0;">
                                <strong>Não solicitou esta redefinição?</strong><br>
                                Se você não pediu para redefinir sua senha, pode ignorar este email com segurança. Sua senha permanecerá inalterada.
                            </p>

                            <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #8a8a9a;">
                                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                                <a href="${resetLink}" style="color: #00d4aa; word-break: break-all;">${resetLink}</a>
                            </p>

                            <p style="margin: 24px 0 0; font-size: 15px; line-height: 1.6; color: #e0e0e0;">
                                Atenciosamente,<br>
                                <strong style="color: #00d4aa;">Equipe Eon Pro</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #0a0e18; border-top: 1px solid #1a1f2e;">
                            <p style="margin: 0; font-size: 13px; color: #8a8a9a; text-align: center; line-height: 1.6;">
                                © 2026 Eon Pro - Todos os direitos reservados<br>
                                <a href="https://app.iaeon.site" style="color: #00d4aa; text-decoration: none;">app.iaeon.site</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

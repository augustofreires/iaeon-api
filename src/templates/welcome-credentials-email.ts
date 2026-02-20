export function getWelcomeCredentialsEmailHtml(userName: string, email: string, password: string, planName: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo à Eon Pro - Suas Credenciais</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0e18; color: #ffffff;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0e18;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0f1525; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px; background: linear-gradient(135deg, #00d4aa 0%, #00a886 100%);">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">
                                Eon Pro
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; font-size: 28px; font-weight: 600; color: #00d4aa;">
                                Bem-vindo, ${userName}! 🎉
                            </h2>

                            <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
                                Sua assinatura do plano <strong style="color: #00d4aa;">${planName}</strong> foi confirmada com sucesso! Sua conta foi criada automaticamente e você já pode começar a usar a plataforma.
                            </p>

                            <!-- Credenciais Box -->
                            <div style="margin: 30px 0; padding: 24px; background-color: #1a1f2e; border: 2px solid #00d4aa; border-radius: 8px;">
                                <h3 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #00d4aa; text-align: center;">
                                    🔐 Suas Credenciais de Acesso
                                </h3>

                                <table width="100%" cellpadding="8" cellspacing="0">
                                    <tr>
                                        <td style="padding: 12px; font-size: 14px; color: #8a8a9a; font-weight: 600;">Email:</td>
                                        <td style="padding: 12px; font-size: 14px; color: #ffffff; font-family: 'Courier New', monospace; background-color: #0a0e18; border-radius: 4px;">
                                            ${email}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px; font-size: 14px; color: #8a8a9a; font-weight: 600;">Senha:</td>
                                        <td style="padding: 12px; font-size: 14px; color: #ffffff; font-family: 'Courier New', monospace; background-color: #0a0e18; border-radius: 4px;">
                                            ${password}
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin: 16px 0 0; font-size: 13px; color: #ff6b6b; text-align: center;">
                                    ⚠️ Recomendamos que você altere sua senha após o primeiro acesso
                                </p>
                            </div>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="https://app.iaeon.site" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00d4aa 0%, #00a886 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);">
                                            Acessar Plataforma →
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="margin: 30px 0; padding: 20px; background-color: #1a1f2e; border-left: 4px solid #00d4aa; border-radius: 8px;">
                                <h3 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #00d4aa;">
                                    Próximos Passos
                                </h3>
                                <ul style="margin: 0; padding-left: 20px; color: #e0e0e0; font-size: 15px; line-height: 1.8;">
                                    <li>Faça login com suas credenciais</li>
                                    <li>Conecte sua conta Deriv à plataforma</li>
                                    <li>Explore nossos bots pré-configurados</li>
                                    <li>Acesse nossos tutoriais e documentação</li>
                                </ul>
                            </div>

                            <p style="margin: 24px 0 0; font-size: 15px; line-height: 1.6; color: #b0b0b0;">
                                Se tiver alguma dúvida, nossa equipe de suporte está sempre disponível para ajudar!
                            </p>

                            <p style="margin: 16px 0 0; font-size: 15px; line-height: 1.6; color: #e0e0e0;">
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

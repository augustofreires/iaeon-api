"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendTestEmail = sendTestEmail;
exports.getSmtpConfigMasked = getSmtpConfigMasked;
exports.updateSmtpConfig = updateSmtpConfig;
const nodemailer_1 = __importDefault(require("nodemailer"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function sendEmail(to, subject, htmlContent) {
    try {
        const config = await getSmtpConfig();
        if (!config.host || !config.user || !config.password || !config.from_email) {
            throw new Error('Configuração SMTP incompleta. Configure o servidor de email no painel admin.');
        }
        const transporter = nodemailer_1.default.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.password,
            },
        });
        const info = await transporter.sendMail({
            from: `"${config.from_name}" <${config.from_email}>`,
            to,
            subject,
            html: htmlContent,
        });
        return { success: true, messageId: info.messageId };
    }
    catch (error) {
        console.error('[EMAIL SERVICE] Error sending email:', error);
        throw new Error(error.message || 'Erro ao enviar email');
    }
}
async function sendTestEmail(to) {
    const subject = 'Teste de Configuração SMTP - IAEON';
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #ff444f;">IAEON - Teste de Email</h2>
            <p>Olá!</p>
            <p>Este é um email de teste para verificar se a configuração SMTP está funcionando corretamente.</p>
            <p>Se você recebeu este email, significa que o servidor de email foi configurado com sucesso!</p>
            <br>
            <p style="color: #666; font-size: 12px;">
                Este email foi enviado automaticamente pela plataforma IAEON.<br>
                Data: ${new Date().toLocaleString('pt-BR')}
            </p>
        </div>
    `;
    return sendEmail(to, subject, htmlContent);
}
async function getSmtpConfig() {
    let config = await prisma.smtpConfig.findFirst();
    if (!config) {
        // Criar config padrão se não existir
        config = await prisma.smtpConfig.create({
            data: {},
        });
    }
    return config;
}
async function getSmtpConfigMasked() {
    const config = await getSmtpConfig();
    return {
        ...config,
        password: config.password ? '••••••' : '',
    };
}
async function updateSmtpConfig(data) {
    let config = await prisma.smtpConfig.findFirst();
    if (!config) {
        config = await prisma.smtpConfig.create({
            data: {},
        });
    }
    // Se a senha vier como '••••••', não atualizar (manter a atual)
    const updateData = { ...data };
    if (data.password === '••••••') {
        delete updateData.password;
    }
    return prisma.smtpConfig.update({
        where: { id: config.id },
        data: updateData,
    });
}

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestEmail = exports.updateSmtpConfig = exports.getSmtpConfig = void 0;
const emailService = __importStar(require("../services/email.service"));
// GET /api/admin/smtp - Retorna config SMTP (apenas MASTER/ADMIN)
const getSmtpConfig = async (req, res) => {
    try {
        const config = await emailService.getSmtpConfigMasked();
        res.json(config);
    }
    catch (error) {
        console.error('[SMTP CONTROLLER] Error getting config:', error);
        res.status(500).json({ error: 'Erro ao buscar configuração SMTP' });
    }
};
exports.getSmtpConfig = getSmtpConfig;
// PUT /api/admin/smtp - Salva config SMTP (apenas MASTER)
const updateSmtpConfig = async (req, res) => {
    try {
        // Apenas MASTER pode atualizar config SMTP
        if (req.user?.role !== 'MASTER') {
            res.status(403).json({ error: 'Apenas usuários MASTER podem alterar configurações SMTP' });
            return;
        }
        const { host, port, user, password, from_name, from_email, secure } = req.body;
        const config = await emailService.updateSmtpConfig({
            host,
            port: port ? parseInt(port) : undefined,
            user,
            password,
            from_name,
            from_email,
            secure: secure === true || secure === 'true',
        });
        // Retornar com senha mascarada
        res.json({
            ...config,
            password: config.password ? '••••••' : '',
        });
    }
    catch (error) {
        console.error('[SMTP CONTROLLER] Error updating config:', error);
        res.status(500).json({ error: 'Erro ao atualizar configuração SMTP' });
    }
};
exports.updateSmtpConfig = updateSmtpConfig;
// POST /api/admin/smtp/test - Envia email de teste (apenas MASTER)
const sendTestEmail = async (req, res) => {
    try {
        // Apenas MASTER pode enviar email de teste
        if (req.user?.role !== 'MASTER') {
            res.status(403).json({ error: 'Apenas usuários MASTER podem enviar emails de teste' });
            return;
        }
        if (!req.user?.email) {
            res.status(400).json({ error: 'Email do usuário não encontrado' });
            return;
        }
        const result = await emailService.sendTestEmail(req.user.email);
        res.json({
            success: true,
            message: `Email de teste enviado para ${req.user.email}`,
            messageId: result.messageId,
        });
    }
    catch (error) {
        console.error('[SMTP CONTROLLER] Error sending test email:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao enviar email de teste',
        });
    }
};
exports.sendTestEmail = sendTestEmail;

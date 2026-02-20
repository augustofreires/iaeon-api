import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as emailService from '../services/email.service';

// GET /api/admin/smtp - Retorna config SMTP (apenas MASTER/ADMIN)
export const getSmtpConfig = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const config = await emailService.getSmtpConfigMasked();
        res.json(config);
    } catch (error: any) {
        console.error('[SMTP CONTROLLER] Error getting config:', error);
        res.status(500).json({ error: 'Erro ao buscar configuração SMTP' });
    }
};

// PUT /api/admin/smtp - Salva config SMTP (apenas MASTER)
export const updateSmtpConfig = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Apenas MASTER pode atualizar config SMTP
        if (req.user?.role !== 'MASTER') {
            res.status(403).json({ error: 'Apenas usuários MASTER podem alterar configurações SMTP' });
            return;
        }

        const { host, port, user, password, from_name, from_email, secure } = req.body;

        const config = await emailService.updateSmtpConfig({
            host,
            port: port ? parseInt(port, 10) : undefined,
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
    } catch (error: any) {
        console.error('[SMTP CONTROLLER] Error updating config:', error);
        res.status(500).json({ error: 'Erro ao atualizar configuração SMTP' });
    }
};

// POST /api/admin/smtp/test - Envia email de teste (apenas MASTER)
export const sendTestEmail = async (req: AuthRequest, res: Response): Promise<void> => {
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
    } catch (error: any) {
        console.error('[SMTP CONTROLLER] Error sending test email:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erro ao enviar email de teste',
        });
    }
};

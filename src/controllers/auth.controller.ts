import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto, { createHash } from 'crypto';
import { AuthRequest } from '../middleware/auth';
import { sendEmail } from '../services/email.service';
import { getWelcomeEmailHtml } from '../templates/welcome-email';
import { getResetPasswordEmailHtml } from '../templates/reset-password-email';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_EXPIRES_IN = '7d'; // 7 dias
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 dias

/**
 * POST /api/auth/login
 * Autentica usuário e retorna tokens
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email e senha são obrigatórios' });
            return;
        }

        // Buscar usuário
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
                id: true,
                email: true,
                password_hash: true,
                name: true,
                role: true,
                status: true,
                language: true
            }
        });

        if (!user) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        // Verificar status
        if (user.status !== 'ACTIVE') {
            res.status(403).json({ error: 'Conta inativa ou bloqueada' });
            return;
        }

        // Verificar senha
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        // Atualizar last_login
        await prisma.user.update({
            where: { id: user.id },
            data: { last_login: new Date() }
        });

        // Gerar tokens
        const access_token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
        );

        const refresh_token = jwt.sign(
            { userId: user.id },
            JWT_REFRESH_SECRET,
            { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
        );

        // Setar refresh_token como httpOnly cookie
        res.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias em ms
        });

        // Setar access_token como httpOnly cookie também (para nginx auth_request)
        res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutos em ms
        });

        // Retornar dados do usuário e access_token
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                language: user.language
            },
            access_token,
            expires_in: 900 // 15 minutos em segundos
        });
    } catch (error) {
        console.error('[AUTH] Login error:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
};

/**
 * POST /api/auth/register
 * Cria nova conta e atribui plano padrão automaticamente
 */
const hashSHA256 = (value: string) =>
    createHash('sha256').update(value.trim().toLowerCase()).digest('hex');

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name, language, utm_source, utm_medium, utm_campaign } = req.body;

        // Validações básicas
        if (!email || !password || !name) {
            res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
            return;
        }

        // Verificar se email já existe
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            res.status(409).json({ error: 'Email já cadastrado' });
            return;
        }

        // Criar hash da senha
        const password_hash = await bcrypt.hash(password, 12);

        // Criar usuário
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password_hash,
                name,
                language: language || 'pt-br',
                role: 'USER',
                status: 'ACTIVE',
                utm_source: utm_source || null,
                utm_medium: utm_medium || null,
                utm_campaign: utm_campaign || null,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                language: true
            }
        });

        // Buscar plano padrão e criar subscription automática
        const defaultPlan = await prisma.plan.findFirst({
            where: {
                is_default: true,
                status: 'ACTIVE'
            }
        });

        let subscriptionInfo = null;

        if (defaultPlan) {
            // Calcular data de expiração
            let expiresAt = null;
            if (defaultPlan.duration_days > 0) {
                expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + defaultPlan.duration_days);
            }

            // Criar subscription
            const subscription = await prisma.subscription.create({
                data: {
                    user_id: user.id,
                    plan_id: defaultPlan.id,
                    status: 'ACTIVE',
                    payment_source: 'MANUAL',
                    expires_at: expiresAt
                }
            });

            subscriptionInfo = {
                plan_name: defaultPlan.name,
                expires_at: expiresAt,
                duration_days: defaultPlan.duration_days
            };
        }

        // Enviar email de boas-vindas (não bloqueia o registro se falhar)
        if (subscriptionInfo) {
            sendEmail(
                user.email,
                'Bem-vindo à Eon Pro!',
                getWelcomeEmailHtml(user.name, subscriptionInfo.plan_name)
            ).catch(error => {
                console.error('[AUTH] Failed to send welcome email:', error);
            });
        }

        // Enviar evento CompleteRegistration para Meta Conversions API (não bloqueia o registro)
        try {
            const [pixelIdSetting, pixelTokenSetting] = await Promise.all([
                prisma.setting.findUnique({ where: { key: 'meta_pixel_id' } }),
                prisma.setting.findUnique({ where: { key: 'meta_pixel_token' } }),
            ]);
            const pixel_id = pixelIdSetting?.value;
            const access_token = pixelTokenSetting?.value;

            if (pixel_id && access_token) {
                fetch(`https://graph.facebook.com/v18.0/${pixel_id}/events?access_token=${access_token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: [{
                            event_name: 'CompleteRegistration',
                            event_time: Math.floor(Date.now() / 1000),
                            action_source: 'website',
                            user_data: {
                                em: [hashSHA256(user.email)],
                            },
                        }],
                    }),
                }).then(async (metaRes) => {
                    if (!metaRes.ok) {
                        const errBody = await metaRes.text();
                        console.error('[META] Conversions API error:', metaRes.status, errBody);
                    } else {
                        console.log('[META] CompleteRegistration sent for:', user.email);
                    }
                }).catch((err) => {
                    console.error('[META] Conversions API fetch failed:', err);
                });
            }
        } catch (metaError) {
            console.error('[META] Failed to send Conversions API event:', metaError);
        }

        res.status(201).json({
            message: 'Conta criada com sucesso',
            user,
            subscription: subscriptionInfo
        });
    } catch (error) {
        console.error('[AUTH] Register error:', error);
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
};

/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado
 */
export const me = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }

        // Buscar dados completos do usuário (sem senha)
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                language: true,
                created_at: true,
                last_login: true,
                subscriptions: {
                    where: {
                        status: 'ACTIVE'
                    },
                    include: {
                        plan: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                duration_days: true
                            }
                        }
                    }
                }
            }
        });

        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }

        res.json({ user });
    } catch (error) {
        console.error('[AUTH] Me error:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
};

/**
 * POST /api/auth/refresh
 * Gera novo access_token a partir do refresh_token
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
    try {
        const refresh_token = req.cookies.refresh_token;

        if (!refresh_token) {
            res.status(401).json({ error: 'Refresh token não fornecido' });
            return;
        }

        // Verificar refresh_token
        const decoded = jwt.verify(refresh_token, JWT_REFRESH_SECRET) as any;

        // Buscar usuário
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                role: true,
                status: true
            }
        });

        if (!user || user.status !== 'ACTIVE') {
            res.status(401).json({ error: 'Usuário inválido ou inativo' });
            return;
        }

        // Gerar novo access_token
        const access_token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
        );

        // Atualizar cookie do access_token
        res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutos em ms
        });

        res.json({
            access_token,
            expires_in: 900 // 15 minutos em segundos
        });
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ error: 'Refresh token expirado' });
            return;
        }
        console.error('[AUTH] Refresh error:', error);
        res.status(401).json({ error: 'Refresh token inválido' });
    }
};

/**
 * POST /api/auth/logout
 * Limpa os cookies de autenticação
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
    res.clearCookie('refresh_token');
    res.clearCookie('access_token');
    res.json({ message: 'Logout realizado com sucesso' });
};

/**
 * GET /api/auth/verify
 * Endpoint para nginx auth_request
 * Retorna apenas status 200 (ok) ou 401 (unauthorized)
 */
export const verify = async (req: AuthRequest, res: Response): Promise<void> => {
    // Se chegou aqui, passou pelo middleware verifyForNginx
    // Mas vamos deixar a lógica no middleware mesmo
    res.status(200).send();
};

/**
 * POST /api/auth/forgot-password
 * Envia email com link de redefinição de senha
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email é obrigatório' });
            return;
        }

        // Buscar usuário
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
                id: true,
                email: true,
                name: true,
                status: true
            }
        });

        // SEMPRE retorna mesma mensagem (não revela se email existe)
        const successMessage = 'Se o email existir no sistema, enviaremos instruções de redefinição de senha';

        // Se usuário não existe ou está inativo, retornar sucesso mas não fazer nada
        if (!user || user.status !== 'ACTIVE') {
            res.json({ message: successMessage });
            return;
        }

        // Gerar token de reset
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date();
        resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Expira em 1 hora

        // Salvar token no banco
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry
            }
        });

        // Enviar email (não bloqueia a resposta se falhar)
        sendEmail(
            user.email,
            'Eon Pro - Redefinição de Senha',
            getResetPasswordEmailHtml(user.name, resetToken)
        ).catch(error => {
            console.error('[AUTH] Failed to send reset password email:', error);
        });

        res.json({ message: successMessage });
    } catch (error) {
        console.error('[AUTH] Forgot password error:', error);
        res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
};

/**
 * POST /api/auth/reset-password
 * Redefine a senha usando o token enviado por email
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
            return;
        }

        // Buscar usuário com token válido e não expirado
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gte: new Date() // Token não expirado
                },
                status: 'ACTIVE'
            },
            select: {
                id: true,
                email: true,
                name: true
            }
        });

        if (!user) {
            res.status(400).json({ error: 'Link inválido ou expirado' });
            return;
        }

        // Criar hash da nova senha
        const password_hash = await bcrypt.hash(password, 12);

        // Atualizar senha e limpar token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password_hash,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
        console.error('[AUTH] Reset password error:', error);
        res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
};

import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

/**
 * Retorna TODOS os bots ACTIVE com campo is_accessible
 * indicando se o usuário tem acesso baseado no plano
 */
export const getUserBots = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }

        // Buscar usuário com role
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }

        // Buscar TODOS os bots ACTIVE
        const allBots = await prisma.bot.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                internal_id: true,
                name: true,
                description: true,
                xml_filename: true,
                category: true
            },
            orderBy: { name: 'asc' }
        });

        // Se é MASTER ou ADMIN, todos os bots são acessíveis
        if (user.role === 'MASTER' || user.role === 'ADMIN') {
            const botsWithAccess = allBots.map(bot => ({
                ...bot,
                is_accessible: true
            }));
            res.json(botsWithAccess);
            return;
        }

        // Buscar subscription ativa do usuário
        const now = new Date();
        const activeSubscription = await prisma.subscription.findFirst({
            where: {
                user_id: userId,
                status: 'ACTIVE',
                OR: [
                    { expires_at: null }, // Sem expiração (vitalício)
                    { expires_at: { gt: now } } // Ainda não expirou
                ]
            },
            include: {
                plan: {
                    include: {
                        plan_bots: {
                            select: {
                                bot_id: true
                            }
                        }
                    }
                }
            }
        });

        // IDs dos bots que o usuário pode acessar
        let accessibleBotIds: string[] = [];

        // Se tem subscription ativa, pegar bots do plano
        if (activeSubscription) {
            accessibleBotIds = activeSubscription.plan.plan_bots.map(pb => pb.bot_id);
        }

        // Adicionar bots FREE (todos têm acesso)
        const freeBots = allBots.filter(bot => bot.category === 'FREE');
        freeBots.forEach(bot => {
            if (!accessibleBotIds.includes(bot.id)) {
                accessibleBotIds.push(bot.id);
            }
        });

        // Retornar todos os bots com campo is_accessible
        const botsWithAccess = allBots.map(bot => ({
            ...bot,
            is_accessible: accessibleBotIds.includes(bot.id)
        }));

        res.json(botsWithAccess);

    } catch (error) {
        console.error('Error getting user bots:', error);
        res.status(500).json({ error: 'Erro ao buscar bots do usuário' });
    }
};

/**
 * Retorna a subscription ativa do usuário
 */
export const getUserSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }

        const now = new Date();
        const activeSubscription = await prisma.subscription.findFirst({
            where: {
                user_id: userId,
                status: 'ACTIVE',
                OR: [
                    { expires_at: null },
                    { expires_at: { gt: now } }
                ]
            },
            include: {
                plan: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        duration_days: true
                    }
                }
            }
        });

        if (!activeSubscription) {
            res.json({ subscription: null });
            return;
        }

        res.json({ subscription: activeSubscription });
    } catch (error) {
        console.error('Error getting user subscription:', error);
        res.status(500).json({ error: 'Erro ao buscar subscription' });
    }
};

/**
 * Retorna dados do dashboard do usuário
 */
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }

        // Buscar dados do usuário
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true
            }
        });

        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }

        // Buscar subscription ativa
        const now = new Date();
        const activeSubscription = await prisma.subscription.findFirst({
            where: {
                user_id: userId,
                status: 'ACTIVE',
                OR: [
                    { expires_at: null },
                    { expires_at: { gt: now } }
                ]
            },
            include: {
                plan: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        duration_days: true
                    }
                }
            }
        });

        let subscription = null;
        if (activeSubscription) {
            let daysRemaining = null;
            if (activeSubscription.expires_at) {
                const diffTime = activeSubscription.expires_at.getTime() - now.getTime();
                daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            subscription = {
                plan_name: activeSubscription.plan.name,
                status: activeSubscription.status,
                expires_at: activeSubscription.expires_at,
                days_remaining: daysRemaining
            };
        }

        // Contar bots disponíveis
        let totalBotsAvailable = 0;
        let totalBotsFree = 0;
        let totalBotsPaid = 0;

        // Se é MASTER ou ADMIN, tem acesso a todos os bots
        if (user.role === 'MASTER' || user.role === 'ADMIN') {
            const allBots = await prisma.bot.findMany({
                where: { status: 'ACTIVE' },
                select: { category: true }
            });

            totalBotsAvailable = allBots.length;
            totalBotsFree = allBots.filter(b => b.category === 'FREE').length;
            totalBotsPaid = allBots.filter(b => b.category !== 'FREE').length;
        } else {
            // Contar bots FREE
            const freeBots = await prisma.bot.findMany({
                where: {
                    category: 'FREE',
                    status: 'ACTIVE'
                }
            });
            totalBotsFree = freeBots.length;

            // Se tem subscription, contar bots do plano
            if (activeSubscription) {
                const planBots = await prisma.planBot.findMany({
                    where: {
                        plan_id: activeSubscription.plan.id
                    },
                    include: {
                        bot: {
                            select: {
                                id: true,
                                category: true,
                                status: true
                            }
                        }
                    }
                });

                const activePlanBots = planBots.filter(pb => pb.bot.status === 'ACTIVE');
                totalBotsPaid = activePlanBots.length;
            }

            totalBotsAvailable = totalBotsFree + totalBotsPaid;
        }

        // Contar bots do plano Pro (para mostrar no card de upgrade)
        const proPlan = await prisma.plan.findFirst({
            where: {
                name: 'IAeon Pro',
                status: 'ACTIVE'
            }
        });

        let totalBotsProPlan = 0;
        if (proPlan) {
            const proPlanBots = await prisma.planBot.findMany({
                where: {
                    plan_id: proPlan.id
                },
                include: {
                    bot: true
                }
            });
            totalBotsProPlan = proPlanBots.filter(pb => pb.bot && pb.bot.status === 'ACTIVE').length;
        }

        res.json({
            user: {
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            },
            subscription,
            stats: {
                total_bots_available: totalBotsAvailable,
                total_bots_free: totalBotsFree,
                total_bots_paid: totalBotsPaid,
                total_bots_pro_plan: totalBotsProPlan
            }
        });

    } catch (error) {
        console.error('Error getting dashboard:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
    }
};

/**
 * Atualiza perfil do usuário (nome e/ou senha)
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }

        const { name, current_password, new_password } = req.body;

        const updateData: any = {};

        // Atualizar nome
        if (name) {
            updateData.name = name;
        }

        // Atualizar senha
        if (new_password) {
            if (!current_password) {
                res.status(400).json({ error: 'Senha atual é obrigatória para alterar a senha' });
                return;
            }

            // Verificar senha atual
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { password_hash: true }
            });

            if (!user || !user.password_hash) {
                res.status(404).json({ error: 'Usuário não encontrado' });
                return;
            }

            const isValidPassword = await bcrypt.compare(current_password, user.password_hash);

            if (!isValidPassword) {
                res.status(401).json({ error: 'Senha atual incorreta' });
                return;
            }

            // Hash nova senha
            const passwordHash = await bcrypt.hash(new_password, 12);
            updateData.password_hash = passwordHash;
        }

        // Se não há nada para atualizar
        if (Object.keys(updateData).length === 0) {
            res.status(400).json({ error: 'Nenhum dado para atualizar' });
            return;
        }

        // Atualizar usuário
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                created_at: true
            }
        });

        res.json({ message: 'Perfil atualizado com sucesso', user: updatedUser });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
};

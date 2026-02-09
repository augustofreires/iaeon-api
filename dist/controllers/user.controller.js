"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getDashboard = exports.getUserSubscription = exports.getUserBots = void 0;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
/**
 * Retorna os bots que o usuário tem acesso baseado no plano
 */
const getUserBots = async (req, res) => {
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
        // Se é MASTER ou ADMIN, retornar TODOS os bots
        if (user.role === 'MASTER' || user.role === 'ADMIN') {
            const allBots = await prisma.bot.findMany({
                where: { status: 'ACTIVE' },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    xml_filename: true,
                    category: true
                },
                orderBy: { name: 'asc' }
            });
            res.json(allBots);
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
                            include: {
                                bot: {
                                    select: {
                                        id: true,
                                        name: true,
                                        description: true,
                                        xml_filename: true,
                                        category: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        let botIds = [];
        // Se tem subscription ativa, pegar bots do plano
        if (activeSubscription) {
            botIds = activeSubscription.plan.plan_bots.map(pb => pb.bot.id);
        }
        // Buscar bots FREE (todos têm acesso)
        const freeBots = await prisma.bot.findMany({
            where: {
                category: 'FREE',
                status: 'ACTIVE'
            },
            select: {
                id: true,
                name: true,
                description: true,
                xml_filename: true,
                category: true
            }
        });
        // Adicionar IDs dos bots FREE
        freeBots.forEach(bot => {
            if (!botIds.includes(bot.id)) {
                botIds.push(bot.id);
            }
        });
        // Buscar todos os bots que o usuário tem acesso
        const userBots = await prisma.bot.findMany({
            where: {
                id: { in: botIds },
                status: 'ACTIVE'
            },
            select: {
                id: true,
                name: true,
                description: true,
                xml_filename: true,
                category: true
            },
            orderBy: { name: 'asc' }
        });
        res.json(userBots);
    }
    catch (error) {
        console.error('Error getting user bots:', error);
        res.status(500).json({ error: 'Erro ao buscar bots do usuário' });
    }
};
exports.getUserBots = getUserBots;
/**
 * Retorna a subscription ativa do usuário
 */
const getUserSubscription = async (req, res) => {
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
    }
    catch (error) {
        console.error('Error getting user subscription:', error);
        res.status(500).json({ error: 'Erro ao buscar subscription' });
    }
};
exports.getUserSubscription = getUserSubscription;
/**
 * Retorna dados do dashboard do usuário
 */
const getDashboard = async (req, res) => {
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
        }
        else {
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
                total_bots_paid: totalBotsPaid
            }
        });
    }
    catch (error) {
        console.error('Error getting dashboard:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
    }
};
exports.getDashboard = getDashboard;
/**
 * Atualiza perfil do usuário (nome e/ou senha)
 */
const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const { name, current_password, new_password } = req.body;
        const updateData = {};
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
            const isValidPassword = await bcrypt_1.default.compare(current_password, user.password_hash);
            if (!isValidPassword) {
                res.status(401).json({ error: 'Senha atual incorreta' });
                return;
            }
            // Hash nova senha
            const passwordHash = await bcrypt_1.default.hash(new_password, 12);
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
    }
    catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
};
exports.updateProfile = updateProfile;

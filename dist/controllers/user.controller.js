"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserBots = void 0;
const client_1 = require("@prisma/client");
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

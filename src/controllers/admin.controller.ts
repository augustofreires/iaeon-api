import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// ============= USUÁRIOS =============

export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page = parseInt((req.query.page || '1') as string) || 1;
        const limit = parseInt((req.query.limit || '20') as string) || 20;
        const search = (req.query.search || '') as string;
        const status = req.query.status as string | undefined;
        const role = req.query.role as string | undefined;

        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (status) {
            where.status = status;
        }

        if (role) {
            where.role = role;
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    status: true,
                    language: true,
                    created_at: true,
                    updated_at: true,
                    subscriptions: {
                        select: {
                            id: true,
                            status: true,
                            expires_at: true,
                            plan: {
                                select: {
                                    name: true,
                                    price: true
                                }
                            }
                        }
                    }
                },
                orderBy: { created_at: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        res.json({
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error listing users:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;

        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                subscriptions: {
                    include: {
                        plan: {
                            include: {
                                plan_bots: {
                                    include: {
                                        bot: true
                                    }
                                }
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

        res.json(user);
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { name, email, role, status, language } = req.body;

        const user = await prisma.user.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(email && { email: email.toLowerCase() }),
                ...(role && { role }),
                ...(status && { status }),
                ...(language && { language })
            }
        });

        res.json(user);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
};

export const updateUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { status } = req.body;

        if (!['ACTIVE', 'BLOCKED', 'INACTIVE'].includes(status)) {
            res.status(400).json({ error: 'Status inválido' });
            return;
        }

        const user = await prisma.user.update({
            where: { id },
            data: { status }
        });

        res.json(user);
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ error: 'Erro ao atualizar status' });
    }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;

        await prisma.subscription.deleteMany({
            where: { user_id: id }
        });

        await prisma.user.delete({
            where: { id }
        });

        res.json({ message: 'Usuário deletado com sucesso' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
};

export const createUserSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { plan_id, expires_at } = req.body;

        if (!plan_id) {
            res.status(400).json({ error: 'Plan ID é obrigatório' });
            return;
        }

        const plan = await prisma.plan.findUnique({
            where: { id: plan_id }
        });

        if (!plan) {
            res.status(404).json({ error: 'Plano não encontrado' });
            return;
        }

        const subscription = await prisma.subscription.create({
            data: {
                user_id: id,
                plan_id,
                status: 'ACTIVE',
                expires_at: expires_at ? new Date(expires_at) : null,
                payment_source: 'MANUAL',
                payment_reference: `ADMIN-${Date.now()}`
            },
            include: {
                plan: true
            }
        });

        res.json(subscription);
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Erro ao criar subscription' });
    }
};

// ============= PLANOS =============

export const listPlans = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const plans = await prisma.plan.findMany({
            include: {
                plan_bots: {
                    include: {
                        bot: true
                    }
                },
                subscriptions: {
                    where: { status: 'ACTIVE' },
                    select: { id: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        res.json(plans);
    } catch (error) {
        console.error('Error listing plans:', error);
        res.status(500).json({ error: 'Erro ao listar planos' });
    }
};

export const createPlan = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description, price, duration_days } = req.body;

        if (!name || price === undefined) {
            res.status(400).json({ error: 'Nome e preço são obrigatórios' });
            return;
        }

        const plan = await prisma.plan.create({
            data: {
                name,
                description,
                price: parseFloat(price),
                ...(duration_days && { duration_days: parseInt(duration_days) })
            }
        });

        res.json(plan);
    } catch (error) {
        console.error('Error creating plan:', error);
        res.status(500).json({ error: 'Erro ao criar plano' });
    }
};

export const updatePlan = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { name, description, price, duration_days } = req.body;

        const plan = await prisma.plan.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(price !== undefined && { price: parseFloat(price) }),
                ...(duration_days !== undefined && { duration_days: duration_days ? parseInt(duration_days) : null })
            }
        });

        res.json(plan);
    } catch (error) {
        console.error('Error updating plan:', error);
        res.status(500).json({ error: 'Erro ao atualizar plano' });
    }
};

export const deletePlan = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;

        await prisma.planBot.deleteMany({
            where: { plan_id: id }
        });

        await prisma.subscription.deleteMany({
            where: { plan_id: id }
        });

        await prisma.plan.delete({
            where: { id }
        });

        res.json({ message: 'Plano deletado com sucesso' });
    } catch (error) {
        console.error('Error deleting plan:', error);
        res.status(500).json({ error: 'Erro ao deletar plano' });
    }
};

export const addBotToPlan = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { bot_id } = req.body;

        if (!bot_id) {
            res.status(400).json({ error: 'Bot ID é obrigatório' });
            return;
        }

        const planBot = await prisma.planBot.create({
            data: {
                plan_id: id,
                bot_id
            },
            include: {
                bot: true
            }
        });

        res.json(planBot);
    } catch (error) {
        console.error('Error adding bot to plan:', error);
        res.status(500).json({ error: 'Erro ao adicionar bot ao plano' });
    }
};

export const removeBotFromPlan = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const botId = req.params.botId as string;

        await prisma.planBot.deleteMany({
            where: {
                plan_id: id,
                bot_id: botId
            }
        });

        res.json({ message: 'Bot removido do plano' });
    } catch (error) {
        console.error('Error removing bot from plan:', error);
        res.status(500).json({ error: 'Erro ao remover bot do plano' });
    }
};

// ============= BOTS =============

// Lista dos XMLs disponíveis no projeto frontend
const AVAILABLE_XML_FILES = [
    '1 tick DIgit Over 2.xml',
    'Defender_Digits Auto Bot.xml',
    'Digit Over 3.xml',
    'Entry_Touch_BBot.xml',
    'Exponential Strategy Bot 2.0.xml',
    'Free Digit Socail Bot.xml',
    'HARAMI Binary-Bot.xml',
    'HL BearKing premium Bot.xml',
    'HL HAMMER B-BOT 1.0.xml',
    'Higher-Lower Trend-Challenger BinaryBot .xml',
    'House of Rise_Fall Auto_Bots.xml',
    'Insync_Equals BinaryBot.xml',
    'LastDigit1-Strategy-Bot.xml',
    'Leo_Even_Odd.xml',
    'Mavic-Air-RF Vix Bot.xml',
    'One Touch Tetris B-Bot.xml',
    'RF-Compressor Signal Bot V1.0.1.xml',
    'RF-MARBLE B-BOT.xml',
    'RF_Market-Monitor.xml',
    'SENSEI-RF-BINARYBOT.xml',
    'SHASH DIGITS V- 4-20.xml',
    'Shark_Digits.xml',
    'Sonic Digits BinaryBot.xml',
    'Stoch and RSI Bot.xml',
    'Super Digit Differ Bot.xml',
    'Tick-Pip Rf.xml',
    'Unicorn Only Up-Down BinaryBot.xml',
    'Up-Down Volt Binary Bot.xml',
    'binary-bot Premium Rise_Fall .xml',
    'bot.xml',
];

export const getXmlFiles = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        res.json({
            files: AVAILABLE_XML_FILES,
            total: AVAILABLE_XML_FILES.length
        });
    } catch (error) {
        console.error('Error listing XML files:', error);
        res.status(500).json({ error: 'Erro ao listar arquivos XML' });
    }
};

export const listBots = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const bots = await prisma.bot.findMany({
            include: {
                plan_bots: {
                    include: {
                        plan: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        res.json(bots);
    } catch (error) {
        console.error('Error listing bots:', error);
        res.status(500).json({ error: 'Erro ao listar bots' });
    }
};

export const createBot = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description, xml_filename, category, status } = req.body;

        if (!name || !xml_filename) {
            res.status(400).json({ error: 'Nome e xml_filename são obrigatórios' });
            return;
        }

        const bot = await prisma.bot.create({
            data: {
                name,
                description,
                xml_filename,
                category,
                ...(status && { status })
            }
        });

        res.json(bot);
    } catch (error) {
        console.error('Error creating bot:', error);
        res.status(500).json({ error: 'Erro ao criar bot' });
    }
};

export const updateBot = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { name, description, xml_filename, category, status } = req.body;

        const bot = await prisma.bot.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(xml_filename && { xml_filename }),
                ...(category && { category }),
                ...(status && { status })
            }
        });

        res.json(bot);
    } catch (error) {
        console.error('Error updating bot:', error);
        res.status(500).json({ error: 'Erro ao atualizar bot' });
    }
};

export const deleteBot = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;

        await prisma.planBot.deleteMany({
            where: { bot_id: id }
        });

        await prisma.bot.delete({
            where: { id }
        });

        res.json({ message: 'Bot deletado com sucesso' });
    } catch (error) {
        console.error('Error deleting bot:', error);
        res.status(500).json({ error: 'Erro ao deletar bot' });
    }
};

// ============= SUBSCRIPTIONS =============

export const listSubscriptions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const status = req.query.status as string | undefined;
        const user_id = req.query.user_id as string | undefined;
        const plan_id = req.query.plan_id as string | undefined;

        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (user_id) {
            where.user_id = user_id;
        }

        if (plan_id) {
            where.plan_id = plan_id;
        }

        const subscriptions = await prisma.subscription.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                plan: true
            },
            orderBy: { created_at: 'desc' }
        });

        res.json(subscriptions);
    } catch (error) {
        console.error('Error listing subscriptions:', error);
        res.status(500).json({ error: 'Erro ao listar subscriptions' });
    }
};

export const updateSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { status, expires_at } = req.body;

        const subscription = await prisma.subscription.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(expires_at !== undefined && { expires_at: expires_at ? new Date(expires_at) : null })
            }
        });

        res.json(subscription);
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ error: 'Erro ao atualizar subscription' });
    }
};

export const deleteSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;

        await prisma.subscription.delete({
            where: { id }
        });

        res.json({ message: 'Subscription cancelada' });
    } catch (error) {
        console.error('Error deleting subscription:', error);
        res.status(500).json({ error: 'Erro ao cancelar subscription' });
    }
};

// ============= CONFIGURAÇÕES =============

export const listSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const settings = await prisma.setting.findMany({
            orderBy: { key: 'asc' }
        });

        res.json(settings);
    } catch (error) {
        console.error('Error listing settings:', error);
        res.status(500).json({ error: 'Erro ao listar configurações' });
    }
};

export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { settings } = req.body;

        if (!Array.isArray(settings)) {
            res.status(400).json({ error: 'Settings deve ser um array' });
            return;
        }

        const results = await Promise.all(
            settings.map(async ({ key, value }: { key: string; value: string }) => {
                return prisma.setting.upsert({
                    where: { key },
                    update: { value },
                    create: { key, value }
                });
            })
        );

        res.json(results);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
};

// ============= MÉTRICAS =============

export const getMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const [
            total_users,
            active_users,
            total_subscriptions,
            active_subscriptions,
            revenue_data
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { status: 'ACTIVE' } }),
            prisma.subscription.count(),
            prisma.subscription.count({ where: { status: 'ACTIVE' } }),
            prisma.subscription.findMany({
                where: { status: 'ACTIVE' },
                include: {
                    plan: {
                        select: {
                            price: true
                        }
                    }
                }
            })
        ]);

        const total_revenue = revenue_data.reduce((sum, sub) => {
            const price = typeof sub.plan.price === 'number' ? sub.plan.price : Number(sub.plan.price);
            return sum + (price || 0);
        }, 0);

        res.json({
            total_users,
            active_users,
            total_subscriptions,
            active_subscriptions,
            total_revenue
        });
    } catch (error) {
        console.error('Error getting metrics:', error);
        res.status(500).json({ error: 'Erro ao buscar métricas' });
    }
};

// ============= LINKS ÚTEIS =============

export const getUsefulLinksAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: 'useful_links' }
        });

        if (!setting || !setting.value) {
            res.json([]);
            return;
        }

        try {
            const links = JSON.parse(setting.value);
            res.json(links);
        } catch (parseError) {
            console.error('Error parsing useful_links JSON:', parseError);
            res.json([]);
        }
    } catch (error) {
        console.error('Error getting useful links:', error);
        res.status(500).json({ error: 'Erro ao buscar links úteis' });
    }
};

export const updateUsefulLinks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { links } = req.body;

        if (!Array.isArray(links)) {
            res.status(400).json({ error: 'Links deve ser um array' });
            return;
        }

        // Validar estrutura dos links
        for (const link of links) {
            if (!link.label || !link.url || !link.icon) {
                res.status(400).json({ error: 'Cada link deve ter label, url e icon' });
                return;
            }
        }

        const linksJson = JSON.stringify(links);

        // Tentar atualizar ou criar
        const setting = await prisma.setting.upsert({
            where: { key: 'useful_links' },
            update: { value: linksJson },
            create: {
                key: 'useful_links',
                value: linksJson
            }
        });

        res.json({ message: 'Links atualizados com sucesso', setting });
    } catch (error) {
        console.error('Error updating useful links:', error);
        res.status(500).json({ error: 'Erro ao atualizar links úteis' });
    }
};

// ============= BANNERS =============

export const getBannersAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: 'dashboard_banners' }
        });

        if (!setting || !setting.value) {
            res.json([]);
            return;
        }

        try {
            const banners = JSON.parse(setting.value);
            res.json(banners);
        } catch (parseError) {
            console.error('Error parsing dashboard_banners JSON:', parseError);
            res.json([]);
        }
    } catch (error) {
        console.error('Error getting banners:', error);
        res.status(500).json({ error: 'Erro ao buscar banners' });
    }
};

export const updateBanners = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { banners } = req.body;

        if (!Array.isArray(banners)) {
            res.status(400).json({ error: 'Banners deve ser um array' });
            return;
        }

        // Validar estrutura dos banners
        for (const banner of banners) {
            if (!banner.id || banner.order === undefined || banner.active === undefined) {
                res.status(400).json({ error: 'Cada banner deve ter id, order e active' });
                return;
            }
            if (!banner.link) {
                res.status(400).json({ error: 'Cada banner deve ter um link' });
                return;
            }
        }

        const bannersJson = JSON.stringify(banners);

        // Tentar atualizar ou criar
        const setting = await prisma.setting.upsert({
            where: { key: 'dashboard_banners' },
            update: { value: bannersJson },
            create: {
                key: 'dashboard_banners',
                value: bannersJson
            }
        });

        res.json({ message: 'Banners atualizados com sucesso', setting });
    } catch (error) {
        console.error('Error updating banners:', error);
        res.status(500).json({ error: 'Erro ao atualizar banners' });
    }
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBanners = exports.getBannersAdmin = exports.updateUsefulLinks = exports.getUsefulLinksAdmin = exports.getMetrics = exports.updateSettings = exports.listSettings = exports.deleteSubscription = exports.updateSubscription = exports.listSubscriptions = exports.deleteBot = exports.updateBot = exports.createBot = exports.listBots = exports.getXmlFiles = exports.setDefaultPlan = exports.removeBotFromPlan = exports.addBotToPlan = exports.deletePlan = exports.updatePlan = exports.createPlan = exports.listPlans = exports.createUserSubscription = exports.deleteUser = exports.updateUserStatus = exports.updateUser = exports.getUserById = exports.listUsers = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ============= USUÁRIOS =============
const listUsers = async (req, res) => {
    try {
        const page = parseInt((req.query.page || '1')) || 1;
        const limit = parseInt((req.query.limit || '20')) || 20;
        const search = (req.query.search || '');
        const status = req.query.status;
        const role = req.query.role;
        const skip = (page - 1) * limit;
        const where = {};
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
    }
    catch (error) {
        console.error('Error listing users:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
};
exports.listUsers = listUsers;
const getUserById = async (req, res) => {
    try {
        const id = req.params.id;
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
    }
    catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
};
exports.getUserById = getUserById;
const updateUser = async (req, res) => {
    try {
        const id = req.params.id;
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
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
};
exports.updateUser = updateUser;
const updateUserStatus = async (req, res) => {
    try {
        const id = req.params.id;
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
    }
    catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ error: 'Erro ao atualizar status' });
    }
};
exports.updateUserStatus = updateUserStatus;
const deleteUser = async (req, res) => {
    try {
        const id = req.params.id;
        await prisma.subscription.deleteMany({
            where: { user_id: id }
        });
        await prisma.user.delete({
            where: { id }
        });
        res.json({ message: 'Usuário deletado com sucesso' });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
};
exports.deleteUser = deleteUser;
const createUserSubscription = async (req, res) => {
    try {
        const id = req.params.id;
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
    }
    catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Erro ao criar subscription' });
    }
};
exports.createUserSubscription = createUserSubscription;
// ============= PLANOS =============
const listPlans = async (req, res) => {
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
    }
    catch (error) {
        console.error('Error listing plans:', error);
        res.status(500).json({ error: 'Erro ao listar planos' });
    }
};
exports.listPlans = listPlans;
const createPlan = async (req, res) => {
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
    }
    catch (error) {
        console.error('Error creating plan:', error);
        res.status(500).json({ error: 'Erro ao criar plano' });
    }
};
exports.createPlan = createPlan;
const updatePlan = async (req, res) => {
    try {
        const id = req.params.id;
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
    }
    catch (error) {
        console.error('Error updating plan:', error);
        res.status(500).json({ error: 'Erro ao atualizar plano' });
    }
};
exports.updatePlan = updatePlan;
const deletePlan = async (req, res) => {
    try {
        const id = req.params.id;
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
    }
    catch (error) {
        console.error('Error deleting plan:', error);
        res.status(500).json({ error: 'Erro ao deletar plano' });
    }
};
exports.deletePlan = deletePlan;
const addBotToPlan = async (req, res) => {
    try {
        const id = req.params.id;
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
    }
    catch (error) {
        console.error('Error adding bot to plan:', error);
        res.status(500).json({ error: 'Erro ao adicionar bot ao plano' });
    }
};
exports.addBotToPlan = addBotToPlan;
const removeBotFromPlan = async (req, res) => {
    try {
        const id = req.params.id;
        const botId = req.params.botId;
        await prisma.planBot.deleteMany({
            where: {
                plan_id: id,
                bot_id: botId
            }
        });
        res.json({ message: 'Bot removido do plano' });
    }
    catch (error) {
        console.error('Error removing bot from plan:', error);
        res.status(500).json({ error: 'Erro ao remover bot do plano' });
    }
};
exports.removeBotFromPlan = removeBotFromPlan;
const setDefaultPlan = async (req, res) => {
    try {
        const id = req.params.id;
        // Primeiro: remover is_default de todos os planos
        await prisma.plan.updateMany({
            where: { is_default: true },
            data: { is_default: false }
        });
        // Depois: setar o plano específico como default
        const plan = await prisma.plan.update({
            where: { id },
            data: { is_default: true }
        });
        res.json(plan);
    }
    catch (error) {
        console.error('Error setting default plan:', error);
        res.status(500).json({ error: 'Erro ao definir plano padrão' });
    }
};
exports.setDefaultPlan = setDefaultPlan;
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
const getXmlFiles = async (req, res) => {
    try {
        res.json({
            files: AVAILABLE_XML_FILES,
            total: AVAILABLE_XML_FILES.length
        });
    }
    catch (error) {
        console.error('Error listing XML files:', error);
        res.status(500).json({ error: 'Erro ao listar arquivos XML' });
    }
};
exports.getXmlFiles = getXmlFiles;
const listBots = async (req, res) => {
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
    }
    catch (error) {
        console.error('Error listing bots:', error);
        res.status(500).json({ error: 'Erro ao listar bots' });
    }
};
exports.listBots = listBots;
const createBot = async (req, res) => {
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
    }
    catch (error) {
        console.error('Error creating bot:', error);
        res.status(500).json({ error: 'Erro ao criar bot' });
    }
};
exports.createBot = createBot;
const updateBot = async (req, res) => {
    try {
        const id = req.params.id;
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
    }
    catch (error) {
        console.error('Error updating bot:', error);
        res.status(500).json({ error: 'Erro ao atualizar bot' });
    }
};
exports.updateBot = updateBot;
const deleteBot = async (req, res) => {
    try {
        const id = req.params.id;
        await prisma.planBot.deleteMany({
            where: { bot_id: id }
        });
        await prisma.bot.delete({
            where: { id }
        });
        res.json({ message: 'Bot deletado com sucesso' });
    }
    catch (error) {
        console.error('Error deleting bot:', error);
        res.status(500).json({ error: 'Erro ao deletar bot' });
    }
};
exports.deleteBot = deleteBot;
// ============= SUBSCRIPTIONS =============
const listSubscriptions = async (req, res) => {
    try {
        const status = req.query.status;
        const user_id = req.query.user_id;
        const plan_id = req.query.plan_id;
        const where = {};
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
    }
    catch (error) {
        console.error('Error listing subscriptions:', error);
        res.status(500).json({ error: 'Erro ao listar subscriptions' });
    }
};
exports.listSubscriptions = listSubscriptions;
const updateSubscription = async (req, res) => {
    try {
        const id = req.params.id;
        const { status, expires_at } = req.body;
        const subscription = await prisma.subscription.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(expires_at !== undefined && { expires_at: expires_at ? new Date(expires_at) : null })
            }
        });
        res.json(subscription);
    }
    catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ error: 'Erro ao atualizar subscription' });
    }
};
exports.updateSubscription = updateSubscription;
const deleteSubscription = async (req, res) => {
    try {
        const id = req.params.id;
        await prisma.subscription.delete({
            where: { id }
        });
        res.json({ message: 'Subscription cancelada' });
    }
    catch (error) {
        console.error('Error deleting subscription:', error);
        res.status(500).json({ error: 'Erro ao cancelar subscription' });
    }
};
exports.deleteSubscription = deleteSubscription;
// ============= CONFIGURAÇÕES =============
const listSettings = async (req, res) => {
    try {
        const settings = await prisma.setting.findMany({
            orderBy: { key: 'asc' }
        });
        res.json(settings);
    }
    catch (error) {
        console.error('Error listing settings:', error);
        res.status(500).json({ error: 'Erro ao listar configurações' });
    }
};
exports.listSettings = listSettings;
const updateSettings = async (req, res) => {
    try {
        const { settings } = req.body;
        if (!Array.isArray(settings)) {
            res.status(400).json({ error: 'Settings deve ser um array' });
            return;
        }
        const results = await Promise.all(settings.map(async ({ key, value }) => {
            return prisma.setting.upsert({
                where: { key },
                update: { value },
                create: { key, value }
            });
        }));
        res.json(results);
    }
    catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
};
exports.updateSettings = updateSettings;
// ============= MÉTRICAS =============
const getMetrics = async (req, res) => {
    try {
        const [total_users, active_users, total_subscriptions, active_subscriptions, revenue_data] = await Promise.all([
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
    }
    catch (error) {
        console.error('Error getting metrics:', error);
        res.status(500).json({ error: 'Erro ao buscar métricas' });
    }
};
exports.getMetrics = getMetrics;
// ============= LINKS ÚTEIS =============
const getUsefulLinksAdmin = async (req, res) => {
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
        }
        catch (parseError) {
            console.error('Error parsing useful_links JSON:', parseError);
            res.json([]);
        }
    }
    catch (error) {
        console.error('Error getting useful links:', error);
        res.status(500).json({ error: 'Erro ao buscar links úteis' });
    }
};
exports.getUsefulLinksAdmin = getUsefulLinksAdmin;
const updateUsefulLinks = async (req, res) => {
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
    }
    catch (error) {
        console.error('Error updating useful links:', error);
        res.status(500).json({ error: 'Erro ao atualizar links úteis' });
    }
};
exports.updateUsefulLinks = updateUsefulLinks;
// ============= BANNERS =============
const getBannersAdmin = async (req, res) => {
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
        }
        catch (parseError) {
            console.error('Error parsing dashboard_banners JSON:', parseError);
            res.json([]);
        }
    }
    catch (error) {
        console.error('Error getting banners:', error);
        res.status(500).json({ error: 'Erro ao buscar banners' });
    }
};
exports.getBannersAdmin = getBannersAdmin;
const updateBanners = async (req, res) => {
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
    }
    catch (error) {
        console.error('Error updating banners:', error);
        res.status(500).json({ error: 'Erro ao atualizar banners' });
    }
};
exports.updateBanners = updateBanners;

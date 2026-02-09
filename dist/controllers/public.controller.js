"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDerivConfig = exports.getBanners = exports.getUsefulLinks = exports.listPublicPlans = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Lista planos públicos (ACTIVE)
 */
const listPublicPlans = async (req, res) => {
    try {
        const plans = await prisma.plan.findMany({
            where: {
                status: 'ACTIVE'
            },
            include: {
                plan_bots: {
                    include: {
                        bot: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                category: true
                            }
                        }
                    }
                }
            },
            orderBy: { price: 'asc' }
        });
        res.json(plans);
    }
    catch (error) {
        console.error('Error listing public plans:', error);
        res.status(500).json({ error: 'Erro ao listar planos' });
    }
};
exports.listPublicPlans = listPublicPlans;
/**
 * Retorna links úteis configurados no sistema
 */
const getUsefulLinks = async (req, res) => {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: 'useful_links' }
        });
        if (!setting || !setting.value) {
            // Retornar array vazio se não houver configuração
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
exports.getUsefulLinks = getUsefulLinks;
/**
 * Retorna banners ativos para o dashboard
 */
const getBanners = async (req, res) => {
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
            // Filtrar apenas banners ativos e ordenar
            const activeBanners = banners
                .filter((b) => b.active)
                .sort((a, b) => a.order - b.order);
            res.json(activeBanners);
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
exports.getBanners = getBanners;
/**
 * Retorna configurações de afiliado da Deriv
 */
const getDerivConfig = async (req, res) => {
    try {
        const [affiliateTokenSetting, utmCampaignSetting, signupUrlSetting] = await Promise.all([
            prisma.setting.findUnique({ where: { key: 'deriv_affiliate_token' } }),
            prisma.setting.findUnique({ where: { key: 'deriv_utm_campaign' } }),
            prisma.setting.findUnique({ where: { key: 'deriv_signup_url' } })
        ]);
        const app_id = 82349;
        const affiliate_token = affiliateTokenSetting?.value || '';
        const utm_campaign = utmCampaignSetting?.value || 'iaeon';
        const signup_url = signupUrlSetting?.value || 'https://deriv.com';
        // Montar URL OAuth completa
        const oauth_url = `https://oauth.deriv.com/oauth2/authorize?app_id=${app_id}${affiliate_token ? `&affiliate_token=${affiliate_token}` : ''}&utm_campaign=${utm_campaign}`;
        res.json({
            app_id,
            affiliate_token,
            utm_campaign,
            signup_url,
            oauth_url
        });
    }
    catch (error) {
        console.error('Error getting Deriv config:', error);
        res.status(500).json({ error: 'Erro ao buscar configurações da Deriv' });
    }
};
exports.getDerivConfig = getDerivConfig;

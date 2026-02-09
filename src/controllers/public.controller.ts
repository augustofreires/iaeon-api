import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Lista planos públicos (ACTIVE)
 */
export const listPublicPlans = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
        console.error('Error listing public plans:', error);
        res.status(500).json({ error: 'Erro ao listar planos' });
    }
};

/**
 * Retorna links úteis configurados no sistema
 */
export const getUsefulLinks = async (req: Request, res: Response): Promise<void> => {
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
        } catch (parseError) {
            console.error('Error parsing useful_links JSON:', parseError);
            res.json([]);
        }
    } catch (error) {
        console.error('Error getting useful links:', error);
        res.status(500).json({ error: 'Erro ao buscar links úteis' });
    }
};

/**
 * Retorna banners ativos para o dashboard
 */
export const getBanners = async (req: Request, res: Response): Promise<void> => {
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
                .filter((b: any) => b.active)
                .sort((a: any, b: any) => a.order - b.order);
            res.json(activeBanners);
        } catch (parseError) {
            console.error('Error parsing dashboard_banners JSON:', parseError);
            res.json([]);
        }
    } catch (error) {
        console.error('Error getting banners:', error);
        res.status(500).json({ error: 'Erro ao buscar banners' });
    }
};

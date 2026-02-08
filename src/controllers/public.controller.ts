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

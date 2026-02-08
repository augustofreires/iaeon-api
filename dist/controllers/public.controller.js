"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublicPlans = void 0;
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

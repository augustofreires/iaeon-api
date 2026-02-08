"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePerfectPayWebhook = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
/**
 * Gera senha aleatória de 8 caracteres
 */
function generateRandomPassword(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}
/**
 * Mapeia product_id ou product_name para plan_id
 */
async function getPlanByProduct(productId, productName) {
    // Tentar buscar mapeamento no Setting
    let mappingKey = '';
    let mappingValue = '';
    if (productId) {
        mappingKey = `perfectpay_product_${productId}`;
    }
    else if (productName) {
        mappingKey = `perfectpay_product_name_${productName.toLowerCase().replace(/\s+/g, '_')}`;
    }
    if (mappingKey) {
        const setting = await prisma.setting.findUnique({
            where: { key: mappingKey }
        });
        if (setting) {
            mappingValue = setting.value;
        }
    }
    // Se encontrou plan_id no Setting, retornar
    if (mappingValue) {
        return mappingValue;
    }
    // Fallback: buscar plano pelo nome similar
    if (productName) {
        const plan = await prisma.plan.findFirst({
            where: {
                name: {
                    contains: productName,
                    mode: 'insensitive'
                }
            }
        });
        if (plan) {
            return plan.id;
        }
    }
    return null;
}
/**
 * Webhook PerfectPay
 */
const handlePerfectPayWebhook = async (req, res) => {
    try {
        const payload = req.body;
        // Log do payload completo
        console.log('[PerfectPay Webhook] Received:', JSON.stringify(payload, null, 2));
        // Validar token de segurança
        const webhookToken = req.headers['x-webhook-token'] || req.query.token;
        const setting = await prisma.setting.findUnique({
            where: { key: 'perfectpay_webhook_token' }
        });
        const expectedToken = setting?.value;
        if (expectedToken && webhookToken !== expectedToken) {
            console.error('[PerfectPay Webhook] Invalid token');
            res.status(403).json({ error: 'Forbidden: Invalid webhook token' });
            return;
        }
        // Extrair dados importantes
        const { customer_email, customer_name, product_id, product_name, transaction_status, transaction_id } = payload;
        if (!customer_email) {
            res.status(400).json({ error: 'Missing customer_email' });
            return;
        }
        let userId = null;
        // APROVADO
        if (transaction_status === 'approved') {
            // 1. Verificar/Criar usuário
            let user = await prisma.user.findUnique({
                where: { email: customer_email.toLowerCase() }
            });
            if (!user) {
                // Criar novo usuário com senha aleatória
                const randomPassword = generateRandomPassword();
                const passwordHash = await bcryptjs_1.default.hash(randomPassword, 12);
                user = await prisma.user.create({
                    data: {
                        email: customer_email.toLowerCase(),
                        name: customer_name || customer_email.split('@')[0],
                        password_hash: passwordHash,
                        role: 'USER',
                        status: 'ACTIVE'
                    }
                });
                console.log(`[PerfectPay Webhook] User created: ${user.email} with password: ${randomPassword}`);
                // TODO: Enviar email com credenciais
            }
            userId = user.id;
            // 2. Identificar o plano
            const planId = await getPlanByProduct(product_id, product_name);
            if (!planId) {
                console.error(`[PerfectPay Webhook] Plan not found for product: ${product_id || product_name}`);
                // Salvar log mesmo sem plano
                await prisma.webhookLog.create({
                    data: {
                        source: 'perfectpay',
                        payload,
                        status: 'error_plan_not_found'
                    }
                });
                res.status(400).json({ error: 'Plan not found for this product' });
                return;
            }
            // 3. Buscar informações do plano
            const plan = await prisma.plan.findUnique({
                where: { id: planId }
            });
            if (!plan) {
                res.status(400).json({ error: 'Plan not found' });
                return;
            }
            // 4. Calcular data de expiração
            let expiresAt = null;
            if (plan.duration_days && plan.duration_days > 0) {
                expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + plan.duration_days);
            }
            // 5. Criar subscription
            const subscription = await prisma.subscription.create({
                data: {
                    user_id: userId,
                    plan_id: planId,
                    status: 'ACTIVE',
                    started_at: new Date(),
                    expires_at: expiresAt,
                    payment_source: 'PERFECTPAY',
                    payment_reference: transaction_id || `perfectpay-${Date.now()}`
                }
            });
            console.log(`[PerfectPay Webhook] Subscription created: ${subscription.id}`);
            // 6. Salvar log
            await prisma.webhookLog.create({
                data: {
                    source: 'perfectpay',
                    payload,
                    status: 'processed'
                }
            });
            res.status(200).json({
                success: true,
                message: 'Webhook processed successfully',
                user_id: userId,
                subscription_id: subscription.id
            });
            return;
        }
        // REEMBOLSO ou CANCELAMENTO
        if (transaction_status === 'refunded' || transaction_status === 'cancelled') {
            // Buscar usuário
            const user = await prisma.user.findUnique({
                where: { email: customer_email.toLowerCase() }
            });
            if (user) {
                userId = user.id;
                // Cancelar subscriptions ativas deste usuário relacionadas ao transaction_id
                await prisma.subscription.updateMany({
                    where: {
                        user_id: userId,
                        payment_reference: transaction_id,
                        status: 'ACTIVE'
                    },
                    data: {
                        status: 'CANCELLED'
                    }
                });
                console.log(`[PerfectPay Webhook] Subscriptions cancelled for user: ${user.email}`);
            }
            // Salvar log
            await prisma.webhookLog.create({
                data: {
                    source: 'perfectpay',
                    payload,
                    status: 'processed_cancellation'
                }
            });
            res.status(200).json({
                success: true,
                message: 'Cancellation processed successfully'
            });
            return;
        }
        // Outros status
        await prisma.webhookLog.create({
            data: {
                source: 'perfectpay',
                payload,
                status: `unhandled_status_${transaction_status}`
            }
        });
        res.status(200).json({
            success: true,
            message: 'Webhook received but not processed',
            transaction_status
        });
    }
    catch (error) {
        console.error('[PerfectPay Webhook] Error:', error);
        // Tentar salvar log do erro
        try {
            await prisma.webhookLog.create({
                data: {
                    source: 'perfectpay',
                    payload: req.body,
                    status: 'error'
                }
            });
        }
        catch (logError) {
            console.error('[PerfectPay Webhook] Error saving log:', logError);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.handlePerfectPayWebhook = handlePerfectPayWebhook;

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../services/email.service';
import { getWelcomeCredentialsEmailHtml } from '../templates/welcome-credentials-email';

const prisma = new PrismaClient();

/**
 * Gera senha aleatória de 8 caracteres
 */
function generateRandomPassword(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

/**
 * Mapeia product code/name da PerfectPay para plan_id do sistema
 *
 * @param productCode - Código do produto da PerfectPay (ex: "PPPB9L9E")
 * @param productName - Nome do produto da PerfectPay (ex: "Eon Pro")
 * @returns plan_id ou null se não encontrar mapeamento
 */
async function getPlanByProduct(productCode?: string, productName?: string): Promise<string | null> {
    // Buscar todos os settings de mapeamento (padrão: plan_{plan.id}_perfectpay_product)
    const allSettings = await prisma.setting.findMany({
        where: {
            key: {
                startsWith: 'plan_'
            }
        }
    });

    // Procurar setting que tenha o product code ou product name como value
    const searchValue = productCode || productName;

    if (searchValue) {
        const matchingSetting = allSettings.find(s =>
            s.key.endsWith('_perfectpay_product') &&
            s.value &&
            s.value.toLowerCase() === searchValue.toLowerCase()
        );

        if (matchingSetting) {
            // Extrair plan_id da key: plan_{plan.id}_perfectpay_product
            const planId = matchingSetting.key.replace('plan_', '').replace('_perfectpay_product', '');
            return planId;
        }
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
 *
 * Payload real da PerfectPay:
 * - body.token → Public token pra validação
 * - body.sale_status_enum_key → Status: "approved", "refunded", "chargeback", "cancelled"
 * - body.customer.email → Email do comprador
 * - body.customer.full_name → Nome completo
 * - body.product.code → Código do produto (ex: "PPPB9L9E")
 * - body.product.name → Nome do produto (ex: "Eon Pro")
 * - body.code → Código da transação
 * - body.sale_amount → Valor da venda
 * - body.payment_type_enum_key → Tipo de pagamento
 * - body.date_approved → Data de aprovação
 */
export const handlePerfectPayWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
        const payload = req.body;

        // Log do payload (sem token por segurança)
        const { token, ...safePayload } = payload;
        console.log('[PerfectPay Webhook] Received:', JSON.stringify({
            ...safePayload,
            customer: { email: safePayload.customer?.email }
        }, null, 2));

        // Validar token de segurança (vem no body como "token")
        const webhookToken = payload.token;

        const setting = await prisma.setting.findUnique({
            where: { key: 'perfectpay_webhook_token' }
        });

        const expectedToken = setting?.value;

        if (expectedToken && webhookToken !== expectedToken) {
            console.error('[PerfectPay Webhook] Invalid token');
            res.status(403).json({ error: 'Forbidden: Invalid webhook token' });
            return;
        }

        // Extrair dados importantes do payload real
        const saleStatus = payload.sale_status_enum_key; // "approved", "refunded", "chargeback", "cancelled"
        const customerEmail = payload.customer?.email;
        const customerName = payload.customer?.full_name;
        const productCode = payload.product?.code;
        const productName = payload.product?.name;
        const transactionCode = payload.code;
        const saleAmount = payload.sale_amount;
        const paymentType = payload.payment_type_enum_key;
        const dateApproved = payload.date_approved;

        if (!customerEmail) {
            console.error('[PerfectPay Webhook] Missing customer email');
            res.status(400).json({ error: 'Missing customer email' });
            return;
        }

        let userId: string | null = null;

        // APROVADO
        if (saleStatus === 'approved') {
            // 1. Verificar/Criar usuário
            let user = await prisma.user.findUnique({
                where: { email: customerEmail.toLowerCase() }
            });

            let userWasCreated = false;
            let randomPassword = '';

            if (!user) {
                // Criar novo usuário com senha aleatória
                randomPassword = generateRandomPassword();
                const passwordHash = await bcrypt.hash(randomPassword, 12);

                user = await prisma.user.create({
                    data: {
                        email: customerEmail.toLowerCase(),
                        name: customerName || customerEmail.split('@')[0],
                        password_hash: passwordHash,
                        role: 'USER',
                        status: 'ACTIVE'
                    }
                });

                userWasCreated = true;
                console.log(`[PerfectPay Webhook] User created: ${user.email}`);
            }

            userId = user.id;

            // 2. Identificar o plano
            const planId = await getPlanByProduct(productCode, productName);

            if (!planId) {
                console.error(`[PerfectPay Webhook] Plan not found for product: ${productCode || productName}`);

                // Salvar log mesmo sem plano
                await prisma.webhookLog.create({
                    data: {
                        source: 'perfectpay',
                        email: customerEmail || 'desconhecido',
                        event_type: saleStatus || 'unknown',
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
            let expiresAt: Date | null = null;
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
                    payment_reference: transactionCode || `perfectpay-${Date.now()}`
                }
            });

            console.log(`[PerfectPay Webhook] Subscription created: ${subscription.id}`);

            // 6. Enviar email com credenciais se o usuário foi criado
            if (userWasCreated && randomPassword) {
                try {
                    const htmlContent = getWelcomeCredentialsEmailHtml(
                        user.name,
                        user.email,
                        randomPassword,
                        plan.name
                    );

                    await sendEmail(
                        user.email,
                        'Bem-vindo à Eon Pro - Suas Credenciais de Acesso',
                        htmlContent
                    );

                    console.log(`[PerfectPay Webhook] Welcome email sent to: ${user.email}`);
                } catch (emailError) {
                    console.error(`[PerfectPay Webhook] Error sending email:`, emailError);
                    // Não falhar o webhook se o email falhar
                }
            }

            // 7. Salvar log
            await prisma.webhookLog.create({
                data: {
                    source: 'perfectpay',
                    email: customerEmail || 'desconhecido',
                    event_type: saleStatus || 'unknown',
                    payload,
                    status: 'processed',
                    processed_at: new Date()
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

        // REEMBOLSO, CHARGEBACK ou CANCELAMENTO
        if (saleStatus === 'refunded' || saleStatus === 'chargeback' || saleStatus === 'cancelled') {
            // Buscar usuário
            const user = await prisma.user.findUnique({
                where: { email: customerEmail.toLowerCase() }
            });

            if (user) {
                userId = user.id;

                // Cancelar subscriptions ativas deste usuário relacionadas ao transactionCode
                await prisma.subscription.updateMany({
                    where: {
                        user_id: userId,
                        payment_reference: transactionCode,
                        status: 'ACTIVE'
                    },
                    data: {
                        status: 'CANCELLED'
                    }
                });

                console.log(`[PerfectPay Webhook] Subscriptions cancelled for user: ${user.email} (reason: ${saleStatus})`);
            }

            // Salvar log
            await prisma.webhookLog.create({
                data: {
                    source: 'perfectpay',
                    email: customerEmail || 'desconhecido',
                    event_type: saleStatus || 'unknown',
                    payload,
                    status: 'processed_cancellation',
                    processed_at: new Date()
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
                email: customerEmail || 'desconhecido',
                event_type: saleStatus || 'unknown',
                payload,
                status: `unhandled_status_${saleStatus}`
            }
        });

        res.status(200).json({
            success: true,
            message: 'Webhook received but not processed',
            sale_status: saleStatus
        });

    } catch (error) {
        console.error('[PerfectPay Webhook] Error:', error);

        // Tentar salvar log do erro
        try {
            await prisma.webhookLog.create({
                data: {
                    source: 'perfectpay',
                    email: req.body?.customer?.email || 'desconhecido',
                    event_type: req.body?.sale_status_enum_key || 'unknown',
                    payload: req.body,
                    status: 'error'
                }
            });
        } catch (logError) {
            console.error('[PerfectPay Webhook] Error saving log:', logError);
        }

        res.status(500).json({ error: 'Internal server error' });
    }
};

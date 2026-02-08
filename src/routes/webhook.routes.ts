import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller';

const router = Router();

// Webhook PerfectPay - rota pública, sem autenticação
router.post('/perfectpay', webhookController.handlePerfectPayWebhook);

export default router;

import { Router } from 'express';
import * as publicController from '../controllers/public.controller';

const router = Router();

// Rota pública para listar planos (sem autenticação)
router.get('/plans', publicController.listPublicPlans);

export default router;

import { Router } from 'express';
import * as publicController from '../controllers/public.controller';

const router = Router();

// Rota pública para listar planos (sem autenticação)
router.get('/plans', publicController.listPublicPlans);

// Rota pública para listar links úteis (sem autenticação)
router.get('/links', publicController.getUsefulLinks);

// Rota pública para listar banners ativos (sem autenticação)
router.get('/banners', publicController.getBanners);

// Rota pública para config de afiliado Deriv (sem autenticação)
router.get('/config/deriv', publicController.getDerivConfig);

export default router;

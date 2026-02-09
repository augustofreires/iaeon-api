import { Router } from 'express';
import * as cotacoesController from '../controllers/cotacoes.controller';

const router = Router();

// Rotas públicas (sem autenticação)
router.get('/', cotacoesController.getCotacoes);
router.get('/historico/:par', cotacoesController.getHistorico);

export default router;

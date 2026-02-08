import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import * as userController from '../controllers/user.controller';

const router = Router();

// Todas as rotas de usuário requerem autenticação
router.use(verifyToken);

// Buscar bots do usuário baseado no plano
router.get('/bots', userController.getUserBots);

export default router;

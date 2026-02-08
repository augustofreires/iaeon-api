import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import * as userController from '../controllers/user.controller';

const router = Router();

// Todas as rotas de usuário requerem autenticação
router.use(verifyToken);

// Buscar bots do usuário baseado no plano
router.get('/bots', userController.getUserBots);

// Buscar subscription ativa do usuário
router.get('/subscription', userController.getUserSubscription);

// Atualizar perfil (nome e/ou senha)
router.put('/profile', userController.updateProfile);

export default router;

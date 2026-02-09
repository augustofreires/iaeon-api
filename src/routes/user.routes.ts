import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import * as userController from '../controllers/user.controller';
import * as bancaController from '../controllers/banca.controller';

const router = Router();

// Todas as rotas de usuário requerem autenticação
router.use(verifyToken);

// Buscar dados do dashboard
router.get('/dashboard', userController.getDashboard);

// Buscar bots do usuário baseado no plano
router.get('/bots', userController.getUserBots);

// Buscar subscription ativa do usuário
router.get('/subscription', userController.getUserSubscription);

// Atualizar perfil (nome e/ou senha)
router.put('/profile', userController.updateProfile);

// Gestor de Banca
router.get('/banca', bancaController.getBancaData);
router.put('/banca', bancaController.saveBancaData);

export default router;

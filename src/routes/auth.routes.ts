import { Router } from 'express';
import { verifyToken, verifyForNginx } from '../middleware/auth';
import * as authController from '../controllers/auth.controller';

const router = Router();

/**
 * POST /api/auth/login
 * Login com email e senha
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/register
 * Criar nova conta (requer query param ?ref=IAEON2026)
 */
router.post('/register', authController.register);

/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado (requer token)
 */
router.get('/me', verifyToken, authController.me);

/**
 * POST /api/auth/refresh
 * Gera novo access_token usando refresh_token do cookie
 */
router.post('/refresh', authController.refresh);

/**
 * POST /api/auth/logout
 * Limpa cookie do refresh_token
 */
router.post('/logout', authController.logout);

/**
 * GET /api/auth/verify
 * Endpoint para nginx auth_request
 * Retorna apenas 200 ou 401
 */
router.get('/verify', verifyForNginx);

export default router;

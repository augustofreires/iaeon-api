import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyToken, verifyForNginx } from '../middleware/auth';
import * as authController from '../controllers/auth.controller';

const router = Router();

// Rate limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 tentativas por IP
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 3, // 3 registros por IP
    message: { error: 'Muitas tentativas de registro. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * POST /api/auth/login
 * Login com email e senha
 */
router.post('/login', authLimiter, authController.login);

/**
 * POST /api/auth/register
 * Criar nova conta (requer query param ?ref=IAEON2026)
 */
router.post('/register', registerLimiter, authController.register);

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

/**
 * POST /api/auth/forgot-password
 * Envia email com link de redefinição de senha
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * POST /api/auth/reset-password
 * Redefine senha usando token
 */
router.post('/reset-password', authController.resetPassword);

export default router;

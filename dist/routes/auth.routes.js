"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authController = __importStar(require("../controllers/auth.controller"));
const router = (0, express_1.Router)();
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
router.get('/me', auth_1.verifyToken, authController.me);
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
router.get('/verify', auth_1.verifyForNginx);
exports.default = router;

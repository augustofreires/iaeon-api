"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyForNginx = exports.requireActivePlan = exports.requireRole = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Middleware para verificar JWT
 * Aceita token do header Authorization (Bearer token) ou do cookie (refresh_token)
 */
const verifyToken = async (req, res, next) => {
    try {
        let token;
        // Tentar pegar token do header Authorization
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        // Se não houver no header, tentar pegar do cookie
        if (!token) {
            token = req.cookies.access_token;
        }
        if (!token) {
            res.status(401).json({ error: 'Token não fornecido' });
            return;
        }
        // Verificar token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Buscar usuário no banco
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                name: true,
                language: true
            }
        });
        if (!user) {
            res.status(401).json({ error: 'Usuário não encontrado' });
            return;
        }
        if (user.status !== 'ACTIVE') {
            res.status(403).json({ error: 'Usuário bloqueado ou inativo' });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ error: 'Token expirado' });
            return;
        }
        res.status(401).json({ error: 'Token inválido' });
    }
};
exports.verifyToken = verifyToken;
/**
 * Middleware para verificar role do usuário
 * @param allowedRoles - Array com as roles permitidas (ex: ['ADMIN', 'MASTER'])
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: 'Permissão negada' });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Middleware para verificar se usuário tem plano ativo
 * Admins e Masters passam automaticamente
 */
const requireActivePlan = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        // ADMIN e MASTER sempre têm acesso
        if (req.user.role === 'ADMIN' || req.user.role === 'MASTER') {
            next();
            return;
        }
        // Verificar se tem subscription ativa
        const activeSubscription = await prisma.subscription.findFirst({
            where: {
                user_id: req.user.id,
                status: 'ACTIVE',
                OR: [
                    { expires_at: null }, // Plano perpétuo
                    { expires_at: { gte: new Date() } } // Plano não expirado
                ]
            }
        });
        if (!activeSubscription) {
            res.status(403).json({ error: 'Nenhum plano ativo encontrado' });
            return;
        }
        next();
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao verificar plano' });
    }
};
exports.requireActivePlan = requireActivePlan;
/**
 * Middleware para o nginx auth_request
 * Retorna apenas 200 (ok) ou 401 (unauthorized)
 * Verifica APENAS se o usuário está autenticado e ativo
 * NÃO verifica subscription (isso deve ser feito em rotas específicas)
 */
const verifyForNginx = async (req, res) => {
    try {
        let token;
        // Tentar pegar token do cookie (primary) ou header
        token = req.cookies.access_token;
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }
        if (!token) {
            res.status(401).send();
            return;
        }
        // Verificar token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Buscar usuário
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                status: true
            }
        });
        // Aceitar qualquer usuário autenticado com status ACTIVE
        if (user && user.status === 'ACTIVE') {
            res.status(200).send();
            return;
        }
        res.status(401).send();
    }
    catch (error) {
        res.status(401).send();
    }
};
exports.verifyForNginx = verifyForNginx;

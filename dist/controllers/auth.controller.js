"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify = exports.logout = exports.refresh = exports.me = exports.register = exports.login = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutos
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 dias
/**
 * POST /api/auth/login
 * Autentica usuário e retorna tokens
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email e senha são obrigatórios' });
            return;
        }
        // Buscar usuário
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
                id: true,
                email: true,
                password_hash: true,
                name: true,
                role: true,
                status: true,
                language: true
            }
        });
        if (!user) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }
        // Verificar status
        if (user.status !== 'ACTIVE') {
            res.status(403).json({ error: 'Conta inativa ou bloqueada' });
            return;
        }
        // Verificar senha
        const passwordMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!passwordMatch) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }
        // Atualizar last_login
        await prisma.user.update({
            where: { id: user.id },
            data: { last_login: new Date() }
        });
        // Gerar tokens
        const access_token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
        const refresh_token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
        // Setar refresh_token como httpOnly cookie
        res.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias em ms
        });
        // Setar access_token como httpOnly cookie também (para nginx auth_request)
        res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutos em ms
        });
        // Retornar dados do usuário e access_token
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                language: user.language
            },
            access_token,
            expires_in: 900 // 15 minutos em segundos
        });
    }
    catch (error) {
        console.error('[AUTH] Login error:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
};
exports.login = login;
/**
 * POST /api/auth/register
 * Cria nova conta (protegido por query param ref=IAEON2026)
 */
const register = async (req, res) => {
    try {
        const { ref } = req.query;
        // Verificar referência
        if (ref !== 'IAEON2026') {
            res.status(403).json({ error: 'Código de referência inválido' });
            return;
        }
        const { email, password, name, language } = req.body;
        // Validações básicas
        if (!email || !password || !name) {
            res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
            return;
        }
        // Verificar se email já existe
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });
        if (existingUser) {
            res.status(409).json({ error: 'Email já cadastrado' });
            return;
        }
        // Criar hash da senha
        const password_hash = await bcryptjs_1.default.hash(password, 12);
        // Criar usuário
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password_hash,
                name,
                language: language || 'pt-br',
                role: 'USER',
                status: 'ACTIVE'
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                language: true
            }
        });
        res.status(201).json({
            message: 'Conta criada com sucesso',
            user
        });
    }
    catch (error) {
        console.error('[AUTH] Register error:', error);
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
};
exports.register = register;
/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado
 */
const me = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        // Buscar dados completos do usuário (sem senha)
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                language: true,
                created_at: true,
                last_login: true,
                subscriptions: {
                    where: {
                        status: 'ACTIVE'
                    },
                    include: {
                        plan: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                duration_days: true
                            }
                        }
                    }
                }
            }
        });
        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }
        res.json({ user });
    }
    catch (error) {
        console.error('[AUTH] Me error:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
};
exports.me = me;
/**
 * POST /api/auth/refresh
 * Gera novo access_token a partir do refresh_token
 */
const refresh = async (req, res) => {
    try {
        const refresh_token = req.cookies.refresh_token;
        if (!refresh_token) {
            res.status(401).json({ error: 'Refresh token não fornecido' });
            return;
        }
        // Verificar refresh_token
        const decoded = jsonwebtoken_1.default.verify(refresh_token, JWT_REFRESH_SECRET);
        // Buscar usuário
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                role: true,
                status: true
            }
        });
        if (!user || user.status !== 'ACTIVE') {
            res.status(401).json({ error: 'Usuário inválido ou inativo' });
            return;
        }
        // Gerar novo access_token
        const access_token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
        // Atualizar cookie do access_token
        res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutos em ms
        });
        res.json({
            access_token,
            expires_in: 900 // 15 minutos em segundos
        });
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ error: 'Refresh token expirado' });
            return;
        }
        console.error('[AUTH] Refresh error:', error);
        res.status(401).json({ error: 'Refresh token inválido' });
    }
};
exports.refresh = refresh;
/**
 * POST /api/auth/logout
 * Limpa os cookies de autenticação
 */
const logout = async (req, res) => {
    res.clearCookie('refresh_token');
    res.clearCookie('access_token');
    res.json({ message: 'Logout realizado com sucesso' });
};
exports.logout = logout;
/**
 * GET /api/auth/verify
 * Endpoint para nginx auth_request
 * Retorna apenas status 200 (ok) ou 401 (unauthorized)
 */
const verify = async (req, res) => {
    // Se chegou aqui, passou pelo middleware verifyForNginx
    // Mas vamos deixar a lógica no middleware mesmo
    res.status(200).send();
};
exports.verify = verify;

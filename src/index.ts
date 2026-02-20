import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import webhookRoutes from './routes/webhook.routes';
import publicRoutes from './routes/public.routes';
import userRoutes from './routes/user.routes';
import courseRoutes from './routes/course.routes';
import cotacoesRoutes from './routes/cotacoes.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
    origin: ['https://app.iaeon.site', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Rate limiting
const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // 30 requisições por minuto
    message: { error: 'Muitas requisições ao webhook. Tente novamente em breve.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const cotacoesLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 60, // 60 requisições por minuto
    message: { error: 'Muitas requisições de cotações. Tente novamente em breve.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Webhook routes (public, no auth) - com rate limiting
app.use('/api/webhooks', webhookLimiter, webhookRoutes);

// Public routes (no auth)
app.use('/api', publicRoutes);

// User routes (requires auth)
app.use('/api/user', userRoutes);

// Course routes (public + admin)
app.use('/api', courseRoutes);

// Cotacoes routes (public) - com rate limiting
app.use('/api/cotacoes', cotacoesLimiter, cotacoesRoutes);

app.listen(PORT, () => {
    console.log(`[IAEON API] Server running on port ${PORT}`);
    console.log(`[IAEON API] Auth endpoints available at /api/auth/*`);
    console.log(`[IAEON API] Admin endpoints available at /api/admin/*`);
    console.log(`[IAEON API] Webhook endpoints available at /api/webhooks/*`);
});

export default app;

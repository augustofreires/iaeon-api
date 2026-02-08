import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';

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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
    console.log(`[IAEON API] Server running on port ${PORT}`);
    console.log(`[IAEON API] Auth endpoints available at /api/auth/*`);
});

export default app;

import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// Todas as rotas de admin exigem autenticação e role MASTER ou ADMIN
const adminOnly = [verifyToken, requireRole(['MASTER', 'ADMIN'])];

// ============= USUÁRIOS =============
router.get('/users', adminOnly, adminController.listUsers);
router.get('/users/:id', adminOnly, adminController.getUserById);
router.put('/users/:id', adminOnly, adminController.updateUser);
router.put('/users/:id/status', adminOnly, adminController.updateUserStatus);
router.delete('/users/:id', adminOnly, adminController.deleteUser);
router.post('/users/:id/subscription', adminOnly, adminController.createUserSubscription);

// ============= PLANOS =============
router.get('/plans', adminOnly, adminController.listPlans);
router.post('/plans', adminOnly, adminController.createPlan);
router.put('/plans/:id', adminOnly, adminController.updatePlan);
router.delete('/plans/:id', adminOnly, adminController.deletePlan);
router.post('/plans/:id/bots', adminOnly, adminController.addBotToPlan);
router.delete('/plans/:id/bots/:botId', adminOnly, adminController.removeBotFromPlan);

// ============= BOTS =============
router.get('/xml-files', adminOnly, adminController.getXmlFiles);
router.get('/bots', adminOnly, adminController.listBots);
router.post('/bots', adminOnly, adminController.createBot);
router.put('/bots/:id', adminOnly, adminController.updateBot);
router.delete('/bots/:id', adminOnly, adminController.deleteBot);

// ============= SUBSCRIPTIONS =============
router.get('/subscriptions', adminOnly, adminController.listSubscriptions);
router.put('/subscriptions/:id', adminOnly, adminController.updateSubscription);
router.delete('/subscriptions/:id', adminOnly, adminController.deleteSubscription);

// ============= CONFIGURAÇÕES =============
router.get('/settings', adminOnly, adminController.listSettings);
router.put('/settings', adminOnly, adminController.updateSettings);

// ============= MÉTRICAS =============
router.get('/metrics', adminOnly, adminController.getMetrics);

// ============= LINKS ÚTEIS =============
router.get('/useful-links', adminOnly, adminController.getUsefulLinksAdmin);
router.put('/useful-links', adminOnly, adminController.updateUsefulLinks);

// ============= BANNERS =============
router.get('/banners', adminOnly, adminController.getBannersAdmin);
router.put('/banners', adminOnly, adminController.updateBanners);

export default router;

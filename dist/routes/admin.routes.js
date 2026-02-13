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
const adminController = __importStar(require("../controllers/admin.controller"));
const router = (0, express_1.Router)();
// Todas as rotas de admin exigem autenticação e role MASTER ou ADMIN
const adminOnly = [auth_1.verifyToken, (0, auth_1.requireRole)(['MASTER', 'ADMIN'])];
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
router.put('/plans/:id/set-default', adminOnly, adminController.setDefaultPlan);
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
exports.default = router;

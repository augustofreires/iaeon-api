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
const courseController = __importStar(require("../controllers/course.controller"));
const router = (0, express_1.Router)();
// ========== ROTAS PÚBLICAS ==========
// Listar cursos (público - não requer auth)
router.get('/courses', courseController.listCourses);
// ========== ROTAS ADMIN ==========
// Módulos
router.get('/admin/courses/modules', auth_1.verifyToken, auth_1.requireAdmin, courseController.listModules);
router.post('/admin/courses/modules', auth_1.verifyToken, auth_1.requireAdmin, courseController.createModule);
router.put('/admin/courses/modules/:id', auth_1.verifyToken, auth_1.requireAdmin, courseController.updateModule);
router.delete('/admin/courses/modules/:id', auth_1.verifyToken, auth_1.requireAdmin, courseController.deleteModule);
// Lições
router.post('/admin/courses/lessons', auth_1.verifyToken, auth_1.requireAdmin, courseController.createLesson);
router.put('/admin/courses/lessons/:id', auth_1.verifyToken, auth_1.requireAdmin, courseController.updateLesson);
router.delete('/admin/courses/lessons/:id', auth_1.verifyToken, auth_1.requireAdmin, courseController.deleteLesson);
exports.default = router;

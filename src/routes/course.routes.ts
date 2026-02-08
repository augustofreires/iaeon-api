import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth';
import * as courseController from '../controllers/course.controller';

const router = Router();

// ========== ROTAS PÚBLICAS ==========

// Listar cursos (público - não requer auth)
router.get('/courses', courseController.listCourses);

// ========== ROTAS ADMIN ==========

// Módulos
router.get('/admin/courses/modules', verifyToken, requireAdmin, courseController.listModules);
router.post('/admin/courses/modules', verifyToken, requireAdmin, courseController.createModule);
router.put('/admin/courses/modules/:id', verifyToken, requireAdmin, courseController.updateModule);
router.delete('/admin/courses/modules/:id', verifyToken, requireAdmin, courseController.deleteModule);

// Lições
router.post('/admin/courses/lessons', verifyToken, requireAdmin, courseController.createLesson);
router.put('/admin/courses/lessons/:id', verifyToken, requireAdmin, courseController.updateLesson);
router.delete('/admin/courses/lessons/:id', verifyToken, requireAdmin, courseController.deleteLesson);

export default router;

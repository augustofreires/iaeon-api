"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLesson = exports.updateLesson = exports.createLesson = exports.deleteModule = exports.updateModule = exports.createModule = exports.listModules = exports.listCourses = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ============= PÚBLICO - LISTAR CURSOS =============
const listCourses = async (req, res) => {
    try {
        const modules = await prisma.courseModule.findMany({
            where: { status: 'ACTIVE' },
            include: {
                lessons: {
                    where: { status: 'ACTIVE' },
                    orderBy: { order: 'asc' }
                }
            },
            orderBy: { order: 'asc' }
        });
        res.json(modules);
    }
    catch (error) {
        console.error('Error listing courses:', error);
        res.status(500).json({ error: 'Erro ao listar cursos' });
    }
};
exports.listCourses = listCourses;
// ============= ADMIN - MÓDULOS =============
const listModules = async (req, res) => {
    try {
        const modules = await prisma.courseModule.findMany({
            include: {
                lessons: {
                    orderBy: { order: 'asc' }
                }
            },
            orderBy: { order: 'asc' }
        });
        res.json(modules);
    }
    catch (error) {
        console.error('Error listing modules:', error);
        res.status(500).json({ error: 'Erro ao listar módulos' });
    }
};
exports.listModules = listModules;
const createModule = async (req, res) => {
    try {
        const { title, description, order } = req.body;
        if (!title) {
            res.status(400).json({ error: 'Título é obrigatório' });
            return;
        }
        const module = await prisma.courseModule.create({
            data: {
                title,
                description,
                order: order ? parseInt(order) : 0,
                status: 'ACTIVE'
            }
        });
        res.json(module);
    }
    catch (error) {
        console.error('Error creating module:', error);
        res.status(500).json({ error: 'Erro ao criar módulo' });
    }
};
exports.createModule = createModule;
const updateModule = async (req, res) => {
    try {
        const id = req.params.id;
        const { title, description, order, status } = req.body;
        const module = await prisma.courseModule.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(order !== undefined && { order: parseInt(order) }),
                ...(status && { status })
            }
        });
        res.json(module);
    }
    catch (error) {
        console.error('Error updating module:', error);
        res.status(500).json({ error: 'Erro ao atualizar módulo' });
    }
};
exports.updateModule = updateModule;
const deleteModule = async (req, res) => {
    try {
        const id = req.params.id;
        // Deletar lições do módulo
        await prisma.courseLesson.deleteMany({
            where: { module_id: id }
        });
        // Deletar módulo
        await prisma.courseModule.delete({
            where: { id }
        });
        res.json({ message: 'Módulo deletado com sucesso' });
    }
    catch (error) {
        console.error('Error deleting module:', error);
        res.status(500).json({ error: 'Erro ao deletar módulo' });
    }
};
exports.deleteModule = deleteModule;
// ============= ADMIN - LIÇÕES =============
const createLesson = async (req, res) => {
    try {
        const { module_id, title, youtube_url, order } = req.body;
        if (!module_id || !title || !youtube_url) {
            res.status(400).json({ error: 'Module ID, título e YouTube URL são obrigatórios' });
            return;
        }
        const lesson = await prisma.courseLesson.create({
            data: {
                module_id,
                title,
                youtube_url,
                order: order ? parseInt(order) : 0,
                status: 'ACTIVE'
            }
        });
        res.json(lesson);
    }
    catch (error) {
        console.error('Error creating lesson:', error);
        res.status(500).json({ error: 'Erro ao criar aula' });
    }
};
exports.createLesson = createLesson;
const updateLesson = async (req, res) => {
    try {
        const id = req.params.id;
        const { title, youtube_url, order, status } = req.body;
        const lesson = await prisma.courseLesson.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(youtube_url && { youtube_url }),
                ...(order !== undefined && { order: parseInt(order) }),
                ...(status && { status })
            }
        });
        res.json(lesson);
    }
    catch (error) {
        console.error('Error updating lesson:', error);
        res.status(500).json({ error: 'Erro ao atualizar aula' });
    }
};
exports.updateLesson = updateLesson;
const deleteLesson = async (req, res) => {
    try {
        const id = req.params.id;
        await prisma.courseLesson.delete({
            where: { id }
        });
        res.json({ message: 'Aula deletada com sucesso' });
    }
    catch (error) {
        console.error('Error deleting lesson:', error);
        res.status(500).json({ error: 'Erro ao deletar aula' });
    }
};
exports.deleteLesson = deleteLesson;

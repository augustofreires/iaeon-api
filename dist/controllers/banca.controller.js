"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveBancaData = exports.getBancaData = void 0;
const client_1 = require("@prisma/client");
const json_1 = require("../utils/json");
const prisma = new client_1.PrismaClient();
const getBancaData = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Usuário não autenticado' });
            return;
        }
        const key = `banca_data_${userId}`;
        const setting = await prisma.setting.findUnique({
            where: { key },
        });
        const defaultData = {
            meta_diaria: 5,
            max_perda: 9,
            dias: Array(30).fill(null).map((_, i) => ({ dia: i + 1 })),
        };
        if (!setting || !setting.value) {
            res.json(defaultData);
            return;
        }
        const data = (0, json_1.safeJsonParse)(setting.value, defaultData);
        res.json(data);
    }
    catch (error) {
        console.error('Error getting banca data:', error);
        res.status(500).json({ error: 'Erro ao buscar dados da banca' });
    }
};
exports.getBancaData = getBancaData;
const saveBancaData = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Usuário não autenticado' });
            return;
        }
        const { meta_diaria, max_perda, dias } = req.body;
        // Validar dados
        if (typeof meta_diaria !== 'number' || typeof max_perda !== 'number' || !Array.isArray(dias)) {
            res.status(400).json({ error: 'Dados inválidos' });
            return;
        }
        const key = `banca_data_${userId}`;
        const value = JSON.stringify({ meta_diaria, max_perda, dias });
        // Upsert (criar ou atualizar)
        await prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
        res.json({ success: true, message: 'Dados salvos com sucesso' });
    }
    catch (error) {
        console.error('Error saving banca data:', error);
        res.status(500).json({ error: 'Erro ao salvar dados da banca' });
    }
};
exports.saveBancaData = saveBancaData;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeJsonParse = safeJsonParse;
/**
 * Parse JSON com tratamento de erro seguro
 * @param value - String JSON para fazer parse
 * @param defaultValue - Valor padrão a retornar em caso de erro
 * @returns Objeto parseado ou defaultValue em caso de erro
 */
function safeJsonParse(value, defaultValue) {
    if (!value) {
        return defaultValue;
    }
    try {
        return JSON.parse(value);
    }
    catch (error) {
        console.error('[JSON Parse Error] Invalid JSON:', error);
        return defaultValue;
    }
}

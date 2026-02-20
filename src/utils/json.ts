/**
 * Parse JSON com tratamento de erro seguro
 * @param value - String JSON para fazer parse
 * @param defaultValue - Valor padrão a retornar em caso de erro
 * @returns Objeto parseado ou defaultValue em caso de erro
 */
export function safeJsonParse<T = any>(value: string | null | undefined, defaultValue: T): T {
    if (!value) {
        return defaultValue;
    }

    try {
        return JSON.parse(value) as T;
    } catch (error) {
        console.error('[JSON Parse Error] Invalid JSON:', error);
        return defaultValue;
    }
}

import { Request, Response } from 'express';

// Cache global para evitar muitas requisições à API
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
let cotacoesCache: any = null;
let cotacoesCacheTime: number = 0;
const historicosCache: { [key: string]: { data: any; time: number } } = {};

interface AwesomeAPIResponse {
    [key: string]: {
        code: string;
        codein: string;
        name: string;
        high: string;
        low: string;
        varBid: string;
        pctChange: string;
        bid: string;
        ask: string;
        timestamp: string;
        create_date: string;
    };
}

interface HistoricPoint {
    high: string;
    low: string;
    varBid: string;
    pctChange: string;
    bid: string;
    ask: string;
    timestamp: string;
}

const CURRENCY_NAMES: { [key: string]: string } = {
    USD: 'Dólar Americano',
    EUR: 'Euro',
    GBP: 'Libra Esterlina',
    AUD: 'Dólar Australiano',
    CAD: 'Dólar Canadense',
    ARS: 'Peso Argentino',
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    LTC: 'Litecoin',
};

const PAIRS = ['USD-BRL', 'EUR-BRL', 'GBP-BRL', 'AUD-BRL', 'CAD-BRL', 'ARS-BRL', 'BTC-BRL', 'ETH-BRL', 'LTC-BRL'];

// Função auxiliar para buscar de API alternativa (fallback)
async function fetchFromAlternativeAPI(): Promise<any[]> {
    console.log('[Cotacoes] Tentando API alternativa (exchangerate-api)');

    // Buscar USD, EUR, GBP, AUD, CAD de uma API alternativa
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/BRL');
    if (!response.ok) throw new Error('API alternativa falhou');

    const data: any = await response.json();
    const rates = data.rates;

    // Converter taxas (BRL -> moeda) para (moeda -> BRL)
    const cotacoes = [];

    const currencies = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];
    for (const code of currencies) {
        if (rates[code]) {
            const value = 1 / rates[code]; // Inverter taxa
            cotacoes.push({
                code,
                name: CURRENCY_NAMES[code] || code,
                value: value,
                variation: 0, // API alternativa não fornece variação
                high: value * 1.01,
                low: value * 0.99,
                color: 'green',
            });
        }
    }

    return cotacoes;
}

export const getCotacoes = async (req: Request, res: Response): Promise<void> => {
    try {
        // Verificar cache
        const now = Date.now();
        if (cotacoesCache && (now - cotacoesCacheTime) < CACHE_DURATION) {
            console.log('[Cotacoes] Retornando cache');
            res.json(cotacoesCache);
            return;
        }

        console.log('[Cotacoes] Buscando nova cotação da API principal (AwesomeAPI)');
        const pairsString = PAIRS.join(',');
        const response = await fetch(`https://economia.awesomeapi.com.br/json/last/${pairsString}`);

        if (!response.ok) {
            console.log(`[Cotacoes] API principal falhou com status ${response.status}`);

            // Tentar API alternativa
            try {
                const alternativeData = await fetchFromAlternativeAPI();
                cotacoesCache = alternativeData;
                cotacoesCacheTime = now;
                res.json(alternativeData);
                return;
            } catch (altError) {
                console.error('[Cotacoes] API alternativa também falhou:', altError);

                // Se houver cache antigo, retornar mesmo expirado
                if (cotacoesCache) {
                    console.log('[Cotacoes] Retornando cache antigo');
                    res.json(cotacoesCache);
                    return;
                }

                res.status(500).json({ error: 'Erro ao buscar cotações' });
                return;
            }
        }

        const data = await response.json() as AwesomeAPIResponse;

        const cotacoes = PAIRS.map((pair) => {
            const key = pair.replace('-', '');
            const currency = data[key];

            if (!currency) {
                return null;
            }

            const code = currency.code;
            const value = parseFloat(currency.bid);
            const variation = parseFloat(currency.pctChange);
            const high = parseFloat(currency.high);
            const low = parseFloat(currency.low);
            const color = variation >= 0 ? 'green' : 'red';

            return {
                code,
                name: CURRENCY_NAMES[code] || code,
                value: value,
                variation: variation,
                high: high,
                low: low,
                color: color,
            };
        }).filter(Boolean);

        // Atualizar cache
        cotacoesCache = cotacoes;
        cotacoesCacheTime = now;

        res.json(cotacoes);
    } catch (error) {
        console.error('Error fetching cotacoes:', error);

        // Tentar API alternativa em caso de erro
        try {
            const alternativeData = await fetchFromAlternativeAPI();
            cotacoesCache = alternativeData;
            cotacoesCacheTime = Date.now();
            res.json(alternativeData);
            return;
        } catch (altError) {
            console.error('[Cotacoes] API alternativa também falhou:', altError);
        }

        // Se houver cache antigo, retornar mesmo expirado
        if (cotacoesCache) {
            console.log('[Cotacoes] Erro, retornando cache antigo');
            res.json(cotacoesCache);
            return;
        }
        res.status(500).json({ error: 'Erro ao buscar cotações' });
    }
};

export const getHistorico = async (req: Request, res: Response): Promise<void> => {
    const par = req.params.par as string;

    try {
        // Validar par
        if (!par || !PAIRS.includes(par)) {
            res.status(400).json({ error: 'Par de moedas inválido' });
            return;
        }

        // Verificar cache
        const now = Date.now();
        const cached = historicosCache[par];
        if (cached && (now - cached.time) < CACHE_DURATION) {
            console.log(`[Historico] Retornando cache para ${par}`);
            res.json(cached.data);
            return;
        }

        console.log(`[Historico] Buscando novo histórico para ${par}`);
        const response = await fetch(`https://economia.awesomeapi.com.br/json/daily/${par}/8`);

        if (!response.ok) {
            console.log(`[Historico] API falhou para ${par} com status ${response.status}`);

            // Se houver cache antigo, retornar mesmo expirado
            if (cached) {
                console.log(`[Historico] Retornando cache antigo para ${par}`);
                res.json(cached.data);
                return;
            }

            // Retornar array vazio se não houver cache
            console.log(`[Historico] Retornando array vazio para ${par}`);
            res.json([]);
            return;
        }

        const data = await response.json() as HistoricPoint[];

        // Formatar dados para o gráfico (inverter ordem - mais antigo primeiro)
        const historico = data
            .reverse()
            .slice(0, 7) // Pegar apenas 7 dias
            .map((point) => {
                const timestamp = parseInt(point.timestamp) * 1000;
                const date = new Date(timestamp);
                const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

                return {
                    date: formattedDate,
                    value: parseFloat(point.bid),
                };
            });

        // Atualizar cache
        historicosCache[par] = { data: historico, time: now };

        res.json(historico);
    } catch (error) {
        console.error('Error fetching historico:', error);

        // Se houver cache antigo, retornar mesmo expirado
        const cached = historicosCache[par];
        if (cached) {
            console.log(`[Historico] Erro, retornando cache antigo para ${par}`);
            res.json(cached.data);
            return;
        }

        // Retornar array vazio se não houver dados
        console.log(`[Historico] Erro, retornando array vazio para ${par}`);
        res.json([]);
    }
};

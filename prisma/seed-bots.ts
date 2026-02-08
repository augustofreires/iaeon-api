import { PrismaClient, BotCategory, Status } from '@prisma/client';

const prisma = new PrismaClient();

// Lista de todos os XMLs disponíveis no projeto frontend
const XML_FILES = [
    '1 tick DIgit Over 2.xml',
    'Defender_Digits Auto Bot.xml',
    'Digit Over 3.xml',
    'Entry_Touch_BBot.xml',
    'Exponential Strategy Bot 2.0.xml',
    'Free Digit Socail Bot.xml',
    'HARAMI Binary-Bot.xml',
    'HL BearKing premium Bot.xml',
    'HL HAMMER B-BOT 1.0.xml',
    'Higher-Lower Trend-Challenger BinaryBot .xml',
    'House of Rise_Fall Auto_Bots.xml',
    'Insync_Equals BinaryBot.xml',
    'LastDigit1-Strategy-Bot.xml',
    'Leo_Even_Odd.xml',
    'Mavic-Air-RF Vix Bot.xml',
    'One Touch Tetris B-Bot.xml',
    'RF-Compressor Signal Bot V1.0.1.xml',
    'RF-MARBLE B-BOT.xml',
    'RF_Market-Monitor.xml',
    'SENSEI-RF-BINARYBOT.xml',
    'SHASH DIGITS V- 4-20.xml',
    'Shark_Digits.xml',
    'Sonic Digits BinaryBot.xml',
    'Stoch and RSI Bot.xml',
    'Super Digit Differ Bot.xml',
    'Tick-Pip Rf.xml',
    'Unicorn Only Up-Down BinaryBot.xml',
    'Up-Down Volt Binary Bot.xml',
    'binary-bot Premium Rise_Fall .xml',
    'bot.xml',
];

/**
 * Converte o nome do arquivo XML em um nome legível
 * Ex: "martingale_v1.xml" → "Martingale V1"
 */
function xmlFilenameToName(filename: string): string {
    // Remove a extensão .xml
    let name = filename.replace(/\.xml$/i, '');

    // Remove underscores e hífens, substitui por espaços
    name = name.replace(/[_-]/g, ' ');

    // Capitaliza cada palavra
    name = name
        .split(' ')
        .map(word => {
            if (word.length === 0) return '';
            // Preserva palavras já em maiúsculas (como RF, SENSEI)
            if (word === word.toUpperCase() && word.length > 1) {
                return word;
            }
            // Capitaliza primeira letra
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');

    // Remove espaços extras
    name = name.replace(/\s+/g, ' ').trim();

    return name;
}

/**
 * Determina a categoria do bot baseado no nome
 */
function determineBotCategory(filename: string): BotCategory {
    const lowerName = filename.toLowerCase();

    if (lowerName.includes('free') || lowerName.includes('gratis')) {
        return BotCategory.FREE;
    }

    if (lowerName.includes('premium') || lowerName.includes('pro')) {
        return BotCategory.PAID;
    }

    // Por padrão, todos são PAID
    return BotCategory.PAID;
}

async function seedBots() {
    console.log('🤖 Iniciando seed dos bots...\n');

    let created = 0;
    let skipped = 0;

    for (const xmlFile of XML_FILES) {
        const name = xmlFilenameToName(xmlFile);
        const category = determineBotCategory(xmlFile);

        // Verifica se o bot já existe
        const existingBot = await prisma.bot.findFirst({
            where: { xml_filename: xmlFile }
        });

        if (existingBot) {
            console.log(`⏭️  Bot já existe: ${name} (${xmlFile})`);
            skipped++;
            continue;
        }

        // Cria o bot
        await prisma.bot.create({
            data: {
                name,
                xml_filename: xmlFile,
                category,
                status: Status.ACTIVE,
                description: `Bot de trading baseado em ${name}`,
            }
        });

        console.log(`✅ Criado: ${name} [${category}] (${xmlFile})`);
        created++;
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   ✅ Criados: ${created}`);
    console.log(`   ⏭️  Ignorados (já existiam): ${skipped}`);
    console.log(`   📦 Total: ${XML_FILES.length}`);
}

seedBots()
    .catch((e) => {
        console.error('❌ Erro ao fazer seed dos bots:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

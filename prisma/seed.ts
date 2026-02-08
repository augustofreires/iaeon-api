import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Admin master
    const passwordHash = await bcrypt.hash('Iaeon@2026!', 12);

    await prisma.user.upsert({
        where: { email: 'admin@iaeon.site' },
        update: {},
        create: {
            email: 'admin@iaeon.site',
            password_hash: passwordHash,
            name: 'Augusto Admin',
            role: 'MASTER',
            status: 'ACTIVE',
            language: 'pt-br'
        }
    });

    // Configurações iniciais
    const settings = [
        { key: 'platform_name', value: 'IAEON' },
        { key: 'checkout_url', value: 'https://pay.perfectpay.com.br/SEUCHECKOUT' },
        { key: 'logo_url', value: '' },
        { key: 'primary_color', value: '#00d4aa' },
        { key: 'telegram_url', value: '' },
        { key: 'whatsapp_url', value: '' },
        { key: 'support_url', value: '' },
    ];

    for (const setting of settings) {
        await prisma.setting.upsert({
            where: { key: setting.key },
            update: { value: setting.value },
            create: setting
        });
    }

    console.log('Seed completed!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

/**
 * bootstrap-db.js
 * Cria todas as tabelas via Sequelize sync() e popula com seed de desenvolvimento.
 * Alternativa ao db:migrate quando as migrations têm índices duplicados.
 * Uso: node scripts/bootstrap-db.js
 */
'use strict';

const path = require('path');
// Carrega variáveis de ambiente
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
    console.log('\n🔄 Conectando ao banco...');
    const { sequelize } = require('../src/models');

    try {
        await sequelize.authenticate();
        console.log('✅ Conexão OK\n');
    } catch (err) {
        console.error('❌ Falha na conexão:', err.message);
        process.exit(1);
    }

    // ── 1. Sync models (cria tabelas sem apagar dados existentes) ──
    console.log('🔄 Criando tabelas (sync)...');
    try {
        await sequelize.sync({ alter: false, force: false });
        console.log('✅ Tabelas sincronizadas\n');
    } catch (err) {
        console.warn('⚠️  sync() parcial (alguns índices já existem):', err.message.slice(0, 100));
    }

    // ── 2. Seed: Planos ──
    console.log('🌱 Seeding planos...');
    try {
        const { v4: uuidv4 } = require('uuid');
        const { SubscriptionPlan } = require('../src/models');

        const plans = [
            {
                id: uuidv4(), name: 'Essencial', slug: 'starter',
                description: 'Para o profissional autônomo.',
                price: 49.90, currency: 'BRL', billing_interval: 'monthly',
                trial_days: 14, is_active: true, is_public: true, sort_order: 1,
                limits: { users: 2, professionals: 1, clients: 50, appointments_per_month: 100 },
                features: ['Agendamento online', 'Gestão de clientes', 'Confirmações automáticas'],
                metadata: {},
            },
            {
                id: uuidv4(), name: 'Profissional', slug: 'professional',
                description: 'Para salões em crescimento.',
                price: 99.90, currency: 'BRL', billing_interval: 'monthly',
                trial_days: 14, is_active: true, is_public: true, sort_order: 2,
                limits: { users: 5, professionals: 3, clients: 200, appointments_per_month: 500 },
                features: ['Tudo do Essencial +', 'Controle financeiro', 'Gestão de equipe'],
                metadata: { popular: true },
            },
            {
                id: uuidv4(), name: 'Premium', slug: 'business',
                description: 'Solução completa para salões.',
                price: 199.90, currency: 'BRL', billing_interval: 'monthly',
                trial_days: 14, is_active: true, is_public: true, sort_order: 3,
                limits: { users: 15, professionals: 10, clients: 1000, appointments_per_month: 2000 },
                features: ['Tudo do Profissional +', 'Secretária IA 24h', 'Marketing automatizado'],
                metadata: {},
            },
        ];

        for (const plan of plans) {
            await SubscriptionPlan.findOrCreate({ where: { slug: plan.slug }, defaults: plan });
        }
        console.log('✅ Planos criados\n');
    } catch (err) {
        console.warn('⚠️  Planos:', err.message.slice(0, 120));
    }

    // ── 3. Seed: Tenant + Usuários ──
    console.log('🌱 Seeding tenant + usuários...');
    try {
        const bcrypt = require('bcryptjs');
        const { v4: uuidv4 } = require('uuid');
        const { User, Tenant, Subscription, SubscriptionPlan, Professional, Service, Client } = require('../src/models');

        const passwordHash = await bcrypt.hash('123456', 10);
        const now = new Date();

        // Master
        const [masterUser] = await User.findOrCreate({
            where: { email: 'master@belezaecosystem.com' },
            defaults: {
                id: uuidv4(), first_name: 'Master', last_name: 'Admin',
                email: 'master@belezaecosystem.com', password: passwordHash,
                phone: '11999999999', role: 'master', is_active: true,
                settings: { notifications: { email: true, push: true, sms: false }, language: 'pt-BR', timezone: 'America/Sao_Paulo' },
                metadata: {},
            },
        });
        console.log('  ✓ Master:', masterUser.email);

        // Tenant
        const [tenant] = await Tenant.findOrCreate({
            where: { slug: 'beleza-pura' },
            defaults: {
                id: uuidv4(), name: 'Salão Beleza Pura', slug: 'beleza-pura',
                email: 'contato@belezapura.com', phone: '11987654321',
                document_type: 'cnpj', document: '12345678000190',
                type: 'establishment', status: 'active',
                address: { street: 'Rua das Flores', number: '123', neighborhood: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01234567', country: 'BR' },
                settings: { timezone: 'America/Sao_Paulo', currency: 'BRL', language: 'pt-BR', notificationsEnabled: true, allowOnlineBooking: true },
                branding: { primaryColor: '#603322', secondaryColor: '#F8E6C2' },
                activated_at: now,
            },
        });
        console.log('  ✓ Tenant:', tenant.slug);

        // Owner
        const [owner] = await User.findOrCreate({
            where: { email: 'owner@belezapura.com' },
            defaults: {
                id: uuidv4(), tenant_id: tenant.id,
                first_name: 'Maria', last_name: 'Silva',
                email: 'owner@belezapura.com', password: passwordHash,
                phone: '11987654321', role: 'owner', is_active: true,
                settings: { notifications: { email: true, push: true, sms: true }, language: 'pt-BR', timezone: 'America/Sao_Paulo' },
                metadata: {},
            },
        });
        await tenant.update({ owner_id: owner.id });
        console.log('  ✓ Owner:', owner.email);

        // Admin
        const [admin] = await User.findOrCreate({
            where: { email: 'admin@belezapura.com' },
            defaults: {
                id: uuidv4(), tenant_id: tenant.id,
                first_name: 'João', last_name: 'Admin',
                email: 'admin@belezapura.com', password: passwordHash,
                phone: '11912345678', role: 'admin', is_active: true,
                settings: {}, metadata: {},
            },
        });
        console.log('  ✓ Admin:', admin.email);

        // Professional 1
        const [prof1User] = await User.findOrCreate({
            where: { email: 'prof@belezapura.com' },
            defaults: {
                id: uuidv4(), tenant_id: tenant.id,
                first_name: 'Ana', last_name: 'Profissional',
                email: 'prof@belezapura.com', password: passwordHash,
                phone: '11998765432', role: 'professional', is_active: true,
                settings: {}, metadata: { specialty: 'Extensão de Cílios' },
            },
        });
        console.log('  ✓ Professional:', prof1User.email);

        // Professional 2
        const [prof2User] = await User.findOrCreate({
            where: { email: 'carlos@belezapura.com' },
            defaults: {
                id: uuidv4(), tenant_id: tenant.id,
                first_name: 'Carlos', last_name: 'Santos',
                email: 'carlos@belezapura.com', password: passwordHash,
                phone: '11933334444', role: 'professional', is_active: true,
                settings: {}, metadata: { specialty: 'Cabeleireiro' },
            },
        });
        console.log('  ✓ Professional 2:', prof2User.email);

        // Professionals table
        const [p1] = await Professional.findOrCreate({
            where: { user_id: prof1User.id },
            defaults: { id: uuidv4(), user_id: prof1User.id, tenant_id: tenant.id, specialty: 'Extensão de Cílios', commission_rate: 40.00 },
        });
        const [p2] = await Professional.findOrCreate({
            where: { user_id: prof2User.id },
            defaults: { id: uuidv4(), user_id: prof2User.id, tenant_id: tenant.id, specialty: 'Cabeleireiro', commission_rate: 35.00 },
        });

        // Services
        const serviceData = [
            { name: 'Extensão de Cílios', price: 150.00, duration_minutes: 90, category: 'skin' },
            { name: 'Corte Feminino',     price: 80.00,  duration_minutes: 60, category: 'hair' },
            { name: 'Manicure',           price: 45.00,  duration_minutes: 45, category: 'nails' },
            { name: 'Coloração',          price: 200.00, duration_minutes: 120, category: 'hair' },
            { name: 'Manutenção de Cílios', price: 90.00, duration_minutes: 60, category: 'skin' },
        ];
        for (const s of serviceData) {
            await Service.findOrCreate({
                where: { tenant_id: tenant.id, name: s.name },
                defaults: { id: uuidv4(), tenant_id: tenant.id, is_active: true, ...s },
            });
        }
        console.log('  ✓ 5 serviços criados');

        // Clients
        const clientData = [
            { first_name: 'Thaisa',    last_name: 'Oliveira', email: 'thaisa@email.com',   phone: '11988881111' },
            { first_name: 'Rafaela',   last_name: 'Costa',    email: 'rafaela@email.com',  phone: '11988882222' },
            { first_name: 'Taís',      last_name: 'Mendes',   email: 'tais@email.com',     phone: '11988883333' },
            { first_name: 'Juliana',   last_name: 'Ferreira', email: 'juliana@email.com',  phone: '11988884444' },
            { first_name: 'Camila',    last_name: 'Souza',    email: 'camila@email.com',   phone: '11988885555' },
            { first_name: 'Beatriz',   last_name: 'Lima',     email: 'beatriz@email.com',  phone: '11988886666' },
            { first_name: 'Larissa',   last_name: 'Almeida',  email: 'larissa@email.com',  phone: '11988887777' },
            { first_name: 'Fernanda',  last_name: 'Rocha',    email: 'fernanda@email.com', phone: '11988888888' },
            { first_name: 'Patrícia',  last_name: 'Dias',     email: 'patricia@email.com', phone: '11988889999' },
            { first_name: 'Amanda',    last_name: 'Ribeiro',  email: 'amanda@email.com',   phone: '11988880000' },
        ];
        for (const c of clientData) {
            await Client.findOrCreate({
                where: { tenant_id: tenant.id, email: c.email },
                defaults: { id: uuidv4(), tenant_id: tenant.id, ...c },
            });
        }
        console.log('  ✓ 10 clientes criados');

        // Subscription
        const plan = await SubscriptionPlan.findOne({ where: { slug: 'professional' } });
        if (plan) {
            const trialEnds = new Date(now);
            trialEnds.setDate(trialEnds.getDate() + 14);
            await Subscription.findOrCreate({
                where: { tenant_id: tenant.id },
                defaults: {
                    id: uuidv4(), tenant_id: tenant.id, plan_id: plan.id,
                    status: 'trial', started_at: now, trial_ends_at: trialEnds, quantity: 1,
                    plan_snapshot: { name: plan.name, price: plan.price, limits: plan.limits },
                    metadata: {},
                },
            });
            console.log('  ✓ Subscription (trial) criada');
        }

        console.log('\n✅ Seed concluído!\n');
    } catch (err) {
        console.error('❌ Erro no seed:', err.message);
        console.error(err.stack?.slice(0, 500));
    }

    console.log('─────────────────────────────────────');
    console.log('Credenciais de teste:');
    console.log('  MASTER:  master@belezaecosystem.com / 123456');
    console.log('  OWNER:   owner@belezapura.com / 123456');
    console.log('  ADMIN:   admin@belezapura.com / 123456');
    console.log('  PROF:    prof@belezapura.com / 123456');
    console.log('  PROF2:   carlos@belezapura.com / 123456');
    console.log('  Tenant slug: beleza-pura');
    console.log('─────────────────────────────────────\n');

    await sequelize.close();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

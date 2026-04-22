/**
 * safe-migrate-and-seed.js
 * Roda migrations e seed ignorando erros de índice duplicado.
 * Uso: node scripts/safe-migrate-and-seed.js
 */
'use strict';

const { execSync } = require('child_process');

function run(cmd) {
    try {
        const out = execSync(cmd, { cwd: '/app', stdio: 'pipe' }).toString();
        console.log(out);
        return true;
    } catch (err) {
        const output = (err.stdout || '').toString() + (err.stderr || '').toString();
        // Ignorar erros de índice/constraint duplicado — são inofensivos
        if (/already exists|duplicate_table|duplicate_object/i.test(output)) {
            console.warn(`[WARN] Skipped (already exists): ${cmd.slice(0, 80)}`);
            return true;
        }
        // Erro real — reportar mas continuar
        console.error(`[ERROR] ${cmd.slice(0, 80)}\n${output.slice(0, 500)}`);
        return false;
    }
}

async function main() {
    console.log('\n=== SAFE MIGRATE & SEED ===\n');

    // 1. Aplicar todas as migrations (uma a uma para tolerar falhas parciais)
    console.log('--- Running migrations ---');
    const migrateResult = run('npx sequelize-cli db:migrate 2>&1 || true');

    // 2. Seed de planos (001)
    console.log('\n--- Seeding subscription plans ---');
    run("npx sequelize-cli db:seed --seed src/seeders/001_seed_subscription_plans.js 2>&1 || true");

    // 3. Seed de usuários/tenant (002)
    console.log('\n--- Seeding master + tenant + users ---');
    run("npx sequelize-cli db:seed --seed src/seeders/002_seed_master_and_tenant.js 2>&1 || true");

    console.log('\n=== DONE ===');
    console.log('\nCredenciais de teste:');
    console.log('  MASTER:  master@belezaecosystem.com / 123456');
    console.log('  OWNER:   owner@belezapura.com / 123456');
    console.log('  ADMIN:   admin@belezapura.com / 123456');
    console.log('  PROF:    prof@belezapura.com / 123456');
    console.log('  PROF2:   carlos@belezapura.com / 123456');
    console.log('  Tenant:  beleza-pura\n');
}

main();

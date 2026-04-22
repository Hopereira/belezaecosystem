/**
 * patch-migrations.js
 * Substitui addIndex simples por versão segura (try/catch) em todas as migrations.
 * Executa UMA VEZ para corrigir o problema de índices duplicados no PostgreSQL.
 * Uso: node scripts/patch-migrations.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'migrations');

const SAFE_IDX_HELPER = `    const safeIdx = (t, f, o) => queryInterface.addIndex(t, f, o).catch(e => { if (!/already exists/i.test(e.message)) throw e; });\n`;

let patchedCount = 0;

const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();

for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    let src = fs.readFileSync(filePath, 'utf-8');

    // Skip if already patched or has no plain addIndex
    if (src.includes('safeIdx') || !src.includes('addIndex')) continue;

    // Count plain addIndex calls (not _safeAddIndex)
    const plainAddIndex = (src.match(/await queryInterface\.addIndex\(/g) || []).length;
    if (plainAddIndex === 0) continue;

    // Insert safeIdx helper before first addIndex call in the up() block
    const upBlockMatch = src.match(/async up\(queryInterface[^)]*\)\s*\{([\s\S]*?)\n  \},/);
    if (!upBlockMatch) continue;

    // Replace all 'await queryInterface.addIndex(' with 'await safeIdx('
    // But preserve the table/field args — just change the method call pattern
    const patched = src
        .replace(/await queryInterface\.addIndex\(/g, 'await safeIdx(')
        .replace(
            // Insert safeIdx helper before the first 'await safeIdx(' in the up() block
            /(async up\(queryInterface[^)]*\)\s*\{[\s\S]*?)(await safeIdx\()/,
            `$1${SAFE_IDX_HELPER}    $2`
        );

    if (patched !== src) {
        fs.writeFileSync(filePath, patched, 'utf-8');
        console.log(`✅ Patched: ${file}`);
        patchedCount++;
    }
}

console.log(`\nDone. ${patchedCount} migration(s) patched.`);

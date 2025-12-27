/**
 * 🔧 Script para marcar migration 014 como concluída manualmente
 * Execute: node scripts/marcar-migration-014.js
 */

require('dotenv').config({ path: './apps/jobs/.env' });

const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rsv_360_ecosystem',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '290491Bb',
});

async function marcarMigration() {
  try {
    console.log('🔌 Conectando ao PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL\n');

    // Verificar se migration já está registrada
    console.log('🔍 Verificando se migration 014 já está registrada...');
    const checkResult = await client.query(
      "SELECT * FROM knex_migrations WHERE name = $1",
      ['014_fix_foreign_keys.js']
    );

    if (checkResult.rows.length > 0) {
      console.log('✅ Migration 014 já está registrada!');
      console.log('   Batch:', checkResult.rows[0].batch);
      console.log('   Migration Time:', checkResult.rows[0].migration_time);
      await client.end();
      return;
    }

    // Obter o próximo batch number
    console.log('📊 Obtendo próximo batch number...');
    const batchResult = await client.query(
      "SELECT COALESCE(MAX(batch), 0) + 1 as next_batch FROM knex_migrations"
    );
    const nextBatch = batchResult.rows[0].next_batch;
    console.log(`   Próximo batch: ${nextBatch}\n`);

    // Inserir migration manualmente
    console.log('📝 Inserindo migration 014 na tabela knex_migrations...');
    await client.query(
      `INSERT INTO knex_migrations (name, batch, migration_time)
       VALUES ($1, $2, NOW())`,
      ['014_fix_foreign_keys.js', nextBatch]
    );

    console.log('✅ Migration 014 marcada como concluída com sucesso!');
    console.log(`   Batch: ${nextBatch}`);
    console.log('   Migration Time: NOW()\n');

    // Verificar novamente
    const verifyResult = await client.query(
      "SELECT * FROM knex_migrations WHERE name = $1",
      ['014_fix_foreign_keys.js']
    );
    console.log('✅ Verificação final:');
    console.log('   Migration registrada:', verifyResult.rows.length > 0 ? 'SIM' : 'NÃO');
    if (verifyResult.rows.length > 0) {
      console.log('   Batch:', verifyResult.rows[0].batch);
      console.log('   Migration Time:', verifyResult.rows[0].migration_time);
    }

    await client.end();
    console.log('\n✅ Processo concluído com sucesso!');
    console.log('\n📋 Próximo passo:');
    console.log('   cd apps/api && npm run migrate');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao marcar migration:');
    console.error(`   ${error.message}`);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Verifique se:');
      console.error('   - PostgreSQL está rodando');
      console.error('   - Porta 5432 está acessível');
    } else if (error.code === '28P01') {
      console.error('\n💡 Verifique se:');
      console.error('   - Usuário e senha estão corretos');
      console.error('   - Arquivo .env está configurado');
    } else if (error.code === '3D000') {
      console.error('\n💡 Banco de dados não existe!');
      console.error('   Execute o script: scripts/criar-banco-postgres-auto.js');
    } else if (error.code === '42P01') {
      console.error('\n💡 Tabela knex_migrations não existe!');
      console.error('   Execute migrations primeiro: cd apps/api && npm run migrate');
    }

    process.exit(1);
  }
}

marcarMigration();


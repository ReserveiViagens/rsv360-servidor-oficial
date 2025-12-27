/**
 * 🗄️ Script para criar banco de dados PostgreSQL automaticamente
 * Execute: node scripts/criar-banco-postgres-auto.js
 */

require('dotenv').config({ path: './apps/jobs/.env' });

const { Client } = require('pg');

const adminClient = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'postgres', // Conecta ao banco padrão
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '290491Bb',
});

const dbName = process.env.DB_NAME || 'rsv_360_ecosystem';

async function criarBanco() {
  try {
    console.log('🔌 Conectando ao PostgreSQL...');
    await adminClient.connect();
    console.log('✅ Conectado ao PostgreSQL');

    // Verificar se banco já existe
    const checkResult = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`\n✅ Banco de dados '${dbName}' já existe!`);
      await adminClient.end();
      return;
    }

    // Criar banco de dados
    console.log(`\n📦 Criando banco de dados '${dbName}'...`);
    await adminClient.query(`CREATE DATABASE ${dbName}`);
    console.log(`✅ Banco de dados '${dbName}' criado com sucesso!`);

    // Adicionar comentário
    await adminClient.query(
      `COMMENT ON DATABASE ${dbName} IS 'RSV 360 Ecosystem - Banco de dados principal'`
    );

    await adminClient.end();
    console.log('\n✅ Processo concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao criar banco de dados:');
    console.error(`   ${error.message}`);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Verifique se:');
      console.error('   - PostgreSQL está rodando');
      console.error('   - Porta 5432 está acessível');
    } else if (error.code === '28P01') {
      console.error('\n💡 Verifique se:');
      console.error('   - Usuário e senha estão corretos');
      console.error('   - Arquivo .env está configurado');
    } else if (error.code === '42P04') {
      console.error(`\n⚠️ Banco '${dbName}' já existe!`);
      await adminClient.end();
      process.exit(0);
    }

    process.exit(1);
  }
}

criarBanco();


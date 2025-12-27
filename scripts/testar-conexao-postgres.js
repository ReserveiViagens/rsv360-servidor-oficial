/**
 * 🧪 Script para testar conexão com PostgreSQL
 * Execute: node scripts/testar-conexao-postgres.js
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

async function testarConexao() {
  try {
    console.log('🔌 Conectando ao PostgreSQL...');
    console.log(`   Host: ${client.host}`);
    console.log(`   Port: ${client.port}`);
    console.log(`   Database: ${client.database}`);
    console.log(`   User: ${client.user}`);
    
    await client.connect();
    console.log('✅ Conectado com sucesso!');
    
    // Testar query
    const result = await client.query('SELECT version()');
    console.log('\n📊 Versão do PostgreSQL:');
    console.log(`   ${result.rows[0].version}`);
    
    // Verificar se banco existe
    const dbResult = await client.query(
      "SELECT datname FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'rsv_360_ecosystem']
    );
    
    if (dbResult.rows.length > 0) {
      console.log(`\n✅ Banco de dados '${process.env.DB_NAME}' existe!`);
    } else {
      console.log(`\n⚠️ Banco de dados '${process.env.DB_NAME}' NÃO existe!`);
      console.log('   Execute o script: scripts/criar-banco-postgres.sql');
    }
    
    await client.end();
    console.log('\n✅ Teste concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao conectar:');
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
      console.error('   Execute o script: scripts/criar-banco-postgres.sql');
    }
    
    process.exit(1);
  }
}

testarConexao();


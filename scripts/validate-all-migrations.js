/**
 * Script de Validação Completa de Migrations SQL
 * 
 * Este script valida todas as migrations SQL do projeto:
 * 1. Verifica conexão com banco de dados
 * 2. Verifica/cria tabela schema_migrations
 * 3. Lista migrations executadas
 * 4. Lista migrations disponíveis
 * 5. Compara e identifica pendentes
 * 6. Gera relatório completo
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Obter DATABASE_URL de várias fontes
let DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.DB_PORT || '5432';
  const DB_NAME = process.env.DB_NAME || 'rsv_360_db';
  const DB_USER = process.env.DB_USER || 'postgres';
  const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
  
  DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  
  console.log('ℹ️  DATABASE_URL não encontrada, usando valores padrão:');
  console.log(`   Host: ${DB_HOST}`);
  console.log(`   Port: ${DB_PORT}`);
  console.log(`   Database: ${DB_NAME}`);
  console.log(`   User: ${DB_USER}\n`);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

/**
 * Verifica conexão com banco de dados
 */
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as now, version() as version');
    console.log('✅ Conexão com banco de dados estabelecida');
    console.log(`   Timestamp: ${result.rows[0].now}`);
    console.log(`   PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}\n`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error.message);
    console.log('\n💡 Verifique:');
    console.log('   1. PostgreSQL está rodando?');
    console.log('   2. DATABASE_URL está correta?');
    console.log('   3. Usuário tem permissões?');
    console.log('   4. Banco de dados existe?');
    console.log('\n   Você pode fornecer a DATABASE_URL como argumento:');
    console.log('   node scripts/validate-all-migrations.js postgresql://user:pass@host:port/dbname\n');
    return false;
  }
}

/**
 * Verifica/cria tabela schema_migrations
 */
async function ensureSchemaMigrationsTable() {
  try {
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.log('⚠️  Tabela schema_migrations não existe');
      console.log('   Criando tabela...\n');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          executed_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ Tabela schema_migrations criada\n');
    } else {
      console.log('✅ Tabela schema_migrations existe\n');
    }
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar/criar tabela schema_migrations:', error.message);
    return false;
  }
}

/**
 * Lista migrations executadas no banco
 */
async function getExecutedMigrations() {
  try {
    const result = await pool.query(`
      SELECT version, executed_at 
      FROM schema_migrations 
      ORDER BY version ASC
    `);
    return result.rows;
  } catch (error) {
    console.error('❌ Erro ao listar migrations executadas:', error.message);
    return [];
  }
}

/**
 * Encontra todos os arquivos de migration no projeto
 */
function findMigrationFiles() {
  const migrationDirs = [
    path.join(__dirname, '..', 'Hotel-com-melhor-preco-main', 'scripts', 'migrations'),
    path.join(__dirname, '..', 'backend', 'database', 'migrations'),
    path.join(__dirname, '..', 'scripts', 'migrations'),
  ];

  const migrations = [];
  
  for (const dir of migrationDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.sql') || f.endsWith('.js'))
        .sort();
      
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        migrations.push({
          file: file,
          path: fullPath,
          dir: dir,
          size: stats.size,
          modified: stats.mtime,
        });
      });
    }
  }

  return migrations;
}

/**
 * Extrai versão/nome da migration do nome do arquivo
 */
function extractMigrationVersion(filename) {
  // Padrões: 001-name.sql, migration-001-name.sql, 001_name.js
  const match = filename.match(/(\d{3,})/);
  if (match) {
    return match[1];
  }
  return filename.replace(/\.(sql|js)$/, '');
}

/**
 * Função principal de validação
 */
async function validateAllMigrations() {
  console.log('🔍 VALIDAÇÃO COMPLETA DE MIGRATIONS SQL\n');
  console.log('='.repeat(60));
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log('='.repeat(60) + '\n');

  // 1. Testar conexão
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }

  // 2. Verificar/criar tabela schema_migrations
  const tableOk = await ensureSchemaMigrationsTable();
  if (!tableOk) {
    process.exit(1);
  }

  // 3. Listar migrations executadas
  console.log('📋 Migrations Executadas no Banco:');
  const executedMigrations = await getExecutedMigrations();
  console.log(`   Total: ${executedMigrations.length}`);
  
  const executedVersions = new Set();
  executedMigrations.forEach(m => {
    executedVersions.add(m.version);
    console.log(`   ✓ ${m.version} - ${m.executed_at}`);
  });
  console.log('');

  // 4. Listar migrations disponíveis
  console.log('📁 Migrations Disponíveis no Projeto:');
  const availableMigrations = findMigrationFiles();
  console.log(`   Total: ${availableMigrations.length}`);
  
  const availableVersions = new Map();
  availableMigrations.forEach(m => {
    const version = extractMigrationVersion(m.file);
    availableVersions.set(version, m);
    console.log(`   - ${m.file} (${version})`);
  });
  console.log('');

  // 5. Comparar e identificar pendentes
  console.log('📊 ANÁLISE DE STATUS:');
  console.log('='.repeat(60));
  
  const pending = [];
  const executed = [];
  const missing = [];

  availableMigrations.forEach(m => {
    const version = extractMigrationVersion(m.file);
    if (executedVersions.has(version)) {
      executed.push({ version, file: m.file });
    } else {
      pending.push({ version, file: m.file, path: m.path });
    }
  });

  executedMigrations.forEach(m => {
    if (!availableVersions.has(m.version)) {
      missing.push({ version: m.version, executed_at: m.executed_at });
    }
  });

  console.log(`\n✅ Executadas e Encontradas: ${executed.length}`);
  executed.forEach(m => {
    console.log(`   ✓ ${m.file}`);
  });

  console.log(`\n⏳ Pendentes (Não Executadas): ${pending.length}`);
  if (pending.length > 0) {
    pending.forEach(m => {
      console.log(`   ⚠️  ${m.file}`);
    });
  } else {
    console.log('   ✅ Nenhuma migration pendente!');
  }

  console.log(`\n⚠️  Executadas mas Arquivo Não Encontrado: ${missing.length}`);
  if (missing.length > 0) {
    missing.forEach(m => {
      console.log(`   ⚠️  ${m.version} (executada em ${m.executed_at})`);
    });
  } else {
    console.log('   ✅ Todas as migrations executadas têm arquivo correspondente!');
  }

  // 6. Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO FINAL');
  console.log('='.repeat(60));
  console.log(`Total de migrations disponíveis: ${availableMigrations.length}`);
  console.log(`Total de migrations executadas: ${executedMigrations.length}`);
  console.log(`Migrations pendentes: ${pending.length}`);
  console.log(`Migrations executadas sem arquivo: ${missing.length}`);
  
  if (pending.length === 0 && missing.length === 0) {
    console.log('\n🎉 TODAS AS MIGRATIONS ESTÃO SINCRONIZADAS!');
    process.exit(0);
  } else {
    console.log('\n⚠️  AÇÃO NECESSÁRIA:');
    if (pending.length > 0) {
      console.log(`   - Execute ${pending.length} migration(s) pendente(s)`);
      console.log('   - Use: node scripts/run-pending-migrations.js');
    }
    if (missing.length > 0) {
      console.log(`   - Verifique ${missing.length} migration(s) executada(s) sem arquivo`);
    }
    process.exit(1);
  }
}

// Executar validação
validateAllMigrations()
  .catch((error) => {
    console.error('❌ Erro não tratado:', error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });


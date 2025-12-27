/**
 * Script para Executar Migrations Pendentes
 * 
 * Identifica e executa automaticamente todas as migrations pendentes
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.DB_PORT || '5432';
  const DB_NAME = process.env.DB_NAME || 'rsv_360_db';
  const DB_USER = process.env.DB_USER || 'postgres';
  const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
  
  DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  
  console.log('ℹ️  DATABASE_URL não encontrada, usando valores padrão\n');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

/**
 * Encontra migrations disponíveis
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
        migrations.push({
          file: file,
          path: fullPath,
          dir: dir,
        });
      });
    }
  }

  return migrations;
}

/**
 * Extrai versão da migration
 */
function extractMigrationVersion(filename) {
  const match = filename.match(/(\d{3,})/);
  if (match) {
    return match[1];
  }
  return filename.replace(/\.(sql|js)$/, '');
}

/**
 * Obtém migrations executadas
 */
async function getExecutedMigrations() {
  try {
    // Verificar se tabela existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      )
    `);

    if (!tableExists.rows[0].exists) {
      // Criar tabela se não existir
      await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          executed_at TIMESTAMP DEFAULT NOW()
        )
      `);
      return [];
    }

    const result = await pool.query(`
      SELECT version 
      FROM schema_migrations 
      ORDER BY version ASC
    `);
    return result.rows.map(r => r.version);
  } catch (error) {
    if (error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  }
}

/**
 * Executa uma migration SQL
 */
async function runSQLMigration(client, migrationPath) {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  await client.query(sql);
}

/**
 * Executa uma migration JavaScript (Knex)
 */
async function runJSMigration(client, migrationPath) {
  // Para migrations JS, precisamos usar o Knex
  // Por enquanto, apenas logamos
  console.log(`   ⚠️  Migration JS detectada: ${path.basename(migrationPath)}`);
  console.log(`   ℹ️  Execute manualmente com: npx knex migrate:up`);
  return false;
}

/**
 * Registra migration como executada
 */
async function markMigrationAsExecuted(client, version) {
  await client.query(`
    INSERT INTO schema_migrations (version, executed_at)
    VALUES ($1, NOW())
    ON CONFLICT (version) DO NOTHING
  `, [version]);
}

/**
 * Função principal
 */
async function runPendingMigrations() {
  console.log('🚀 EXECUTANDO MIGRATIONS PENDENTES\n');
  console.log('='.repeat(60));
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Testar conexão
    await pool.query('SELECT NOW()');
    console.log('✅ Conexão com banco estabelecida\n');

    // Obter migrations executadas
    const executedVersions = new Set(await getExecutedMigrations());
    console.log(`📋 Migrations já executadas: ${executedVersions.size}\n`);

    // Obter migrations disponíveis
    const availableMigrations = findMigrationFiles();
    console.log(`📁 Migrations disponíveis: ${availableMigrations.length}\n`);

    // Filtrar pendentes
    const pendingMigrations = availableMigrations.filter(m => {
      const version = extractMigrationVersion(m.file);
      return !executedVersions.has(version);
    });

    if (pendingMigrations.length === 0) {
      console.log('✅ Nenhuma migration pendente!');
      process.exit(0);
    }

    console.log(`⏳ Migrations pendentes encontradas: ${pendingMigrations.length}\n`);

    // Executar migrations pendentes
    const client = await pool.connect();
    let successCount = 0;
    let errorCount = 0;

    try {
      await client.query('BEGIN');

      for (let i = 0; i < pendingMigrations.length; i++) {
        const migration = pendingMigrations[i];
        const version = extractMigrationVersion(migration.file);
        
        console.log(`[${i + 1}/${pendingMigrations.length}] Executando: ${migration.file}`);

        try {
          if (migration.file.endsWith('.sql')) {
            await runSQLMigration(client, migration.path);
            await markMigrationAsExecuted(client, version);
            console.log(`   ✅ Sucesso: ${migration.file}\n`);
            successCount++;
          } else if (migration.file.endsWith('.js')) {
            const result = await runJSMigration(client, migration.path);
            if (result !== false) {
              await markMigrationAsExecuted(client, version);
              successCount++;
            } else {
              errorCount++;
            }
          }
        } catch (error) {
          // Se for erro de "já existe", considerar sucesso
          if (
            error.message.includes('already exists') ||
            error.message.includes('duplicate') ||
            (error.message.includes('relation') && error.message.includes('already exists'))
          ) {
            console.log(`   ℹ️  Tabela/objeto já existe, marcando como executada...`);
            await markMigrationAsExecuted(client, version);
            successCount++;
          } else {
            console.error(`   ❌ Erro: ${error.message}`);
            errorCount++;
          }
          console.log('');
        }
      }

      if (errorCount === 0) {
        await client.query('COMMIT');
        console.log('='.repeat(60));
        console.log('📊 RESUMO:');
        console.log(`   ✅ Sucesso: ${successCount}`);
        console.log(`   ❌ Erros: ${errorCount}`);
        console.log('='.repeat(60));
        console.log('\n🎉 Todas as migrations pendentes foram executadas!');
      } else {
        await client.query('ROLLBACK');
        console.log('='.repeat(60));
        console.log('📊 RESUMO:');
        console.log(`   ✅ Sucesso: ${successCount}`);
        console.log(`   ❌ Erros: ${errorCount}`);
        console.log('='.repeat(60));
        console.log('\n⚠️  Algumas migrations falharam. Rollback executado.');
        process.exit(1);
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

// Executar
runPendingMigrations()
  .catch((error) => {
    console.error('❌ Erro não tratado:', error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });


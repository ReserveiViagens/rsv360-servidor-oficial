/**
 * Script de Comparação de Migrations
 * 
 * Compara migrations no diretório com migrations executadas no banco
 * e gera relatório detalhado de status
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
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

/**
 * Encontra todos os arquivos de migration
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
 * Lê migrations executadas do banco
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
    if (error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  }
}

/**
 * Função principal de comparação
 */
async function compareMigrations() {
  console.log('🔍 COMPARAÇÃO DE MIGRATIONS\n');
  console.log('='.repeat(60));

  try {
    // Testar conexão
    await pool.query('SELECT NOW()');
    console.log('✅ Conexão com banco estabelecida\n');

    // Obter migrations do banco
    const executedMigrations = await getExecutedMigrations();
    const executedMap = new Map();
    executedMigrations.forEach(m => {
      executedMap.set(m.version, m.executed_at);
    });

    // Obter migrations do sistema de arquivos
    const availableMigrations = findMigrationFiles();
    const availableMap = new Map();
    availableMigrations.forEach(m => {
      const version = extractMigrationVersion(m.file);
      availableMap.set(version, m);
    });

    // Comparar
    const allVersions = new Set([
      ...executedMap.keys(),
      ...availableMap.keys(),
    ]);

    const report = {
      executed: [],
      pending: [],
      missing: [],
      total: allVersions.size,
    };

    allVersions.forEach(version => {
      const executed = executedMap.has(version);
      const available = availableMap.has(version);

      if (executed && available) {
        report.executed.push({
          version,
          file: availableMap.get(version).file,
          executed_at: executedMap.get(version),
        });
      } else if (!executed && available) {
        report.pending.push({
          version,
          file: availableMap.get(version).file,
          path: availableMap.get(version).path,
        });
      } else if (executed && !available) {
        report.missing.push({
          version,
          executed_at: executedMap.get(version),
        });
      }
    });

    // Gerar relatório
    console.log('📊 RELATÓRIO DE COMPARAÇÃO\n');
    console.log(`Total de migrations únicas: ${report.total}`);
    console.log(`✅ Executadas: ${report.executed.length}`);
    console.log(`⏳ Pendentes: ${report.pending.length}`);
    console.log(`⚠️  Sem arquivo: ${report.missing.length}\n`);

    if (report.executed.length > 0) {
      console.log('✅ MIGRATIONS EXECUTADAS:');
      report.executed.forEach(m => {
        console.log(`   ✓ ${m.version} - ${m.file} (${m.executed_at})`);
      });
      console.log('');
    }

    if (report.pending.length > 0) {
      console.log('⏳ MIGRATIONS PENDENTES:');
      report.pending.forEach(m => {
        console.log(`   ⚠️  ${m.version} - ${m.file}`);
      });
      console.log('');
    }

    if (report.missing.length > 0) {
      console.log('⚠️  MIGRATIONS EXECUTADAS SEM ARQUIVO:');
      report.missing.forEach(m => {
        console.log(`   ⚠️  ${m.version} (executada em ${m.executed_at})`);
      });
      console.log('');
    }

    // Salvar relatório em arquivo
    const reportPath = path.join(__dirname, '..', 'migrations-comparison-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Relatório salvo em: ${reportPath}\n`);

    // Status final
    if (report.pending.length === 0 && report.missing.length === 0) {
      console.log('🎉 TODAS AS MIGRATIONS ESTÃO SINCRONIZADAS!');
      process.exit(0);
    } else {
      console.log('⚠️  AÇÃO NECESSÁRIA:');
      if (report.pending.length > 0) {
        console.log(`   Execute ${report.pending.length} migration(s) pendente(s)`);
      }
      if (report.missing.length > 0) {
        console.log(`   Verifique ${report.missing.length} migration(s) sem arquivo`);
      }
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erro na comparação:', error.message);
    process.exit(1);
  }
}

// Executar comparação
compareMigrations()
  .catch((error) => {
    console.error('❌ Erro não tratado:', error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });


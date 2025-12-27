/**
 * 🔗 Database Wrapper para Jobs
 * FASE 3.4: Wrapper para acessar database da API
 * Resolve dependências localmente antes de importar
 */

// Garantir que knex está disponível
let knex;
try {
  knex = require('knex');
} catch (error) {
  // Tentar do node_modules da API
  try {
    knex = require('../../../api/node_modules/knex');
  } catch (e) {
    throw new Error('knex não encontrado. Execute: cd apps/jobs && npm install knex');
  }
}

// Importar configuração do knexfile da API
// De apps/jobs/src/config/ para apps/api/knexfile.js
const knexConfig = require('../../../api/knexfile');
const path = require('path');
const fs = require('fs');

// Logger simples para evitar dependências complexas (winston-daily-rotate-file)
const logger = {
  info: (...args) => console.log('[DB]', ...args),
  error: (...args) => console.error('[DB ERROR]', ...args),
  warn: (...args) => console.warn('[DB WARN]', ...args),
  debug: (...args) => console.debug('[DB DEBUG]', ...args),
};

const environment = process.env.NODE_ENV || 'development';
let config = knexConfig[environment];

// Ajustar caminho do SQLite se necessário
if (config.client === 'sqlite3' && config.connection && config.connection.filename) {
  // Garantir que o diretório data existe
  // O caminho relativo no knexfile é relativo a apps/api/, então precisamos ajustar
  const apiDataDir = path.join(__dirname, '../../../api/data');
  const jobsDataDir = path.join(__dirname, '../../../data');
  
  // Criar diretório data em apps/api/ (onde o knexfile espera)
  if (!fs.existsSync(apiDataDir)) {
    fs.mkdirSync(apiDataDir, { recursive: true });
    logger.info(`✅ Diretório data criado: ${apiDataDir}`);
  }
  
  // Ajustar caminho absoluto do arquivo SQLite
  // O knexfile usa caminho relativo a apps/api/, então precisamos resolver a partir de lá
  const sqlitePath = path.isAbsolute(config.connection.filename) 
    ? config.connection.filename 
    : path.join(__dirname, '../../../api/', config.connection.filename);
  
  config = {
    ...config,
    connection: {
      ...config.connection,
      filename: sqlitePath,
    },
  };
  
  logger.info(`📁 SQLite path: ${sqlitePath}`);
}

// Criar conexão com database
const db = knex(config);

// Função para conectar (compatível com API)
const connectDatabase = async () => {
  try {
    await db.raw('SELECT 1');
    logger.info(`✅ Database connected successfully (${environment})`);
    return db;
  } catch (error) {
    logger.error('Database connection error:', error);
    throw error;
  }
};

module.exports = {
  db,
  connectDatabase,
};

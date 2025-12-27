/**
 * Migration: Atualizar roles de usuários para incluir owner, customer, broker
 * FASE A4.4: Sistema de roles
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // PostgreSQL: Alterar enum para incluir novos valores
  // SQLite: Não suporta ALTER TYPE, então precisamos recriar a coluna
  
  const isPostgres = knex.client.config.client === 'pg';
  
  if (isPostgres) {
    // PostgreSQL: Adicionar novos valores ao enum
    await knex.raw(`
      DO $$ BEGIN
        ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'owner';
        ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'customer';
        ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'broker';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  } else {
    // SQLite: Recriar tabela com novo enum
    // Como SQLite não suporta enum nativo, vamos apenas documentar
    // e usar string com constraint CHECK
    await knex.schema.alterTable('users', (table) => {
      // SQLite não suporta alterar enum, então apenas documentamos
      // Os valores serão validados no código da aplicação
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Não podemos remover valores de enum em PostgreSQL facilmente
  // Em SQLite, não há nada a fazer
  // Esta migration é principalmente para documentação
  console.log('⚠️  Rollback de roles não suportado - valores permanecerão no banco');
};


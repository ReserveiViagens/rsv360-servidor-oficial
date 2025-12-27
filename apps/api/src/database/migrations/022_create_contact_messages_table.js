/**
 * Migration: Create Contact Messages Table
 * FASE: Tabela para mensagens de contato
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("contact_messages", function (table) {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.string("email").notNullable();
    table.string("subject").notNullable();
    table.text("message").notNullable();
    table
      .enum("status", ["new", "read", "replied", "archived"])
      .defaultTo("new");
    table.integer("user_id").unsigned().nullable(); // FK para users (opcional - pode ser anônimo)
    table.integer("replied_by_user_id").unsigned().nullable(); // Admin que respondeu
    table.text("reply_message").nullable();
    table.timestamp("replied_at").nullable();
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table
      .foreign("replied_by_user_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    // Índices
    table.index("email");
    table.index("status");
    table.index("user_id");
    table.index("created_at");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable("contact_messages");
};


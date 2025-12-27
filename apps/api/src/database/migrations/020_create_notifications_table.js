/**
 * Migration: Create Notifications Table
 * FASE: Tabela para armazenar notificações do sistema
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("notifications", function (table) {
    table.increments("id").primary();
    table.integer("user_id").unsigned().notNullable();
    table.string("title").notNullable();
    table.text("message").notNullable();
    table
      .enum("type", ["info", "success", "warning", "error", "promotion"])
      .defaultTo("info");
    table
      .enum("priority", ["low", "medium", "high", "urgent"])
      .defaultTo("medium");
    table.boolean("read").defaultTo(false);
    table.boolean("archived").defaultTo(false);
    table.timestamp("read_at").nullable();
    table.string("action_url").nullable(); // URL para ação relacionada
    table.string("category").nullable(); // Ex: 'Leilões', 'Pagamentos', 'Reservas'
    table.json("metadata").nullable(); // Dados adicionais (ex: booking_id, auction_id)
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.index("user_id");
    table.index("read");
    table.index("archived");
    table.index("type");
    table.index("priority");
    table.index("category");
    table.index("created_at");
    table.index(["user_id", "read"]);
    table.index(["user_id", "archived"]);
  });

  // Tabela para preferências de notificações do usuário
  await knex.schema.createTable("notification_preferences", function (table) {
    table.increments("id").primary();
    table.integer("user_id").unsigned().notNullable().unique();
    table.boolean("email_enabled").defaultTo(true);
    table.boolean("sms_enabled").defaultTo(false);
    table.boolean("push_enabled").defaultTo(true);
    table.boolean("whatsapp_enabled").defaultTo(false);
    table.json("categories").nullable(); // { auctions: true, payments: true, ... }
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.index("user_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable("notification_preferences");
  await knex.schema.dropTable("notifications");
};


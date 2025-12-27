/**
 * Migration: Create Integrations Tables
 * FASE 5: Tabelas para integrações externas (Google Calendar, Smart Locks, Klarna)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Tabela para autenticação Google Calendar
  await knex.schema.createTable("google_calendar_auth", function (table) {
    table.increments("id").primary();
    table.integer("user_id").unsigned().notNullable();
    table.string("access_token").nullable();
    table.string("refresh_token").notNullable();
    table.timestamp("expires_at").nullable();
    table.boolean("active").defaultTo(true);
    table.timestamps(true, true);

    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE").onUpdate("CASCADE");
    table.index("user_id");
    table.index("active");
  });

  // Tabela para eventos do Google Calendar
  await knex.schema.createTable("google_calendar_events", function (table) {
    table.increments("id").primary();
    table.integer("user_id").unsigned().notNullable();
    table.integer("booking_id").unsigned().nullable();
    table.string("calendar_id").notNullable().defaultTo("primary");
    table.string("event_id").notNullable(); // ID do evento no Google Calendar
    table.string("event_link").nullable(); // URL do evento
    table.timestamp("synced_at").notNullable();
    table.timestamps(true, true);

    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE").onUpdate("CASCADE");
    table.foreign("booking_id").references("id").inTable("bookings").onDelete("SET NULL").onUpdate("CASCADE");
    table.index("user_id");
    table.index("booking_id");
    table.index("event_id");
    table.unique(["user_id", "event_id"]);
  });

  // Tabela para fechaduras inteligentes
  await knex.schema.createTable("smart_locks", function (table) {
    table.increments("id").primary();
    table.integer("property_id").unsigned().notNullable();
    table.string("name").notNullable();
    table.enum("provider", ["intelbras", "garen", "yale", "august"]).notNullable();
    table.string("external_id").nullable(); // ID na API do provider
    table.string("model").nullable();
    table.enum("status", ["online", "offline", "unknown"]).defaultTo("unknown");
    table.integer("battery_level").nullable(); // 0-100
    table.timestamp("last_sync").nullable();
    table.json("metadata").nullable(); // Dados adicionais do provider
    table.timestamps(true, true);

    table.foreign("property_id").references("id").inTable("properties").onDelete("CASCADE").onUpdate("CASCADE");
    table.index("property_id");
    table.index("provider");
    table.index("status");
  });

  // Tabela para códigos de acesso de fechaduras
  await knex.schema.createTable("smart_lock_codes", function (table) {
    table.increments("id").primary();
    table.integer("lock_id").unsigned().notNullable();
    table.integer("booking_id").unsigned().notNullable();
    table.string("code").notNullable(); // Código de acesso
    table.date("start_date").notNullable();
    table.date("end_date").notNullable();
    table.enum("status", ["active", "expired", "revoked"]).defaultTo("active");
    table.string("provider").notNullable();
    table.string("external_code_id").nullable(); // ID do código na API do provider
    table.timestamp("revoked_at").nullable();
    table.timestamps(true, true);

    table.foreign("lock_id").references("id").inTable("smart_locks").onDelete("CASCADE").onUpdate("CASCADE");
    table.foreign("booking_id").references("id").inTable("bookings").onDelete("CASCADE").onUpdate("CASCADE");
    table.index("lock_id");
    table.index("booking_id");
    table.index("status");
    table.index("code");
  });

  // Tabela para sessões Klarna
  await knex.schema.createTable("klarna_sessions", function (table) {
    table.increments("id").primary();
    table.integer("booking_id").unsigned().notNullable();
    table.string("session_id").notNullable().unique();
    table.enum("status", ["pending", "authorized", "cancelled", "expired", "failed"]).defaultTo("pending");
    table.decimal("amount", 10, 2).notNullable();
    table.string("currency", 3).defaultTo("BRL");
    table.string("client_token").nullable();
    table.string("authorization_token").nullable();
    table.string("order_id").nullable(); // ID do pedido na Klarna
    table.timestamp("authorized_at").nullable();
    table.timestamp("cancelled_at").nullable();
    table.timestamps(true, true);

    table.foreign("booking_id").references("id").inTable("bookings").onDelete("CASCADE").onUpdate("CASCADE");
    table.index("booking_id");
    table.index("session_id");
    table.index("status");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable("klarna_sessions");
  await knex.schema.dropTable("smart_lock_codes");
  await knex.schema.dropTable("smart_locks");
  await knex.schema.dropTable("google_calendar_events");
  await knex.schema.dropTable("google_calendar_auth");
};


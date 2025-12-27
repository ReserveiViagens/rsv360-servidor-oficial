/**
 * Migration: Criar tabela webhook_events para idempotência de webhooks
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("webhook_events", function (table) {
    table.increments("id").primary();
    table.string("gateway").notNullable(); // stripe, mercado_pago, etc
    table.string("event_id").notNullable(); // ID único do evento do gateway
    table.string("event_type").notNullable(); // payment_intent.succeeded, payment.created, etc
    table.text("payload").notNullable(); // JSON completo do evento
    table.enum("status", ["pending", "processing", "processed", "failed"]).defaultTo("pending");
    table.integer("retry_count").defaultTo(0);
    table.text("error_message").nullable();
    table.timestamp("processed_at").nullable();
    table.timestamps(true, true);

    // Índices para busca rápida
    table.unique(["gateway", "event_id"]); // Garantir idempotência
    table.index("gateway");
    table.index("event_type");
    table.index("status");
    table.index("created_at");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("webhook_events");
};


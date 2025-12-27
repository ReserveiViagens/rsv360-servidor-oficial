/**
 * Migration: Create Payment Gateways Tables
 * FASE C10: Tabelas para payment splits e chargeback webhooks
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Tabela de divisão de pagamentos (payment splits)
  await knex.schema.createTable("payment_splits", function (table) {
    table.increments("id").primary();
    table.integer("payment_id").unsigned().notNullable();
    table.integer("recipient_id").unsigned().notNullable(); // FK para users ou owners
    table.string("recipient_type").notNullable().defaultTo("user"); // 'user' ou 'owner'
    table.decimal("amount", 10, 2).nullable(); // Valor fixo
    table.decimal("percentage", 5, 2).nullable(); // Porcentagem
    table
      .enum("split_type", ["percentage", "fixed_amount"])
      .notNullable()
      .defaultTo("fixed_amount");
    table
      .enum("status", ["pending", "processing", "completed", "failed", "cancelled"])
      .defaultTo("pending");
    table.decimal("fee_amount", 10, 2).defaultTo(0); // Taxa do gateway para este split
    table.string("gateway_transaction_id").nullable(); // ID da transação no gateway
    table.json("gateway_response").nullable(); // Resposta do gateway
    table.timestamp("processed_at").nullable();
    table.text("failure_reason").nullable();
    table.json("metadata").nullable();
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("payment_id")
      .references("id")
      .inTable("payments")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.index("payment_id");
    table.index("recipient_id");
    table.index("status");
    table.index(["payment_id", "status"]);
  });

  // Tabela de chargebacks (disputas)
  await knex.schema.createTable("chargeback_webhooks", function (table) {
    table.increments("id").primary();
    table.integer("payment_id").unsigned().notNullable();
    table.string("gateway").notNullable(); // 'stripe', 'mercado_pago', etc
    table.string("chargeback_id").notNullable(); // ID do chargeback no gateway
    table.string("dispute_id").nullable(); // ID da disputa (Stripe)
    table
      .enum("status", [
        "warning_needs_response",
        "warning_under_review",
        "warning_closed",
        "needs_response",
        "under_review",
        "charge_refunded",
        "won",
        "lost",
      ])
      .defaultTo("needs_response");
    table
      .enum("reason", [
        "fraudulent",
        "subscription_canceled",
        "product_unacceptable",
        "product_not_received",
        "unrecognized",
        "credit_not_processed",
        "general",
        "duplicate",
        "incorrect_account_details",
        "insufficient_funds",
        "other",
      ])
      .nullable();
    table.decimal("amount", 10, 2).notNullable(); // Valor do chargeback
    table.string("currency", 3).defaultTo("BRL");
    table.text("evidence_due_by").nullable(); // Data limite para envio de evidências
    table.text("response_due_by").nullable(); // Data limite para resposta
    table.json("evidence").nullable(); // Evidências enviadas
    table.json("gateway_response").nullable(); // Resposta completa do gateway
    table.text("notes").nullable(); // Notas internas
    table.timestamp("received_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("resolved_at").nullable();
    table.json("metadata").nullable();
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("payment_id")
      .references("id")
      .inTable("payments")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.unique(["gateway", "chargeback_id"]); // Garantir idempotência
    table.index("payment_id");
    table.index("gateway");
    table.index("status");
    table.index("received_at");
    table.index(["payment_id", "status"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable("chargeback_webhooks");
  await knex.schema.dropTable("payment_splits");
};


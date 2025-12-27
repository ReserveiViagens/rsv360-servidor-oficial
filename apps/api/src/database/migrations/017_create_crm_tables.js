/**
 * Migration: Create CRM Tables
 * FASE 1.5.2: Tabelas para CRM (segmentação, campanhas, interações)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Tabela de segmentos de clientes
  await knex.schema.createTable("crm_segments", function (table) {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.text("description").nullable();
    table.json("criteria").notNullable(); // Critérios de segmentação
    table.integer("customer_count").defaultTo(0); // Número de clientes no segmento
    table
      .enum("status", ["active", "inactive", "archived"])
      .defaultTo("active");
    table.integer("created_by").unsigned().nullable(); // FK para users
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("created_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    // Índices
    table.index("status");
    table.index("created_by");
    table.unique("name"); // Nome único
  });

  // Tabela de campanhas de marketing
  await knex.schema.createTable("crm_campaigns", function (table) {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.text("description").nullable();
    table.integer("segment_id").unsigned().nullable(); // FK para crm_segments
    table
      .enum("campaign_type", ["email", "sms", "push", "all"])
      .defaultTo("email");
    table
      .enum("status", ["draft", "scheduled", "running", "paused", "completed", "cancelled"])
      .defaultTo("draft");
    table.timestamp("scheduled_at").nullable();
    table.timestamp("started_at").nullable();
    table.timestamp("completed_at").nullable();
    table.integer("target_count").defaultTo(0); // Número de destinatários
    table.integer("sent_count").defaultTo(0); // Número de mensagens enviadas
    table.integer("opened_count").defaultTo(0); // Número de aberturas (email)
    table.integer("clicked_count").defaultTo(0); // Número de cliques
    table.integer("converted_count").defaultTo(0); // Número de conversões
    table.decimal("open_rate", 5, 2).defaultTo(0); // Taxa de abertura
    table.decimal("click_rate", 5, 2).defaultTo(0); // Taxa de clique
    table.decimal("conversion_rate", 5, 2).defaultTo(0); // Taxa de conversão
    table.json("content").nullable(); // Conteúdo da campanha
    table.json("metadata").nullable();
    table.integer("created_by").unsigned().nullable(); // FK para users
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("segment_id")
      .references("id")
      .inTable("crm_segments")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table
      .foreign("created_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    // Índices
    table.index("segment_id");
    table.index("status");
    table.index("campaign_type");
    table.index("created_by");
    table.index("scheduled_at");
  });

  // Tabela de interações com clientes
  await knex.schema.createTable("crm_interactions", function (table) {
    table.increments("id").primary();
    table.integer("customer_id").unsigned().notNullable(); // FK para customers
    table
      .enum("interaction_type", ["email", "sms", "push", "call", "visit", "chat"])
      .notNullable();
    table.string("channel").nullable(); // Canal específico (ex: 'whatsapp', 'telegram')
    table.text("content").nullable(); // Conteúdo da interação
    table
      .enum("status", ["sent", "delivered", "opened", "clicked", "responded", "failed"])
      .defaultTo("sent");
    table
      .enum("direction", ["inbound", "outbound"])
      .defaultTo("outbound");
    table.integer("campaign_id").unsigned().nullable(); // FK para crm_campaigns (se relacionado)
    table.json("metadata").nullable(); // Metadados adicionais
    table.timestamp("sent_at").nullable();
    table.timestamp("delivered_at").nullable();
    table.timestamp("opened_at").nullable();
    table.timestamp("clicked_at").nullable();
    table.timestamp("responded_at").nullable();
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("customer_id")
      .references("id")
      .inTable("customers")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("campaign_id")
      .references("id")
      .inTable("crm_campaigns")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    // Índices
    table.index("customer_id");
    table.index("interaction_type");
    table.index("status");
    table.index("campaign_id");
    table.index("created_at");
    table.index(["customer_id", "created_at"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable("crm_interactions");
  await knex.schema.dropTable("crm_campaigns");
  await knex.schema.dropTable("crm_segments");
};


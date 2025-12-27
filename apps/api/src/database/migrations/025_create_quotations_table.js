/**
 * Migration: Create Quotations (Budgets) Table
 * FASE: Tabela para cotações/orçamentos
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("quotations", function (table) {
    table.increments("id").primary();
    table.string("budget_id").notNullable().unique(); // ID único do budget (string)
    table.string("title").notNullable();
    
    // Informações do cliente
    table.string("client_name").notNullable();
    table.string("client_email").notNullable();
    table.string("client_phone").notNullable();
    table.string("client_document").nullable();
    
    // Tipo e categoria
    table
      .enum("type", ["hotel", "parque", "atracao", "passeio", "personalizado"])
      .notNullable();
    table.string("category").nullable();
    table.string("main_category").nullable();
    table.text("description").nullable();
    table.text("notes").nullable();
    
    // Valores
    table.decimal("subtotal", 12, 2).defaultTo(0);
    table.decimal("discount", 12, 2).defaultTo(0);
    table.string("discount_type").nullable(); // 'percentage' | 'fixed'
    table.decimal("taxes", 12, 2).defaultTo(0);
    table.string("tax_type").nullable(); // 'percentage' | 'fixed'
    table.decimal("total", 12, 2).defaultTo(0);
    table.string("currency").defaultTo("BRL");
    
    // Status e datas
    table
      .enum("status", ["draft", "sent", "approved", "rejected", "expired"])
      .defaultTo("draft");
    table.timestamp("valid_until").nullable();
    table.timestamp("expires_at").nullable();
    
    // Dados completos do budget (JSON para manter toda a estrutura)
    table.json("budget_data").notNullable(); // Armazena o objeto Budget completo
    
    // Metadados
    table.integer("version").defaultTo(1);
    table.json("tags").nullable(); // Array de tags
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
    table.index("budget_id");
    table.index("type");
    table.index("status");
    table.index("client_email");
    table.index("created_by");
    table.index("created_at");
    table.index(["type", "status"]);
    table.index(["status", "created_at"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable("quotations");
};


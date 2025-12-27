/**
 * Migration: Create Financial Transactions Table
 * FASE: Tabela para transações financeiras (receitas e despesas)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("financial_transactions", function (table) {
    table.increments("id").primary();
    table
      .enum("type", ["income", "expense"])
      .notNullable();
    table.string("category").notNullable(); // Ex: 'Vendas', 'Comissões', 'Transporte', 'Tecnologia'
    table.text("description").notNullable();
    table.decimal("amount", 12, 2).notNullable();
    table.date("date").notNullable();
    table.string("payment_method").nullable(); // Ex: 'Cartão de Crédito', 'Transferência', 'PIX'
    table
      .enum("status", ["completed", "pending", "cancelled"])
      .defaultTo("pending");
    table.string("reference").nullable(); // Referência externa (ex: 'DIS-001', 'EXP-003')
    table.integer("customer_id").unsigned().nullable(); // FK para customers (se relacionado)
    table.integer("booking_id").unsigned().nullable(); // FK para bookings (se relacionado)
    table.integer("payment_id").unsigned().nullable(); // FK para payments (se relacionado)
    table.text("notes").nullable();
    table.json("metadata").nullable(); // Metadados adicionais
    table.integer("created_by").unsigned().nullable(); // FK para users
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("customer_id")
      .references("id")
      .inTable("customers")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table
      .foreign("booking_id")
      .references("id")
      .inTable("bookings")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table
      .foreign("payment_id")
      .references("id")
      .inTable("payments")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table
      .foreign("created_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    // Índices
    table.index("type");
    table.index("category");
    table.index("date");
    table.index("status");
    table.index("customer_id");
    table.index("booking_id");
    table.index("payment_id");
    table.index("created_by");
    table.index(["type", "date"]);
    table.index(["category", "date"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable("financial_transactions");
};


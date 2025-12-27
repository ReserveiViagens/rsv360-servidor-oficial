/**
 * Migration: Create Owners Table
 * FASE 1.2: Tabela de proprietários
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("owners", function (table) {
    table.increments("id").primary();
    table.integer("user_id").unsigned().notNullable();
    table.string("name").notNullable();
    table.string("email").notNullable();
    table.string("phone").nullable();
    table.string("document_type").nullable(); // CPF, CNPJ, Passport
    table.string("document_number").nullable();
    table.text("address").nullable();
    table.string("city").nullable();
    table.string("state").nullable();
    table.string("zip_code").nullable();
    table.string("country").defaultTo("Brasil");
    table
      .enum("status", ["active", "inactive", "pending", "suspended"])
      .defaultTo("pending");
    table.decimal("total_revenue", 12, 2).defaultTo(0);
    table.integer("total_properties").defaultTo(0);
    table.integer("total_bookings").defaultTo(0);
    table.decimal("commission_rate", 5, 2).defaultTo(10.0); // Taxa de comissão padrão
    table.json("bank_account").nullable(); // Dados bancários para pagamento
    table.json("preferences").nullable();
    table.json("metadata").nullable();
    table.timestamps(true, true);

    // Foreign keys
    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");

    // Indexes
    table.index("user_id");
    table.index("email");
    table.index("document_number");
    table.index("status");
    table.unique("email");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("owners");
};


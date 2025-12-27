/**
 * Migration: Create Property Availability Table
 * FASE 1.3: Tabela de disponibilidade de propriedades
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("property_availability", function (table) {
    table.increments("id").primary();
    table.integer("property_id").unsigned().notNullable();
    table.date("date").notNullable();
    table.boolean("available").defaultTo(true);
    table.decimal("price", 10, 2).nullable(); // Preço específico para esta data
    table.integer("min_stay").nullable(); // Estadia mínima específica
    table
      .enum("block_reason", ["maintenance", "owner_reserved", "other"])
      .nullable();
    table.text("block_notes").nullable();
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("property_id")
      .references("id")
      .inTable("properties")
      .onDelete("CASCADE");

    // Indexes
    table.unique(["property_id", "date"]);
    table.index("property_id");
    table.index("date");
    table.index("available");
    table.index(["property_id", "date", "available"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("property_availability");
};


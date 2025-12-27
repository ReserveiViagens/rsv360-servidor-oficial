/**
 * Migration: Create Properties Table
 * FASE 1.1: Tabela de propriedades para multipropriedade
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("properties", function (table) {
    table.increments("id").primary();
    table.integer("owner_id").unsigned().nullable();
    table
      .enum("type", ["apartment", "house", "chalet", "flat", "bungalow", "villa", "condo"])
      .notNullable();
    table.string("title").notNullable();
    table.text("description").nullable();
    table.string("address_street").notNullable();
    table.string("address_city").notNullable();
    table.string("address_state").notNullable();
    table.string("address_zip_code").nullable();
    table.string("address_country").defaultTo("Brasil");
    table.decimal("latitude", 10, 8).nullable();
    table.decimal("longitude", 11, 8).nullable();
    table.integer("bedrooms").nullable();
    table.integer("bathrooms").nullable();
    table.integer("max_guests").notNullable();
    table.decimal("area_sqm", 10, 2).nullable();
    table.decimal("base_price", 10, 2).notNullable();
    table.decimal("cleaning_fee", 10, 2).defaultTo(0);
    table.json("amenities").nullable(); // Array de amenidades
    table.json("images").nullable(); // Array de URLs de imagens
    table.integer("min_stay").defaultTo(1);
    table.string("check_in_time").defaultTo("14:00");
    table.string("check_out_time").defaultTo("11:00");
    table.text("cancellation_policy").nullable();
    table
      .enum("status", ["active", "inactive", "maintenance", "pending"])
      .defaultTo("pending");
    table.decimal("rating", 3, 2).defaultTo(0);
    table.integer("review_count").defaultTo(0);
    table.json("metadata").nullable();
    table.timestamps(true, true);

    // Foreign keys
    table.foreign("owner_id").references("id").inTable("owners").onDelete("SET NULL");

    // Indexes
    table.index("owner_id");
    table.index("type");
    table.index("status");
    table.index("address_city");
    table.index("address_state");
    table.index(["status", "type"]);
    table.index(["latitude", "longitude"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("properties");
};


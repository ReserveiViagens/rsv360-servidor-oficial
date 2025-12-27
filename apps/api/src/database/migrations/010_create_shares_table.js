/**
 * Migration: Create Property Shares Tables
 * FASE 1.4: Tabela de cotas de multipropriedade
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Tabela de cotas
  await knex.schema.createTable("property_shares", function (table) {
    table.increments("id").primary();
    table.integer("property_id").unsigned().notNullable();
    table.integer("owner_id").unsigned().notNullable();
    table.decimal("share_percentage", 5, 2).notNullable(); // % da propriedade
    table.integer("weeks_per_year").notNullable(); // Semanas por ano
    table.date("start_date").notNullable();
    table.date("end_date").nullable();
    table.decimal("price", 10, 2).notNullable();
    table
      .enum("status", ["active", "inactive", "transferred"])
      .defaultTo("active");
    table.json("metadata").nullable();
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("property_id")
      .references("id")
      .inTable("properties")
      .onDelete("CASCADE");
    table
      .foreign("owner_id")
      .references("id")
      .inTable("owners")
      .onDelete("CASCADE");

    // Indexes
    table.index("property_id");
    table.index("owner_id");
    table.index("status");
    table.index(["property_id", "owner_id"]);
  });

  // Tabela de calendário de cotas
  await knex.schema.createTable("share_calendar", function (table) {
    table.increments("id").primary();
    table.integer("share_id").unsigned().notNullable();
    table.integer("week_number").notNullable(); // Semana do ano (1-52)
    table.integer("year").notNullable();
    table.boolean("available").defaultTo(true);
    table.integer("reserved_by").unsigned().nullable(); // ID do owner que reservou
    table.timestamp("reserved_at").nullable();
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("share_id")
      .references("id")
      .inTable("property_shares")
      .onDelete("CASCADE");
    table
      .foreign("reserved_by")
      .references("id")
      .inTable("owners")
      .onDelete("SET NULL");

    // Indexes
    table.unique(["share_id", "week_number", "year"]);
    table.index("share_id");
    table.index("year");
    table.index("week_number");
    table.index(["share_id", "year", "week_number"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable("share_calendar");
  await knex.schema.dropTable("property_shares");
};


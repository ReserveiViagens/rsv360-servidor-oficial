/**
 * Migration: Create Pricing Experiments Tables
 * FASE 1.5.1: Tabelas para A/B Testing de pricing e histórico de ROI
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Tabela de experimentos A/B de pricing
  await knex.schema.createTable("pricing_ab_experiments", function (table) {
    table.increments("id").primary();
    table.integer("property_id").unsigned().notNullable();
    table.string("experiment_name").notNullable();
    table.string("variant_a_name").notNullable().defaultTo("Control");
    table.string("variant_b_name").notNullable().defaultTo("Treatment");
    table.decimal("variant_a_price", 10, 2).notNullable();
    table.decimal("variant_b_price", 10, 2).notNullable();
    table.date("start_date").notNullable();
    table.date("end_date").notNullable();
    table
      .enum("status", ["draft", "running", "paused", "completed", "cancelled"])
      .defaultTo("draft");
    table.integer("variant_a_bookings").defaultTo(0);
    table.integer("variant_b_bookings").defaultTo(0);
    table.decimal("variant_a_revenue", 10, 2).defaultTo(0);
    table.decimal("variant_b_revenue", 10, 2).defaultTo(0);
    table.decimal("variant_a_conversion_rate", 5, 2).defaultTo(0);
    table.decimal("variant_b_conversion_rate", 5, 2).defaultTo(0);
    table.string("winner").nullable(); // 'variant_a', 'variant_b', 'no_difference'
    table.decimal("confidence_level", 5, 2).nullable(); // 0-100
    table.json("metadata").nullable();
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("property_id")
      .references("id")
      .inTable("properties")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.index("property_id");
    table.index("status");
    table.index(["property_id", "status"]);
    table.index("start_date");
    table.index("end_date");
  });

  // Tabela de histórico de ROI de pricing
  await knex.schema.createTable("pricing_roi_history", function (table) {
    table.increments("id").primary();
    table.integer("property_id").unsigned().notNullable();
    table.date("date").notNullable();
    table.decimal("base_price", 10, 2).notNullable();
    table.decimal("smart_price", 10, 2).notNullable();
    table.decimal("price_difference", 10, 2).notNullable(); // smart_price - base_price
    table.integer("bookings_count").defaultTo(0);
    table.decimal("revenue", 10, 2).defaultTo(0);
    table.decimal("revenue_with_base_price", 10, 2).defaultTo(0); // Receita se tivesse usado preço base
    table.decimal("roi_percentage", 5, 2).defaultTo(0); // ROI em porcentagem
    table.decimal("occupancy_rate", 5, 2).defaultTo(0); // Taxa de ocupação
    table.json("factors").nullable(); // Fatores que influenciaram o preço
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("property_id")
      .references("id")
      .inTable("properties")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.index("property_id");
    table.index("date");
    table.unique(["property_id", "date"]); // Uma entrada por propriedade por dia
    table.index(["property_id", "date"]);
  });

  // Tabela de multiplicadores de demanda
  await knex.schema.createTable("demand_multipliers", function (table) {
    table.increments("id").primary();
    table.integer("property_id").unsigned().notNullable();
    table.date("date").notNullable();
    table.decimal("demand_score", 5, 2).notNullable(); // 0-100
    table.decimal("multiplier", 5, 2).notNullable(); // Multiplicador de preço (ex: 1.15 = +15%)
    table.string("demand_level").notNullable(); // 'very_low', 'low', 'medium', 'high', 'very_high'
    table.integer("historical_bookings").defaultTo(0); // Bookings históricos para esta data
    table.integer("competitor_bookings").defaultTo(0); // Bookings de competidores
    table.decimal("market_demand_index", 5, 2).defaultTo(0); // Índice de demanda do mercado
    table.json("metadata").nullable();
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("property_id")
      .references("id")
      .inTable("properties")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.index("property_id");
    table.index("date");
    table.unique(["property_id", "date"]); // Uma entrada por propriedade por dia
    table.index(["property_id", "date"]);
    table.index("demand_level");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable("demand_multipliers");
  await knex.schema.dropTable("pricing_roi_history");
  await knex.schema.dropTable("pricing_ab_experiments");
};


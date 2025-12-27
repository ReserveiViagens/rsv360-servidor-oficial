/**
 * Migration: Create Auctions Tables
 * FASE: Tabelas para sistema de leilões de hospedagem
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Tabela de leilões
  await knex.schema.createTable("auctions", function (table) {
    table.increments("id").primary();
    table.integer("property_id").unsigned().notNullable();
    table.integer("host_id").unsigned().notNullable(); // Criador do leilão
    table.decimal("start_price", 10, 2).notNullable();
    table.decimal("current_bid", 10, 2).notNullable();
    table.decimal("min_increment", 10, 2).notNullable().defaultTo(10.00);
    table.timestamp("start_time").notNullable();
    table.timestamp("end_time").notNullable();
    table.timestamp("extended_time").nullable(); // Tempo estendido se houver lance nos últimos minutos
    table
      .enum("status", ["scheduled", "active", "ended", "cancelled"])
      .defaultTo("scheduled");
    table.integer("winner_id").unsigned().nullable();
    table.integer("bids_count").defaultTo(0);
    table.integer("participants_count").defaultTo(0);
    table.date("check_in").notNullable();
    table.date("check_out").notNullable();
    table.integer("max_guests").notNullable();
    table.text("description").nullable();
    table.boolean("payment_completed").defaultTo(false);
    table.timestamp("payment_deadline").nullable(); // Prazo para pagamento após vencer
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("property_id")
      .references("id")
      .inTable("properties")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("host_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("winner_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    // Índices
    table.index("property_id");
    table.index("host_id");
    table.index("status");
    table.index("start_time");
    table.index("end_time");
    table.index("winner_id");
    table.index(["status", "end_time"]);
    table.index(["property_id", "status"]);
  });

  // Tabela de lances
  await knex.schema.createTable("auction_bids", function (table) {
    table.increments("id").primary();
    table.integer("auction_id").unsigned().notNullable();
    table.integer("user_id").unsigned().notNullable();
    table.decimal("amount", 10, 2).notNullable();
    table.boolean("is_auto_bid").defaultTo(false);
    table.decimal("max_amount", 10, 2).nullable(); // Para auto-bid
    table.boolean("is_winning_bid").defaultTo(false);
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("auction_id")
      .references("id")
      .inTable("auctions")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.index("auction_id");
    table.index("user_id");
    table.index("is_winning_bid");
    table.index(["auction_id", "created_at"]);
    table.index(["user_id", "created_at"]);
  });

  // Tabela de participantes (para rastrear quem participou)
  await knex.schema.createTable("auction_participants", function (table) {
    table.increments("id").primary();
    table.integer("auction_id").unsigned().notNullable();
    table.integer("user_id").unsigned().notNullable();
    table.integer("bids_count").defaultTo(0);
    table.decimal("total_bid_amount", 10, 2).defaultTo(0);
    table.timestamp("first_bid_at").nullable();
    table.timestamp("last_bid_at").nullable();
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("auction_id")
      .references("id")
      .inTable("auctions")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índice único para evitar duplicatas
    table.unique(["auction_id", "user_id"]);
    table.index("auction_id");
    table.index("user_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("auction_participants");
  await knex.schema.dropTableIfExists("auction_bids");
  await knex.schema.dropTableIfExists("auctions");
};


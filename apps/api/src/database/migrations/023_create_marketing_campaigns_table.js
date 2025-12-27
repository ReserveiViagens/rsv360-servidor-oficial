/**
 * Migration: Create Marketing Campaigns Table
 * FASE: Tabela completa para campanhas de marketing (redes sociais, ads, SEO, etc)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("marketing_campaigns", function (table) {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.text("description").nullable();
    table
      .enum("type", ["email", "social", "ads", "content", "influencer", "SEO"])
      .notNullable();
    table
      .enum("status", ["active", "paused", "completed", "draft", "scheduled"])
      .defaultTo("draft");
    table.decimal("budget", 12, 2).defaultTo(0);
    table.decimal("spent", 12, 2).defaultTo(0);
    table.integer("impressions").defaultTo(0);
    table.integer("clicks").defaultTo(0);
    table.integer("conversions").defaultTo(0);
    table.date("start_date").nullable();
    table.date("end_date").nullable();
    table.string("target_audience").nullable();
    table.decimal("roi", 10, 2).defaultTo(0);
    table.decimal("ctr", 5, 2).defaultTo(0); // Click-through rate
    table.decimal("cpc", 10, 2).defaultTo(0); // Cost per click
    table.decimal("engagement_rate", 5, 2).defaultTo(0);
    table.integer("reach").defaultTo(0);
    table.decimal("frequency", 5, 2).defaultTo(0);
    table.string("platform").nullable(); // Ex: 'Instagram', 'Google Ads', 'Mailchimp'
    table.string("content_type").nullable(); // Ex: 'Stories', 'Post', 'Search'
    table.json("tags").nullable(); // Array de tags
    table.decimal("performance_score", 5, 2).nullable(); // Score de 0-100
    table.json("metadata").nullable(); // Metadados adicionais
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
    table.index("type");
    table.index("status");
    table.index("created_by");
    table.index("start_date");
    table.index("end_date");
    table.index(["type", "status"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable("marketing_campaigns");
};


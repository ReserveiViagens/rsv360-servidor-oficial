/**
 * Migration: Create Blog Tables
 * FASE: Tabelas para sistema de blog
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("blog_posts", function (table) {
    table.increments("id").primary();
    table.string("slug").notNullable().unique();
    table.string("title").notNullable();
    table.text("excerpt").nullable();
    table.text("content").notNullable(); // HTML content
    table.string("author").defaultTo("Equipe RSV360");
    table.string("image_url").nullable();
    table.boolean("published").defaultTo(false);
    table.timestamp("published_at").nullable();
    table.integer("views").defaultTo(0);
    table.string("meta_title").nullable();
    table.text("meta_description").nullable();
    table.json("tags").nullable(); // Array de tags
    table.integer("author_id").unsigned().nullable(); // FK para users (opcional)
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("author_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    // Índices
    table.index("slug");
    table.index("published");
    table.index("published_at");
    table.index("author_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable("blog_posts");
};


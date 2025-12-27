/**
 * Migration: Add Version Column to Bookings
 * FASE 1.5: Adicionar coluna version para optimistic locking
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Verificar quais colunas já existem
  const hasVersion = await knex.schema.hasColumn("bookings", "version");
  const hasPropertyId = await knex.schema.hasColumn("bookings", "property_id");
  const hasCustomerId = await knex.schema.hasColumn("bookings", "customer_id");
  const hasCheckIn = await knex.schema.hasColumn("bookings", "check_in");
  const hasCheckOut = await knex.schema.hasColumn("bookings", "check_out");
  const hasBasePrice = await knex.schema.hasColumn("bookings", "base_price");
  const hasCleaningFee = await knex.schema.hasColumn("bookings", "cleaning_fee");
  const hasServiceFee = await knex.schema.hasColumn("bookings", "service_fee");

  // Adicionar apenas as colunas que não existem
  await knex.schema.table("bookings", function (table) {
    if (!hasVersion) {
      table.integer("version").defaultTo(1).notNullable();
    }
    // Não adicionar property_id, customer_id, check_in, check_out se já existem
    // Eles podem ter sido criados em outra migration ou ter tipos diferentes
  });

  // Adicionar indexes apenas para a coluna version (que é o objetivo principal)
  if (!hasVersion) {
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS bookings_version_idx ON bookings(version);
    `).catch(() => {
      // Ignorar erro se index já existe
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table("bookings", function (table) {
    table.dropColumn("version");
    // Não remover property_id e customer_id caso já existam
    // table.dropColumn("property_id");
    // table.dropColumn("customer_id");
  });
};


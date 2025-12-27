/**
 * Migration: Create Group Travel Tables
 * FASE 2.1.9: Tabelas para Viagens em Grupo (wishlists, splits, convites, chat)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Tabela de wishlists compartilhadas
  await knex.schema.createTable("shared_wishlists", function (table) {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.text("description").nullable();
    table.integer("created_by").unsigned().notNullable();
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("created_by")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.index("created_by");
    table.index("created_at");
  });

  // Tabela de membros de wishlist
  await knex.schema.createTable("wishlist_members", function (table) {
    table.increments("id").primary();
    table.integer("wishlist_id").unsigned().notNullable();
    table.integer("user_id").unsigned().notNullable();
    table
      .enum("role", ["admin", "member"])
      .defaultTo("member");
    table.timestamp("joined_at").defaultTo(knex.fn.now());

    // Foreign keys
    table
      .foreign("wishlist_id")
      .references("id")
      .inTable("shared_wishlists")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.unique(["wishlist_id", "user_id"]); // Um usuário só pode ser membro uma vez
    table.index("wishlist_id");
    table.index("user_id");
  });

  // Tabela de itens de wishlist
  await knex.schema.createTable("wishlist_items", function (table) {
    table.increments("id").primary();
    table.integer("wishlist_id").unsigned().notNullable();
    table.integer("property_id").unsigned().notNullable();
    table.integer("added_by").unsigned().notNullable();
    table.integer("votes_up").defaultTo(0);
    table.integer("votes_down").defaultTo(0);
    table.text("notes").nullable();
    table.timestamp("added_at").defaultTo(knex.fn.now());

    // Foreign keys
    table
      .foreign("wishlist_id")
      .references("id")
      .inTable("shared_wishlists")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("property_id")
      .references("id")
      .inTable("properties")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("added_by")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.unique(["wishlist_id", "property_id"]); // Uma propriedade só pode estar na wishlist uma vez
    table.index("wishlist_id");
    table.index("property_id");
    table.index("added_by");
  });

  // Tabela de votos em itens de wishlist
  await knex.schema.createTable("wishlist_votes", function (table) {
    table.increments("id").primary();
    table.integer("user_id").unsigned().notNullable();
    table.integer("item_id").unsigned().notNullable();
    table
      .enum("vote", ["up", "down", "maybe"])
      .notNullable();
    table.timestamp("timestamp").defaultTo(knex.fn.now());

    // Foreign keys
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("item_id")
      .references("id")
      .inTable("wishlist_items")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.unique(["user_id", "item_id"]); // Um usuário só pode votar uma vez por item
    table.index("item_id");
    table.index("user_id");
    table.index("timestamp");
  });

  // Tabela de convites de viagem
  await knex.schema.createTable("trip_invitations", function (table) {
    table.increments("id").primary();
    table.integer("booking_id").unsigned().notNullable();
    table.integer("invited_by").unsigned().notNullable();
    table.string("invited_email").notNullable();
    table.string("token").notNullable().unique();
    table
      .enum("status", ["pending", "accepted", "declined", "expired", "cancelled"])
      .defaultTo("pending");
    table.timestamp("expires_at").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("accepted_at").nullable();

    // Foreign keys
    table
      .foreign("booking_id")
      .references("id")
      .inTable("bookings")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("invited_by")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.index("booking_id");
    table.index("invited_by");
    table.index("invited_email");
    table.index("token");
    table.index("status");
    table.index("expires_at");
  });

  // Tabela de chats em grupo
  await knex.schema.createTable("group_chats", function (table) {
    table.increments("id").primary();
    table.integer("booking_id").unsigned().notNullable();
    table.json("participants").notNullable(); // Array de user_ids
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // Foreign keys
    table
      .foreign("booking_id")
      .references("id")
      .inTable("bookings")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.unique("booking_id"); // Um chat por reserva
    table.index("booking_id");
  });

  // Tabela de mensagens do chat em grupo
  await knex.schema.createTable("group_chat_messages", function (table) {
    table.increments("id").primary();
    table.integer("chat_id").unsigned().notNullable();
    table.integer("sender_id").unsigned().notNullable();
    table.text("message").notNullable();
    table.string("attachment_url").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("read_at").nullable();

    // Foreign keys
    table
      .foreign("chat_id")
      .references("id")
      .inTable("group_chats")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("sender_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // Índices
    table.index("chat_id");
    table.index("sender_id");
    table.index("created_at");
    table.index(["chat_id", "created_at"]);
    table.index("read_at");
  });

  // Atualizar tabela payment_splits se necessário (adicionar campos para group travel)
  // Verificar se tabela já existe e se tem os campos necessários
  const hasPaymentSplits = await knex.schema.hasTable("payment_splits");
  if (hasPaymentSplits) {
    // Verificar se já tem booking_id
    const hasBookingId = await knex.schema.hasColumn("payment_splits", "booking_id");
    if (!hasBookingId) {
      await knex.schema.table("payment_splits", function (table) {
        table.integer("booking_id").unsigned().nullable();
        table
          .foreign("booking_id")
          .references("id")
          .inTable("bookings")
          .onDelete("CASCADE")
          .onUpdate("CASCADE");
        table.index("booking_id");
      });
    }

    // Verificar se já tem user_id (para compatibilidade com group travel)
    const hasUserId = await knex.schema.hasColumn("payment_splits", "user_id");
    if (!hasUserId) {
      await knex.schema.table("payment_splits", function (table) {
        table.integer("user_id").unsigned().nullable();
        table.index("user_id");
      });
    }

    // Adicionar campos específicos de group travel se não existirem
    // Nota: status já existe na tabela original, mas pode precisar de valores adicionais
    const hasPaidAt = await knex.schema.hasColumn("payment_splits", "paid_at");
    if (!hasPaidAt) {
      await knex.schema.table("payment_splits", function (table) {
        table.timestamp("paid_at").nullable();
      });
    }

    const hasPaymentMethod = await knex.schema.hasColumn("payment_splits", "payment_method");
    if (!hasPaymentMethod) {
      await knex.schema.table("payment_splits", function (table) {
        table.string("payment_method").nullable();
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable("group_chat_messages");
  await knex.schema.dropTable("group_chats");
  await knex.schema.dropTable("trip_invitations");
  await knex.schema.dropTable("wishlist_votes");
  await knex.schema.dropTable("wishlist_items");
  await knex.schema.dropTable("wishlist_members");
  await knex.schema.dropTable("shared_wishlists");
};


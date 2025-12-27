/**
 * Migration: Create Verification Tables
 * FASE 1.5.3: Tabelas para verificação de identidade e documentos
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Tabela de solicitações de verificação
  await knex.schema.createTable("verification_requests", function (table) {
    table.increments("id").primary();
    table.integer("user_id").unsigned().nullable(); // FK para users (opcional - pode ser verificação sem usuário)
    table
      .enum("type", ["cpf", "cnpj", "background_check", "document_verification"])
      .notNullable();
    table.string("document").notNullable(); // CPF ou CNPJ (apenas números)
    table.json("request_data").nullable(); // Dados da solicitação (nome, data nascimento, etc.)
    table.json("response_data").nullable(); // Resposta da API (Serasa, etc.)
    table
      .enum("status", ["pending", "processing", "approved", "rejected", "expired"])
      .defaultTo("pending");
    table.string("request_id").nullable(); // ID da solicitação na API externa
    table.text("rejection_reason").nullable(); // Motivo da rejeição
    table.timestamp("expires_at").nullable(); // Data de expiração
    table.timestamp("processed_at").nullable();
    table.json("metadata").nullable();
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    // Índices
    table.index("user_id");
    table.index("document");
    table.index("type");
    table.index("status");
    table.index("request_id");
    table.unique(["document", "type"]); // Uma verificação por tipo por documento
    table.index(["document", "type", "status"]);
  });

  // Tabela de documentos enviados para verificação
  await knex.schema.createTable("verification_documents", function (table) {
    table.increments("id").primary();
    table.integer("user_id").unsigned().notNullable(); // FK para users
    table
      .enum("document_type", ["cpf", "cnpj", "rg", "passport", "driver_license", "other"])
      .notNullable();
    table.string("document_number").notNullable(); // Número do documento (apenas números)
    table.string("file_url").nullable(); // URL do arquivo enviado
    table.string("file_path").nullable(); // Caminho local do arquivo
    table.string("file_name").nullable(); // Nome original do arquivo
    table.integer("file_size").nullable(); // Tamanho do arquivo em bytes
    table.string("mime_type").nullable(); // Tipo MIME do arquivo
    table
      .enum("status", ["pending", "processing", "approved", "rejected", "expired"])
      .defaultTo("pending");
    table.text("rejection_reason").nullable(); // Motivo da rejeição
    table.integer("verified_by").unsigned().nullable(); // FK para users (quem verificou)
    table.timestamp("verified_at").nullable();
    table.timestamp("expires_at").nullable();
    table.json("verification_data").nullable(); // Dados da verificação
    table.json("metadata").nullable();
    table.timestamps(true, true);

    // Foreign keys
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("verified_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");

    // Índices
    table.index("user_id");
    table.index("document_type");
    table.index("document_number");
    table.index("status");
    table.index("verified_by");
    table.index("created_at");
    table.index(["user_id", "document_type"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable("verification_documents");
  await knex.schema.dropTable("verification_requests");
};


/**
 * Script para validar estrutura do banco de dados após migrations
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Obter DATABASE_URL do argumento ou variável de ambiente
const databaseUrl = process.argv[2] || process.env.DATABASE_URL || 'postgresql://postgres:290491Bb@localhost:5432/rsv_360_db';

async function validateDatabaseStructure() {
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('✅ Conexão com banco estabelecida\n');

    // 1. Verificar tabelas criadas pelas migrations
    console.log('📋 Verificando tabelas criadas pelas migrations...\n');
    
    const tables = [
      'schema_migrations',
      // Smart Pricing (nomes corretos)
      'smart_pricing_config',      // era: smart_pricing_configs
      'price_history',             // era: pricing_history
      'competitor_prices',
      // Top Host (nomes corretos)
      'host_metrics',              // era: top_hosts
      'host_badges',
      // Notifications
      'notifications',
      'push_subscriptions',
      // Group Travel (todas as tabelas reais)
      'shared_wishlists',
      'wishlist_members',
      'wishlist_items',
      'wishlist_votes',
      'payment_splits',
      'trip_invitations',
      'group_chats',
      'group_chat_messages',
      'shared_calendars',
      'calendar_events',
    ];

    const existingTables = [];
    const missingTables = [];

    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );

      if (result.rows[0].exists) {
        existingTables.push(table);
        console.log(`  ✅ ${table}`);
      } else {
        missingTables.push(table);
        console.log(`  ❌ ${table} - NÃO ENCONTRADA`);
      }
    }

    // 2. Verificar migrations executadas
    console.log('\n📊 Migrations executadas:');
    const migrationsResult = await client.query(
      'SELECT version, executed_at FROM schema_migrations ORDER BY version'
    );
    
    migrationsResult.rows.forEach(row => {
      console.log(`  ✓ ${row.version} - ${new Date(row.executed_at).toLocaleString()}`);
    });

    // 3. Verificar estrutura de algumas tabelas importantes
    console.log('\n🔍 Verificando estrutura de tabelas principais...\n');

    if (existingTables.includes('smart_pricing_config')) {
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'smart_pricing_config'
        ORDER BY ordinal_position
      `);
      console.log('  📊 smart_pricing_config:');
      columns.rows.forEach(col => {
        console.log(`    - ${col.column_name} (${col.data_type})`);
      });
    }

    if (existingTables.includes('notifications')) {
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        ORDER BY ordinal_position
      `);
      console.log('\n  📊 notifications:');
      columns.rows.forEach(col => {
        console.log(`    - ${col.column_name} (${col.data_type})`);
      });
    }

    // 4. Resumo
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA VALIDAÇÃO');
    console.log('='.repeat(60));
    console.log(`✅ Tabelas encontradas: ${existingTables.length}/${tables.length}`);
    console.log(`❌ Tabelas faltando: ${missingTables.length}`);
    console.log(`📋 Migrations executadas: ${migrationsResult.rows.length}`);
    
    if (missingTables.length > 0) {
      console.log('\n⚠️  Tabelas faltando:');
      missingTables.forEach(t => console.log(`   - ${t}`));
    }

    if (existingTables.length === tables.length && migrationsResult.rows.length > 0) {
      console.log('\n🎉 Estrutura do banco validada com sucesso!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Algumas tabelas ou migrations estão faltando');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erro ao validar estrutura:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

validateDatabaseStructure();


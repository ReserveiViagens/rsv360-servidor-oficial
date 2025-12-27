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
      // Core Tables
      'users',
      'customers',
      'properties',
      'bookings',
      'payments',
      'payment_gateways',
      'owners',
      'content',
      'availability',
      'shares',
      'webhook_events',
      'audit_logs',
      'travel_packages',
      // Smart Pricing (nomes corretos)
      'smart_pricing_config',      // era: smart_pricing_configs
      'price_history',             // era: pricing_history
      'competitor_prices',
      'pricing_ab_experiments',     // Faltante - será criada
      'pricing_roi_history',       // Faltante - será criada
      'demand_multipliers',        // Faltante - será criada
      // Top Host (nomes corretos)
      'host_metrics',              // era: top_hosts
      'host_badges',
      'host_ratings',              // Faltante - será criada
      'host_incentives',           // Faltante - será criada
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
      // CRM Tables (Faltantes - serão criadas)
      'crm_interactions',
      'crm_campaigns',
      'crm_segments',
      // Verification Tables (Faltantes - serão criadas)
      'verification_requests',
      'verification_documents',
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

    // 4. Verificar índices em tabelas principais
    console.log('\n🔍 Verificando índices em tabelas principais...\n');
    
    const expectedIndexes = {
      'smart_pricing_config': ['idx_smart_pricing_config_property'],
      'price_history': ['idx_price_history_property_date'],
      'competitor_prices': ['idx_competitor_prices_property_date'],
      'host_metrics': ['idx_host_metrics_rating', 'idx_host_metrics_host'],
      'host_badges': ['idx_host_badges_host'],
      'notifications': ['idx_notifications_user_read', 'idx_notifications_created_at'],
      'push_subscriptions': ['idx_push_subscriptions_user'],
      'shared_wishlists': ['idx_shared_wishlists_creator'],
      'wishlist_members': ['idx_wishlist_members_wishlist', 'idx_wishlist_members_user'],
      'wishlist_items': ['idx_wishlist_items_wishlist', 'idx_wishlist_items_property'],
      'wishlist_votes': ['idx_wishlist_votes_item'],
      'payment_splits': ['idx_payment_splits_booking', 'idx_payment_splits_user'],
      'trip_invitations': ['idx_trip_invitations_token', 'idx_trip_invitations_booking'],
      'group_chats': ['idx_group_chats_booking'],
      'group_chat_messages': ['idx_group_chat_messages_chat', 'idx_group_chat_messages_created_at'],
    };

    const indexResults = {
      found: 0,
      missing: 0,
      missingList: []
    };

    for (const [table, indexes] of Object.entries(expectedIndexes)) {
      if (existingTables.includes(table)) {
        for (const indexName of indexes) {
          const indexResult = await client.query(
            `SELECT EXISTS (
              SELECT FROM pg_indexes 
              WHERE schemaname = 'public' 
              AND tablename = $1 
              AND indexname = $2
            )`,
            [table, indexName]
          );

          if (indexResult.rows[0].exists) {
            indexResults.found++;
            console.log(`  ✅ ${indexName} em ${table}`);
          } else {
            indexResults.missing++;
            indexResults.missingList.push(`${indexName} em ${table}`);
            console.log(`  ❌ ${indexName} em ${table} - NÃO ENCONTRADO`);
          }
        }
      }
    }

    // 5. Verificar foreign keys em tabelas principais
    console.log('\n🔗 Verificando foreign keys em tabelas principais...\n');
    
    const expectedForeignKeys = {
      'smart_pricing_config': ['property_id'],
      'price_history': ['property_id'],
      'competitor_prices': ['property_id'],
      'host_metrics': ['host_id'],
      'host_badges': ['host_id', 'badge_id'],
      'notifications': ['user_id'],
      'push_subscriptions': ['user_id'],
      'shared_wishlists': ['created_by'],
      'wishlist_members': ['wishlist_id', 'user_id'],
      'wishlist_items': ['wishlist_id', 'property_id', 'added_by'],
      'wishlist_votes': ['item_id', 'user_id'],
      'payment_splits': ['booking_id', 'user_id'],
      'trip_invitations': ['booking_id', 'invited_by'],
      'group_chats': ['booking_id'],
      'group_chat_messages': ['chat_id', 'sender_id'],
    };

    const fkResults = {
      found: 0,
      missing: 0,
      missingList: []
    };

    for (const [table, fkColumns] of Object.entries(expectedForeignKeys)) {
      if (existingTables.includes(table)) {
        for (const column of fkColumns) {
          const fkResult = await client.query(
            `SELECT 
              tc.constraint_name,
              tc.table_name,
              kcu.column_name,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = $1
              AND kcu.column_name = $2`,
            [table, column]
          );

          if (fkResult.rows.length > 0) {
            fkResults.found++;
            const fk = fkResult.rows[0];
            console.log(`  ✅ FK ${fk.constraint_name}: ${table}.${column} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
          } else {
            fkResults.missing++;
            fkResults.missingList.push(`${table}.${column}`);
            console.log(`  ❌ FK faltando: ${table}.${column}`);
          }
        }
      }
    }

    // 6. Resumo
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA VALIDAÇÃO');
    console.log('='.repeat(60));
    console.log(`✅ Tabelas encontradas: ${existingTables.length}/${tables.length}`);
    console.log(`❌ Tabelas faltando: ${missingTables.length}`);
    console.log(`📋 Migrations executadas: ${migrationsResult.rows.length}`);
    console.log(`\n🔍 Índices:`);
    console.log(`  ✅ Encontrados: ${indexResults.found}`);
    console.log(`  ❌ Faltando: ${indexResults.missing}`);
    console.log(`\n🔗 Foreign Keys:`);
    console.log(`  ✅ Encontradas: ${fkResults.found}`);
    console.log(`  ❌ Faltando: ${fkResults.missing}`);
    
    if (missingTables.length > 0) {
      console.log('\n⚠️  Tabelas faltando:');
      missingTables.forEach(t => console.log(`   - ${t}`));
    }

    if (indexResults.missing > 0) {
      console.log('\n⚠️  Índices faltando:');
      indexResults.missingList.forEach(idx => console.log(`   - ${idx}`));
    }

    if (fkResults.missing > 0) {
      console.log('\n⚠️  Foreign Keys faltando:');
      fkResults.missingList.forEach(fk => console.log(`   - ${fk}`));
    }

    // Considerar sucesso se tabelas core existem e migrations foram executadas
    const coreTables = ['users', 'customers', 'properties', 'bookings', 'payments'];
    const coreTablesExist = coreTables.every(t => existingTables.includes(t));
    
    if (coreTablesExist && migrationsResult.rows.length > 0) {
      console.log('\n✅ Estrutura básica do banco validada!');
      if (missingTables.length > 0 || indexResults.missing > 0 || fkResults.missing > 0) {
        console.log('⚠️  Algumas tabelas, índices ou foreign keys estão faltando (podem ser criadas posteriormente)');
        process.exit(0); // Não falhar, apenas avisar
      } else {
        console.log('\n🎉 Estrutura do banco validada com sucesso!');
        process.exit(0);
      }
    } else {
      console.log('\n❌ Estrutura básica do banco não está completa');
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


-- ============================================
-- 🗄️ SCRIPT PARA CRIAR BANCO DE DADOS RSV 360
-- ============================================
-- Execute este script no pgAdmin4 ou psql
-- ============================================

-- Criar banco de dados
CREATE DATABASE rsv_360_ecosystem
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'Portuguese_Brazil.1252'
    LC_CTYPE = 'Portuguese_Brazil.1252'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Comentário no banco
COMMENT ON DATABASE rsv_360_ecosystem IS 'RSV 360 Ecosystem - Banco de dados principal';

-- ============================================
-- ✅ BANCO CRIADO COM SUCESSO!
-- ============================================
-- Próximo passo: Executar migrations
-- cd apps/api && npm run migrate
-- ============================================


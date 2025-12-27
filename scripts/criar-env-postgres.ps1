# ============================================
# 🔧 Script PowerShell para criar arquivos .env
# Execute: .\scripts\criar-env-postgres.ps1
# ============================================

$rootPath = Split-Path -Parent $PSScriptRoot
$jobsEnvPath = Join-Path $rootPath "apps\jobs\.env"
$apiEnvPath = Join-Path $rootPath "apps\api\.env"

Write-Host "=== CRIANDO ARQUIVOS .env ===" -ForegroundColor Cyan
Write-Host ""

# ============================================
# apps/jobs/.env
# ============================================
$jobsEnv = @"
# ============================================
# 🔧 RSV 360 - JOBS SERVICE - VARIÁVEIS DE AMBIENTE
# ============================================

# Ambiente
NODE_ENV=development

# ============================================
# 🗄️ CONFIGURAÇÕES DO BANCO DE DADOS PostgreSQL
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rsv_360_ecosystem
DB_USER=postgres
DB_PASSWORD=290491Bb

# ============================================
# 🔴 CONFIGURAÇÕES DO REDIS (para Bull Queue - futuro)
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# ============================================
# 📝 LOGGING
# ============================================
LOG_LEVEL=info
"@

$jobsEnv | Out-File -FilePath $jobsEnvPath -Encoding UTF8
Write-Host "✅ Criado: apps/jobs/.env" -ForegroundColor Green

# ============================================
# apps/api/.env
# ============================================
$apiEnv = @"
# ============================================
# 🔧 RSV 360 - API SERVICE - VARIÁVEIS DE AMBIENTE
# ============================================

# Ambiente
NODE_ENV=development
PORT=5000
HOST=localhost
APP_NAME=RSV-360-API
DEBUG=false

# ============================================
# 🗄️ CONFIGURAÇÕES DO BANCO DE DADOS PostgreSQL
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rsv_360_ecosystem
DB_USER=postgres
DB_PASSWORD=290491Bb

# ============================================
# 🔴 CONFIGURAÇÕES DO REDIS
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
REDIS_MAX_MEMORY=256mb
REDIS_EVICTION_POLICY=allkeys-lru

# ============================================
# 🔐 CONFIGURAÇÕES DE AUTENTICAÇÃO JWT
# ============================================
JWT_SECRET=rsv360_super_secret_jwt_key_change_in_production
JWT_REFRESH_SECRET=rsv360_refresh_token_secret_change_in_production
REFRESH_TOKEN_SECRET=rsv360_refresh_token_secret_change_in_production
JWT_EXPIRES_IN=7d
JWT_ISSUER=rsv360-backend
JWT_AUDIENCE=rsv360-frontend

# ============================================
# 📧 CONFIGURAÇÕES DE EMAIL (SMTP)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@rsv360.com

# ============================================
# 💳 CONFIGURAÇÕES DE PAGAMENTO
# ============================================
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
MERCADO_PAGO_ACCESS_TOKEN=TEST-your_token
MERCADO_PAGO_WEBHOOK_SECRET=your_webhook_secret

# ============================================
# 📝 LOGGING
# ============================================
LOG_LEVEL=info

# ============================================
# 🌐 CORS
# ============================================
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
"@

$apiEnv | Out-File -FilePath $apiEnvPath -Encoding UTF8
Write-Host "✅ Criado: apps/api/.env" -ForegroundColor Green

Write-Host ""
Write-Host "=== ✅ ARQUIVOS .env CRIADOS COM SUCESSO! ===" -ForegroundColor Green
Write-Host ""
Write-Host "🔐 Credenciais configuradas:" -ForegroundColor Cyan
Write-Host "   Host: localhost"
Write-Host "   Port: 5432"
Write-Host "   Database: rsv_360_ecosystem"
Write-Host "   User: postgres"
Write-Host "   Password: 290491Bb"
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "   1. Criar banco no pgAdmin4 (ou executar scripts/criar-banco-postgres.sql)"
Write-Host "   2. Testar conexão: node scripts/testar-conexao-postgres.js"
Write-Host "   3. Executar migrations: cd apps/api && npm run migrate"
Write-Host "   4. Testar jobs: npm run dev:jobs"
Write-Host ""


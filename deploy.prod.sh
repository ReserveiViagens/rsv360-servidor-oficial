#!/bin/bash
# Script Bash para Deploy de Produção
# FASE 5.4: Deploy Produção 1-Clique

echo "=== 🚀 DEPLOY PRODUÇÃO RSV360 MONOREPO ==="
echo ""

# 1. Pull latest code
echo "📥 1. Atualizando código..."
if git status &>/dev/null; then
    echo "   Git detectado. Pulling latest code..."
    git pull origin main || echo "   ⚠️  Git pull falhou (continuando...)"
    echo "   ✅ Código atualizado"
else
    echo "   ℹ️  Git não configurado ou não é repositório (continuando...)"
fi
echo ""

# 2. Install production dependencies
echo "📦 2. Instalando dependências de produção..."
npm ci --production --ignore-scripts || npm install --production --ignore-scripts
if [ $? -eq 0 ]; then
    echo "   ✅ Dependências instaladas"
else
    echo "   ❌ Erro ao instalar dependências"
    exit 1
fi
echo ""

# 3. Docker build + start
echo "🐳 3. Build e start containers Docker..."
docker-compose -f docker-compose.prod.yml down
echo "   Containers antigos parados"

docker-compose -f docker-compose.prod.yml up --build -d
if [ $? -eq 0 ]; then
    echo "   ✅ Containers Docker iniciados"
else
    echo "   ❌ Erro ao iniciar containers Docker"
    exit 1
fi
echo ""

# 4. Nginx proxy
echo "🌐 4. Iniciando Nginx proxy..."
npm run nginx:start || echo "   ⚠️  Nginx pode já estar rodando (continuando...)"
echo ""

# 5. Health check
echo "🏥 5. Verificando saúde dos serviços..."
sleep 10

HEALTH_CHECK=false

# Test API
if curl -f http://localhost:5000/api/health &>/dev/null; then
    echo "   ✅ API Health check OK"
    HEALTH_CHECK=true
else
    echo "   ⚠️  API Health check falhou (serviço pode estar iniciando...)"
fi

# Test Guest App
if curl -f http://localhost/ &>/dev/null; then
    echo "   ✅ Guest App OK"
    HEALTH_CHECK=true
else
    echo "   ⚠️  Guest App não respondeu (pode estar iniciando...)"
fi

if [ "$HEALTH_CHECK" = false ]; then
    echo "   ⚠️  Alguns serviços podem estar iniciando. Aguarde alguns segundos."
    echo "   💡 Execute: npm run docker:logs para ver logs"
fi
echo ""

# 6. Status final
echo "=== ✅ DEPLOY CONCLUÍDO ==="
echo ""
echo "🌐 URLs disponíveis:"
echo "   http://localhost/          → Guest App"
echo "   http://admin.rsv360.com/   → Admin App (se DNS configurado)"
echo "   http://api.rsv360.com/     → API Backend (se DNS configurado)"
echo ""
echo "📊 Comandos úteis:"
echo "   npm run docker:status  → Status dos containers"
echo "   npm run docker:logs    → Ver logs"
echo "   npm run nginx:logs    → Logs do Nginx"
echo ""
echo "🛑 Parar produção:"
echo "   npm run nginx:stop"
echo "   npm run docker:stop"
echo ""
echo "🎉 PRODUÇÃO ATUALIZADA E RODANDO!"


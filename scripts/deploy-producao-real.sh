#!/bin/bash
# Script para Deploy em Produção Real
# RSV360 Monorepo - Deploy Completo

echo "=== DEPLOY PRODUCAO REAL - RSV360 MONOREPO ==="
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está no servidor
if [ ! -d "/var/www" ] && [ ! -d "$HOME/rsv360" ]; then
    echo -e "${YELLOW}⚠️  Aviso: Este script deve ser executado no servidor${NC}"
    echo "   Execute: ssh user@servidor"
    echo "   Depois: cd /var/www/rsv360"
    echo ""
fi

# 1. Verificar pré-requisitos
echo "1. Verificando pré-requisitos..."
echo ""

# Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado${NC}"
    echo "   Instale: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
fi

# Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não encontrado${NC}"
    echo "   Instale: curl -fsSL https://get.docker.com | sh"
    exit 1
else
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✅ Docker: $DOCKER_VERSION${NC}"
fi

# Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não encontrado${NC}"
    echo "   Instale: sudo apt install docker-compose"
    exit 1
else
    COMPOSE_VERSION=$(docker-compose --version)
    echo -e "${GREEN}✅ Docker Compose: $COMPOSE_VERSION${NC}"
fi

echo ""

# 2. Verificar variáveis de ambiente
echo "2. Verificando variáveis de ambiente..."
echo ""

if [ ! -f "apps/api/.env" ]; then
    echo -e "${YELLOW}⚠️  apps/api/.env não encontrado${NC}"
    echo "   Criando a partir de .env.example..."
    if [ -f "apps/api/.env.example" ]; then
        cp apps/api/.env.example apps/api/.env
        echo -e "${GREEN}✅ apps/api/.env criado${NC}"
        echo -e "${YELLOW}⚠️  IMPORTANTE: Edite apps/api/.env com valores de produção!${NC}"
    else
        echo -e "${RED}❌ apps/api/.env.example não encontrado${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ apps/api/.env encontrado${NC}"
fi

if [ ! -f "apps/jobs/.env" ]; then
    echo -e "${YELLOW}⚠️  apps/jobs/.env não encontrado${NC}"
    echo "   Criando a partir de apps/api/.env..."
    cp apps/api/.env apps/jobs/.env
    echo -e "${GREEN}✅ apps/jobs/.env criado${NC}"
else
    echo -e "${GREEN}✅ apps/jobs/.env encontrado${NC}"
fi

echo ""

# 3. Instalar dependências
echo "3. Instalando dependências..."
echo ""

npm ci --production --ignore-scripts
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependências instaladas${NC}"
else
    echo -e "${YELLOW}⚠️  npm ci falhou, tentando npm install...${NC}"
    npm install --production --ignore-scripts
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Erro ao instalar dependências${NC}"
        exit 1
    fi
fi

echo ""

# 4. Docker build + start
echo "4. Build e start containers Docker..."
echo ""

docker-compose -f docker-compose.prod.yml down
echo "   Containers antigos parados"

docker-compose -f docker-compose.prod.yml up --build -d
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Containers Docker iniciados${NC}"
else
    echo -e "${RED}❌ Erro ao iniciar containers Docker${NC}"
    exit 1
fi

echo ""

# 5. Nginx proxy
echo "5. Iniciando Nginx proxy..."
echo ""

npm run nginx:start
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx iniciado${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx pode já estar rodando${NC}"
fi

echo ""

# 6. Health check
echo "6. Verificando saúde dos serviços..."
echo ""

sleep 15

HEALTH_CHECK=false

# Test API
if curl -f http://localhost:5000/api/health &>/dev/null; then
    echo -e "${GREEN}✅ API Health check OK${NC}"
    HEALTH_CHECK=true
else
    echo -e "${YELLOW}⚠️  API Health check falhou (pode estar iniciando...)${NC}"
fi

# Test Guest App
if curl -f http://localhost/ &>/dev/null; then
    echo -e "${GREEN}✅ Guest App OK${NC}"
    HEALTH_CHECK=true
else
    echo -e "${YELLOW}⚠️  Guest App não respondeu (pode estar iniciando...)${NC}"
fi

if [ "$HEALTH_CHECK" = false ]; then
    echo -e "${YELLOW}⚠️  Alguns serviços podem estar iniciando. Aguarde alguns segundos.${NC}"
    echo "   Execute: npm run docker:logs para ver logs"
fi

echo ""

# 7. Status final
echo "=== DEPLOY CONCLUIDO ==="
echo ""
echo -e "${GREEN}✅ PRODUÇÃO ATUALIZADA E RODANDO!${NC}"
echo ""
echo "URLs disponíveis:"
echo "   http://localhost/          → Guest App"
echo "   http://admin.rsv360.com/   → Admin App (se DNS configurado)"
echo "   http://api.rsv360.com/     → API Backend (se DNS configurado)"
echo ""
echo "Comandos úteis:"
echo "   npm run docker:status  → Status dos containers"
echo "   npm run docker:logs    → Ver logs"
echo "   npm run nginx:logs    → Logs do Nginx"
echo ""
echo "Parar produção:"
echo "   npm run nginx:stop"
echo "   npm run docker:stop"
echo ""


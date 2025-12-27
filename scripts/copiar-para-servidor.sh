#!/bin/bash
# Script para Copiar Código para Servidor
# RSV360 Monorepo - Transferência Segura

echo "=== COPIAR CODIGO PARA SERVIDOR ==="
echo ""

# Verificar se servidor foi fornecido
if [ -z "$1" ]; then
    echo "Uso: ./scripts/copiar-para-servidor.sh user@servidor"
    echo ""
    echo "Exemplo:"
    echo "  ./scripts/copiar-para-servidor.sh root@192.168.1.100"
    echo "  ./scripts/copiar-para-servidor.sh ubuntu@servidor.example.com"
    exit 1
fi

SERVER=$1
DEST_PATH="/var/www/rsv360"

echo "Servidor: $SERVER"
echo "Destino: $DEST_PATH"
echo ""

# Confirmar
read -p "Continuar? (s/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Cancelado."
    exit 1
fi

echo ""
echo "Copiando arquivos..."
echo ""

# Excluir arquivos desnecessários
EXCLUDE="--exclude='.git' \
         --exclude='node_modules' \
         --exclude='.next' \
         --exclude='dist' \
         --exclude='build' \
         --exclude='*.log' \
         --exclude='.env' \
         --exclude='.env.local' \
         --exclude='_archive' \
         --exclude='*.md'"

# Copiar via SCP
rsync -avz --progress $EXCLUDE ./ $SERVER:$DEST_PATH/

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Código copiado com sucesso!"
    echo ""
    echo "Próximos passos:"
    echo "  1. ssh $SERVER"
    echo "  2. cd $DEST_PATH"
    echo "  3. Configurar variáveis de ambiente"
    echo "  4. npm run deploy:prod"
else
    echo ""
    echo "❌ Erro ao copiar código"
    exit 1
fi


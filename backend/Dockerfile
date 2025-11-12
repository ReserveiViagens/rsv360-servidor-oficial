# Multi-stage build para otimização
FROM node:18-alpine AS base

# Instalar dependências do sistema
RUN apk add --no-cache \
    dumb-init \
    libc6-compat \
    postgresql-client \
    curl \
    git

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
COPY package*.json ./
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação (se usando TypeScript)
RUN npm run build || echo "No build script found"

# Produção
FROM base AS runner

# Configurar usuário
USER nodeuser

# Definir diretório de trabalho
WORKDIR /app

# Copiar dependências de produção
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copiar aplicação
COPY --chown=nodeuser:nodejs . .

# Criar diretórios necessários
RUN mkdir -p logs uploads temp

# Configurar variáveis de ambiente
ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# Expor porta
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Usar dumb-init para gerenciamento de processos
ENTRYPOINT ["dumb-init", "--"]

# Comando de início
CMD ["npm", "start"]

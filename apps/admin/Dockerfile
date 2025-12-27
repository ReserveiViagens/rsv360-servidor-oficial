# Dockerfile para Admin App (Next.js)
FROM node:20-alpine AS base

# Instalar dependências apenas quando necessário
FROM base AS deps
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./
COPY apps/admin/package.json ./apps/admin/

# Instalar dependências do root (Next, React)
RUN npm ci --only=production || npm install next@^15.5.2 react@^19.1.1 react-dom@^19.1.1 --save

# Instalar dependências do admin
WORKDIR /app/apps/admin
RUN npm ci || npm install

# Rebuild do código fonte apenas quando necessário
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY apps/admin ./apps/admin
COPY packages ./packages

# Build da aplicação
WORKDIR /app/apps/admin
ENV NODE_ENV=production
RUN npm run build

# Imagem de produção, copiar todos os arquivos e executar next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos necessários
COPY --from=builder /app/apps/admin/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./.next/static

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Next.js standalone cria server.js na raiz do .next/standalone
CMD ["node", "server.js"]


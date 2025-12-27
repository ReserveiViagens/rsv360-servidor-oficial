# Dockerfile para Guest App (Next.js)
FROM node:20-alpine AS base

# Instalar dependências apenas quando necessário
FROM base AS deps
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./
COPY apps/guest/package.json ./apps/guest/

# Instalar dependências do root (Next, React)
RUN npm ci --only=production || npm install next@^15.5.2 react@^19.1.1 react-dom@^19.1.1 --save

# Instalar dependências do guest
WORKDIR /app/apps/guest
RUN npm ci || npm install

# Rebuild do código fonte apenas quando necessário
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY apps/guest ./apps/guest
COPY packages ./packages

# Build da aplicação
WORKDIR /app/apps/guest
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
COPY --from=builder /app/apps/guest/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/guest/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/guest/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Next.js standalone cria server.js na raiz do .next/standalone
CMD ["node", "server.js"]


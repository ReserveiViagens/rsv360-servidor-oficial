# Dockerfile para Jobs Service
FROM node:20-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY apps/jobs/package*.json ./
RUN npm ci --only=production

# Copiar código fonte
COPY apps/jobs/ ./

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3002

ENV NODE_ENV=production

CMD ["node", "src/index.js"]


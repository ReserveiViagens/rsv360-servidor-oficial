# Dockerfile para API Backend
FROM node:20-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY apps/api/package*.json ./
RUN npm ci --only=production

# Copiar código fonte
COPY apps/api/ ./

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "src/server.js"]


# 🎉 RSV360 MONOREPO - PRODUÇÃO 100%

**Versão:** 1.0.0  
**Data:** 27/12/2025  
**Status:** ✅ **PRODUÇÃO READY**

---

## 🚀 Comandos Principais

### Desenvolvimento Local
```bash
# Hot reload instantâneo
npm run dev:migration

# URLs:
# http://localhost:3000  → Guest App
# http://localhost:3001   → Admin App
# http://localhost:5000  → API Backend
```

### Produção (1 Comando)
```bash
# Deploy completo (Docker + Nginx + Health Check)
npm run deploy:prod

# URLs:
# http://localhost/          → Guest App (via Nginx)
# http://admin.rsv360.com/   → Admin App (se DNS configurado)
# http://api.rsv360.com/     → API Backend (se DNS configurado)
```

---

## 📁 Estrutura do Projeto

```
rsv360-servidor-oficial/
├── apps/
│   ├── guest/          ✅ Guest Web App (Next.js)
│   ├── admin/          ✅ Admin Panel (Next.js)
│   ├── api/            ✅ API Backend (Express)
│   └── jobs/            ✅ Background Jobs (Bull Queue)
├── packages/
│   └── shared/         ✅ Código compartilhado
├── docker-compose.prod.yml  ✅ Docker Compose produção
├── nginx.conf          ✅ Nginx Reverse Proxy
├── deploy.prod.ps1     ✅ Script deploy Windows
├── deploy.prod.sh      ✅ Script deploy Linux/Mac
└── _archive/           📦 Código legado arquivado
```

---

## 🌐 Domínios de Produção

### Configurados
- `guest.rsv360.com` → Guest App (porta 3000)
- `admin.rsv360.com` → Admin App (porta 3001)
- `api.rsv360.com` → API Backend (porta 5000)

### Como Configurar DNS
```
A Record: guest.rsv360.com → IP_DO_SERVIDOR
A Record: admin.rsv360.com → IP_DO_SERVIDOR
A Record: api.rsv360.com → IP_DO_SERVIDOR
```

---

## 🐳 Docker Services

### Serviços Disponíveis
- **guest** - Guest Web App (Next.js)
- **admin** - Admin Panel (Next.js)
- **api** - API Backend (Express)
- **jobs** - Background Jobs (Bull Queue)
- **postgres** - PostgreSQL Database
- **redis** - Redis Cache

### Comandos Docker
```bash
# Status
npm run docker:status

# Logs
npm run docker:logs

# Parar
npm run docker:stop

# Start
npm run docker:prod
```

---

## 🌐 Nginx Reverse Proxy

### Configuração
- Proxy para Guest App (porta 80 → 3000)
- Proxy para Admin App (porta 80 → 3001)
- Proxy para API (porta 80 → 5000)

### Comandos Nginx
```bash
# Start
npm run nginx:start

# Stop
npm run nginx:stop

# Logs
npm run nginx:logs

# Test config
npm run nginx:test
```

---

## 🔄 Deploy Produção

### Processo Automático
```bash
npm run deploy:prod
```

**O que faz:**
1. 📥 Atualiza código (git pull)
2. 📦 Instala dependências (npm ci --production)
3. 🐳 Build e start Docker
4. 🌐 Inicia Nginx
5. 🏥 Health check

### Rollback (Emergência)
```bash
# Voltar para commit anterior
git checkout main~1

# Re-deploy
npm run deploy:prod
```

---

## 📊 Monitoramento

### Health Checks
```bash
# API
curl http://localhost:5000/api/health

# Guest App
curl http://localhost/

# Admin App
curl http://localhost:3001/dashboard
```

### Logs
```bash
# Todos os serviços
npm run docker:logs

# Serviço específico
docker-compose -f docker-compose.prod.yml logs -f guest
docker-compose -f docker-compose.prod.yml logs -f admin
docker-compose -f docker-compose.prod.yml logs -f api

# Nginx
npm run nginx:logs
```

---

## 🛡️ Segurança

### Variáveis de Ambiente
- ✅ NUNCA commitar `.env` no Git
- ✅ Usar variáveis de ambiente no servidor
- ✅ Rotacionar `JWT_SECRET` regularmente
- ✅ Senhas fortes para PostgreSQL

### Firewall
- Porta 80 (HTTP)
- Porta 443 (HTTPS - futuro)
- Porta 22 (SSH)

---

## 🔧 Troubleshooting

### Containers não iniciam
```bash
npm run docker:logs
npm run docker:status
```

### Nginx não inicia
```bash
npm run nginx:test
npm run nginx:logs
```

### Serviços não respondem
```bash
npm run docker:status
curl http://localhost:5000/api/health
```

---

## 📈 Estatísticas do Projeto

### Migração Completa
- ✅ **40+ páginas** migradas
- ✅ **4 serviços** Dockerizados
- ✅ **Deploy 1-clique** configurado
- ✅ **Zero downtime** possível
- ✅ **Rollback instantâneo** disponível

### Tecnologias
- **Frontend:** Next.js 15, React 19, Tailwind CSS
- **Backend:** Express, Node.js 20
- **Database:** PostgreSQL 18, Redis 7
- **Jobs:** Bull Queue
- **Proxy:** Nginx
- **Container:** Docker, Docker Compose

---

## 🎯 Fluxo Diário

### Desenvolvimento
```bash
npm run dev:migration
# Hot reload em localhost:3000 e 3001
```

### Release
```bash
git push
ssh servidor
cd /var/www/rsv360
npm run deploy:prod
# Produção live em 2 minutos!
```

---

## 📞 Suporte

### Documentação
- `README.DEPLOY.md` - Guia de deploy detalhado
- `FASE5_*_RESULTADO.md` - Resultados das fases
- `_archive/README.md` - Código legado

### Comandos Úteis
```bash
# Status completo
npm run docker:status
npm run nginx:test

# Logs completos
npm run docker:logs
npm run nginx:logs

# Parar tudo
npm run nginx:stop
npm run docker:stop
```

---

## 🎉 Status Final

- ✅ **100% Produção Ready**
- ✅ **Deploy 1-clique**
- ✅ **Desenvolvimento intacto**
- ✅ **Zero downtime possível**
- ✅ **Rollback disponível**

---

**Última atualização:** 27/12/2025  
**Versão:** 1.0.0  
**Status:** ✅ PRODUÇÃO LIVE


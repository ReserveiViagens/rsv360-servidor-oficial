# 🚀 GUIA DE DEPLOY EM PRODUÇÃO REAL

**Data:** 27/12/2025  
**Status:** ✅ **PRONTO PARA DEPLOY REAL**

---

## 📋 PRÉ-REQUISITOS

### No Servidor VPS/Cloud
- ✅ Node.js 20+ instalado
- ✅ Docker e Docker Compose instalados
- ✅ Git instalado
- ✅ Acesso SSH configurado
- ✅ Portas 80, 443, 5000 liberadas no firewall

---

## 🚀 PROCESSO DE DEPLOY (3 Passos)

### Passo 1: Copiar Código para Servidor

#### Opção A: Via Git (Recomendado)
```bash
# No servidor
cd /var/www
git clone <seu-repositorio> rsv360
cd rsv360
```

#### Opção B: Via SCP
```bash
# No seu computador local
scp -r . user@servidor:/var/www/rsv360/
```

---

### Passo 2: Configurar Variáveis de Ambiente

```bash
# No servidor
cd /var/www/rsv360

# Criar .env para API
cd apps/api
cp .env.example .env
nano .env  # Editar com valores de produção

# Criar .env para Jobs
cd ../jobs
cp .env.example .env
nano .env  # Editar com valores de produção
```

**Variáveis Importantes:**
```env
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rsv_360_ecosystem
DB_USER=postgres
DB_PASSWORD=<senha_forte>
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=<chave_secreta_forte>
```

---

### Passo 3: Executar Deploy

```bash
# No servidor
cd /var/www/rsv360
npm run deploy:prod
```

**O que o deploy faz:**
1. 📥 Atualiza código (git pull)
2. 📦 Instala dependências
3. 🐳 Build e start containers Docker
4. 🌐 Inicia Nginx proxy
5. 🏥 Health check

---

## 🌐 CONFIGURAR DNS

### Registrar Domínios
```
A Record: guest.rsv360.com → IP_DO_SERVIDOR
A Record: admin.rsv360.com → IP_DO_SERVIDOR
A Record: api.rsv360.com → IP_DO_SERVIDOR
```

### Aguardar Propagação
- DNS pode levar até 24h para propagar
- Geralmente funciona em 1-2 horas

---

## 🔐 SEGURANÇA (Importante!)

### 1. SSL/TLS (HTTPS)
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificados
sudo certbot --nginx -d guest.rsv360.com
sudo certbot --nginx -d admin.rsv360.com
sudo certbot --nginx -d api.rsv360.com
```

### 2. Firewall
```bash
# Configurar UFW
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 3. Variáveis de Ambiente Seguras
- ✅ NUNCA commitar `.env` no Git
- ✅ Usar senhas fortes
- ✅ Rotacionar `JWT_SECRET` regularmente
- ✅ Usar variáveis de ambiente do servidor

---

## 📊 MONITORAMENTO

### Ver Logs
```bash
# Logs de todos os serviços
npm run docker:logs

# Logs de um serviço específico
docker-compose -f docker-compose.prod.yml logs -f guest
docker-compose -f docker-compose.prod.yml logs -f admin
docker-compose -f docker-compose.prod.yml logs -f api

# Logs do Nginx
npm run nginx:logs
```

### Status dos Containers
```bash
npm run docker:status
```

### Health Checks
```bash
# API
curl http://localhost:5000/api/health

# Guest App
curl http://localhost:3000

# Admin App
curl http://localhost:3001
```

---

## 🔄 ROLLBACK (Emergência)

### Opção 1: Git Rollback
```bash
# No servidor
cd /var/www/rsv360
git checkout main~1
npm run deploy:prod
```

### Opção 2: Docker Rollback
```bash
# Parar containers
npm run docker:stop

# Voltar para versão anterior (se tiver tag)
git checkout <tag-anterior>
npm run deploy:prod
```

---

## ✅ CHECKLIST PRÉ-DEPLOY

- [ ] Servidor configurado (Node.js, Docker, Git)
- [ ] Variáveis de ambiente configuradas
- [ ] DNS configurado
- [ ] Firewall configurado
- [ ] Backup do banco de dados (se existir)
- [ ] Plano de rollback testado

---

## 🎯 COMANDOS RÁPIDOS

### Deploy Completo
```bash
ssh user@servidor
cd /var/www/rsv360
npm run deploy:prod
```

### Ver Logs
```bash
npm run docker:logs
```

### Parar Produção
```bash
npm run nginx:stop
npm run docker:stop
```

### Restart
```bash
npm run docker:stop
npm run deploy:prod
```

---

## 🎉 RESULTADO ESPERADO

Após deploy:
- ✅ `guest.rsv360.com` → Guest App LIVE
- ✅ `admin.rsv360.com` → Admin App LIVE
- ✅ `api.rsv360.com` → API Backend LIVE
- ✅ Todos os serviços rodando
- ✅ SSL/TLS configurado (se aplicado)
- ✅ Monitoramento ativo

---

**Criado em:** 27/12/2025  
**Status:** ✅ **PRONTO PARA DEPLOY REAL**


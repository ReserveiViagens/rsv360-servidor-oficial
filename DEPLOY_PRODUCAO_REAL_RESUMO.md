# 🚀 DEPLOY PRODUÇÃO REAL - RESUMO EXECUTIVO

**Data:** 27/12/2025  
**Status:** ✅ **PRONTO PARA DEPLOY REAL**

---

## 🎯 PROCESSO EM 4 PASSOS

### Passo 1: Copiar Código para Servidor

#### Opção A: Via Git (Recomendado)
```bash
ssh user@servidor
cd /var/www
git clone <seu-repositorio> rsv360
cd rsv360
```

#### Opção B: Via SCP
```bash
# No seu computador local
./scripts/copiar-para-servidor.sh user@servidor
```

---

### Passo 2: Configurar Variáveis de Ambiente

```bash
cd /var/www/rsv360

# API
cd apps/api
cp .env.example .env
nano .env  # Editar com valores de produção

# Jobs
cd ../jobs
cp ../api/.env .env
nano .env  # Verificar e ajustar
```

**Variáveis Críticas:**
- `DB_PASSWORD` - Senha forte do PostgreSQL
- `JWT_SECRET` - Chave secreta forte (MUDE EM PRODUÇÃO!)
- `NODE_ENV=production`

---

### Passo 3: Executar Deploy

```bash
cd /var/www/rsv360
npm run deploy:prod
```

**O que faz:**
1. 📥 Atualiza código (git pull)
2. 📦 Instala dependências
3. 🐳 Build e start containers Docker
4. 🌐 Inicia Nginx proxy
5. 🏥 Health check

---

### Passo 4: Configurar DNS

```
A Record: guest.rsv360.com → IP_DO_SERVIDOR
A Record: admin.rsv360.com → IP_DO_SERVIDOR
A Record: api.rsv360.com → IP_DO_SERVIDOR
```

**Aguardar propagação:** 1-24 horas (geralmente 1-2 horas)

---

## 🔐 SEGURANÇA (Após Deploy)

### SSL/TLS (HTTPS)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d guest.rsv360.com
sudo certbot --nginx -d admin.rsv360.com
sudo certbot --nginx -d api.rsv360.com
```

### Firewall
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## 📊 VALIDAÇÃO

### Após Deploy
```bash
# Status
npm run docker:status

# Logs
npm run docker:logs

# Health checks
curl http://localhost:5000/api/health
curl http://localhost/
```

---

## 🔄 ROLLBACK (Emergência)

```bash
cd /var/www/rsv360
git checkout main~1
npm run deploy:prod
```

---

## ✅ CHECKLIST RÁPIDO

- [ ] Código copiado para servidor
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy executado
- [ ] DNS configurado
- [ ] SSL/TLS configurado (opcional)
- [ ] Firewall configurado
- [ ] Monitoramento ativo

---

## 🎉 RESULTADO ESPERADO

Após deploy:
- ✅ `guest.rsv360.com` → Guest App LIVE
- ✅ `admin.rsv360.com` → Admin App LIVE
- ✅ `api.rsv360.com` → API Backend LIVE
- ✅ Todos os serviços rodando
- ✅ SSL/TLS configurado (se aplicado)

---

**Criado em:** 27/12/2025  
**Status:** ✅ **PRONTO PARA DEPLOY REAL**


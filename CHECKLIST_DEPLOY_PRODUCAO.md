# ✅ CHECKLIST - DEPLOY EM PRODUÇÃO REAL

**Data:** 27/12/2025  
**Status:** ⏳ **PRÉ-DEPLOY**

---

## 📋 PRÉ-REQUISITOS NO SERVIDOR

### Software Necessário
- [ ] Node.js 20+ instalado
- [ ] Docker instalado
- [ ] Docker Compose instalado
- [ ] Git instalado
- [ ] Nginx instalado (opcional, se não usar container)

### Portas Liberadas
- [ ] Porta 80 (HTTP) liberada no firewall
- [ ] Porta 443 (HTTPS) liberada no firewall
- [ ] Porta 5000 (API) liberada no firewall (ou apenas interno)
- [ ] Porta 22 (SSH) liberada no firewall

### Permissões
- [ ] Usuário tem permissão para Docker (sem sudo)
- [ ] Diretório `/var/www/rsv360` criado e com permissões
- [ ] Acesso SSH configurado

---

## 🚀 PROCESSO DE DEPLOY

### Passo 1: Copiar Código ✅
- [ ] Código copiado para servidor
- [ ] Estrutura de diretórios verificada
- [ ] Arquivos essenciais presentes

**Comando:**
```bash
# Opção A: Via Git (Recomendado)
ssh user@servidor
cd /var/www
git clone <seu-repositorio> rsv360
cd rsv360

# Opção B: Via SCP
./scripts/copiar-para-servidor.sh user@servidor
```

---

### Passo 2: Configurar Variáveis de Ambiente ✅
- [ ] `apps/api/.env` criado e configurado
- [ ] `apps/jobs/.env` criado e configurado
- [ ] Senhas fortes configuradas
- [ ] JWT_SECRET configurado
- [ ] Credenciais de banco configuradas

**Comando:**
```bash
cd /var/www/rsv360

# Criar .env para API
cd apps/api
cp .env.example .env
nano .env  # Editar com valores de produção

# Criar .env para Jobs
cd ../jobs
cp ../api/.env .env
nano .env  # Verificar e ajustar se necessário
```

**Variáveis Críticas:**
- ✅ `DB_PASSWORD` - Senha forte do PostgreSQL
- ✅ `JWT_SECRET` - Chave secreta forte (mude em produção!)
- ✅ `NODE_ENV=production`

---

### Passo 3: Executar Deploy ✅
- [ ] Dependências instaladas
- [ ] Containers Docker iniciados
- [ ] Nginx proxy iniciado
- [ ] Health checks OK

**Comando:**
```bash
cd /var/www/rsv360
chmod +x scripts/deploy-producao-real.sh
./scripts/deploy-producao-real.sh

# Ou usar npm
npm run deploy:prod
```

---

### Passo 4: Configurar DNS ✅
- [ ] Domínio `guest.rsv360.com` configurado
- [ ] Domínio `admin.rsv360.com` configurado
- [ ] Domínio `api.rsv360.com` configurado
- [ ] DNS propagado (pode levar 1-24h)

**Configuração DNS:**
```
Tipo: A Record
Nome: guest.rsv360.com
Valor: IP_DO_SERVIDOR
TTL: 3600

Tipo: A Record
Nome: admin.rsv360.com
Valor: IP_DO_SERVIDOR
TTL: 3600

Tipo: A Record
Nome: api.rsv360.com
Valor: IP_DO_SERVIDOR
TTL: 3600
```

---

## 🔐 SEGURANÇA (Importante!)

### SSL/TLS (HTTPS)
- [ ] Certbot instalado
- [ ] Certificados gerados para guest.rsv360.com
- [ ] Certificados gerados para admin.rsv360.com
- [ ] Certificados gerados para api.rsv360.com
- [ ] Nginx configurado para HTTPS
- [ ] Redirecionamento HTTP → HTTPS configurado

**Comando:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d guest.rsv360.com
sudo certbot --nginx -d admin.rsv360.com
sudo certbot --nginx -d api.rsv360.com
```

### Firewall
- [ ] UFW configurado
- [ ] Apenas portas necessárias abertas
- [ ] SSH protegido (chave, não senha)

**Comando:**
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### Variáveis de Ambiente
- [ ] `.env` NÃO commitado no Git
- [ ] Senhas fortes configuradas
- [ ] JWT_SECRET único e forte
- [ ] Credenciais de produção diferentes de desenvolvimento

---

## 📊 VALIDAÇÃO PÓS-DEPLOY

### Testes de Funcionalidade
- [ ] Guest App acessível em `http://guest.rsv360.com`
- [ ] Admin App acessível em `http://admin.rsv360.com`
- [ ] API respondendo em `http://api.rsv360.com`
- [ ] Health check da API funcionando
- [ ] Login funcionando
- [ ] Criação de leilões funcionando (se aplicável)

### Testes de Performance
- [ ] Tempo de resposta < 2s
- [ ] Containers usando recursos adequados
- [ ] Banco de dados respondendo rapidamente
- [ ] Redis funcionando

### Monitoramento
- [ ] Logs sendo gerados
- [ ] Erros sendo registrados
- [ ] Métricas disponíveis (opcional)

---

## 🔄 ROLLBACK PLAN

### Se Algo Der Errado

#### Opção 1: Git Rollback
```bash
cd /var/www/rsv360
git checkout main~1
npm run deploy:prod
```

#### Opção 2: Docker Rollback
```bash
npm run docker:stop
git checkout <tag-anterior>
npm run deploy:prod
```

#### Opção 3: Restart Limpo
```bash
npm run nginx:stop
npm run docker:stop
npm run deploy:prod
```

---

## ✅ CHECKLIST FINAL

### Antes do Deploy
- [ ] Backup do banco de dados atual (se existir)
- [ ] Backup do código atual (se existir)
- [ ] Plano de rollback testado
- [ ] Equipe notificada

### Durante o Deploy
- [ ] Deploy executado
- [ ] Containers iniciados
- [ ] Health checks OK
- [ ] Logs verificados

### Após o Deploy
- [ ] Todos os serviços rodando
- [ ] DNS configurado
- [ ] SSL/TLS configurado
- [ ] Monitoramento ativo
- [ ] Equipe notificada

---

## 📞 SUPORTE

### Comandos Úteis
```bash
# Status
npm run docker:status

# Logs
npm run docker:logs
npm run nginx:logs

# Restart
npm run docker:stop
npm run deploy:prod

# Parar tudo
npm run nginx:stop
npm run docker:stop
```

### Troubleshooting
- Ver logs: `npm run docker:logs`
- Ver status: `npm run docker:status`
- Testar serviços: `curl http://localhost:5000/api/health`

---

**Criado em:** 27/12/2025  
**Status:** ✅ **PRONTO PARA DEPLOY REAL**


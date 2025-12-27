# 🚀 GUIA DE DEPLOY - PRODUÇÃO RSV360

**Data:** 27/12/2025  
**Versão:** 1.0.0

---

## 📋 Pré-requisitos

- ✅ Node.js 20+ instalado
- ✅ Docker e Docker Compose instalados
- ✅ PostgreSQL e Redis (ou usar containers Docker)
- ✅ Git configurado (opcional, para pull automático)

---

## 🚀 Deploy Produção (1 Comando)

### Windows (PowerShell)
```powershell
npm run deploy:prod
```

### Linux/Mac (Bash)
```bash
chmod +x deploy.prod.sh
npm run deploy:prod
```

### O Que Faz
1. 📥 Atualiza código (git pull)
2. 📦 Instala dependências de produção
3. 🐳 Build e start containers Docker
4. 🌐 Inicia Nginx proxy
5. 🏥 Verifica saúde dos serviços

---

## 🧪 Teste Local (Simular Produção)

```bash
# 1. Start Docker (infraestrutura + apps)
npm run docker:prod

# 2. Start Nginx
npm run nginx:start

# 3. Testar
curl http://localhost/          # Guest App
curl http://localhost/leiloes   # Leilões
curl http://localhost:5000/api/health # API

# 4. Ver logs
npm run docker:logs
npm run nginx:logs

# 5. Parar
npm run nginx:stop
npm run docker:stop
```

---

## 🔄 Rollback (Emergência)

### Opção 1: Git Rollback
```bash
# Voltar para commit anterior
git checkout main~1

# Re-deploy
npm run deploy:prod
```

### Opção 2: Docker Rollback
```bash
# Parar containers
npm run docker:stop

# Voltar para versão anterior (se tiver tag)
docker-compose -f docker-compose.prod.yml pull
npm run deploy:prod
```

### Opção 3: Restart Limpo
```bash
# Parar tudo
npm run nginx:stop
npm run docker:stop

# Limpar volumes (CUIDADO: apaga dados!)
docker-compose -f docker-compose.prod.yml down -v

# Re-deploy
npm run deploy:prod
```

---

## 📊 Monitoramento

### Status dos Containers
```bash
npm run docker:status
```

### Logs em Tempo Real
```bash
# Todos os serviços
npm run docker:logs

# Serviço específico
docker-compose -f docker-compose.prod.yml logs -f guest
docker-compose -f docker-compose.prod.yml logs -f admin
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f jobs

# Nginx
npm run nginx:logs
```

### Health Checks
```bash
# API
curl http://localhost:5000/api/health

# Guest App
curl http://localhost/

# Admin App
curl http://localhost:3001/dashboard
```

---

## 🌐 URLs de Produção

### Desenvolvimento (NÃO MUDA)
```
http://localhost:3000  # Guest App (direto)
http://localhost:3001  # Admin App (direto)
http://localhost:5000  # API (direto)
```

### Produção (Com Nginx)
```
http://localhost/              # Guest App (via proxy)
http://admin.rsv360.com/       # Admin App (via proxy, se DNS configurado)
http://api.rsv360.com/         # API (via proxy, se DNS configurado)
```

---

## 🛑 Parar Produção

```bash
# Parar Nginx
npm run nginx:stop

# Parar Docker
npm run docker:stop

# Parar tudo
npm run nginx:stop && npm run docker:stop
```

---

## 🔧 Troubleshooting

### Containers não iniciam
```bash
# Ver logs de erro
npm run docker:logs

# Verificar status
npm run docker:status

# Restart limpo
npm run docker:stop
npm run docker:prod
```

### Nginx não inicia
```bash
# Verificar se porta 80 está livre
netstat -ano | findstr :80  # Windows
lsof -i :80                 # Linux/Mac

# Testar configuração
npm run nginx:test

# Ver logs
npm run nginx:logs
```

### Serviços não respondem
```bash
# Verificar se containers estão rodando
npm run docker:status

# Ver logs
npm run docker:logs

# Health check manual
curl http://localhost:5000/api/health
curl http://localhost/
```

---

## 📦 Deploy em Servidor VPS/Cloud

### 1. Copiar Arquivos
```bash
# Via SCP
scp -r . user@servidor:/var/www/rsv360/

# Via Git
ssh user@servidor
cd /var/www/rsv360
git pull origin main
```

### 2. Executar Deploy
```bash
cd /var/www/rsv360
npm run deploy:prod
```

### 3. Configurar DNS
```
guest.rsv360.com  → IP_DO_SERVIDOR
admin.rsv360.com  → IP_DO_SERVIDOR
api.rsv360.com    → IP_DO_SERVIDOR
```

---

## 🔐 Segurança

### Variáveis de Ambiente
- ✅ NUNCA commitar `.env` no Git
- ✅ Usar variáveis de ambiente no servidor
- ✅ Rotacionar `JWT_SECRET` regularmente
- ✅ Usar senhas fortes para PostgreSQL

### Firewall
```bash
# Permitir apenas portas necessárias
# 80 (HTTP)
# 443 (HTTPS - futuro)
# 22 (SSH)
```

### SSL/TLS (Futuro)
- Configurar Let's Encrypt
- Atualizar Nginx para HTTPS
- Redirecionar HTTP → HTTPS

---

## 📈 Monitoramento Contínuo

### Logs
```bash
# Logs em arquivo (futuro)
docker-compose -f docker-compose.prod.yml logs >> /var/log/rsv360.log
```

### Métricas
- CPU e memória dos containers
- Uptime dos serviços
- Taxa de erro das APIs
- Tempo de resposta

---

## 🎯 Checklist Pós-Deploy

- [ ] Todos os containers rodando
- [ ] Nginx respondendo
- [ ] Guest App acessível
- [ ] Admin App acessível
- [ ] API respondendo
- [ ] Health checks OK
- [ ] Logs sem erros críticos
- [ ] DNS configurado (se aplicável)

---

## 📞 Suporte

Em caso de problemas:
1. Verificar logs: `npm run docker:logs`
2. Verificar status: `npm run docker:status`
3. Rollback se necessário: `git checkout main~1 && npm run deploy:prod`

---

**Última atualização:** 27/12/2025  
**Versão do deploy:** 1.0.0


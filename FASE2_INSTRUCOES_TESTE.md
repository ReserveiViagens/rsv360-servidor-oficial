# 🧪 Fase 2: Instruções de Teste Final

**Data:** 27/12/2025

---

## 🎯 Teste Principal: `npm run dev:migration`

### 1. Executar o Comando

```bash
npm run dev:migration
```

### 2. Aguardar Inicialização

Os servidores devem iniciar em:
- **Guest App:** http://localhost:3000
- **Admin App:** http://localhost:3001

### 3. Verificar Logs

Você deve ver algo como:
```
[0] > next dev -p 3000
[1] > next dev -p 3001
[0] ready - started server on 0.0.0.0:3000
[1] ready - started server on 0.0.0.0:3001
```

---

## ✅ URLs para Testar

### Guest App (http://localhost:3000)

1. **Página Inicial**
   - URL: http://localhost:3000/
   - **Esperado:** Página carrega (pode redirecionar para /dashboard ou /login)
   - **Status:** ✅ / ❌

2. **Página Explore**
   - URL: http://localhost:3000/explore
   - **Esperado:** Página básica com mensagem "Será preenchida na Fase 3"
   - **Status:** ✅ / ❌

### Admin App (http://localhost:3001)

1. **Dashboard**
   - URL: http://localhost:3001/dashboard
   - **Esperado:** Dashboard completo com stats, ações rápidas, reservas recentes
   - **Status:** ✅ / ❌
   - **Nota:** Pode ter erros de backend não disponível (OK)

2. **Analytics**
   - URL: http://localhost:3001/analytics
   - **Esperado:** Analytics dashboard com tabs
   - **Status:** ✅ / ❌
   - **Nota:** Pode ter erros de backend não disponível (OK)

3. **Criar Leilão**
   - URL: http://localhost:3001/leiloes/criar
   - **Esperado:** Formulário de criação de leilão
   - **Status:** ✅ / ❌
   - **Nota:** Pode ter erros de backend não disponível (OK)

---

## ⚠️ Erros Esperados (OK)

### 1. Backend Não Disponível
**Mensagem:** "Backend não disponível. Verifique se o servidor está rodando na porta 5000."

**Status:** ✅ **OK** - Esperado se o backend não estiver rodando

### 2. Warnings de Dependências
**Mensagem:** Warnings sobre versões de pacotes

**Status:** ✅ **OK** - Não impede funcionamento

### 3. Erros de TypeScript (Warnings)
**Mensagem:** Warnings de tipos TypeScript

**Status:** ✅ **OK** - Se não quebrar a compilação

---

## ❌ Erros Críticos (Precisam Correção)

### 1. Módulo Não Encontrado
**Mensagem:** `Module not found: Can't resolve '@shared/api/auctions'`

**Ação:** Verificar `tsconfig.json` paths

### 2. Servidor Não Inicia
**Mensagem:** Erro ao iniciar Next.js

**Ação:** Verificar logs e dependências

### 3. Porta Já em Uso
**Mensagem:** `Port 3000 is already in use`

**Ação:** Parar processo na porta ou usar porta diferente

---

## 📋 Checklist de Validação

### Servidores
- [ ] Guest App inicia sem erros críticos
- [ ] Admin App inicia sem erros críticos
- [ ] Ambos rodam simultaneamente

### Páginas Guest
- [ ] http://localhost:3000/ carrega
- [ ] http://localhost:3000/explore carrega

### Páginas Admin
- [ ] http://localhost:3001/dashboard carrega
- [ ] http://localhost:3001/analytics carrega
- [ ] http://localhost:3001/leiloes/criar carrega

### Imports
- [ ] Sem erros de módulos não encontrados
- [ ] Imports de `@shared/api/*` funcionam
- [ ] Imports relativos funcionam

---

## 🎯 Critério de Sucesso

✅ **SUCESSO:** 
- Ambos os servidores iniciam
- Todas as páginas carregam (mesmo com erros de backend)
- Sem erros críticos de imports ou módulos

⚠️ **AVISOS ACEITÁVEIS:**
- Backend não disponível
- Warnings de dependências
- Warnings de TypeScript

❌ **FALHA:**
- Servidores não iniciam
- Erros de módulos não encontrados
- Imports quebrados

---

## 📝 Anotar Resultados

Após testar, anotar:

### Logs do Guest App
```
[COLE AQUI OS LOGS]
```

### Logs do Admin App
```
[COLE AQUI OS LOGS]
```

### Erros Encontrados
```
[LISTE OS ERROS AQUI]
```

### Status Final
- [ ] ✅ Tudo funcionando
- [ ] ⚠️ Funcionando com avisos
- [ ] ❌ Erros críticos encontrados

---

**Teste executado em:** ___________  
**Resultado:** ___________


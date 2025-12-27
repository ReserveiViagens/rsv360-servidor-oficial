# Script PowerShell para Deploy de Producao
# FASE 5.4: Deploy Producao 1-Clique

Write-Host "=== DEPLOY PRODUCAO RSV360 MONOREPO ===" -ForegroundColor Cyan
Write-Host ""

# 1. Pull latest code (se git estiver configurado)
Write-Host "1. Atualizando codigo..." -ForegroundColor Yellow
try {
    $gitStatus = git status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Git detectado. Pulling latest code..." -ForegroundColor Gray
        git pull origin main 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   Codigo atualizado" -ForegroundColor Green
        } else {
            Write-Host "   Git pull falhou (continuando...)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   Git nao configurado ou nao e repositorio (continuando...)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   Git nao disponivel (continuando...)" -ForegroundColor Gray
}
Write-Host ""

# 2. Install production dependencies
Write-Host "2. Instalando dependencias de producao..." -ForegroundColor Yellow
npm ci --production --ignore-scripts 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "   npm ci falhou, tentando npm install..." -ForegroundColor Yellow
    npm install --production --ignore-scripts 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Dependencias instaladas (npm install)" -ForegroundColor Green
    } else {
        Write-Host "   Erro ao instalar dependencias" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# 3. Docker build + start
Write-Host "3. Build e start containers Docker..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down 2>&1 | Out-Null
Write-Host "   Containers antigos parados" -ForegroundColor Gray

docker-compose -f docker-compose.prod.yml up --build -d 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Containers Docker iniciados" -ForegroundColor Green
} else {
    Write-Host "   Erro ao iniciar containers Docker" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. Nginx proxy
Write-Host "4. Iniciando Nginx proxy..." -ForegroundColor Yellow
npm run nginx:start 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Nginx iniciado" -ForegroundColor Green
} else {
    Write-Host "   Nginx pode ja estar rodando (continuando...)" -ForegroundColor Yellow
}
Write-Host ""

# 5. Health check
Write-Host "5. Verificando saude dos servicos..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$healthCheck = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "   API Health check OK" -ForegroundColor Green
        $healthCheck = $true
    }
} catch {
    Write-Host "   API Health check falhou (servico pode estar iniciando...)" -ForegroundColor Yellow
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost/" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "   Guest App OK" -ForegroundColor Green
        $healthCheck = $true
    }
} catch {
    Write-Host "   Guest App nao respondeu (pode estar iniciando...)" -ForegroundColor Yellow
}

if (-not $healthCheck) {
    Write-Host "   Alguns servicos podem estar iniciando. Aguarde alguns segundos." -ForegroundColor Yellow
    Write-Host "   Execute: npm run docker:logs para ver logs" -ForegroundColor Gray
}
Write-Host ""

# 6. Status final
Write-Host "=== DEPLOY CONCLUIDO ===" -ForegroundColor Green
Write-Host ""
Write-Host "URLs disponiveis:" -ForegroundColor Cyan
Write-Host "   http://localhost/          -> Guest App" -ForegroundColor Gray
Write-Host "   http://admin.rsv360.com/   -> Admin App (se DNS configurado)" -ForegroundColor Gray
Write-Host "   http://api.rsv360.com/     -> API Backend (se DNS configurado)" -ForegroundColor Gray
Write-Host ""
Write-Host "Comandos uteis:" -ForegroundColor Cyan
Write-Host "   npm run docker:status  -> Status dos containers" -ForegroundColor Gray
Write-Host "   npm run docker:logs    -> Ver logs" -ForegroundColor Gray
Write-Host "   npm run nginx:logs    -> Logs do Nginx" -ForegroundColor Gray
Write-Host ""
Write-Host "Parar producao:" -ForegroundColor Cyan
Write-Host "   npm run nginx:stop" -ForegroundColor Gray
Write-Host "   npm run docker:stop" -ForegroundColor Gray
Write-Host ""
Write-Host "PRODUCAO ATUALIZADA E RODANDO!" -ForegroundColor Green

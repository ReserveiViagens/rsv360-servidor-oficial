Continue = 'Stop'
 = @{ Authorization = 'Bearer admin-token-123'; 'Content-Type'='application/json' }

# Criar (POST)
Write-Host '== POST criar hotel =='
 = Get-Content -Raw -Path 'backend/tmp-hotel.json'
 = Invoke-RestMethod -Uri 'http://localhost:5002/api/admin/website/content' -Method Post -Headers  -Body 
 | ConvertTo-Json -Depth 6 | Out-File -Encoding utf8 backend\out-create.json

# Listar (GET)
Write-Host '== GET listar hoteis =='
 = Invoke-RestMethod -Uri 'http://localhost:5002/api/admin/website/content/hotels' -Method Get -Headers 
 | ConvertTo-Json -Depth 6 | Out-File -Encoding utf8 backend\out-list.json

# Atualizar (PUT)
Write-Host '== PUT atualizar hotel =='
 = '{"description":"Hotel atualizado automaticamente","metadata":{"price":275}}'
 = Invoke-RestMethod -Uri 'http://localhost:5002/api/admin/website/content/hotels/hoteltestersv4' -Method Put -Headers  -Body 
 | ConvertTo-Json -Depth 6 | Out-File -Encoding utf8 backend\out-update.json

# Deletar (DELETE)
Write-Host '== DELETE deletar hotel =='
 = Invoke-RestMethod -Uri 'http://localhost:5002/api/admin/website/content/hotels/hoteltestersv4' -Method Delete -Headers 
 | ConvertTo-Json -Depth 6 | Out-File -Encoding utf8 backend\out-delete.json

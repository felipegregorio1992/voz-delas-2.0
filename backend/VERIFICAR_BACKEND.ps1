# Script para verificar se o backend está rodando

Write-Host "🔍 Verificando se o backend está rodando..." -ForegroundColor Cyan

# Verificar se a porta 3000 está em uso
$connection = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($connection) {
    Write-Host "✅ Backend está rodando na porta 3000!" -ForegroundColor Green
    Write-Host "   Estado: $($connection.State)" -ForegroundColor Green
    
    # Testar conexão HTTP
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/health" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ Backend está respondendo corretamente!" -ForegroundColor Green
        Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Backend está na porta 3000 mas não está respondendo em /api/v1/health" -ForegroundColor Yellow
        Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Backend NÃO está rodando na porta 3000!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para iniciar o backend, execute:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor White
    Write-Host "  npm run start:dev" -ForegroundColor White
}

Write-Host ""
Write-Host "📱 Para o app mobile conectar:" -ForegroundColor Cyan
Write-Host "   Emulador Android: http://10.0.2.2:3000/api/v1" -ForegroundColor White
Write-Host "   Dispositivo físico: http://SEU_IP:3000/api/v1" -ForegroundColor White

# Script pentru a porni aplicatia Balance Beacon Buddy

Write-Host "Porneste aplicatia Balance Beacon Buddy..." -ForegroundColor Green

# Defineste calea de baza
$BasePath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Porneste backend-ul
Write-Host "Porneste backend-ul..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BasePath'; Write-Host 'Starting Backend Server...' -ForegroundColor Cyan; npm run dev --workspace=backend"

# Asteapta 5 secunde pentru ca backend-ul sa porneasca
Start-Sleep -Seconds 5

# Porneste frontend-ul
Write-Host "Porneste frontend-ul..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BasePath'; Write-Host 'Starting Frontend Server...' -ForegroundColor Cyan; npm run dev --workspace=frontend"

# Asteapta ca ambele servere sa porneasca
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Aplicatia a fost pornita cu succes!" -ForegroundColor Green
Write-Host "Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "Frontend App: Check terminal for actual port (usually 5173, 5174, or 5175)" -ForegroundColor White
Write-Host ""
Write-Host "Credentiale MASTER:" -ForegroundColor Cyan
Write-Host "   Email: paulaurelian@freshcrm.ro" -ForegroundColor White
Write-Host "   Parola: Maria14789*-" -ForegroundColor White
Write-Host ""
Write-Host "Nota: Frontend-ul va selecta automat un port disponibil." -ForegroundColor Yellow
Write-Host "Verifica terminalul frontend pentru portul exact." -ForegroundColor Yellow

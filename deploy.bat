@echo off
:: Balance Beacon Buddy - Script de deployment automatizat pentru Windows
:: Versiunea: 1.0.0

echo 🚀 Începe deployment-ul Balance Beacon Buddy...

:: Variabile de configurare
set APP_NAME=balance-beacon-buddy
set DOCKER_COMPOSE_FILE=docker-compose.yml
set ENV_FILE=.env

:: Verifică dacă Docker este disponibil
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker nu este instalat sau nu este în PATH
    echo Te rog să instalezi Docker Desktop pentru Windows
    pause
    exit /b 1
)

:: Verifică dacă Docker Compose este disponibil
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose nu este disponibil
    echo Te rog să instalezi Docker Compose
    pause
    exit /b 1
)

:: Verifică dacă fișierul .env există
if not exist "%ENV_FILE%" (
    echo ⚠️ Fișierul .env nu există. Copiez din .env.production...
    copy .env.production .env
    echo 🔧 Te rog să editezi fișierul .env cu datele tale reale:
    echo    - DB_HOST, DB_USER, DB_PASSWORD pentru Azure SQL
    echo    - JWT_SECRET (minim 32 caractere)
    echo    - EMAIL_USER, EMAIL_PASS pentru SMTP  
    echo    - VITE_API_URL pentru frontend
    pause
)

:: Oprește containerele existente
echo 🛑 Opresc containerele existente...
docker-compose down --remove-orphans

:: Întreabă dacă să cureţe imaginile vechi
set /p cleanup="🧹 Vrei să ștergi imaginile Docker vechi? (y/N): "
if /i "%cleanup%"=="y" (
    echo 🧹 Șterg imaginile Docker vechi...
    docker system prune -f
)

:: Construiește imaginile
echo 🔨 Construiesc imaginile Docker...
docker-compose build --no-cache

:: Pornește serviciile
echo 🚀 Pornesc serviciile...
docker-compose up -d

:: Așteaptă ca serviciile să pornească
echo ⏳ Aștept ca serviciile să pornească...
timeout /t 30 /nobreak >nul

:: Verifică starea serviciilor
echo 🔍 Verific starea serviciilor...
docker-compose ps

:: Testează health check-urile
echo 🏥 Testez health check-urile...

:: Test backend health (folosind PowerShell pentru request HTTP)
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:5000/health' -UseBasicParsing; Write-Host '✅ Backend health check: OK' } catch { Write-Host '❌ Backend health check: FAILED' }"

:: Test frontend
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:80/' -UseBasicParsing; Write-Host '✅ Frontend check: OK' } catch { Write-Host '❌ Frontend check: FAILED' }"

:: Întreabă dacă să afișeze logs
set /p showlogs="📋 Vrei să vezi logs-urile în timp real? (y/N): "
if /i "%showlogs%"=="y" (
    echo 📋 Logs în timp real (Ctrl+C pentru a ieși)...
    docker-compose logs -f
)

echo.
echo 🎉 Deployment completat!
echo 🌐 Frontend: http://localhost
echo 🔗 Backend API: http://localhost:5000  
echo 🏥 Health Check: http://localhost:5000/health
echo.
echo 📋 Comenzi utile:
echo    docker-compose logs -f        # Vezi logs-urile
echo    docker-compose ps            # Vezi starea serviciilor  
echo    docker-compose down          # Oprește serviciile
echo    docker-compose restart       # Repornește serviciile

pause

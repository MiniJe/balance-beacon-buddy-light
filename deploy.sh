#!/bin/bash

# Balance Beacon Buddy - Script de deployment automatizat
# Versiunea: 1.0.0

set -e  # Oprește execuția dacă apare o eroare

echo "🚀 Începe deployment-ul Balance Beacon Buddy..."

# Variabile de configurare
APP_NAME="balance-beacon-buddy"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Verifică dacă Docker și Docker Compose sunt instalate
if ! command -v docker &> /dev/null; then
    echo "❌ Docker nu este instalat. Te rog să instalezi Docker primul."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose nu este instalat. Te rog să instalezi Docker Compose primul."
    exit 1
fi

# Verifică dacă fișierul .env există
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  Fișierul .env nu există. Copiez din .env.production..."
    cp .env.production .env
    echo "🔧 Te rog să editezi fișierul .env cu datele tale reale:"
    echo "   - DB_HOST, DB_USER, DB_PASSWORD pentru Azure SQL"
    echo "   - JWT_SECRET (minim 32 caractere)"
    echo "   - EMAIL_USER, EMAIL_PASS pentru SMTP"
    echo "   - VITE_API_URL pentru frontend"
    read -p "Apasă ENTER după ce ai configurat fișierul .env..."
fi

# Oprește containerele existente
echo "🛑 Opresc containerele existente..."
docker-compose down --remove-orphans

# Curăță imagini vechi (opțional)
read -p "🧹 Vrei să ștergi imaginile Docker vechi? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Șterg imaginile Docker vechi..."
    docker system prune -f
fi

# Construiește imaginile
echo "🔨 Construiesc imaginile Docker..."
docker-compose build --no-cache

# Pornește serviciile
echo "🚀 Pornesc serviciile..."
docker-compose up -d

# Așteaptă ca serviciile să pornească
echo "⏳ Aștept ca serviciile să pornească..."
sleep 30

# Verifică starea serviciilor
echo "🔍 Verific starea serviciilor..."
docker-compose ps

# Testează health check-urile
echo "🏥 Testez health check-urile..."

# Test backend health
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend health check: OK"
else
    echo "❌ Backend health check: FAILED"
    echo "📋 Backend logs:"
    docker-compose logs backend | tail -20
fi

# Test frontend
if curl -f http://localhost:80/ > /dev/null 2>&1; then
    echo "✅ Frontend check: OK"
else
    echo "❌ Frontend check: FAILED"
    echo "📋 Frontend logs:"
    docker-compose logs frontend | tail -20
fi

# Afișează logs în timp real (opțional)
read -p "📋 Vrei să vezi logs-urile în timp real? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📋 Logs în timp real (Ctrl+C pentru a ieși)..."
    docker-compose logs -f
fi

echo ""
echo "🎉 Deployment completat!"
echo "🌐 Frontend: http://localhost"
echo "🔗 Backend API: http://localhost:5000"
echo "🏥 Health Check: http://localhost:5000/health"
echo ""
echo "📋 Comenzi utile:"
echo "   docker-compose logs -f        # Vezi logs-urile"
echo "   docker-compose ps            # Vezi starea serviciilor"
echo "   docker-compose down          # Oprește serviciile"
echo "   docker-compose restart       # Repornește serviciile"

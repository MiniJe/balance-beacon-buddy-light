# Backend Dockerfile pentru Balance Beacon Buddy
FROM node:18-alpine

# Setează directorul de lucru
WORKDIR /app

# Copiază package.json și package-lock.json
COPY package*.json ./

# Instalează dependențele
RUN npm ci --only=production

# Copiază codul sursă
COPY . .

# Construiește aplicația TypeScript
RUN npm run build

# Creează utilizator non-root pentru securitate
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Schimbă proprietarul fișierelor
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expune portul aplicației
EXPOSE 5000

# Setează variabilele de mediu
ENV NODE_ENV=production

# Pornește aplicația
CMD ["node", "dist/server.js"]

# Frontend Dockerfile pentru Balance Beacon Buddy
FROM node:18-alpine as builder

# Setează directorul de lucru
WORKDIR /app

# Copiază package.json și package-lock.json
COPY package*.json ./

# Instalează dependențele
RUN npm ci --only=production

# Copiază codul sursă
COPY . .

# Construiește aplicația pentru producție
RUN npm run build

# Etapa de producție - folosește nginx pentru servirea fișierelor statice
FROM nginx:alpine

# Copiază fișierele build din etapa anterioară
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiază configurația nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Expune portul 80
EXPOSE 80

# Pornește nginx
CMD ["nginx", "-g", "daemon off;"]

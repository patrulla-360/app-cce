FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Instalo serve para evitar npx en runtime
RUN npm i -g serve@14

# Cloud Run escucha en $PORT; por defecto 9090 para local
ENV PORT=9090
EXPOSE 9090

# Forma shell para expandir $PORT y bind en 0.0.0.0
CMD sh -c 'serve -s dist -l tcp://0.0.0.0:${PORT}'

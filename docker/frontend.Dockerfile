# ─── Stage 1: Build ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Vite build-time env: Google Sign-In Client ID (boş olabilir → buton gizlenir)
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

# ─── Stage 2: Serve ───────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx başlamadan önce index.html başlığına sistemdeki mağaza adını enjekte et
COPY inject-store-name.sh /docker-entrypoint.d/30-inject-store-name.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/30-inject-store-name.sh \
    && chmod +x /docker-entrypoint.d/30-inject-store-name.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ─── Stage 1: Build ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# PostgreSQL client'ı sunucu sürümüyle (PG16) eşitle — pg_dump/psql 16
# (varsayılan "postgresql-client" alpine 3.23'te PG18 çekiyordu, dump/restore
#  sürüm uyumsuzluğuna yol açıyordu)
RUN apk add --no-cache openssl postgresql16-client

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Runtime'da pg_dump/psql 16 (sunucu PG16 ile birebir uyum)
RUN apk add --no-cache openssl postgresql16-client

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma

# prisma ve @prisma/client artık production dependency, npm ci yükleyecek
RUN npm ci --omit=dev
# ts-node also needed for seeding - install after omitting dev
RUN npm install ts-node@10.9.2 typescript@6.0.3

# Prisma generated client (builder'dan kopyala)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY --from=builder /app/dist ./dist
# Statik veri (il/ilçe/mahalle JSON) tsc tarafından dist'e kopyalanmaz — elle kopyala
COPY --from=builder /app/src/data ./dist/data
COPY import-backup.js ./
COPY create-admin.js ./
COPY import-variants.js ./
COPY ceyiz_diyari_mock_db-v2.json ./

EXPOSE 5000

# Schema'yı veritabanına eşitle (migration skip)
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist/server.js"]

#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Nefesol Shop — Ubuntu/Debian sunucuya ilk kurulum
#
# Kullanım:
#   HTTP (yalnızca 80):
#     sudo DOMAIN=alanadiniz.com EMAIL=siz@alanadiniz.com bash deploy.sh
#
#   HTTPS (Let's Encrypt ile, DNS A kaydı sunucuya bakıyor olmalı):
#     sudo DOMAIN=alanadiniz.com EMAIL=siz@alanadiniz.com ENABLE_SSL=true bash deploy.sh
#
# Tekrar çalıştırıldığında repoyu günceller; mevcut .env'i korur.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Renkli çıktı ─────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[HATA]${NC} $1"; exit 1; }

# ─── Değişkenler ──────────────────────────────────────────────────
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"
ENABLE_SSL="${ENABLE_SSL:-false}"
REPO_URL="${REPO_URL:-https://github.com/onder7/Nefesol_Shop.git}"
APP_DIR="${APP_DIR:-/opt/nefesol-shop}"
COMPOSE="docker compose"

[[ -z "$DOMAIN" ]] && error "DOMAIN belirtin: DOMAIN=alanadiniz.com EMAIL=siz@alanadiniz.com bash deploy.sh"
[[ -z "$EMAIL"  ]] && error "EMAIL belirtin (SSL ve uyarılar için): EMAIL=siz@alanadiniz.com ..."
[[ $EUID -ne 0  ]] && error "Bu script root (sudo) ile çalıştırılmalıdır."

PROTO="http"; [[ "$ENABLE_SSL" == "true" ]] && PROTO="https"

info "Domain        : $DOMAIN"
info "Email         : $EMAIL"
info "SSL (HTTPS)   : $ENABLE_SSL"
info "Uygulama dizini: $APP_DIR"

# ─── 1. Sistem güncellemesi ───────────────────────────────────────
info "Sistem paketleri güncelleniyor..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq
apt-get install -y -qq curl git openssl ca-certificates >/dev/null

# ─── 2. Docker + Compose kurulumu ─────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Docker kuruluyor..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
else
  info "Docker zaten kurulu: $(docker --version)"
fi

if ! docker compose version &>/dev/null; then
  info "Docker Compose plugin kuruluyor..."
  apt-get install -y -qq docker-compose-plugin
fi
info "Compose: $(docker compose version | head -1)"

# ─── 3. Repo klonlama / güncelleme ────────────────────────────────
if [[ -d "$APP_DIR/.git" ]]; then
  info "Repo güncelleniyor ($APP_DIR)..."
  git -C "$APP_DIR" pull --ff-only
else
  info "Repo klonlanıyor → $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# ─── 4. .env dosyası ──────────────────────────────────────────────
if [[ ! -f .env ]]; then
  info ".env oluşturuluyor (.env.example'dan)..."
  cp .env.example .env

  # Güçlü secret/şifre üret
  JWT_SEC=$(openssl rand -hex 32)
  JWT_REF=$(openssl rand -hex 32)
  DB_PASS=$(openssl rand -hex 16)

  # .env.example içindeki placeholder'ları doldur
  sed -i "s/GUCLU_SIFRE_DEGISTIR/$DB_PASS/g" .env                       # POSTGRES_PASSWORD + DATABASE_URL
  sed -i "s/BURAYA_GUCLU_RASTGELE_SECRET_YAZIN/$JWT_SEC/" .env          # JWT_SECRET
  sed -i "s/BURAYA_BASKA_GUCLU_RASTGELE_SECRET/$JWT_REF/" .env          # JWT_REFRESH_SECRET
  sed -i "s#FRONTEND_URL=https://example.com#FRONTEND_URL=$PROTO://$DOMAIN#" .env
  sed -i "s#ADMIN_URL=https://example.com#ADMIN_URL=$PROTO://$DOMAIN#" .env
  sed -i "s/ADMIN_EMAIL=admin@example.com/ADMIN_EMAIL=$EMAIL/" .env

  warn ".env oluşturuldu → $APP_DIR/.env"
  warn "ÖNEMLİ: SMTP/Brevo, İyzico ve (varsa) Cloudinary bilgilerini elle doldurun."
else
  info ".env zaten var, korunuyor. (URL/secret değerleri değiştirilmedi)"
fi

# ─── 5. Nginx — domain'i HTTP config'e işle ───────────────────────
# Repo yalnızca HTTP config (default-http.conf) ile gelir; path-bazlı proxy.
info "Nginx HTTP konfigürasyonu hazırlanıyor..."
write_http_conf() {
  # $1 = "site" (siteyi proxylar) | "redirect" (80'i 443'e yönlendirir)
  local mode="$1"
  if [[ "$mode" == "redirect" ]]; then
    cat > nginx/conf.d/default-http.conf <<EOF
# HTTP → HTTPS yönlendirme (+ ACME challenge)
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\$host\$request_uri; }
}
EOF
  else
    cat > nginx/conf.d/default-http.conf <<EOF
# HTTP servis (SSL kurulana kadar) + ACME challenge
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN localhost;
    client_max_body_size 20m;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }

    location /api/ {
        proxy_pass         http://backend:5000/api/;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }
    location /uploads/ { proxy_pass http://backend:5000/uploads/; }
    location /admin/   { proxy_pass http://admin/; proxy_set_header Host \$host; }
    location /         { proxy_pass http://frontend/; proxy_set_header Host \$host; }
}
EOF
  fi
}
write_http_conf site

# ─── 6. Build & başlat ────────────────────────────────────────────
info "Tüm servisler build edilip başlatılıyor (ilk sefer birkaç dakika sürebilir)..."
$COMPOSE up -d --build

# ─── 7. Backend hazır olana kadar bekle, admin kullanıcısı oluştur ─
info "Backend'in hazır olması bekleniyor..."
for i in $(seq 1 30); do
  if $COMPOSE exec -T backend node -e "process.exit(0)" 2>/dev/null; then break; fi
  sleep 3
done

info "İlk admin kullanıcısı oluşturuluyor (varsa atlanır)..."
# create-admin.js sabit: admin@ecommerce.com / Admin123!  (zaten varsa P2002 ile geçer)
$COMPOSE exec -T backend node create-admin.js || warn "Admin kullanıcısı zaten var ya da oluşturulamadı (loglara bakın)."

# ─── 8. (Opsiyonel) SSL — Let's Encrypt / certbot ─────────────────
if [[ "$ENABLE_SSL" == "true" ]]; then
  info "SSL kurulumu başlıyor (DNS A kaydı $DOMAIN → bu sunucuya bakmalı)..."
  mkdir -p certbot/conf certbot/www

  # nginx'e sertifika dizinlerini mount etmek için compose override (repoyu kirletmeden)
  cat > docker-compose.override.yml <<'EOF'
# deploy.sh tarafından üretildi — nginx'e SSL sertifikalarını bağlar
services:
  nginx:
    volumes:
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
EOF

  # nginx'i override ile yeniden başlat (ACME challenge dizinini servis etsin)
  $COMPOSE up -d nginx

  # Sertifikayı al (webroot yöntemi)
  info "Let's Encrypt sertifikası alınıyor..."
  docker run --rm \
    -v "$APP_DIR/certbot/conf:/etc/letsencrypt" \
    -v "$APP_DIR/certbot/www:/var/www/certbot" \
    certbot/certbot certonly --webroot -w /var/www/certbot \
    -d "$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email -n \
    || error "Sertifika alınamadı. DNS A kaydını ve 80 portunun açık olduğunu kontrol edin."

  # HTTP config'i yönlendirmeye çevir, HTTPS config'i yaz
  write_http_conf redirect
  cat > nginx/conf.d/default.conf <<EOF
# HTTPS servis (Let's Encrypt)
server {
    listen 443 ssl;
    http2 on;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    client_max_body_size 20m;

    location /api/ {
        proxy_pass         http://backend:5000/api/;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }
    location /uploads/ { proxy_pass http://backend:5000/uploads/; }
    location /admin/   { proxy_pass http://admin/; proxy_set_header Host \$host; }
    location /         { proxy_pass http://frontend/; proxy_set_header Host \$host; }
}
EOF

  $COMPOSE up -d nginx
  info "HTTPS aktif."

  # Otomatik yenileme için cron (günde bir kez dener, nginx'i reload eder)
  RENEW_CMD="docker run --rm -v $APP_DIR/certbot/conf:/etc/letsencrypt -v $APP_DIR/certbot/www:/var/www/certbot certbot/certbot renew --quiet && cd $APP_DIR && $COMPOSE exec -T nginx nginx -s reload"
  CRON_LINE="0 3 * * * $RENEW_CMD"
  ( crontab -l 2>/dev/null | grep -v 'certbot/certbot renew' ; echo "$CRON_LINE" ) | crontab -
  info "Sertifika otomatik yenileme cron'u eklendi (her gün 03:00)."
fi

# ─── 9. Özet ──────────────────────────────────────────────────────
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "Kurulum tamamlandı!"
info ""
info "  Mağaza : $PROTO://$DOMAIN"
info "  Admin  : $PROTO://$DOMAIN/admin/"
info "  API    : $PROTO://$DOMAIN/api/"
info ""
info "  İlk admin: admin@ecommerce.com / Admin123!  → giriş yapıp ŞİFREYİ DEĞİŞTİRİN"
info ""
warn "Yapılacaklar:"
warn "  1. $APP_DIR/.env içinde SMTP/Brevo, İyzico bilgilerini doldurun, sonra: $COMPOSE up -d backend"
warn "  2. Admin → Ayarlar → Bildirimler'den e-posta gönderimini test edin"
warn "  3. Güncelleme için: cd $APP_DIR && git pull && $COMPOSE up -d --build"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

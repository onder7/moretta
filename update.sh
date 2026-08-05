#!/usr/bin/env bash
# update.sh — Mevcut kurulumu güncellemek için
# Kullanım: bash update.sh
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[HATA]${NC} $1"; exit 1; }

APP_DIR="/opt/mabridgeglobal"

[[ ! -d "$APP_DIR/.git" ]] && error "Uygulama dizini bulunamadı: $APP_DIR — Önce deploy.sh çalıştırın"

cd "$APP_DIR"

info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "MaBridge Update Başlıyor"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Kodu güncelle
info "Git pull..."
git pull origin master

# 2. Docker image'ları yeniden build et
info "Docker image'ları build ediliyor..."
docker compose build --no-cache backend frontend admin

# 3. Servisleri yeniden başlat
info "Servisler yeniden başlatılıyor..."
docker compose up -d --remove-orphans

# 4. Sağlık kontrolü
info "Servislerin başlaması bekleniyor (30s)..."
sleep 30

info "Servis durumu:"
docker compose ps

# 5. Backend sağlık kontrolü
if curl -sf http://localhost/api/health > /dev/null 2>&1; then
  info "✅ API sağlıklı"
else
  warn "⚠️  API henüz yanıt vermiyor — logları kontrol edin: docker compose logs backend"
fi

info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "Güncelleme tamamlandı!"
info "  Site:   https://mabridgeglobal.com"
info "  Admin:  https://mabridgeglobal.com/admin/"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

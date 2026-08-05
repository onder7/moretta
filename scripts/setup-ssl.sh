#!/bin/bash

# SSL Sertifikası Kurulum Script'i (Let's Encrypt + Certbot)
# Kullanım: chmod +x scripts/setup-ssl.sh && ./scripts/setup-ssl.sh

set -e

DOMAIN="moretta.com.tr"
EMAIL="admin@moretta.com.tr"  # Certbot bildirimler için email
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "================================================"
echo "Let's Encrypt SSL Sertifikası Kurulum"
echo "Domain: $DOMAIN"
echo "================================================"

# 1. Gerekli dizinleri oluştur
echo "📁 Dizinler oluşturuluyor..."
mkdir -p "$PROJECT_ROOT/letsencrypt"
mkdir -p "$PROJECT_ROOT/certbot-webroot"

# 2. Nginx'i sadece HTTP modu ile başlat (Certbot doğrulaması için)
echo "🐳 Nginx HTTP modu ile başlatılıyor (Certbot doğrulaması için)..."
cd "$PROJECT_ROOT"
docker compose up -d nginx

# Nginx'in başlaması için biraz bekle
sleep 3

# 3. Certbot'u host makinede çalıştır
echo "🔐 Certbot ile Let's Encrypt sertifikası alınıyor..."
docker run --rm \
  --volume "$PROJECT_ROOT/letsencrypt:/etc/letsencrypt" \
  --volume "$PROJECT_ROOT/certbot-webroot:/var/www/certbot" \
  --port 80:80 \
  certbot/certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --no-eff-email

# 4. Sertifikaların başarılı bir şekilde alındığını kontrol et
if [ -f "$PROJECT_ROOT/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ Sertifika başarılı bir şekilde alındı!"
    echo "   Konum: $PROJECT_ROOT/letsencrypt/live/$DOMAIN/"
else
    echo "❌ Sertifika alınamadı. Lütfen hataları kontrol edin."
    exit 1
fi

# 5. Docker'ı yeniden başlat (artık HTTPS desteğiyle)
echo "🔄 Docker compose yeniden başlatılıyor (HTTPS desteğiyle)..."
cd "$PROJECT_ROOT"
docker compose down
docker compose up -d

# 6. Servislerin başlaması için bekle
echo "⏳ Servislerin başlaması bekleniyor..."
sleep 5

# 7. HTTPS bağlantısını test et
echo "🧪 HTTPS bağlantısı test ediliyor..."
if curl -s --insecure https://localhost/ > /dev/null 2>&1; then
    echo "✅ HTTPS bağlantısı başarılı!"
else
    echo "⚠️  HTTPS bağlantısı test edilemedi, ancak sertifika kuruldu."
fi

echo ""
echo "================================================"
echo "✅ SSL Kurulumu Tamamlandı!"
echo "================================================"
echo ""
echo "📋 Sonraki Adımlar:"
echo "1. Firewall kurallarını kontrol edin (80, 443 portları açık olmalı)"
echo "2. DNS kayıtlarını kontrol edin (moretta.com.tr -> 31.7.33.14)"
echo "3. Uygulamaya https://moretta.com.tr adresinden erişin"
echo ""
echo "🔄 Sertifikaları Otomatik Yenileme için:"
echo "   Aşağıdaki cron job'ı ekleyin:"
echo "   0 3 * * * cd $PROJECT_ROOT && docker run --rm -v $PROJECT_ROOT/letsencrypt:/etc/letsencrypt -v $PROJECT_ROOT/certbot-webroot:/var/www/certbot certbot/certbot renew --webroot -w /var/www/certbot --quiet"
echo ""
echo "📊 Sertifika Bilgisi:"
openssl x509 -in "$PROJECT_ROOT/letsencrypt/live/$DOMAIN/fullchain.pem" -text -noout | grep -A 2 "Not Before\|Not After\|Subject:"

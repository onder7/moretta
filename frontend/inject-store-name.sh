#!/bin/sh
# nginx:alpine resmi entrypoint'i bu script'i (executable ise) nginx başlamadan
# önce çalıştırır. Amaç: statik index.html'deki "Online Mağaza" placeholder'ını
# sistemdeki gerçek mağaza adıyla değiştirmek — böylece WhatsApp/Facebook gibi
# JS çalıştırmayan link önizleme botları doğru başlığı görür.
#
# Mağaza adı backend'den (/api/company-info → data.name) alınır. Backend deploy
# sırasında geç açılabileceği için birkaç kez denenir. Alınamazsa varsayılan kalır.

HTML="/usr/share/nginx/html/index.html"
API_URL="${STORE_INFO_URL:-http://backend:5000/api/company-info}"
PLACEHOLDER="Online Mağaza"

[ -f "$HTML" ] || { echo "[store-name] $HTML yok, atlanıyor"; exit 0; }

NAME=""
i=1
while [ "$i" -le 12 ]; do
  RESP=$(wget -q -T 3 -O- "$API_URL" 2>/dev/null || true)
  # data.name alanını çek (legalName vb. ile karışmaz; "name":" küçük n ile)
  NAME=$(printf '%s' "$RESP" | grep -o '"name":"[^"]*"' | head -n1 | sed 's/^"name":"//; s/"$//')
  if [ -n "$NAME" ] && [ "$NAME" != "Mağaza" ]; then
    break
  fi
  echo "[store-name] ($i/12) mağaza adı henüz alınamadı, 2sn sonra tekrar..."
  sleep 2
  i=$((i + 1))
done

if [ -n "$NAME" ] && [ "$NAME" != "Mağaza" ]; then
  # sed değişim metni için &, /, \ karakterlerini kaçır
  ESC=$(printf '%s' "$NAME" | sed -e 's/[&/\]/\\&/g')
  sed -i "s/$PLACEHOLDER/$ESC/g" "$HTML"
  echo "[store-name] index.html başlığı güncellendi -> $NAME"
else
  echo "[store-name] Mağaza adı alınamadı, varsayılan '$PLACEHOLDER' korunuyor"
fi

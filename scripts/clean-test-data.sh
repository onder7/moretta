#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# clean-test-data.sh — Test verisini tek komutla temizler.
#
# SİLER: siparişler, sipariş kalemleri/durumları, ödemeler, kargolar, iptaller,
#        indirim kullanımları, sepetler ve stok hareketleri.
# KORUR: kullanıcılar, ürünler, kategoriler, markalar, ayarlar, kuponlar.
#
# Kullanım:
#   bash scripts/clean-test-data.sh          # onay sorar
#   bash scripts/clean-test-data.sh -y       # onay sormadan çalışır
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# Proje köküne geç (script'in bir üst dizini) — her yerden çalışsın
cd "$(dirname "$0")/.."

SERVICE="postgres"

# Onay (yanlışlıkla çalıştırmaya karşı). -y / --yes ile atlanır.
if [[ "${1:-}" != "-y" && "${1:-}" != "--yes" ]]; then
  printf "⚠️  Tüm sipariş/sepet/ödeme/iptal/stok-hareketi verisi SİLİNECEK (kullanıcılar ve ürünler korunur).\n"
  printf "Devam etmek için 'e' yazın: "
  read -r ans
  if [[ "$ans" != "e" && "$ans" != "E" ]]; then
    echo "İptal edildi."
    exit 0
  fi
fi

# FK-güvenli sırada, tek transaction içinde sil. Bir hata olursa hepsi geri alınır.
docker compose exec -T "$SERVICE" sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' <<'SQL'
BEGIN;
DELETE FROM order_cancellations;
DELETE FROM discount_usages;
DELETE FROM order_status_logs;
DELETE FROM payments;
DELETE FROM shippings;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM cart_items;
DELETE FROM carts;
DELETE FROM stock_movements;
COMMIT;
SQL

echo "✓ Test verisi temizlendi (kullanıcılar ve ürünler korundu)."

# Temiz Veritabanı Şeması - Test için

## 📋 Dosya Bilgileri

- **Dosya Adı**: `clean-schema-empty-database.sql`
- **Boyut**: 38 KB
- **Satır Sayısı**: 1.423 satır
- **İçerik**: Schema tanımları (veri YOK)
- **Oluşturma Tarihi**: 2026-06-07
- **Amaç**: Temiz test ortamı hazırlamak

---

## 📊 İçerilenler

37 tablo, tamamen boş:

### Kullanıcı & Hesap (5 tablo)
- `users` - Kullanıcı hesapları
- `user_profiles` - Kullanıcı profilleri
- `addresses` - Kullanıcı adresleri
- `carts` - Alışveriş sepetleri
- `cart_items` - Sepet kalemleri

### Ürün & Katalog (11 tablo)
- `products` - Ürünler
- `product_variants` - Ürün varyantları
- `product_images` - Ürün görüntüleri
- `product_tags` - Ürün etiketleri
- `categories` - Kategoriler
- `brands` - Markalar
- `attributes` - Ürün özellikleri
- `attribute_values` - Özellik değerleri
- `variant_attribute_values` - Varyant özellikleri
- `reviews` - İncelemeler
- `wishlists` / `wishlist_items` - İstek listeleri

### Sipariş & Ödeme (6 tablo)
- `orders` - Siparişler
- `order_items` - Sipariş kalemleri
- `order_status_logs` - Durum günlüğü
- `order_cancellations` - İptal talepleri
- `payments` - Ödeme bilgileri
- `shippings` - Kargo bilgileri

### İndirim & Kampanya (4 tablo)
- `discounts` - İndirimler
- `discount_usages` - İndirim kullanımları
- `campaigns` - Kampanyalar
- `campaign_products` - Kampanya ürünleri

### Sistem & Ayarlar (5 tablo)
- `site_settings` - Site ayarları
- `notifications` - Bildirimler
- `popup_notifications` - Açılır bildirimler
- `chatbot_rules` - Chatbot kuralları
- `contact_messages` - İletişim mesajları

### Diğer
- `_prisma_migrations` - Veritabanı geçişleri
- `newsletter_subscribers` - Haber bülteni aboneleri
- `product_questions` / `product_answers` - Ürün soruları/cevapları
- `discount_campaigns` - İndirim kampanyaları

---

## 🔄 **Geri Yükleme Yöntemi**

### Seçenek 1: Admin Panel Üzerinden
```
1. Admin Panel → Sistem Ayarları → Yedekleme
2. Dosya: clean-schema-empty-database.sql
3. "Geri Yükle" tıkla
4. Admin şifresi gir: Admin123!
5. ✓ Veritabanı resetlenecek
```

### Seçenek 2: Command Line
```bash
# Veritabanı sil (isteğe bağlı)
dropdb -U ecom -h localhost ecommerce

# Boş veritabanı oluştur
createdb -U ecom -h localhost ecommerce

# Şema yükle
psql -U ecom -h localhost -d ecommerce -f clean-schema-empty-database.sql
```

### Seçenek 3: Docker
```bash
docker exec -i -e PGPASSWORD=ecom_pass mabridgeglobal_fresh-postgres-1 \
  psql -h localhost -U ecom -d ecommerce < clean-schema-empty-database.sql
```

---

## ✅ **Test İş Akışı**

1. **Başta**: Temiz veritabanı yükle
2. **Test et**: Tüm testleri çalıştır
3. **Sonra**: Veritabanı resetle
4. **Tekrar et**: Sonraki test seti

---

## 🔐 **Güvenlik Notu**

- Şema tanımları içerir (CREATE TABLE, etc.)
- Veri YOKTUR (users, products, orders, vs.)
- Üretim veritabanı backup'ı DEĞİLDİR
- Test ortamı için hazırlandı

---

## 📝 **Test Senariyoları**

### Kullanıcı Kaydı Testi
- Temiz veritabanı ile başla
- Yeni kullanıcı kaydet
- Veri doğru kaydedildi mi? ✓

### Ürün Yönetimi Testi
- Ürün ekle
- Varyant oluştur
- Görüntü yükle
- Kategori ata

### Sipariş İşlemi Testi
- Ürün sepete ekle
- Adres seç
- Ödeme yap
- Sipariş doğru kaydedildi mi?

---

**Bu dosya test ortamı hazırlığında kullanılacak!** ✅

# Moretta - Yeni Ön Yüz Entegrasyon TODO

## Durum: 2. Aşama Tamamlandı

### [x] 1. Frontend mevcut yapıyı incele
### [x] 2. Tasarım bileşenlerini incele
### [x] 3. Bileşen eşleştirme haritası oluştur
### [x] 4. Yeni tasarım bileşenlerini frontend'e entegre et
  - [x] 4a. Tailwind config'e tasarım renklerini ekle (index.css @theme bloğu)
  - [x] 4b. Framer Motion bağımlılığını ekle
  - [x] 4c. Header bileşenini entegre et (tasarım stili + mevcut auth/API)
  - [x] 4d. Hero bileşenini entegre et (components/home/Hero.tsx)
  - [x] 4e. QuickCategories bileşenini entegre et (components/home/QuickCategories.tsx)
  - [x] 4f. FlashDeals bileşenini entegre et (components/home/FlashDeals.tsx)
  - [x] 4g. FeaturedProducts — Home.tsx içine entegre edildi
  - [ ] 4h. CoffeeFinder bileşenini entegre et (tasarımda kalabilir, sonra API bağlanır)
  - [ ] 4i. ProductCard stilini güncelle
  - [x] 4j. Footer bileşenini entegre et (tasarım stili + mevcut API)
  - [x] 4k. MobileBottomNav (BottomNav) entegre et
### [x] 5. Routing güncellemesi
### [x] 6. State ve API entegrasyonu
### [x] 7. Admin panelinin bozulmadığını doğrula
### [x] 8. Build ve test kontrolü (TypeScript + Vite build hatasız)

## 2. Aşama — Yeni Sayfalar (TAMAMLANDI)

### [x] 9. Giriş/Üye Ol Sayfası yeniden tasarlandı
  - Tek sayfada sekme ile giriş/kayıt geçişi (tasarım stili)
  - Şifre göster/gizle butonu
  - Animasyonlu hata/başarı mesajları
  - Üye ol formunda avantajlar kutusu (%10 indirim vb.)
  - Ödeme sayfasından gelince misafir sekmesi
  - Mevcut authApi + cartApi + Google OAuth korundu

### [x] 10. Kategori Sayfası yeniden tasarlandı
  - Sol filtre paneli: kahve türü, kavrum, yöre, tat profili
  - Fiyat aralığı (range slider + sayısal input)
  - Stok/indirim toggle switch'leri
  - Aktif filtreler için kaldırılabilir etiket chips
  - 3'lü/4'lü grid geçişi
  - Sıralama dropdown (en çok satanlar, fiyat, yeniler)
  - Mobilde sağdan açılan filtre çekmecesi
  - Filtreye uygun ürün yoksa "temizle" butonlu boş ekran
  - Mevcut TanStack Query + productApi korundu

### [x] 11. Müşteri Hizmetleri Sayfası oluşturuldu (/musteri-hizmetleri)
  - Kahve temalı hero banner + arama çubuğu
  - 4 kategori SSS (Sipariş & Teslimat, İade & Değişim, Ödeme & Güvenlik, Kahve & Saklama)
  - Açılır kapanır SSS kartları (AnimatePresence)
  - 4 iletişim kartı (telefon, e-posta, canlı destek, mağaza)
  - İletişim formu (mevcut /api/contact endpoint)
  - Şirket bilgileri /api/company-info'dan çekiliyor

### [x] 12. Kurumsal Sayfa oluşturuldu (/kurumsal)
  - 4 sekmeli yapı: Hakkımızda, Mağazalarımız, Kariyer, Toptan Satış
  - Hakkımızda: hikaye, istatistikler (8 yıl, 120+ çeşit, 50K müşteri), değerler, zaman tüneli
  - Mağazalarımız: 6 şubede adres, telefon, çalışma saatleri
  - Kariyer: açık pozisyonlar + başvur butonu + genel başvuru
  - Toptan Satış: özellikler listesi + teklif formu

## Sonraki Adımlar
- [ ] CoffeeFinder bileşeni (interaktif quiz — isteğe bağlı)
- [ ] ProductCard stili güncelleme
- [ ] Header'da /musteri-hizmetleri ve /kurumsal linkleri nav'a eklenmesi
- [ ] Footer'da linklerin güncellenmesi

## Bileşen Eşleştirme

| Tasarım | Mevcut Frontend | Durum |
|---------|-----------------|-------|
| AuthPage.tsx | Login.tsx + Register.tsx | ✅ Entegre edildi |
| CategoryPage.tsx | CategoryPage.tsx | ✅ Entegre edildi |
| CustomerServicePage.tsx | CustomerServicePage.tsx | ✅ Yeni oluşturuldu |
| AboutPage.tsx | CorporatePage.tsx | ✅ Yeni oluşturuldu |
| Header.tsx | layout/Header.tsx | ✅ Entegre edildi |
| Hero.tsx | components/home/Hero.tsx | ✅ Entegre edildi |
| QuickCategories.tsx | components/home/QuickCategories.tsx | ✅ Entegre edildi |
| FlashDeals.tsx | components/home/FlashDeals.tsx | ✅ Entegre edildi |
| FeaturedProducts.tsx | pages/Home.tsx | ✅ Entegre edildi |
| ProductCard.tsx | product/ProductCard.tsx | ⬜ Bekliyor |
| CoffeeFinder.tsx | — | ⬜ İsteğe bağlı |
| Footer.tsx | layout/Footer.tsx | ✅ Entegre edildi |
| MobileBottomNav.tsx | layout/BottomNav.tsx | ✅ Entegre edildi |

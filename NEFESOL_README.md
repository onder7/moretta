# 🛒 Nefesol Shop — E-Ticaret Platformu

> React + Node.js + PostgreSQL + Redis + Nginx + Docker üzerine kurulu tam kapsamlı online alışveriş sistemi.

🔗 **Repo:** https://github.com/onder7/Nefesol_Shop

---

## ✨ Uygulanan Özellikler

**Mağaza (Frontend)**
- Ürün kataloğu, varyant seçimi, filtreleme/arama, kategori sayfaları
- Sepet, kupon/indirim uygulama, çok adımlı ödeme (İyzico + Havale/EFT + Kapıda Ödeme)
- Üyelik, giriş/kayıt, şifre sıfırlama, **MFA (çok faktörlü kimlik doğrulama)**
- Hesabım paneli: siparişler, favoriler, profil, **Soru & Cevaplarım**
- Ürün değerlendirmeleri ve **Soru-Cevap** (admin onaylı)
- Canlı destek / chatbot, açılır kampanya bildirimleri (popup)

**Yönetim Paneli (Admin)**
- Dashboard (KPI, grafikler, analiz), ürün/kategori/marka CRUD
- Sipariş yönetimi ve durum güncelleme, iptal/iade yönetimi
- **İndirim & kupon kampanyaları**, **KDV (vergi) yönetimi** (fiyatlar KDV hariç net)
- **Değerlendirme moderasyonu** ve **Soru-Cevap moderasyonu** (sadece sorular onaylı)
- Site ayarları, e-posta şablonları, ödeme yöntemleri, chatbot kuralları
- Veritabanı yedekleme/geri yükleme araçları

**E-posta Bildirim Sistemi**
- SMTP veya Brevo API üzerinden gönderim; panelden **test e-postası**
- **Müşteri bildirimleri** (düzenlenebilir şablonlar): sipariş alındı, kargoya verildi, teslim edildi ve diğer durum güncellemeleri
- **Yönetici uyarıları:** yeni sipariş, düşük stok, yeni değerlendirme
- Şablon değişkenleri: `{{ad}}`, `{{siparis_no}}`, `{{toplam}}`, `{{magaza}}`, `{{durum}}`

---

## 📐 Proje Yapısı

```
ecommerce/
├── frontend/                  # React + Vite + TypeScript + Tailwind
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/        # Yeniden kullanılabilir UI bileşenleri
│   │   │   ├── ui/            # shadcn/ui bileşenleri (Button, Input, Card vb.)
│   │   │   ├── common/        # Projeye özel temel bileşenler (SEO, Loader vb.)
│   │   │   └── layout/        # Header, Footer, MobileMenu, AdminLayout
│   │   ├── features/          # Özellik bazlı modüller
│   │   │   ├── auth/          # Giriş, kayıt, şifre sıfırlama
│   │   │   ├── cart/          # Sepet işlemleri
│   │   │   ├── catalog/       # Ürün listeleme, filtreleme
│   │   │   ├── checkout/      # Ödeme akışı
│   │   │   ├── orders/        # Sipariş geçmişi
│   │   │   ├── profile/       # Kullanıcı profili
│   │   │   └── wishlist/      # Favori listesi
│   │   ├── hooks/             # Custom React hook'ları
│   │   ├── pages/             # Sayfa bileşenleri (route bazlı)
│   │   │   ├── Home.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── Cart.tsx
│   │   │   ├── Checkout.tsx
│   │   │   └── ...
│   │   ├── services/          # API çağrıları (axios)
│   │   ├── store/             # Zustand / Redux state yönetimi
│   │   ├── types/             # TypeScript tip tanımları
│   │   └── utils/             # Yardımcı fonksiyonlar
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── admin/                     # Yönetim Paneli (ayrı React uygulaması)
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── dashboard/     # İstatistikler, grafikler
│   │   │   ├── products/      # Ürün yönetimi
│   │   │   ├── orders/        # Sipariş yönetimi
│   │   │   ├── customers/     # Müşteri yönetimi
│   │   │   ├── categories/    # Kategori yönetimi
│   │   │   ├── discounts/     # İndirim/kupon yönetimi
│   │   │   ├── reports/       # Satış raporları
│   │   │   └── settings/      # Site ayarları
│   │   └── ...
│   └── ...
│
├── backend/                   # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/            # DB, Redis, env yapılandırmaları
│   │   ├── controllers/       # Route handler'ları
│   │   ├── middlewares/       # Auth, error, rate-limit, upload
│   │   ├── models/            # Veritabanı modelleri (Prisma/TypeORM)
│   │   ├── routes/            # API route tanımları
│   │   │   ├── auth.routes.ts
│   │   │   ├── product.routes.ts
│   │   │   ├── order.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── cart.routes.ts
│   │   │   ├── payment.routes.ts
│   │   │   └── admin.routes.ts
│   │   ├── services/          # İş mantığı katmanı
│   │   ├── utils/             # Helpers, validators, logger
│   │   ├── types/             # TypeScript tipleri
│   │   └── app.ts             # Express uygulama girişi
│   ├── prisma/                # Prisma ORM şeması ve migrationlar
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── tsconfig.json
│
├── nginx/                     # Nginx yapılandırması
│   ├── nginx.conf
│   ├── conf.d/
│   │   ├── frontend.conf
│   │   ├── backend.conf
│   │   └── admin.conf
│   └── ssl/                   # SSL sertifikaları (Let's Encrypt)
│
├── docker/                    # Docker dosyaları
│   ├── frontend.Dockerfile
│   ├── backend.Dockerfile
│   └── admin.Dockerfile
│
├── scripts/                   # Yardımcı shell scriptleri
│   ├── setup.sh               # İlk kurulum
│   ├── deploy.sh              # Deployment
│   └── backup.sh              # Veritabanı yedekleme
│
├── .env.example
├── .env.production
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

---

## 🗄️ Veritabanı Şeması (Ana Tablolar)

```
users               → id, email, password_hash, role, is_active, created_at
user_profiles       → user_id, first_name, last_name, phone, avatar_url
addresses           → id, user_id, type(billing/shipping), city, district, ...

categories          → id, parent_id, name, slug, description, image_url, sort_order
brands              → id, name, slug, logo_url, is_active
products            → id, category_id, brand_id, name, slug, description, ...
product_variants    → id, product_id, sku, price, stock_qty, attributes(JSON)
product_images      → id, product_id, variant_id, url, sort_order, is_primary
product_tags        → id, product_id, tag

carts               → id, user_id, session_id, expires_at
cart_items          → id, cart_id, variant_id, quantity, price_at_add

orders              → id, user_id, status, total, subtotal, shipping_fee, ...
order_items         → id, order_id, variant_id, quantity, unit_price
order_statuses      → id, order_id, status, note, created_at

payments            → id, order_id, provider, amount, status, transaction_id
shipping            → id, order_id, carrier, tracking_number, status

discounts           → id, code, type(percent/fixed), value, min_order, ...
discount_usages     → id, discount_id, user_id, order_id

reviews             → id, product_id, user_id, rating, title, body, is_approved
wishlists           → id, user_id, name
wishlist_items      → id, wishlist_id, variant_id

notifications       → id, user_id, type, title, body, is_read
```

---

## 🔌 API Endpoint Yapısı

```
# Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh-token
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me

# Kullanıcı
GET    /api/users/profile
PUT    /api/users/profile
GET    /api/users/addresses
POST   /api/users/addresses
PUT    /api/users/addresses/:id
DELETE /api/users/addresses/:id

# Ürünler
GET    /api/products               # Listeleme (filtre, sıralama, sayfalama)
GET    /api/products/:slug         # Detay
GET    /api/products/search        # Arama
GET    /api/categories
GET    /api/categories/:slug/products
GET    /api/brands

# Sepet
GET    /api/cart
POST   /api/cart/items
PUT    /api/cart/items/:id
DELETE /api/cart/items/:id
DELETE /api/cart
POST   /api/cart/apply-discount

# Siparişler
POST   /api/orders                 # Sipariş oluştur (checkout)
GET    /api/orders                 # Sipariş geçmişi
GET    /api/orders/:id

# Ödeme
POST   /api/payments/initialize    # Ödeme başlat
POST   /api/payments/callback      # Ödeme sağlayıcı webhook

# Favoriler
GET    /api/wishlist
POST   /api/wishlist/items
DELETE /api/wishlist/items/:id

# Değerlendirmeler
GET    /api/products/:id/reviews
POST   /api/products/:id/reviews

# Admin (tüm route'lar /api/admin altında, admin JWT gerekli)
GET    /api/admin/dashboard/stats
GET    /api/admin/products
POST   /api/admin/products
PUT    /api/admin/products/:id
DELETE /api/admin/products/:id
GET    /api/admin/orders
PUT    /api/admin/orders/:id/status
GET    /api/admin/customers
GET    /api/admin/reports/sales
GET    /api/admin/discounts
POST   /api/admin/discounts
```

---

## 🖥️ Kullanıcı Arayüzü — Sayfalar

### Son Kullanıcı (Frontend)
| Sayfa | URL | Açıklama |
|-------|-----|----------|
| Ana Sayfa | `/` | Banner, öne çıkan ürünler, kampanyalar |
| Kategori | `/kategori/:slug` | Ürün listesi, filtrele, sırala |
| Ürün Detay | `/urun/:slug` | Görseller, varyant seçimi, sepete ekle |
| Arama | `/ara?q=...` | Arama sonuçları |
| Sepet | `/sepet` | Sepet içeriği, kupon |
| Checkout | `/odeme` | Adres, kargo, ödeme |
| Sipariş Başarılı | `/siparis-tamamlandi/:id` | Teşekkür sayfası |
| Siparişlerim | `/hesabim/siparisler` | Sipariş geçmişi |
| Favorilerim | `/hesabim/favoriler` | Favori ürünler |
| Profilim | `/hesabim/profil` | Kişisel bilgiler |
| Giriş | `/giris` | Login formu |
| Kayıt | `/kayit` | Register formu |
| Şifre Sıfırla | `/sifre-sifirla` | Password reset |

### Yönetim Paneli (Admin)
| Sayfa | URL | Açıklama |
|-------|-----|----------|
| Dashboard | `/admin` | KPI kartları, son siparişler, grafikler |
| Ürünler | `/admin/urunler` | Ürün listesi + CRUD |
| Kategoriler | `/admin/kategoriler` | Kategori yönetimi |
| Markalar | `/admin/markalar` | Marka yönetimi |
| Siparişler | `/admin/siparisler` | Sipariş listesi + durum güncelle |
| Müşteriler | `/admin/musteriler` | Kullanıcı listesi |
| İndirimler | `/admin/indirimler` | Kupon / kampanya |
| Raporlar | `/admin/raporlar` | Satış grafikleri |
| Ayarlar | `/admin/ayarlar` | Site yapılandırması |

---

## 🔐 Güvenlik

- JWT Access Token (15 dk) + Refresh Token (7 gün, HttpOnly cookie)
- bcrypt ile şifre hashleme (salt rounds: 12)
- Rate limiting: IP başına 100 istek/15 dk (express-rate-limit)
- Helmet.js ile HTTP güvenlik başlıkları
- CORS politikası (izin verilen origin listesi)
- SQL injection koruması (Prisma ORM parametreli sorgular)
- XSS koruması (input sanitization)
- HTTPS zorunluluğu (Let's Encrypt / Certbot)
- Admin route'larına ayrı middleware guard

---

## 🐳 Docker Servisleri

| Servis | Image | Port | Açıklama |
|--------|-------|------|----------|
| nginx | nginx:alpine | **80, 443** | Tek giriş noktası — reverse proxy, SSL termination |
| frontend | node:20-alpine | (dahili) | React uygulaması — nginx üzerinden `/` |
| admin | node:20-alpine | (dahili) | Admin paneli — nginx üzerinden `/admin` |
| backend | node:20-alpine | (dahili) | Express API — nginx üzerinden `/api` |
| postgres | postgres:16-alpine | (dahili) | Ana veritabanı |
| redis | redis:7-alpine | (dahili) | Cache ve session |

> Yalnızca **nginx** dışarıya port açar. Tüm trafik tek noktadan (`http://localhost`) yönlenir:
> Mağaza → `/` · Admin → `/admin` · API → `/api`

---

## 🎨 Frontend Tasarım Stratejisi

### Karar: React ile sıfırdan yaz, HTML temayı sadece ilham için kullan

HTML/CSS/JS hazır tema satın alıp React stack'e entegre etmek **önerilmez**. Temel sorunlar:

- Dinamik veri (sepet, auth durumu, filtreler) için jQuery hack'leri gerekir
- React state yönetimiyle çakışır, iki ayrı sistem çalışır
- TypeScript desteği yoktur, tip güvenliği sağlanamaz
- Vite build pipeline'ına entegrasyon karmaşıklaşır
- Bakımı ve özellik eklenmesi giderek zorlaşır

**Doğru yaklaşım — Hibrit Yöntem:**

1. **Tasarım referansı:** Themeforest, ThemeWagon veya Envato'dan beğenilen bir e-ticaret HTML temasından renk paleti, tipografi ve layout ilhamı al. Kodu kopyalama, sadece görsel referans olarak kullan.

2. **Bileşen kütüphanesi:** [shadcn/ui](https://ui.shadcn.com) — ücretsiz, Tailwind tabanlı, TypeScript destekli, kaynak kodu doğrudan projeye kopyalanır. 50+ hazır bileşen (Button, Input, Dialog, Table, Form, Dropdown vb.)

3. **İkon kütüphanesi:** [Lucide React](https://lucide.dev) — SVG tabanlı, React component olarak gelir, tree-shaking destekli.

4. **Grafik/chart:** [Recharts](https://recharts.org) — admin dashboard için React-native grafik kütüphanesi.

### Frontend Kurulum Komutları

```bash
cd frontend

# shadcn/ui başlat
npx shadcn@latest init

# Temel bileşenleri ekle
npx shadcn@latest add button input card badge dialog
npx shadcn@latest add table form select textarea
npx shadcn@latest add dropdown-menu sheet toast

# Diğer paketler
npm install lucide-react                    # İkonlar
npm install @tanstack/react-query           # Server state yönetimi
npm install react-router-dom                # Routing
npm install zustand                         # Client state (sepet, auth)
npm install axios                           # API çağrıları
npm install react-hook-form                 # Form yönetimi
npm install @hookform/resolvers zod         # Form validasyon
npm install recharts                        # Grafik (admin)
npm install react-image-gallery             # Ürün görsel galerisi
npm install swiper                          # Slider/carousel
npm install clsx tailwind-merge             # Koşullu class birleştirme
```

### UI Bileşen Hiyerarşisi

```
src/components/
├── ui/                    # shadcn/ui bileşenleri (dokunma)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── ...
├── common/                # Projeye özel temel bileşenler
│   ├── PageLoader.tsx
│   ├── ErrorBoundary.tsx
│   ├── SEO.tsx
│   └── ProtectedRoute.tsx
├── layout/                # Sayfa iskelet bileşenleri
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── MobileMenu.tsx
│   └── AdminLayout.tsx
└── features/              # Özellik bazlı bileşenler
    ├── ProductCard.tsx
    ├── CartDrawer.tsx
    ├── FilterSidebar.tsx
    └── ...
```

---

## ⚡ Teknoloji Seçimleri & Kararlar

| Karar | Seçilen | Alternatif | Neden |
|-------|---------|------------|-------|
| UI Bileşen | shadcn/ui + Tailwind | Hazır HTML tema | React/TS uyumu, bakım kolaylığı |
| İkon | Lucide React | Font Awesome | Tree-shaking, React-native |
| Server State | TanStack Query | SWR | Cache, refetch, mutation desteği |
| Form | React Hook Form + Zod | Formik | Performans, TS-first validasyon |
| ORM | Prisma | TypeORM | Daha iyi TS desteği, migration sistemi |
| State | Zustand | Redux | Daha az boilerplate |
| HTTP Client | Axios | Fetch | Interceptor desteği |
| Ödeme | İyzico / Stripe | PayTR | Türkiye + uluslararası |
| Email | Nodemailer (SMTP) + Brevo API | SendGrid | Esnek gönderim, maliyet avantajı |
| Dosya Yükleme | Multer + Cloudinary | AWS S3 | Kolay kurulum |
| Validation | Zod | Joi | TypeScript-first |
| Loglama | Winston | Pino | Geniş ekosistem |
| Test | Vitest + Supertest | Jest | Vite uyumlu |

---

## 🚀 Hızlı Başlangıç (Geliştirme)

```bash
# Repo klonla
git clone https://github.com/onder7/Nefesol_Shop.git
cd Nefesol_Shop

# Ortam değişkenlerini kopyala ve düzenle (DB, JWT, SMTP/Brevo, İyzico...)
cp .env.example .env

# Docker ile tüm servisleri build edip başlat
docker compose up -d --build

# Migrationlar container başlangıcında otomatik uygulanır (prisma).
# İlk admin kullanıcıyı oluşturmak için:
docker compose exec backend node create-admin.js

# Uygulama adresleri (tek giriş: nginx):
# Mağaza  → http://localhost
# Admin   → http://localhost/admin
# API     → http://localhost/api
```

> **Not:** Üretimde `.env`, veritabanı yedekleri (`backend/backups/backup-*.sql`) ve `*.tar.gz`
> dosyaları `.gitignore` ile korunur — bunlar **asla** repoya gönderilmez.

---

## 📦 Ortam Değişkenleri (.env)

```env
# Genel
NODE_ENV=development
PORT=5000

# Veritabanı
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@domain.com
SMTP_PASS=smtp-password

# Dosya yükleme
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Ödeme
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

# Admin
ADMIN_EMAIL=admin@domain.com
ADMIN_PASSWORD=güçlü-şifre
```

---

## 📈 Performans Hedefleri

- Lighthouse Score: 90+ (Mobile & Desktop)
- API yanıt süresi: < 200ms (cached), < 500ms (DB sorgu)
- Redis ile ürün listesi cache: 5 dakika TTL
- PostgreSQL indexleme: slug, category_id, user_id kolonları
- CDN ile statik varlık dağıtımı
- Lazy loading ile görsel optimizasyonu

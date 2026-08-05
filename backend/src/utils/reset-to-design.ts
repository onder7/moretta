/**
 * reset-to-design.ts
 * Veritabanını tamamen temizler, ardından
 * sadece tasarım (kahve) verilerini yeniden ekler.
 *
 * Çalıştır:  npx ts-node src/utils/reset-to-design.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Attribute tanımları ──────────────────────────────────────────────────────
const ATTRIBUTES = [
  {
    name: 'Kahve Türü', slug: 'kahve-turu', inputType: 'select',
    values: ['Arabica', 'Robusta', 'Blend'],
  },
  {
    name: 'Kavrum Seviyesi', slug: 'kavrum-seviyesi', inputType: 'select',
    values: ['Açık', 'Açık-Orta', 'Orta', 'Orta-Koyu', 'Koyu'],
  },
  {
    name: 'Menşei', slug: 'mensei', inputType: 'select',
    values: ['Etiyopya', 'Kolombiya', 'Brezilya', 'Guatemala', 'Kenya', 'Costa Rica'],
  },
  {
    name: 'Öğütme Seçeneği', slug: 'ogutme-secenegi', inputType: 'select',
    values: ['Çekirdek', 'V60', 'French Press', 'Espresso', 'Moka Pot'],
  },
];

// ─── Kategori ağacı ───────────────────────────────────────────────────────────
const CATEGORY_TREE = [
  {
    name: 'Kahve Çeşitleri', slug: 'kahve-cesitleri',
    children: [
      { name: 'Çekirdek Kahve',   slug: 'cekirdek-kahve' },
      { name: 'Öğütülmüş Kahve', slug: 'ogutulmus-kahve' },
      { name: 'Filtre Kahve',     slug: 'filtre-kahve' },
      { name: 'Espresso',         slug: 'espresso' },
      { name: 'Yöresel Kahveler', slug: 'yoresel-kahveler' },
    ],
  },
  {
    name: 'Demleme Ekipmanları', slug: 'demleme-ekipmanlari',
    children: [
      { name: 'V60',                 slug: 'v60' },
      { name: 'French Press',        slug: 'french-press' },
      { name: 'Chemex',              slug: 'chemex' },
      { name: 'Espresso Makineleri', slug: 'espresso-makineleri' },
      { name: 'El Değirmenleri',     slug: 'el-degirmenleri' },
    ],
  },
  {
    name: 'Aksesuarlar & Bardaklar', slug: 'aksesuarlar-bardaklar',
    children: [
      { name: 'Termoslar', slug: 'termoslar' },
      { name: 'Bardaklar', slug: 'bardaklar' },
      { name: 'Ölçekler',  slug: 'olcekler' },
      { name: 'Filtreler', slug: 'filtreler' },
    ],
  },
  {
    name: 'Kahve Abonelikleri', slug: 'kahve-abonelikleri',
    children: [
      { name: 'Aylık Abonelik', slug: 'aylik-abonelik' },
      { name: 'Hediye Kutusu',  slug: 'hediye-kutusu' },
      { name: 'Tadım Setleri',  slug: 'tadim-setleri' },
    ],
  },
  {
    name: 'Fırsatlar', slug: 'firsatlar',
    children: [
      { name: 'İndirimli Ürünler', slug: 'indirimli-urunler' },
      { name: 'Sezonluk Ürünler',  slug: 'sezonluk-urunler' },
      { name: 'Outlet',            slug: 'outlet' },
    ],
  },
];

// ─── Ürün verileri ────────────────────────────────────────────────────────────
interface ProductSeed {
  name: string; slug: string; description: string;
  isFeatured: boolean; categorySlug: string;
  price: number; compareAt?: number; stockQty: number;
  images: { url: string; isPrimary: boolean }[];
  tags: string[];
  attrs: Record<string, string>;
  intensity?: number;
}

const PRODUCTS: ProductSeed[] = [
  {
    name: 'Etiyopya Yirgacheffe', slug: 'etiyopya-yirgacheffe',
    description: 'Etiyopya Yirgacheffe bölgesinin yüksek rakımlarında yetişen bu özel Arabica çekirdek, çiçeksi aromaları ve parlak asiditesiyle dünya çapında tanınır. Narenciye ve bergamot notaları, dengeli gövdesiyle filtre kahve severler için eşsiz bir deneyim sunar.',
    isFeatured: true, categorySlug: 'cekirdek-kahve',
    price: 389, compareAt: 459, stockQty: 120,
    images: [
      { url: 'https://images.pexels.com/photos/5926957/pexels-photo-5926957.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: true },
      { url: 'https://images.pexels.com/photos/31945549/pexels-photo-31945549.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: false },
    ],
    tags: ['arabica', 'filtre', 'etiyopya', 'yeni-hasat', 'Narenciye', 'Çiçeksi', 'Bergamot'],
    attrs: { 'kahve-turu': 'Arabica', 'kavrum-seviyesi': 'Açık', 'mensei': 'Etiyopya', 'ogutme-secenegi': 'Çekirdek' },
    intensity: 3,
  },
  {
    name: 'Kolombiya Supremo', slug: 'kolombiya-supremo',
    description: 'Kolombiya Supremo, dengeli gövdesi ve yumuşak asiditesiyle günlük tüketim için idealdir. Çikolata ve karamel notaları, fındık tatlarıyla birleşerek klasik bir kahve deneyimi sunar.',
    isFeatured: true, categorySlug: 'cekirdek-kahve',
    price: 329, compareAt: 399, stockQty: 95,
    images: [
      { url: 'https://images.pexels.com/photos/17077385/pexels-photo-17077385.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: true },
      { url: 'https://images.pexels.com/photos/25547393/pexels-photo-25547393.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: false },
    ],
    tags: ['arabica', 'espresso', 'kolombiya', 'cok-satan', 'Çikolata', 'Karamel', 'Fındık'],
    attrs: { 'kahve-turu': 'Arabica', 'kavrum-seviyesi': 'Orta', 'mensei': 'Kolombiya', 'ogutme-secenegi': 'Espresso' },
    intensity: 4,
  },
  {
    name: 'Brezilya Santos Espresso', slug: 'brezilya-santos-espresso',
    description: 'Brezilya Santos çekirdeklerinden oluşturulan bu espresso blend, yoğun bitter çikolata notaları ve kalın krema tabakasıyla espresso severler için tasarlanmıştır.',
    isFeatured: true, categorySlug: 'espresso',
    price: 299, stockQty: 80,
    images: [
      { url: 'https://images.pexels.com/photos/13741278/pexels-photo-13741278.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: true },
    ],
    tags: ['blend', 'espresso', 'brezilya', 'koyu-kavrum', 'Bitter Çikolata', 'Fındık', 'Tütün'],
    attrs: { 'kahve-turu': 'Blend', 'kavrum-seviyesi': 'Koyu', 'mensei': 'Brezilya', 'ogutme-secenegi': 'Espresso' },
    intensity: 5,
  },
  {
    name: 'Guatemala Antigua', slug: 'guatemala-antigua',
    description: 'Guatemala Antigua vadisinin volkanik topraklarında yetişen bu nadir Arabica, kakao ve baharat notalarıyla tanınır. Dengeli gövdesi ve karmaşık tat profili kahve tutkunları için keşfedilmemiş bir hazine.',
    isFeatured: true, categorySlug: 'cekirdek-kahve',
    price: 419, compareAt: 489, stockQty: 45,
    images: [
      { url: 'https://images.pexels.com/photos/20736684/pexels-photo-20736684.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: true },
      { url: 'https://images.pexels.com/photos/15548856/pexels-photo-15548856.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: false },
    ],
    tags: ['arabica', 'filtre', 'guatemala', 'sinirli-uretim', 'Kakao', 'Baharatlı', 'Meyvemsi'],
    attrs: { 'kahve-turu': 'Arabica', 'kavrum-seviyesi': 'Orta-Koyu', 'mensei': 'Guatemala', 'ogutme-secenegi': 'V60' },
    intensity: 4,
  },
  {
    name: 'Kenya AA Nyeri', slug: 'kenya-aa-nyeri',
    description: 'Kenya AA Nyeri, yüksek rakımlı yıkanmış işlemiyle siyah üzüm ve şarap notalarıyla bilinen premium bir Arabica çekirdektir. Filtre kahve yarışmalarında sıkça tercih edilir.',
    isFeatured: false, categorySlug: 'filtre-kahve',
    price: 459, stockQty: 60,
    images: [
      { url: 'https://images.pexels.com/photos/19569364/pexels-photo-19569364.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: true },
    ],
    tags: ['arabica', 'filtre', 'kenya', 'premium', 'Siyah Üzüm', 'Bergamot', 'Şarap'],
    attrs: { 'kahve-turu': 'Arabica', 'kavrum-seviyesi': 'Açık-Orta', 'mensei': 'Kenya', 'ogutme-secenegi': 'V60' },
    intensity: 3,
  },
  {
    name: 'Costa Rica Tarrazu', slug: 'costa-rica-tarrazu',
    description: 'Costa Rica Tarrazu bölgesinin bal tatlılığı ve narenciye asiditesiyle bilinen bu Arabica çekirdeği, dengeli gövdesiyle günlük tüketim için mükemmel bir seçimdir.',
    isFeatured: true, categorySlug: 'cekirdek-kahve',
    price: 369, compareAt: 429, stockQty: 75,
    images: [
      { url: 'https://images.pexels.com/photos/3914189/pexels-photo-3914189.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: true },
    ],
    tags: ['arabica', 'filtre', 'costa-rica', 'firsat', 'Bal', 'Narenciye', 'Badem'],
    attrs: { 'kahve-turu': 'Arabica', 'kavrum-seviyesi': 'Orta', 'mensei': 'Costa Rica', 'ogutme-secenegi': 'V60' },
    intensity: 3,
  },
];

const SLIDES = [
  { img: 'https://images.pexels.com/photos/26711777/pexels-photo-26711777.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', link: '/kategori/cekirdek-kahve' },
  { img: 'https://images.pexels.com/photos/29619143/pexels-photo-29619143.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', link: '/kategori/demleme-ekipmanlari' },
  { img: 'https://images.pexels.com/photos/1551346/pexels-photo-1551346.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', link: '/kategori/espresso' },
];

async function main() {
  console.log('\n🗑️  VERİTABANI SIFIRLANIYOR — tüm veriler siliniyor...\n');

  // Foreign key sırasına göre sil
  await prisma.variantAttributeValue.deleteMany({});
  await prisma.attributeValue.deleteMany({});
  await prisma.attribute.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.wishlistItem.deleteMany({});
  await prisma.wishlist.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.orderCancellation.deleteMany({});
  await prisma.orderReturnItem.deleteMany({});
  await prisma.orderReturn.deleteMany({});
  await prisma.discountUsage.deleteMany({});
  await prisma.shipping.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderStatusLog.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.productTag.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.campaignProduct.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.discount.deleteMany({});
  await prisma.discountCampaign.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.userProfile.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.newsletterSubscriber.deleteMany({});
  await prisma.contactMessage.deleteMany({});
  await prisma.popupNotification.deleteMany({});
  await prisma.chatbotRule.deleteMany({});
  await prisma.navLink.deleteMany({});
  await prisma.featureCard.deleteMany({});
  await prisma.page.deleteMany({});
  await prisma.siteSettings.deleteMany({});

  console.log('✅ Tüm veriler silindi\n');
  console.log('🌱 Kahve verileri ekleniyor...\n');

  // ─── Admin kullanıcı ──────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin123!', 12);
  await prisma.user.create({
    data: {
      email: 'admin@moretta.dev',
      passwordHash: adminHash,
      role: 'ADMIN',
      isActive: true,
      emailVerifiedAt: new Date(),
      profile: { create: { firstName: 'Admin', lastName: 'User' } },
    },
  });
  const customerHash = await bcrypt.hash('Test123!', 12);
  await prisma.user.create({
    data: {
      email: 'test@moretta.dev',
      passwordHash: customerHash,
      role: 'CUSTOMER',
      isActive: true,
      emailVerifiedAt: new Date(),
      profile: { create: { firstName: 'Test', lastName: 'Kullanıcı' } },
    },
  });
  console.log('👤 Admin : admin@moretta.dev / Admin123!');
  console.log('👤 Müşteri: test@moretta.dev  / Test123!\n');

  // ─── Site ayarları ────────────────────────────────────────────────────────
  await prisma.siteSettings.createMany({
    data: [
      { key: 'general_store_name',      value: 'Aroma Coffee Co.' },
      { key: 'general_footer_slogan',   value: 'Taze kavrulmuş, kapınıza kadar.' },
      { key: 'general_email',           value: 'destek@aromacoffee.co' },
      { key: 'general_phone',           value: '0850 123 45 67' },
      { key: 'general_address',         value: 'Bağdat Caddesi No:123, Kadıköy' },
      { key: 'general_city',            value: 'İstanbul' },
      { key: 'shipping_fee',            value: '49' },
      { key: 'shipping_free_threshold', value: '500' },
      { key: 'tax_rate',                value: '20' },
      { key: 'tax_included',            value: 'true' },
      { key: 'homepage_slides',         value: JSON.stringify(SLIDES) },
    ],
  });
  console.log('⚙️  Site ayarları eklendi');

  // ─── Feature Cards ────────────────────────────────────────────────────────
  await prisma.featureCard.createMany({
    data: [
      { icon: 'truck',    title: 'Ücretsiz Kargo',       description: '500₺ üzeri siparişlerde ücretsiz kargo.',      sortOrder: 0 },
      { icon: 'coffee',   title: 'Taze Kavrum',          description: 'Sipariş sonrası kavrulur, 7 günde kapınızda.', sortOrder: 1 },
      { icon: 'shield',   title: 'Güvenli Ödeme',        description: '256-bit SSL ile korumalı ödeme altyapısı.',    sortOrder: 2 },
      { icon: 'refresh',  title: '14 Gün İade',          description: 'Açılmamış ürünlerde 14 gün iade garantisi.',   sortOrder: 3 },
    ],
  });
  console.log('🃏 Feature cards eklendi');

  // ─── Attribute'lar ────────────────────────────────────────────────────────
  console.log('\n📋 Attribute\'lar oluşturuluyor...');
  const attrValueIds: Record<string, Record<string, string>> = {};

  for (let i = 0; i < ATTRIBUTES.length; i++) {
    const def = ATTRIBUTES[i];
    const attr = await prisma.attribute.create({
      data: { name: def.name, slug: def.slug, inputType: def.inputType, sortOrder: i },
    });
    attrValueIds[def.slug] = {};
    for (let j = 0; j < def.values.length; j++) {
      const av = await prisma.attributeValue.create({
        data: { attributeId: attr.id, value: def.values[j], sortOrder: j },
      });
      attrValueIds[def.slug][def.values[j]] = av.id;
    }
    console.log(`   ✓ ${def.name}: ${def.values.length} değer`);
  }

  // ─── Marka ────────────────────────────────────────────────────────────────
  const brand = await prisma.brand.create({
    data: { name: 'Aroma Coffee', slug: 'aroma-coffee' },
  });
  console.log(`\n🏷️  Marka: ${brand.name}`);

  // ─── Kategori ağacı ───────────────────────────────────────────────────────
  console.log('\n📂 Kategoriler oluşturuluyor...');
  const catSlugToId: Record<string, string> = {};

  for (let i = 0; i < CATEGORY_TREE.length; i++) {
    const top = CATEGORY_TREE[i];
    const parent = await prisma.category.create({
      data: { name: top.name, slug: top.slug, sortOrder: i },
    });
    catSlugToId[top.slug] = parent.id;
    for (let j = 0; j < top.children.length; j++) {
      const child = top.children[j];
      const c = await prisma.category.create({
        data: { name: child.name, slug: child.slug, parentId: parent.id, sortOrder: j },
      });
      catSlugToId[child.slug] = c.id;
    }
    console.log(`   ✓ ${top.name} (${top.children.length} alt kategori)`);
  }

  // ─── Ürünler ──────────────────────────────────────────────────────────────
  console.log('\n🛍️  Ürünler ekleniyor...');

  for (const p of PRODUCTS) {
    const catId = catSlugToId[p.categorySlug];
    if (!catId) { console.warn(`⚠️  Kategori yok: ${p.categorySlug}`); continue; }

    const attrValueList = Object.entries(p.attrs)
      .map(([slug, val]) => ({ attributeValueId: attrValueIds[slug]?.[val] }))
      .filter((x) => x.attributeValueId);

    await prisma.product.create({
      data: {
        name: p.name, slug: p.slug, description: p.description,
        isActive: true, isFeatured: p.isFeatured,
        categoryId: catId, brandId: brand.id,
        vatRate: 20, vatIncluded: true,
        intensity: p.intensity ?? 0,
        tags: { create: p.tags.map((tag) => ({ tag })) },
        images: {
          create: p.images.map((img, idx) => ({
            url: img.url, altText: p.name, sortOrder: idx, isPrimary: img.isPrimary,
          })),
        },
        variants: {
          create: [{
            sku: `AROMA-${p.slug.toUpperCase().replace(/-/g, '').slice(0, 14)}`,
            price: p.price,
            compareAt: p.compareAt ?? null,
            stockQty: p.stockQty,
            attributeValues: {
              create: attrValueList.map((v) => ({ attributeValueId: v.attributeValueId })),
            },
          }],
        },
      },
    });
    console.log(`   ✓ ${p.name} — ${p.price}₺${p.compareAt ? ` (was ${p.compareAt}₺)` : ''}`);
  }

  // ─── İndirim kuponları ────────────────────────────────────────────────────
  await prisma.discount.createMany({
    data: [
      { code: 'KAHVE10',    type: 'PERCENT', value: 10, minOrder: 200, maxUses: 1000, isActive: true, description: 'İlk siparişe özel %10 indirim' },
      { code: 'HOSGELDIN', type: 'PERCENT', value: 15, minOrder: 500, maxUses: 500,  isActive: true, description: 'Hoş geldin kuponu' },
    ],
  });
  console.log('\n🎟️  Kuponlar: KAHVE10 (%10), HOSGELDIN (%15)');

  // ─── Chatbot kuralları ────────────────────────────────────────────────────
  await prisma.chatbotRule.createMany({
    data: [
      { title: 'Karşılama',     keywords: ['merhaba','selam','hi','hey'],         response: 'Merhaba! ☕ Aroma Coffee\'ye hoş geldiniz. Size nasıl yardımcı olabilirim?', quickReplies: ['Kargo Bilgisi','İade','Ödeme','Ürünler'], sortOrder: 0 },
      { title: 'Kargo',         keywords: ['kargo','teslimat','ne zaman','takip'], response: '🚚 500₺ üzeri siparişlerde ücretsiz kargo! Siparişler 1-3 iş gününde kargoya verilir.', quickReplies: ['İade Politikası','Destek'], sortOrder: 1 },
      { title: 'İade',          keywords: ['iade','iptal','değişim','para iade'], response: '↩️ Açılmamış ürünleri teslimattan itibaren 14 gün içinde iade edebilirsiniz.', quickReplies: ['Kargo Bilgisi','Destek'], sortOrder: 2 },
      { title: 'Teşekkür',     keywords: ['teşekkür','sağol','tamam','oldu'],    response: 'Rica ederim! ☕ Başka bir sorunuz olursa buradayım.', quickReplies: ['Ürünlere Göz At'], sortOrder: 3 },
    ],
  });
  console.log('🤖 Chatbot kuralları eklendi');

  // ─── Özet ─────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log('✅ Reset tamamlandı — sadece kahve verisi var!');
  console.log('   👤 admin@moretta.dev / Admin123!');
  console.log('   👤 test@moretta.dev  / Test123!');
  console.log(`   🛍️  ${PRODUCTS.length} ürün`);
  console.log('   🏷️  Marka: Aroma Coffee');
  console.log('   📂  Kahve kategorileri');
  console.log('   🎟️  KAHVE10, HOSGELDIN kuponları');
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error('❌ Hata:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

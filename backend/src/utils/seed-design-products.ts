/**
 * seed-design-products.ts
 * Tasarım klasöründeki (tasarim/src/data/products.ts) kahve ürünlerini
 * gerçek attribute'larıyla birlikte veritabanına ekler.
 *
 * Çalıştırmak için:  npx ts-node src/utils/seed-design-products.ts
 *
 * Mevcut veriyi silmez — yalnızca "Aroma Coffee" markasına ait kayıtlar ekler.
 * İkinci çalıştırmada çakışma olmaması için önce o markayı/kategorileri temizler.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Attribute tanımları ──────────────────────────────────────────────────────
const ATTRIBUTES = [
  {
    name: 'Kahve Türü',
    slug: 'kahve-turu',
    inputType: 'select',
    values: ['Arabica', 'Robusta', 'Blend'],
  },
  {
    name: 'Kavrum Seviyesi',
    slug: 'kavrum-seviyesi',
    inputType: 'select',
    values: ['Açık', 'Açık-Orta', 'Orta', 'Orta-Koyu', 'Koyu'],
  },
  {
    name: 'Menşei',
    slug: 'mensei',
    inputType: 'select',
    values: ['Etiyopya', 'Kolombiya', 'Brezilya', 'Guatemala', 'Kenya', 'Costa Rica'],
  },
  {
    name: 'Öğütme Seçeneği',
    slug: 'ogutme-secenegi',
    inputType: 'select',
    values: ['Çekirdek', 'V60', 'French Press', 'Espresso', 'Moka Pot'],
  },
];

// ─── Kategori ağacı ───────────────────────────────────────────────────────────
const CATEGORY_TREE = [
  {
    name: 'Kahve Çeşitleri', slug: 'kahve-cesitleri',
    children: [
      { name: 'Çekirdek Kahve',    slug: 'cekirdek-kahve' },
      { name: 'Öğütülmüş Kahve',  slug: 'ogutulmus-kahve' },
      { name: 'Filtre Kahve',      slug: 'filtre-kahve' },
      { name: 'Espresso',          slug: 'espresso' },
      { name: 'Yöresel Kahveler',  slug: 'yoresel-kahveler' },
    ],
  },
  {
    name: 'Demleme Ekipmanları', slug: 'demleme-ekipmanlari',
    children: [
      { name: 'V60',                  slug: 'v60' },
      { name: 'French Press',         slug: 'french-press' },
      { name: 'Chemex',               slug: 'chemex' },
      { name: 'Espresso Makineleri',  slug: 'espresso-makineleri' },
      { name: 'El Değirmenleri',      slug: 'el-degirmenleri' },
    ],
  },
  {
    name: 'Aksesuarlar & Bardaklar', slug: 'aksesuarlar-bardaklar',
    children: [
      { name: 'Termoslar',  slug: 'termoslar' },
      { name: 'Bardaklar',  slug: 'bardaklar' },
      { name: 'Ölçekler',   slug: 'olcekler' },
      { name: 'Filtreler',  slug: 'filtreler' },
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

// ─── Ürün verileri ─────────────────────────────────────────────────────────────
interface ProductSeed {
  name: string; slug: string; description: string;
  isFeatured: boolean; categorySlug: string;
  price: number; compareAt?: number; stockQty: number;
  images: { url: string; isPrimary: boolean }[];
  tags: string[];
  attrs: { 'kahve-turu': string; 'kavrum-seviyesi': string; 'mensei': string; 'ogutme-secenegi': string };
  badge?: string;
}

const PRODUCTS: ProductSeed[] = [
  {
    name: 'Etiyopya Yirgacheffe', slug: 'etiyopya-yirgacheffe',
    description: 'Etiyopya Yirgacheffe bölgesinin yüksek rakımlarında yetişen bu özel Arabica çekirdek, çiçeksi aromaları ve parlak asiditesi ile dünya çapında tanınır. Narenciye ve bergamot notaları, dengeli gövdesiyle filtre kahve severler için eşsiz bir deneyim sunar.',
    isFeatured: true, categorySlug: 'cekirdek-kahve',
    price: 389, compareAt: 459, stockQty: 120,
    images: [
      { url: 'https://images.pexels.com/photos/5926957/pexels-photo-5926957.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: true },
      { url: 'https://images.pexels.com/photos/31945549/pexels-photo-31945549.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: false },
    ],
    tags: ['arabica', 'filtre', 'etiyopya', 'yeni-hasat', 'cekirdek'],
    attrs: { 'kahve-turu': 'Arabica', 'kavrum-seviyesi': 'Açık', 'mensei': 'Etiyopya', 'ogutme-secenegi': 'Çekirdek' },
    badge: 'Yeni Hasat',
  },
  {
    name: 'Kolombiya Supremo', slug: 'kolombiya-supremo',
    description: 'Kolombiya Supremo, dengeli gövdesi ve yumuşak asiditesi ile günlük tüketim için idealdir. Çikolata ve karamel notaları, fındık tatlarıyla birleşerek klasik bir kahve deneyimi sunar.',
    isFeatured: true, categorySlug: 'cekirdek-kahve',
    price: 329, compareAt: 399, stockQty: 95,
    images: [
      { url: 'https://images.pexels.com/photos/17077385/pexels-photo-17077385.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: true },
      { url: 'https://images.pexels.com/photos/25547393/pexels-photo-25547393.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: false },
    ],
    tags: ['arabica', 'espresso', 'kolombiya', 'cok-satan', 'cekirdek'],
    attrs: { 'kahve-turu': 'Arabica', 'kavrum-seviyesi': 'Orta', 'mensei': 'Kolombiya', 'ogutme-secenegi': 'Espresso' },
    badge: 'Çok Satan',
  },
  {
    name: 'Brezilya Santos Espresso', slug: 'brezilya-santos-espresso',
    description: 'Brezilya Santos çekirdeklerinden oluşturulan bu espresso blend, yoğun bitter çikolata notaları ve kalın krema tabakası ile espresso severler için tasarlanmıştır.',
    isFeatured: true, categorySlug: 'espresso',
    price: 299, stockQty: 80,
    images: [
      { url: 'https://images.pexels.com/photos/13741278/pexels-photo-13741278.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: true },
    ],
    tags: ['blend', 'espresso', 'brezilya', 'koyu-kavrum'],
    attrs: { 'kahve-turu': 'Blend', 'kavrum-seviyesi': 'Koyu', 'mensei': 'Brezilya', 'ogutme-secenegi': 'Espresso' },
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
    tags: ['arabica', 'filtre', 'guatemala', 'sinirli-uretim'],
    attrs: { 'kahve-turu': 'Arabica', 'kavrum-seviyesi': 'Orta-Koyu', 'mensei': 'Guatemala', 'ogutme-secenegi': 'V60' },
    badge: 'Sınırlı Üretim',
  },
  {
    name: 'Kenya AA Nyeri', slug: 'kenya-aa-nyeri',
    description: 'Kenya AA Nyeri, yüksek rakımlı yıkanmış işlemiyle siyah üzüm ve şarap notalarıyla bilinen premium bir Arabica çekirdektir. Filtre kahve yarışmalarında sıkça tercih edilir.',
    isFeatured: false, categorySlug: 'filtre-kahve',
    price: 459, stockQty: 60,
    images: [
      { url: 'https://images.pexels.com/photos/19569364/pexels-photo-19569364.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: true },
    ],
    tags: ['arabica', 'filtre', 'kenya', 'premium'],
    attrs: { 'kahve-turu': 'Arabica', 'kavrum-seviyesi': 'Açık-Orta', 'mensei': 'Kenya', 'ogutme-secenegi': 'V60' },
  },
  {
    name: 'Costa Rica Tarrazu', slug: 'costa-rica-tarrazu',
    description: 'Costa Rica Tarrazu bölgesinin bal tatlılığı ve narenciye asiditesi ile bilinen bu Arabica çekirdeği, dengeli gövdesiyle günlük tüketim için mükemmel bir seçimdir.',
    isFeatured: true, categorySlug: 'cekirdek-kahve',
    price: 369, compareAt: 429, stockQty: 75,
    images: [
      { url: 'https://images.pexels.com/photos/3914189/pexels-photo-3914189.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', isPrimary: true },
    ],
    tags: ['arabica', 'filtre', 'costa-rica', 'firsat'],
    attrs: { 'kahve-turu': 'Arabica', 'kavrum-seviyesi': 'Orta', 'mensei': 'Costa Rica', 'ogutme-secenegi': 'V60' },
    badge: 'Fırsat',
  },
];

// ─── Site ayarları (homepage slides, discount banner) ─────────────────────────
const SLIDES = [
  {
    img: 'https://images.pexels.com/photos/26711777/pexels-photo-26711777.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    link: '/kategori/cekirdek-kahve',
  },
  {
    img: 'https://images.pexels.com/photos/29619143/pexels-photo-29619143.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    link: '/kategori/demleme-ekipmanlari',
  },
  {
    img: 'https://images.pexels.com/photos/1551346/pexels-photo-1551346.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    link: '/kategori/espresso',
  },
];

async function main() {
  console.log('\n🌱 Tasarım seed scripti başlıyor...\n');

  // ─── Önceki tasarım verisini temizle ──────────────────────────────────────
  console.log('🧹 Önceki "Aroma Coffee" verileri temizleniyor...');
  const aromaBrand = await prisma.brand.findUnique({ where: { slug: 'aroma-coffee' } });
  if (aromaBrand) {
    const products = await prisma.product.findMany({ where: { brandId: aromaBrand.id }, select: { id: true } });
    const ids = products.map((p) => p.id);
    if (ids.length) {
      await prisma.variantAttributeValue.deleteMany({ where: { variant: { productId: { in: ids } } } });
      await prisma.productTag.deleteMany({ where: { productId: { in: ids } } });
      await prisma.productImage.deleteMany({ where: { productId: { in: ids } } });
      await prisma.productVariant.deleteMany({ where: { productId: { in: ids } } });
      await prisma.product.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.brand.delete({ where: { id: aromaBrand.id } });
    console.log('   ✓ Önceki ürünler silindi');
  }

  // ─── Attribute'ları oluştur / güncelle ────────────────────────────────────
  console.log('\n📋 Attribute\'lar oluşturuluyor...');
  const attrValueIds: Record<string, Record<string, string>> = {};

  for (let i = 0; i < ATTRIBUTES.length; i++) {
    const def = ATTRIBUTES[i];
    const attr = await prisma.attribute.upsert({
      where: { slug: def.slug },
      update: { name: def.name, inputType: def.inputType, sortOrder: i },
      create: { name: def.name, slug: def.slug, inputType: def.inputType, sortOrder: i },
    });

    attrValueIds[def.slug] = {};
    for (let j = 0; j < def.values.length; j++) {
      const val = def.values[j];
      const av = await prisma.attributeValue.upsert({
        where: { attributeId_value: { attributeId: attr.id, value: val } },
        update: { sortOrder: j },
        create: { attributeId: attr.id, value: val, sortOrder: j },
      });
      attrValueIds[def.slug][val] = av.id;
    }
    console.log(`   ✓ ${def.name}: ${def.values.length} değer`);
  }

  // ─── Marka ────────────────────────────────────────────────────────────────
  const brand = await prisma.brand.create({
    data: { name: 'Aroma Coffee', slug: 'aroma-coffee' },
  });
  console.log(`\n🏷️  Marka: ${brand.name}`);

  // ─── Kategori ağacını oluştur ─────────────────────────────────────────────
  console.log('\n📂 Kategoriler oluşturuluyor...');
  const catSlugToId: Record<string, string> = {};

  for (let i = 0; i < CATEGORY_TREE.length; i++) {
    const top = CATEGORY_TREE[i];
    const parent = await prisma.category.upsert({
      where: { slug: top.slug },
      update: { name: top.name, sortOrder: 100 + i },
      create: { name: top.name, slug: top.slug, sortOrder: 100 + i },
    });
    catSlugToId[top.slug] = parent.id;
    console.log(`   ✓ ${top.name}`);

    for (let j = 0; j < top.children.length; j++) {
      const child = top.children[j];
      const c = await prisma.category.upsert({
        where: { slug: child.slug },
        update: { name: child.name, parentId: parent.id, sortOrder: j },
        create: { name: child.name, slug: child.slug, parentId: parent.id, sortOrder: j },
      });
      catSlugToId[child.slug] = c.id;
    }
  }

  // ─── Ürünleri ekle ────────────────────────────────────────────────────────
  console.log('\n🛍️  Ürünler ekleniyor...');
  let count = 0;

  for (const p of PRODUCTS) {
    const catId = catSlugToId[p.categorySlug];
    if (!catId) { console.warn(`⚠️  Kategori bulunamadı: ${p.categorySlug}`); continue; }

    // Varyant + attribute değerleri
    const attrValueList = Object.entries(p.attrs).map(([attrSlug, val]) => ({
      attributeValueId: attrValueIds[attrSlug]?.[val],
    })).filter((x) => x.attributeValueId);

    await prisma.product.create({
      data: {
        name: p.name, slug: p.slug, description: p.description,
        isActive: true, isFeatured: p.isFeatured,
        categoryId: catId, brandId: brand.id,
        vatRate: 20, vatIncluded: true,
        tags: { create: p.tags.map((tag) => ({ tag })) },
        images: {
          create: p.images.map((img, idx) => ({
            url: img.url, altText: p.name, sortOrder: idx, isPrimary: img.isPrimary,
          })),
        },
        variants: {
          create: [{
            sku: `AROMA-${p.slug.toUpperCase().replace(/-/g, '').slice(0, 12)}`,
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
    count++;
    console.log(`   ✓ ${p.name} — ${p.price}₺${p.compareAt ? ` (İndirim: ${p.compareAt}₺)` : ''}`);
  }

  // ─── Slides ayarı ─────────────────────────────────────────────────────────
  await prisma.siteSettings.upsert({
    where: { key: 'homepage_slides' },
    update: { value: JSON.stringify(SLIDES) },
    create: { key: 'homepage_slides', value: JSON.stringify(SLIDES) },
  });
  console.log('\n🖼️  Ana sayfa slider görselleri güncellendi');

  // ─── İndirim kuponu ────────────────────────────────────────────────────────
  await prisma.discount.upsert({
    where: { code: 'KAHVE10' },
    update: {},
    create: {
      code: 'KAHVE10', type: 'PERCENT', value: 10,
      minOrder: 200, maxUses: 1000, isActive: true,
      description: 'İlk siparişe özel %10 indirim',
    },
  });
  console.log('🎟️  KAHVE10 indirim kuponu eklendi');

  // ─── Özet ─────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log('✅ Tasarım seed tamamlandı!');
  console.log(`   🛍️  ${count} ürün eklendi`);
  console.log(`   🏷️  Marka: Aroma Coffee`);
  console.log(`   📂  ${Object.keys(catSlugToId).length} kategori (upsert)`);
  console.log(`   🎟️  Kupon: KAHVE10 → %10 indirim`);
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error('❌ Seed hatası:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

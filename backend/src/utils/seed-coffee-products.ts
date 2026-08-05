import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const coffeeCategories = [
  {
    id: 'cat-kahve-cesitleri',
    name: 'Kahve Çeşitleri',
    slug: 'kahve-cesitleri',
    description: 'En iyi kahve çekirdekleri dünyanın dört bir yanından',
  },
  {
    id: 'cat-demleme-ekipmanlari',
    name: 'Demleme Ekipmanları',
    slug: 'demleme-ekipmanlari',
    description: 'Kahvenizi hazırlamak için gereken tüm ekipmanlar',
  },
  {
    id: 'cat-aksesuar-bardaklar',
    name: 'Aksesuarlar & Bardaklar',
    slug: 'aksesuar-bardaklar',
    description: 'Kahve içme deneyimini güzelleştiren aksesuarlar',
  },
  {
    id: 'cat-kahve-abonelikleri',
    name: 'Kahve Abonelikleri',
    slug: 'kahve-abonelikleri',
    description: 'Her ay taze kahveyi kapınıza getiren abonelik planları',
  },
];

const coffeeProducts = [
  {
    name: 'Etiyopya Yirgacheffe',
    slug: 'etiyopya-yirgacheffe',
    description: 'Etiyopya\'dan gelen bu Arabica kahvesi narenciye, çiçeksi ve bergamot notalarıyla ön plana çıkıyor. Açık kavrulmuş olup, V60 ve French Press ile mükemmel demlenir.',
    categorySlug: 'kahve-cesitleri',
    price: 389,
    oldPrice: 459,
    intensity: 3,
    images: [
      'https://images.pexels.com/photos/5926957/pexels-photo-5926957.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/31945549/pexels-photo-31945549.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    ],
    flavorNotes: ['Narenciye', 'Çiçeksi', 'Bergamot'],
    tags: ['arabica', 'etiyopya', 'acik-kavrum', 'filtreleme'],
  },
  {
    name: 'Kolombiya Supremo',
    slug: 'kolombiya-supremo',
    description: 'Kolombiya\'nın en seçkin bölgelerinden kaynaklanan bu Arabica çikolata, karamel ve fındık notalarıyla dikkat çekiyor. Orta kavrulmuş olup, tüm demlemeler için uygundur.',
    categorySlug: 'kahve-cesitleri',
    price: 329,
    oldPrice: 399,
    intensity: 4,
    images: [
      'https://images.pexels.com/photos/17077385/pexels-photo-17077385.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/25547393/pexels-photo-25547393.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    ],
    flavorNotes: ['Çikolata', 'Karamel', 'Fındık'],
    tags: ['arabica', 'kolombiya', 'orta-kavrum', 'çok-satan'],
  },
  {
    name: 'Brezilya Santos Espresso',
    slug: 'brezilya-santos-espresso',
    description: 'Güçlü ve karakterli bir espresso blend\'i. Bitter çikolata, fındık ve tütün notalarıyla espresso makinelerinde harika sonuç verir.',
    categorySlug: 'kahve-cesitleri',
    price: 299,
    oldPrice: null,
    intensity: 5,
    images: [
      'https://images.pexels.com/photos/13741278/pexels-photo-13741278.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/6936981/pexels-photo-6936981.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    ],
    flavorNotes: ['Bitter Çikolata', 'Fındık', 'Tütün'],
    tags: ['blend', 'brezilya', 'koyu-kavrum', 'espresso'],
  },
  {
    name: 'Kenya AA Peaberry',
    slug: 'kenya-aa-peaberry',
    description: 'Kenya\'nın dağlık bölgelerinde yetiştirilen bu premium Arabica çeşidi meyve, jagılı ve çikolata notalarıyla zengin bir profile sahiptir.',
    categorySlug: 'kahve-cesitleri',
    price: 449,
    oldPrice: 549,
    intensity: 4,
    images: [
      'https://images.pexels.com/photos/3985707/pexels-photo-3985707.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/3985708/pexels-photo-3985708.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    ],
    flavorNotes: ['Meyve', 'Jajılı', 'Çikolata'],
    tags: ['arabica', 'kenya', 'premium', 'peaberry'],
  },
  {
    name: 'Sumatra Mandheling Dark Roast',
    slug: 'sumatra-mandheling-dark-roast',
    description: 'Endonezya\'dan gelen bu Arabica koyu kavrulmuş olup, topraklı, çikolatalı ve smoky notalarıyla kahve severlerin favorisidir.',
    categorySlug: 'kahve-cesitleri',
    price: 319,
    oldPrice: null,
    intensity: 5,
    images: [
      'https://images.pexels.com/photos/5926956/pexels-photo-5926956.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/5926958/pexels-photo-5926958.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    ],
    flavorNotes: ['Toprak', 'Çikolata', 'Smoke'],
    tags: ['arabica', 'sumatra', 'koyu-kavrum', 'tam-gövde'],
  },
  {
    name: 'V60 Damıtma Seti',
    slug: 'v60-damitma-seti',
    description: 'Kahvenizi mükemmel şekilde demlemek için gereken tüm araçlar. Seramik V60, kağıt filtre ve ölçek dahil.',
    categorySlug: 'demleme-ekipmanlari',
    price: 189,
    oldPrice: 249,
    intensity: 0,
    images: [
      'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/312419/pexels-photo-312419.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    ],
    flavorNotes: [],
    tags: ['v60', 'ekipman', 'seti', 'filtre'],
  },
  {
    name: 'French Press 800ml',
    slug: 'french-press-800ml',
    description: 'Dökme kahvenin en klasik yöntemi. Bu 800ml kapasiteli French Press kahvenin bütün aromasını yakalamanıza yardımcı olur.',
    categorySlug: 'demleme-ekipmanlari',
    price: 149,
    oldPrice: null,
    intensity: 0,
    images: [
      'https://images.pexels.com/photos/312413/pexels-photo-312413.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/312414/pexels-photo-312414.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    ],
    flavorNotes: [],
    tags: ['french-press', 'ekipman', 'klasik'],
  },
  {
    name: 'Premium Kahve Termoso',
    slug: 'premium-kahve-termoso',
    description: '400ml kapasiteli, paslanmaz çelik premium kahve termosu. Sıcak kahvenizi 12 saat boyunca sıcak tutulur.',
    categorySlug: 'aksesuar-bardaklar',
    price: 199,
    oldPrice: 269,
    intensity: 0,
    images: [
      'https://images.pexels.com/photos/312412/pexels-photo-312412.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/312411/pexels-photo-312411.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    ],
    flavorNotes: [],
    tags: ['termos', 'aksesuar', 'paslanmaz-celik'],
  },
  {
    name: 'Aylık Kahve Abonesi - Starter',
    slug: 'aylik-kahve-abonesi-starter',
    description: '500gr farklı türde taze kavranmış kahveyi her ay kapınıza. Starter paketi ile başlayın.',
    categorySlug: 'kahve-abonelikleri',
    price: 349,
    oldPrice: null,
    intensity: 0,
    images: [
      'https://images.pexels.com/photos/312404/pexels-photo-312404.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/312405/pexels-photo-312405.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    ],
    flavorNotes: [],
    tags: ['abonelik', 'starter', 'aylık'],
  },
  {
    name: 'Kahve Tadım Seti - 5 Çeşit',
    slug: 'kahve-taim-seti-5-cesit',
    description: 'Dünya çapında 5 farklı kahve çeşidini tadıp karşılaştırabilirsiniz. Mükemmel bir kahve macerası başlattırmak için ideal hediye.',
    categorySlug: 'kahve-abonelikleri',
    price: 429,
    oldPrice: 529,
    intensity: 0,
    images: [
      'https://images.pexels.com/photos/312406/pexels-photo-312406.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/312407/pexels-photo-312407.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    ],
    flavorNotes: [],
    tags: ['taim-seti', 'hediye', 'cesit'],
  },
];

async function main() {
  console.log('🧹 Veritabanı temizleniyor...');

  // Tüm verileri sil
  await prisma.review.deleteMany({});
  await prisma.wishlistItem.deleteMany({});
  await prisma.wishlist.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.discountUsage.deleteMany({});
  await prisma.discount.deleteMany({});
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
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✅ Veritabanı temizlendi\n');

  // Kahve markası oluştur
  const kafeBrand = await prisma.brand.create({
    data: {
      name: 'Moretta Kahve',
      slug: 'moretta-kahve',
    },
  });
  console.log('🏷️  Brand oluşturuldu: Moretta Kahve\n');

  // Kategorileri oluştur
  const categoryMap = new Map<string, string>();

  for (const cat of coffeeCategories) {
    const created = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        sortOrder: coffeeCategories.indexOf(cat) + 1,
      },
    });
    categoryMap.set(cat.slug, created.id);
    console.log(`📂 Kategori oluşturuldu: ${cat.name}`);
  }
  console.log('');

  // Admin user oluştur
  const adminHash = await bcrypt.hash('Admin123!', 12);
  await prisma.user.create({
    data: {
      email: 'admin@moretta.com.tr',
      passwordHash: adminHash,
      role: 'ADMIN',
      profile: {
        create: { firstName: 'Admin', lastName: 'User' },
      },
    },
  });
  console.log('👤 Admin oluşturuldu: admin@moretta.com.tr\n');

  // Ürünleri oluştur
  let productCount = 0;

  for (const prod of coffeeProducts) {
    const dbCategoryId = categoryMap.get(prod.categorySlug);
    if (!dbCategoryId) {
      console.warn(`⚠️  Ürün atlandı (kategori bulunamadı): ${prod.name}`);
      continue;
    }

    const variant1Price = prod.price;
    const variant2Price = Math.floor(prod.price * 0.95);

    await prisma.product.create({
      data: {
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        isActive: true,
        isFeatured: productCount < 4,
        categoryId: dbCategoryId,
        brandId: kafeBrand.id,
        intensity: prod.intensity,
        variants: {
          create: [
            {
              sku: `SKU-${productCount + 1}-A`,
              price: variant1Price,
              stockQty: Math.floor(Math.random() * 30) + 10,
            },
            {
              sku: `SKU-${productCount + 1}-B`,
              price: variant2Price,
              stockQty: Math.floor(Math.random() * 20) + 10,
            },
          ],
        },
        images: {
          create: prod.images.map((url, idx) => ({
            url: url,
            altText: `${prod.name} - Görsel ${idx + 1}`,
            sortOrder: idx,
            isPrimary: idx === 0,
          })),
        },
        tags: {
          create: prod.tags.map((tag) => ({
            tag: tag,
          })),
        },
      },
    });

    productCount++;
    if (productCount % 3 === 0) {
      console.log(`   ☕ ${productCount}/${coffeeProducts.length} ürün oluşturuldu...`);
    }
  }

  console.log(`\n✅ Seed Tamamlandı!`);
  console.log(`📊 İstatistikler:`);
  console.log(`   ☕ ${productCount} ürün`);
  console.log(`   📂 ${coffeeCategories.length} kategori`);
  console.log(`   🏷️  1 brand (Moretta Kahve)`);
  console.log(`\n🔐 Test Hesabı:`);
  console.log(`   Email: admin@moretta.com.tr`);
  console.log(`   Şifre: Admin123!`);
}

main()
  .catch((e) => {
    console.error('Seed hatası:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

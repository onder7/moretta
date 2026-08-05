import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ─── JSON veri tipleri ───────────────────────────────────────────────────────
interface MockCategory {
  id: string;
  name: string;
  slug: string;
}

interface MockVariant {
  sku: string;
  color: string;
  price: number;
  stock: number;
}

interface MockProduct {
  id: string;
  categoryId: string;
  brandId: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  variants: MockVariant[];
  images: string[];
  tags: string[];
  reviews: any[];
}

interface MockData {
  categories: MockCategory[];
  products: MockProduct[];
}

// ─── Kategori açıklamaları ──────────────────────────────────────────────────
const categoryDescriptions: Record<string, string> = {
  'nevresim-takimlari': '%100 Pamuklu, 3D baskılı, çift ve tek kişilik modern nevresim takımları.',
  'ceyizlik-urunler': 'Evlilik hazırlığı yapanlar için özenle seçilmiş çeyizlik ürünler.',
  'yatak-ortuleri': 'Çift ve tek kişilik, kapitoneli, jakarlı ve dantelli lüks yatak örtüsü modelleri.',
  'pike-takimlari': 'Yaz ve bahar aylarına uygun günlük ve çeyizlik şık pike modelleri.',
  'banyo': 'Havlu, bornoz ve banyo aksesuarları.',
  'masa-ortuleri': 'Şık ve kaliteli masa örtüsü modelleri.',
  'battaniye': 'Sıcak ve yumuşak battaniye çeşitleri.',
  'carsaf-alez': 'Pamuklu çarşaflar ve koruyucu alezler.',
  'hali': 'Modern ve klasik halı modelleri.',
  'yastik-yorgan': 'Konforlu uyku için yastık ve yorgan çeşitleri.',
};

async function main() {
  console.log('🧹 Veritabanı temizleniyor...');

  // Tüm verileri sil (sıralama önemli - foreign key constraints)
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
  await prisma.address.deleteMany({});
  await prisma.userProfile.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.newsletterSubscriber.deleteMany({});

  console.log('✅ Veritabanı temizlendi\n');
  console.log('🌱 Seed başlıyor...\n');

  // ─── Kullanıcılar ─────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ecommerce.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      profile: {
        create: { firstName: 'Admin', lastName: 'User' },
      },
    },
  });
  console.log(`👤 Admin: ${admin.email}`);

  const customerHash = await bcrypt.hash('Test123!', 12);
  const customer = await prisma.user.create({
    data: {
      email: 'test@ecommerce.com',
      passwordHash: customerHash,
      role: 'CUSTOMER',
      profile: {
        create: { firstName: 'Test', lastName: 'Kullanıcı' },
      },
    },
  });
  console.log(`👤 Müşteri: ${customer.email}\n`);

  const customer1 = await prisma.user.create({
    data: {
      email: 'elif@mail.com',
      passwordHash: customerHash,
      role: 'CUSTOMER',
      profile: {
        create: { firstName: 'Elif', lastName: 'Yılmaz', phone: '05551112233' },
      },
    },
  });
  const customer2 = await prisma.user.create({
    data: {
      email: 'ahmet@mail.com',
      passwordHash: customerHash,
      role: 'CUSTOMER',
      profile: {
        create: { firstName: 'Ahmet', lastName: 'Demir', phone: '05552223344' },
      },
    },
  });
  const customer3 = await prisma.user.create({
    data: {
      email: 'zeynep@mail.com',
      passwordHash: customerHash,
      role: 'CUSTOMER',
      profile: {
        create: { firstName: 'Zeynep', lastName: 'Kara', phone: '05553334455' },
      },
    },
  });
  const customer4 = await prisma.user.create({
    data: {
      email: 'selin@mail.com',
      passwordHash: customerHash,
      role: 'CUSTOMER',
      profile: {
        create: { firstName: 'Selin', lastName: 'Aydın', phone: '05554445566' },
      },
    },
  });
  console.log('👤 Ek test müşterileri oluşturuldu');

  // ─── JSON dosyasını oku ───────────────────────────────────────────────────
  // Docker'da process.cwd() = /app, geliştirmede backend/ klasörü
  const jsonPath = path.resolve(process.cwd(), 'ceyiz_diyari_mock_db-v2.json');
  console.log(`📄 JSON dosyası okunuyor: ${jsonPath}`);
  
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ JSON dosyası bulunamadı:', jsonPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const mockData: MockData = JSON.parse(rawData);
  console.log(`   → ${mockData.categories.length} kategori, ${mockData.products.length} ürün bulundu\n`);

  // ─── Markalar ─────────────────────────────────────────────────────────────
  const tacBrand = await prisma.brand.create({
    data: { name: 'TAÇ', slug: 'tac' },
  });
  const karacaBrand = await prisma.brand.create({
    data: { name: 'Karaca', slug: 'karaca' },
  });
  const englishHomeBrand = await prisma.brand.create({
    data: { name: 'English Home', slug: 'english-home' },
  });
  const ceyizDiyariBrand = await prisma.brand.create({
    data: { name: 'Çeyiz Diyarı', slug: 'ceyiz-diyari' },
  });
  console.log('🏷️  4 marka eklendi (TAÇ, Karaca, English Home, Çeyiz Diyarı)\n');

  // ─── Kategoriler (JSON'dan) ───────────────────────────────────────────────
  const categoryMap = new Map<string, string>(); // JSON id → DB id

  for (let i = 0; i < mockData.categories.length; i++) {
    const cat = mockData.categories[i];
    const created = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        description: categoryDescriptions[cat.slug] || `${cat.name} kategorisi.`,
        sortOrder: i + 1,
      },
    });
    categoryMap.set(cat.id, created.id);
    console.log(`   📂 ${i + 1}. ${cat.name} (${cat.slug})`);
  }
  console.log(`\n✅ ${mockData.categories.length} kategori eklendi\n`);

  // ─── Ürünler (JSON'dan) ───────────────────────────────────────────────────
  let productCount = 0;
  let variantCount = 0;
  let imageCount = 0;
  let tagCount = 0;

  for (const prod of mockData.products) {
    // Kategori ID'sini map'ten al
    const dbCategoryId = categoryMap.get(prod.categoryId);
    if (!dbCategoryId) {
      console.warn(`⚠️  Ürün atlandı (kategori bulunamadı): ${prod.name}`);
      continue;
    }

    // Ürünü oluştur (varyantlar, görseller, etiketler dahil)
    await prisma.product.create({
      data: {
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        isActive: prod.isActive,
        isFeatured: prod.isFeatured,
        categoryId: dbCategoryId,
        brandId: ceyizDiyariBrand.id,  // Tüm ürünler Çeyiz Diyarı markasına ait
        variants: {
          create: prod.variants.map((v) => ({
            sku: v.sku,
            price: v.price,
            stockQty: v.stock,
          })),
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
    variantCount += prod.variants.length;
    imageCount += prod.images.length;
    tagCount += prod.tags.length;

    // Her 10 üründe bir ilerleme göster
    if (productCount % 10 === 0) {
      console.log(`   🛍️  ${productCount}/${mockData.products.length} ürün eklendi...`);
    }
  }

  console.log(`\n✅ Ürün verileri eklendi:`);
  console.log(`   🛍️  ${productCount} ürün`);
  console.log(`   📦 ${variantCount} varyant`);
  console.log(`   🖼️  ${imageCount} görsel`);
  console.log(`   🏷️  ${tagCount} etiket\n`);

  // Carts and wishlists mock data
  const allVariants = await prisma.productVariant.findMany({ take: 10 });
  if (allVariants.length >= 6) {
    // customer1 (Elif Yılmaz)
    await prisma.cart.create({
      data: {
        userId: customer1.id,
        items: {
          create: [
            { variantId: allVariants[0].id, quantity: 3, priceAtAdd: allVariants[0].price },
            { variantId: allVariants[1].id, quantity: 1, priceAtAdd: allVariants[1].price },
          ]
        }
      }
    });
    await prisma.wishlist.create({
      data: {
        userId: customer1.id,
        items: {
          create: [
            { variantId: allVariants[0].id },
            { variantId: allVariants[2].id },
          ]
        }
      }
    });

    // customer2 (Ahmet Demir)
    await prisma.cart.create({
      data: {
        userId: customer2.id,
        items: {
          create: [
            { variantId: allVariants[2].id, quantity: 1, priceAtAdd: allVariants[2].price },
          ]
        }
      }
    });
    await prisma.wishlist.create({
      data: {
        userId: customer2.id,
        items: {
          create: [
            { variantId: allVariants[0].id },
            { variantId: allVariants[1].id },
            { variantId: allVariants[3].id },
          ]
        }
      }
    });

    // customer3 (Zeynep Kara)
    await prisma.cart.create({
      data: {
        userId: customer3.id,
        items: {
          create: [
            { variantId: allVariants[3].id, quantity: 2, priceAtAdd: allVariants[3].price },
            { variantId: allVariants[4].id, quantity: 3, priceAtAdd: allVariants[4].price },
          ]
        }
      }
    });
    await prisma.wishlist.create({
      data: {
        userId: customer3.id,
        items: {
          create: [
            { variantId: allVariants[0].id },
            { variantId: allVariants[4].id },
          ]
        }
      }
    });

    // customer4 (Selin Aydın)
    await prisma.cart.create({
      data: {
        userId: customer4.id,
        items: {
          create: [
            { variantId: allVariants[1].id, quantity: 2, priceAtAdd: allVariants[1].price },
            { variantId: allVariants[5].id, quantity: 2, priceAtAdd: allVariants[5].price },
          ]
        }
      }
    });
    await prisma.wishlist.create({
      data: {
        userId: customer4.id,
        items: {
          create: [
            { variantId: allVariants[2].id },
            { variantId: allVariants[3].id },
          ]
        }
      }
    });
    console.log('🛒 Sepetler ve favori listeleri eklendi');
  }

  // Haber bülteni aboneleri
  await prisma.newsletterSubscriber.createMany({
    data: [
      { email: 'elif@mail.com', status: 'confirmed', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { email: 'ahmet@mail.com', status: 'confirmed', createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
      { email: 'zeynep@mail.com', status: 'pending', createdAt: new Date(Date.now() - 30 * 60 * 1000) },
      { email: 'burak@mail.com', status: 'confirmed', createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { email: 'selin@mail.com', status: 'confirmed', createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
      { email: 'murat@mail.com', status: 'confirmed', createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) },
    ]
  });
  console.log('📰 Haber bülteni aboneleri eklendi');

  // ─── İndirim kuponları ────────────────────────────────────────────────────
  await prisma.discount.create({
    data: {
      code: 'HOSGELDIN10',
      type: 'PERCENT',
      value: 10,
      minOrder: 500,
      maxUses: 1000,
      isActive: true,
    },
  });
  await prisma.discount.create({
    data: {
      code: 'CEYIZ15',
      type: 'PERCENT',
      value: 15,
      minOrder: 2000,
      maxUses: 200,
      isActive: true,
    },
  });
  await prisma.discount.create({
    data: {
      code: 'INDIRIM100',
      type: 'FIXED',
      value: 100,
      minOrder: 1000,
      maxUses: 500,
      isActive: true,
    },
  });
  console.log('🎟️  3 indirim kuponu eklendi\n');

  // ─── Chatbot kuralları ────────────────────────────────────────────────────
  const chatbotRules = [
    { title: 'Karşılama', keywords: ['merhaba','selam','hi','hey','iyi günler','iyi akşamlar','nasılsın'], response: 'Merhaba! 👋 MaBridge\'e hoş geldiniz. Size nasıl yardımcı olabilirim?\n\nAşağıdaki konularda bilgi alabilirim:', quickReplies: ['Kargo & Teslimat','İade & İptal','Ürün & Stok','Ödeme Seçenekleri'], sortOrder: 0 },
    { title: 'Kargo & Teslimat', keywords: ['kargo','teslimat','gönderim','kaç günde','ne zaman gelir','takip'], response: '🚚 **Kargo & Teslimat Bilgileri**\n\n• Siparişler 1–3 iş günü içinde kargoya verilir\n• Standart teslimat 2–4 iş günü sürer\n• 500₺ üzeri alışverişlerde kargo **ücretsiz!**\n• Kargo takibinizi Siparişlerim sayfasından yapabilirsiniz\n\nBaşka bir sorunuz var mı?', quickReplies: ['Siparişlerimi Göster','İade & İptal','Ana Sayfaya Dön'], sortOrder: 1 },
    { title: 'İade & İptal', keywords: ['iade','iptal','geri','para iadesi','değişim','bozuk','hasarlı','hatalı'], response: '↩️ **İade & İptal Politikası**\n\n• Ürün tesliminden itibaren **14 gün** iade hakkınız var\n• Kullanılmamış ve orijinal ambalajında olması şarttır\n• İade talebinizi Siparişlerim sayfasından oluşturabilirsiniz\n• İadeler onaylandıktan sonra 5–7 iş günü içinde ödeme iade edilir\n\nDetaylı yardım için bize WhatsApp\'tan ulaşabilirsiniz.', quickReplies: ['WhatsApp\'a Bağlan','Siparişlerimi Göster','Diğer Konular'], sortOrder: 2 },
    { title: 'Ödeme Seçenekleri', keywords: ['ödeme','kredi kartı','havale','taksit','kapıda','eft','banka'], response: '💳 **Ödeme Seçenekleri**\n\n• Tüm kredi ve banka kartları kabul edilir\n• 9 taksit imkânı (belirlı kartlar)\n• Havale / EFT ile ödeme\n• Kapıda ödeme (nakit veya kart)\n\nGüvenli ödeme altyapısı için SSL koruması kullanılmaktadır. 🔒', quickReplies: ['Kargo Bilgileri','İade & İptal','Ürün Soruları'], sortOrder: 3 },
    { title: 'Ürün & Stok', keywords: ['ürün','stok','var mı','mevcut','renk','beden','numara','model'], response: '📦 **Ürün & Stok Bilgisi**\n\nBelirli bir ürün hakkında bilgi almak için:\n• Arama çubuğunu kullanabilirsiniz\n• Kategoriler üzerinden göz atabilirsiniz\n• Stok durumu ürün sayfasında görünmektedir\n\nBelirli bir ürünü mü arıyorsunuz? Ürün adını yazabilirsiniz! 🔍', quickReplies: ['Ürünleri Ara','WhatsApp\'a Bağlan'], sortOrder: 4 },
    { title: 'Sipariş Sorgulama', keywords: ['sipariş','siparişim','nerelde','durum','takip et'], response: '📋 **Sipariş Sorgulama**\n\nSipariş durumunuzu görmek için:\n• Hesabınıza giriş yapın\n• "Siparişlerim" sayfasını ziyaret edin\n• Her sipariş için kargo takip numarası mevcuttur\n\nGiriş yapmadan sipariş sorgulayamazsınız.', quickReplies: ['Siparişlerime Git','Kargo & Teslimat','Destek Al'], sortOrder: 5 },
    { title: 'Hesap İşlemleri', keywords: ['hesap','kayıt','üye','giriş','şifre','unuttum','profil'], response: '👤 **Hesap İşlemleri**\n\n• **Kayıt olmak** için sağ üstteki "Hesabım" butonuna tıklayın\n• **Şifrenizi** mi unuttunuz? Giriş sayfasındaki "Şifremi Unuttum" linkini kullanın\n• Profil bilgilerinizi "Hesabım → Profil" sayfasından güncelleyebilirsiniz', quickReplies: ['Giriş Yap','Kayıt Ol','Diğer Konular'], sortOrder: 6 },
    { title: 'İndirim & Kampanyalar', keywords: ['indirim','kampanya','kupon','fırsat','promosyon','kod'], response: '🎁 **İndirim & Kampanyalar**\n\n• Aktif kampanyaları ana sayfada görebilirsiniz\n• 500₺ üzeri siparişlerde ücretsiz kargo!\n• Yeni üyelere özel fırsatlar için bültenimize kayıt olun\n\nKupon kodunuzu sepet sayfasında uygulayabilirsiniz.', quickReplies: ['Kampanyaları Gör','Ürünleri İncele'], sortOrder: 7 },
    { title: 'İletişim & Destek', keywords: ['iletişim','telefon','email','mail','ulaş','yardım','destek','çözemedim','anlamadım'], response: '📞 **Bize Ulaşın**\n\nSorunuz çözülmediyse bize doğrudan ulaşabilirsiniz:\n\n• 💬 **WhatsApp**: En hızlı yanıt\n• Hafta içi 09:00–18:00 aktif destek\n\nWhatsApp üzerinden devam edelim mi?', quickReplies: ['WhatsApp\'a Bağlan','Sorunum Çözüldü ✓'], sortOrder: 8 },
    { title: 'Teşekkür / Kapanış', keywords: ['teşekkür','sağol','tamam','oldu','anladım','çözüldü'], response: 'Rica ederim! 😊 Başka bir sorunuz olursa buradayım.\n\nAlışverişlerinizde kolaylıklar dilerim! 🛍️', quickReplies: ['Ürünlere Göz At','Görüşürüz 👋'], sortOrder: 9 },
  ];

  await prisma.chatbotRule.deleteMany({});
  await prisma.chatbotRule.createMany({ data: chatbotRules });
  console.log(`🤖 ${chatbotRules.length} chatbot kuralı eklendi\n`);

  // ─── Özet ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════');
  console.log('✅ Seed tamamlandı!');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('👤 Kullanıcılar:');
  console.log('   Admin   → admin@ecommerce.com / Admin123!');
  console.log('   Müşteri → test@ecommerce.com  / Test123!');
  console.log('');
  console.log(`📂 Kategoriler: ${mockData.categories.length} adet`);
  console.log(`🛍️  Ürünler: ${productCount} ürün, ${variantCount} varyant`);
  console.log(`🖼️  Görseller: ${imageCount} adet`);
  console.log(`🏷️  Etiketler: ${tagCount} adet`);
  console.log(`🏢 Markalar: 4 adet`);
  console.log('');
  console.log('🎟️  Kuponlar:');
  console.log('   HOSGELDIN10 → %10 indirim (min. 500₺)');
  console.log('   CEYIZ15     → %15 indirim (min. 2000₺)');
  console.log('   INDIRIM100  → 100₺ indirim (min. 1000₺)');
  console.log('═══════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('Seed hatası:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

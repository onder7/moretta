const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function importBackup() {
  try {
    console.log('📥 Backup dosyası okunuyor...');
    const backupPath = '/app/backup-2026-06-05T08-27-04.json';
    const rawData = fs.readFileSync(backupPath, 'utf-8');
    const data = JSON.parse(rawData);

    // Varyantları ve görselleri önceden çıkar
    const allVariants = [];
    const allImages = [];
    if (data.tables.products) {
      for (const product of data.tables.products) {
        if (Array.isArray(product.variants)) {
          allVariants.push(...product.variants);
        }
        if (Array.isArray(product.images)) {
          allImages.push(...product.images);
        }
      }
    }
    console.log(`   Variant sayısı: ${allVariants.length}, Görsel sayısı: ${allImages.length}`);

    console.log('🧹 Veritabanı temizleniyor...');

    // Tüm verileri sil (sıralama önemli)
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
    await prisma.attributeValue.deleteMany({});
    await prisma.productVariant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.attribute.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.brand.deleteMany({});
    await prisma.address.deleteMany({});
    await prisma.userProfile.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('✅ Veritabanı temizlendi\n');
    console.log('🌱 İthalatı başlıyor...\n');

    // Kategoriler
    console.log('📂 Kategoriler yükleniyor...');
    const categories = {};
    if (data.tables.categories) {
      for (const cat of data.tables.categories) {
        const created = await prisma.category.create({
          data: {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description || '',
            imageUrl: cat.image || cat.imageUrl || null,
            sortOrder: cat.sortOrder || 0,
            isActive: cat.isActive !== false,
          }
        });
        categories[cat.id] = created;
        process.stdout.write('.');
      }
      console.log(`\n✅ ${Object.keys(categories).length} kategori yüklendi\n`);
    }

    // Markalar
    console.log('🏷️ Markalar yükleniyor...');
    const brands = {};
    if (data.tables.brands) {
      for (const brand of data.tables.brands) {
        const created = await prisma.brand.create({
          data: {
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            logoUrl: brand.logo || brand.logoUrl || null,
            isActive: brand.isActive !== false,
          }
        });
        brands[brand.id] = created;
        process.stdout.write('.');
      }
      console.log(`\n✅ ${Object.keys(brands).length} marka yüklendi\n`);
    }

    // Ürünler
    console.log('📦 Ürünler yükleniyor...');
    const products = {};
    if (data.tables.products) {
      for (const prod of data.tables.products) {
        const created = await prisma.product.create({
          data: {
            id: prod.id,
            categoryId: prod.categoryId,
            brandId: prod.brandId,
            name: prod.name,
            slug: prod.slug,
            description: prod.description,
            isActive: prod.isActive !== false,
            isFeatured: prod.isFeatured || false,
            createdAt: new Date(prod.createdAt),
            updatedAt: new Date(prod.updatedAt),
          }
        });
        products[prod.id] = created;
        process.stdout.write('.');
      }
      console.log(`\n✅ ${Object.keys(products).length} ürün yüklendi\n`);
    }

    // Varyantlar
    console.log('🎨 Varyantlar yükleniyor...');
    let variantCount = 0;
    for (const variant of allVariants) {
      try {
        await prisma.productVariant.create({
          data: {
            id: variant.id,
            productId: variant.productId,
            sku: variant.sku,
            price: variant.price.toString(),
            compareAt: variant.compareAt ? variant.compareAt.toString() : null,
            stockQty: parseInt(variant.stockQty) || 0,
            isActive: variant.isActive !== false,
          }
        });
        variantCount++;
        if (variantCount % 10 === 0) process.stdout.write('.');
      } catch (e) {
        // skip
      }
    }
    console.log(`\n✅ ${variantCount} varyant yüklendi\n`);

    // Görseller
    console.log('🖼️ Görseller yükleniyor...');
    let imageCount = 0;
    for (const img of allImages) {
      try {
        await prisma.productImage.create({
          data: {
            id: img.id,
            productId: img.productId,
            variantId: img.variantId || null,
            url: img.url,
            altText: img.altText || '',
            isPrimary: img.isPrimary || false,
            sortOrder: img.sortOrder || 0,
          }
        });
        imageCount++;
        if (imageCount % 10 === 0) process.stdout.write('.');
      } catch (e) {
        // skip
      }
    }
    console.log(`\n✅ ${imageCount} görsel yüklendi\n`);

    console.log('🎉 İthalatı başarıyla tamamlandı!');
    console.log(`
📊 Özet:
   - Kategoriler: ${Object.keys(categories).length}
   - Markalar: ${Object.keys(brands).length}
   - Ürünler: ${Object.keys(products).length}
   - Varyantlar: ${variantCount}
   - Görseller: ${imageCount}
    `);

  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importBackup();

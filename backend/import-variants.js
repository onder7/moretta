const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function importVariants() {
  try {
    console.log('📥 Backup dosyası okunuyor...');
    const backupPath = '/app/backup-2026-06-05T08-27-04.json';
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

    console.log('🗑️  Mevcut varyantları siliyorum...');
    await prisma.variantAttributeValue.deleteMany({});
    await prisma.productVariant.deleteMany({});
    await prisma.attributeValue.deleteMany({});
    await prisma.attribute.deleteMany({});

    console.log('✅ Temizlik tamamlandı\n');

    // Önce attributes'ları tanımla
    const attributeMap = {};
    const attributes = ['color', 'size', 'material', 'pattern'];

    console.log('🏷️  Attributes oluşturuluyor...');
    for (const attrName of attributes) {
      try {
        const attr = await prisma.attribute.create({
          data: {
            id: `attr-${attrName}`,
            name: attrName.charAt(0).toUpperCase() + attrName.slice(1),
            slug: attrName,
            inputType: attrName === 'color' ? 'color' : 'text',
            sortOrder: attributes.indexOf(attrName) + 1,
          }
        });
        attributeMap[attrName] = attr;
        console.log(`  ✓ ${attrName}`);
      } catch (e) {
        // Zaten var olabilir
      }
    }
    console.log('✅ Attributes hazır\n');

    // Varyantları import et
    console.log('🎨 Varyantlar yükleniyor...');
    let variantCount = 0;
    let attributeValueCount = 0;

    // Varyantlar ürünlerin içinde
    console.log(`Debug: data.tables exists: ${!!data.tables}`);
    console.log(`Debug: data.tables.products exists: ${!!data.tables.products}`);
    console.log(`Debug: is array: ${Array.isArray(data.tables.products)}`);
    console.log(`Debug: product count: ${data.tables.products ? data.tables.products.length : 0}`);

    if (data.tables.products && Array.isArray(data.tables.products)) {
      for (const product of data.tables.products) {
        if (!product.variants || !Array.isArray(product.variants)) {
          console.log(`Debug: skipping product ${product.id} - no variants or not array`);
          continue;
        }
        console.log(`Debug: processing product ${product.id} with ${product.variants.length} variants`);

        for (const variant of product.variants) {
          try {
            // Varyantı oluştur
            const createdVariant = await prisma.productVariant.create({
              data: {
                id: variant.id,
                productId: variant.productId,
                sku: variant.sku || `SKU-${variant.id.slice(0, 8)}`,
                price: (variant.price || '0').toString(),
                compareAt: variant.compareAt ? (variant.compareAt).toString() : null,
                stockQty: parseInt(variant.stockQty) || 0,
                isActive: variant.isActive !== false,
              }
            });

            // Variant'in attributes'larını işle
            if (variant.attributes && typeof variant.attributes === 'object') {
              for (const [attrName, attrValue] of Object.entries(variant.attributes)) {
                const attr = attributeMap[attrName.toLowerCase()];
                if (!attr) continue;

                // AttributeValue oluştur veya bul
                let attrValueRecord = await prisma.attributeValue.findFirst({
                  where: {
                    attributeId: attr.id,
                    value: attrValue.toString(),
                  }
                });

                if (!attrValueRecord) {
                  attrValueRecord = await prisma.attributeValue.create({
                    data: {
                      id: `attrval-${attr.id}-${attrValue.toString().replace(/\s+/g, '-')}`.toLowerCase(),
                      attributeId: attr.id,
                      value: attrValue.toString(),
                      colorHex: attrName.toLowerCase() === 'color' ? generateColorHex(attrValue) : null,
                      sortOrder: 0,
                    }
                  });
                }

                // Variant ile attribute'ı bağla
                await prisma.variantAttributeValue.create({
                  data: {
                    variantId: createdVariant.id,
                    attributeValueId: attrValueRecord.id,
                  }
                });

                attributeValueCount++;
              }
            }

            variantCount++;
            if (variantCount % 10 === 0) process.stdout.write('.');
          } catch (e) {
            console.log(`\n⚠️  Variant hatası: ${variant.id}`);
            console.log(`   Error: ${e.message}`);
            console.log(`   Code: ${e.code}`);
          }
        }
      }
    }

    console.log(`\n✅ ${variantCount} varyant yüklendi`);
    console.log(`✅ ${attributeValueCount} attribute value oluşturuldu\n`);

    // İstatistik
    const stats = await prisma.productVariant.count();
    const attrCount = await prisma.attribute.count();
    const attrValueCount = await prisma.attributeValue.count();

    console.log(`📊 ÖZET:
   - Varyantlar: ${stats}
   - Attributes: ${attrCount}
   - Attribute Values: ${attrValueCount}
    `);

  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Renk adından hex kod üretme
function generateColorHex(colorName) {
  const colors = {
    'krem': '#F5DEB3',
    'beyaz': '#FFFFFF',
    'pudra': '#FAD9DB',
    'gri': '#808080',
    'siyah': '#000000',
    'bordo': '#800020',
    'lacivert': '#000080',
    'mavi': '#0000FF',
    'yeşil': '#008000',
    'sarı': '#FFFF00',
    'turuncu': '#FFA500',
    'pembe': '#FFC0CB',
    'mor': '#800080',
  };

  const name = colorName.toLowerCase();
  for (const [key, hex] of Object.entries(colors)) {
    if (name.includes(key)) return hex;
  }

  return null;
}

importVariants();

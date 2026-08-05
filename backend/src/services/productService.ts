import { prisma } from '../config/database';
import { AppError } from '../types';
import { Prisma } from '@prisma/client';

export interface ProductFilters {
  categorySlug?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  inStock?: boolean;
  onSale?: boolean;
  // Attribute filtresi: { "renk": ["Beyaz","Mavi"], "beden": ["35","36"] }
  attributes?: Record<string, string[]>;
}

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  variants: {
    where: { isActive: true },
    select: {
      id: true, sku: true, price: true, compareAt: true,
      stockQty: true, desi: true,
      attributeValues: {
        select: {
          attributeValue: {
            select: {
              id: true, value: true, colorHex: true, sortOrder: true,
              attribute: { select: { id: true, name: true, slug: true, inputType: true, sortOrder: true } },
            },
          },
        },
      },
    },
  },
  images: {
    orderBy: { sortOrder: 'asc' as const },
    select: { id: true, url: true, altText: true, isPrimary: true },
  },
  tags: { select: { tag: true } },
  // Kart üzerinde ortalama puan göstermek için onaylı yorumların puanları
  reviews: { where: { isApproved: true }, select: { rating: true } },
  _count: { select: { reviews: { where: { isApproved: true } } } },
} satisfies Prisma.ProductInclude;

export async function listProducts(filters: ProductFilters = {}) {
  const { page = 1, limit = 20, search, categorySlug, brandId, minPrice, maxPrice, sort = 'newest', inStock, onSale, attributes } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = { isActive: true };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { some: { tag: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  if (categorySlug) {
    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) throw new AppError('Kategori bulunamadı', 404);
    const descendantIds = await getCategoryDescendantIds(category.id);
    where.categoryId = { in: [category.id, ...descendantIds] };
  }

  if (brandId) where.brandId = brandId;

  // Variant koşullarını tek bir AND bloğunda birleştir
  const variantConditions: Prisma.ProductVariantWhereInput[] = [{ isActive: true }];

  if (minPrice !== undefined || maxPrice !== undefined) {
    variantConditions.push({
      price: {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    });
  }

  if (inStock) {
    variantConditions.push({ stockQty: { gt: 0 } });
  }

  if (onSale) {
    variantConditions.push({ compareAt: { not: null } });
  }

  if (attributes && Object.keys(attributes).length > 0) {
    // Her attribute grubu için ayrı some koşulu — AND semantiği
    for (const [slug, values] of Object.entries(attributes)) {
      if (values.length === 0) continue;
      variantConditions.push({
        attributeValues: {
          some: {
            attributeValue: {
              value: { in: values },
              attribute: { slug },
            },
          },
        },
      });
    }
  }

  if (variantConditions.length > 1) {
    where.variants = { some: { AND: variantConditions } };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === 'price_asc' ? { variants: { _count: 'asc' } }
    : sort === 'price_desc' ? { variants: { _count: 'desc' } }
    : sort === 'popular' ? { reviews: { _count: 'desc' } }
    : { createdAt: 'desc' };

  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, include: productInclude, orderBy, skip, take: limit }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// Kategoriye ait filtre seçeneklerini döner — frontend filtre paneli için
export async function getFilterOptions(categorySlug?: string) {
  const categoryWhere: Prisma.ProductWhereInput = { isActive: true };

  if (categorySlug) {
    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (category) {
      const descendantIds = await getCategoryDescendantIds(category.id);
      categoryWhere.categoryId = { in: [category.id, ...descendantIds] };
    }
  }

  // Bu kategorideki aktif varyantların attribute değerlerini çek
  const variants = await prisma.productVariant.findMany({
    where: { isActive: true, product: categoryWhere },
    select: {
      price: true,
      compareAt: true,
      stockQty: true,
      attributeValues: {
        select: {
          attributeValue: {
            select: {
              id: true,
              value: true,
              colorHex: true,
              sortOrder: true,
              attribute: {
                select: { id: true, name: true, slug: true, inputType: true, sortOrder: true },
              },
            },
          },
        },
      },
    },
  });

  // Attribute gruplarını topla
  const attrMap = new Map<string, { id: string; name: string; slug: string; inputType: string; sortOrder: number; values: Map<string, { id: string; value: string; colorHex: string | null; sortOrder: number }> }>();

  let minPrice = Infinity;
  let maxPrice = 0;

  for (const v of variants) {
    const price = Number(v.price);
    if (price < minPrice) minPrice = price;
    if (price > maxPrice) maxPrice = price;

    for (const { attributeValue: av } of v.attributeValues) {
      const { attribute: attr } = av;
      if (!attrMap.has(attr.slug)) {
        attrMap.set(attr.slug, {
          id: attr.id,
          name: attr.name,
          slug: attr.slug,
          inputType: attr.inputType,
          sortOrder: attr.sortOrder,
          values: new Map(),
        });
      }
      const group = attrMap.get(attr.slug)!;
      if (!group.values.has(av.value)) {
        group.values.set(av.value, { id: av.id, value: av.value, colorHex: av.colorHex, sortOrder: av.sortOrder });
      }
    }
  }

  const attributes = Array.from(attrMap.values())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      inputType: g.inputType,
      values: Array.from(g.values.values()).sort((a, b) => a.sortOrder - b.sortOrder),
    }));

  // Markalar
  const brands = await prisma.brand.findMany({
    where: { isActive: true, products: { some: categoryWhere } },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  return {
    attributes,
    brands,
    priceRange: {
      min: minPrice === Infinity ? 0 : Math.floor(minPrice),
      max: maxPrice === 0 ? 10000 : Math.ceil(maxPrice),
    },
  };
}

export async function getProductBySlug(slug: string) {
  // Not: yorumlar yalnızca puan ortalaması için kullanılır; yorum yazarı ad/soyad
  // (ve email) sızmaması için productInclude'daki rating-only select miras alınır.
  // Yorumların kendisi maskeli olarak /reviews (reviewService.getReviews) ile gelir.
  const product = await prisma.product.findUnique({
    where: { slug },
    include: productInclude,
  });
  if (!product || !product.isActive) throw new AppError('Ürün bulunamadı', 404);
  return product;
}

export async function getFeaturedProducts(limit = 8) {
  return prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    include: productInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function listCategories() {
  return prisma.category.findMany({
    where: { isActive: true, parentId: null },
    include: {
      children: {
        where: { isActive: true },
        select: {
          id: true, name: true, slug: true, imageUrl: true, showInMenu: true,
          children: {
            where: { isActive: true },
            select: { id: true, name: true, slug: true, imageUrl: true, showInMenu: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: { where: { isActive: true }, select: { id: true, name: true, slug: true } },
      parent: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!category || !category.isActive) throw new AppError('Kategori bulunamadı', 404);
  return category;
}

export async function listBrands() {
  return prisma.brand.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, logoUrl: true },
    orderBy: { name: 'asc' },
  });
}

async function getCategoryDescendantIds(categoryId: string): Promise<string[]> {
  const children = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });
  const ids = children.map((c) => c.id);
  for (const child of children) {
    const deeper = await getCategoryDescendantIds(child.id);
    ids.push(...deeper);
  }
  return ids;
}

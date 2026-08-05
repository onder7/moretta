import { prisma } from '../config/database';
import { AppError } from '../types';
import { Prisma } from '@prisma/client';
import { logger } from '../config/logger';
import * as emailSvc from './emailService';

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOf30Days = new Date(now);
  startOf30Days.setDate(now.getDate() - 30);

  const [
    totalOrders,
    todayOrders,
    totalRevenue,
    monthRevenue,
    totalCustomers,
    newCustomers,
    totalProducts,
    pendingOrders,
    recentOrders,
    salesByDay,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { notIn: ['CANCELLED', 'REFUNDED'] }, createdAt: { gte: startOf30Days } },
    }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: startOf30Days } } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
        items: { select: { quantity: true, unitPrice: true } },
      },
    }),
    // Son 30 günün günlük satışları
    prisma.$queryRaw<{ day: Date; revenue: number; count: number }[]>`
      SELECT
        DATE_TRUNC('day', created_at) AS day,
        SUM(total)::float AS revenue,
        COUNT(*)::int AS count
      FROM orders
      WHERE created_at >= ${startOf30Days}
        AND status NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY day
      ORDER BY day ASC
    `,
  ]);

  return {
    totalOrders,
    todayOrders,
    totalRevenue: Number(totalRevenue._sum.total ?? 0),
    monthRevenue: Number(monthRevenue._sum.total ?? 0),
    totalCustomers,
    newCustomers,
    totalProducts,
    pendingOrders,
    recentOrders,
    salesByDay: salesByDay.map((r) => ({
      day: r.day,
      revenue: Number(r.revenue),
      count: Number(r.count),
    })),
  };
}

// ─── Admin Ürün Yönetimi ──────────────────────────────────────────────────────

export interface AdminProductInput {
  categoryId: string;
  brandId?: string;
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  vatRate?: number;
  intensity?: number;
  vatIncluded?: boolean;
  pricingMethod?: string;
  costPrice?: number;
  markupPercentage?: number;
  variants: {
    id?: string;
    sku: string;
    price: number;
    compareAt?: number;
    stockQty: number;
    desi?: number;
    attributeValueIds?: string[];
  }[];
  images?: { url: string; altText?: string; isPrimary?: boolean; sortOrder?: number }[];
  tags?: string[];
}

/**
 * Verilen kategori + tüm alt kategorilerinin id'lerini döner.
 * Üst kategori seçildiğinde alt kategorilerdeki ürünler de listelensin diye kullanılır.
 * (Ör. "Havlular" seçilince "Premium Havlular" ürünleri de gelir.) Döngüye karşı korumalı.
 */
async function categoryWithDescendants(categoryId: string): Promise<string[]> {
  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const childrenOf = new Map<string, string[]>();
  for (const c of all) {
    if (c.parentId) {
      const arr = childrenOf.get(c.parentId) ?? [];
      arr.push(c.id);
      childrenOf.set(c.parentId, arr);
    }
  }
  const result: string[] = [];
  const seen = new Set<string>();
  const stack = [categoryId];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue; // döngü koruması
    seen.add(id);
    result.push(id);
    for (const child of childrenOf.get(id) ?? []) stack.push(child);
  }
  return result;
}

export async function adminListProducts(params: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
}) {
  const { page = 1, limit = 20, search, categoryId, brandId } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (categoryId) {
    // Seçilen kategori + alt kategorileri kapsansın
    const ids = await categoryWithDescendants(categoryId);
    where.categoryId = { in: ids };
  }
  if (brandId) where.brandId = brandId;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        variants: { select: { id: true, sku: true, price: true, stockQty: true, isActive: true } },
        _count: { select: { reviews: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function adminCreateProduct(data: AdminProductInput) {
  const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (existing) throw new AppError('Bu slug zaten kullanılıyor', 409);

  return prisma.product.create({
    data: {
      categoryId: data.categoryId,
      brandId: data.brandId || null,
      name: data.name,
      slug: data.slug,
      description: data.description,
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      vatRate: data.vatRate ?? 20,
      intensity: data.intensity ?? 0,
      vatIncluded: data.vatIncluded ?? true,
      variants: {
        create: data.variants.map((v) => ({
          sku: v.sku,
          price: v.price,
          compareAt: v.compareAt,
          stockQty: v.stockQty,
          desi: v.desi,
          attributeValues: v.attributeValueIds?.length
            ? { create: v.attributeValueIds.map((attributeValueId) => ({ attributeValueId })) }
            : undefined,
        })),
      },
      images: data.images
        ? { create: data.images.map((img, i) => ({ ...img, sortOrder: img.sortOrder ?? i })) }
        : undefined,
      tags: data.tags
        ? { create: data.tags.map((tag) => ({ tag })) }
        : undefined,
    },
    include: {
      variants: { include: { attributeValues: { include: { attributeValue: { include: { attribute: true } } } } } },
      images: true,
      tags: true,
    },
  });
}

export async function adminUpdateProduct(id: string, data: Partial<AdminProductInput>) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Ürün bulunamadı', 404);

  if (data.slug && data.slug !== product.slug) {
    const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
    if (existing) throw new AppError('Bu slug zaten kullanılıyor', 409);
  }

  return prisma.$transaction(async (tx) => {
    // Temel alanları güncelle
    await tx.product.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        brandId: data.brandId || null,
        name: data.name,
        slug: data.slug,
        description: data.description,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        vatRate: data.vatRate,
        intensity: data.intensity,
        vatIncluded: data.vatIncluded,
        pricingMethod: data.pricingMethod,
        costPrice: data.costPrice,
        markupPercentage: data.markupPercentage,
      },
    });

    // Varyantları güncelle (formdan gelen liste)
    if (data.variants) {
      const incomingIds = data.variants.filter((v) => v.id).map((v) => v.id!);

      // Listede olmayan varyantları bul
      const toRemove = await tx.productVariant.findMany({
        where: { productId: id, id: { notIn: incomingIds } },
        select: { id: true, _count: { select: { orderItems: true } } },
      });

      const canHardDelete = toRemove.filter((v) => v._count.orderItems === 0).map((v) => v.id);
      const mustSoftKeep  = toRemove.filter((v) => v._count.orderItems > 0).map((v) => v.id);

      // SKU kısıtı kalmayacak şekilde tamamen sil (sipariş kaydı olmayan varyantlar)
      if (canHardDelete.length > 0) {
        await tx.variantAttributeValue.deleteMany({ where: { variantId: { in: canHardDelete } } });
        await tx.cartItem.deleteMany({ where: { variantId: { in: canHardDelete } } });
        await tx.wishlistItem.deleteMany({ where: { variantId: { in: canHardDelete } } });
        await tx.productVariant.deleteMany({ where: { id: { in: canHardDelete } } });
      }

      // Sipariş geçmişi olan varyantları sadece pasif et
      if (mustSoftKeep.length > 0) {
        await tx.productVariant.updateMany({
          where: { id: { in: mustSoftKeep } },
          data: { isActive: false },
        });
      }

      // Mevcut varyantları güncelle
      for (const v of data.variants.filter((v) => v.id)) {
        const oldVariant = await tx.productVariant.findUnique({ where: { id: v.id! } });
        if (!oldVariant) {
          throw new AppError(`Varyant bulunamadı: ${v.id}`, 404);
        }

        await tx.productVariant.update({
          where: { id: v.id! },
          data: {
            sku: v.sku,
            price: v.price,
            compareAt: v.compareAt ?? null,
            desi: v.desi ?? null,
            isActive: true,
          },
        });

        // Fiyat değiştiyse geçmişe kaydet
        if (Number(oldVariant.price) !== Number(v.price)) {
          await tx.priceHistory.create({
            data: {
              variantId: v.id!,
              oldPrice: oldVariant.price,
              newPrice: v.price,
            },
          });
        }

        // Junction tablosunu sıfırla ve yeniden oluştur
        if (v.attributeValueIds !== undefined) {
          await tx.variantAttributeValue.deleteMany({ where: { variantId: v.id! } });
          if (v.attributeValueIds.length > 0) {
            await tx.variantAttributeValue.createMany({
              data: v.attributeValueIds.map((attributeValueId) => ({ variantId: v.id!, attributeValueId })),
              skipDuplicates: true,
            });
          }
        }
      }

      // Yeni varyantları oluştur
      for (const v of data.variants.filter((v) => !v.id)) {
        const existingSku = await tx.productVariant.findUnique({ where: { sku: v.sku } });
        if (existingSku) {
          throw new AppError(`Bu SKU zaten kullanılıyor: ${v.sku}`, 409);
        }
        const created = await tx.productVariant.create({
          data: {
            productId: id,
            sku: v.sku,
            price: v.price,
            compareAt: v.compareAt ?? null,
            stockQty: v.stockQty ?? 0,
            desi: v.desi ?? null,
          },
        });
        if (v.attributeValueIds?.length) {
          await tx.variantAttributeValue.createMany({
            data: v.attributeValueIds.map((attributeValueId) => ({ variantId: created.id, attributeValueId })),
            skipDuplicates: true,
          });
        }
      }
    }

    // Görselleri yeniden oluştur (liste değiştiyse)
    if (data.images !== undefined) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((img, i) => ({
            productId: id,
            url: img.url,
            altText: img.altText,
            isPrimary: img.isPrimary ?? false,
            sortOrder: img.sortOrder ?? i,
          })),
        });
      }
    }

    // Etiketleri yeniden oluştur
    if (data.tags !== undefined) {
      await tx.productTag.deleteMany({ where: { productId: id } });
      if (data.tags.length > 0) {
        await tx.productTag.createMany({
          data: data.tags.map((tag) => ({ productId: id, tag })),
        });
      }
    }

    return tx.product.findUnique({
      where: { id },
      include: {
        variants: {
          where: { isActive: true },
          include: { attributeValues: { include: { attributeValue: { include: { attribute: true } } } } },
        },
        images: true,
        tags: true,
      },
    });
  });
}

export async function adminGetProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      variants: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: { attributeValues: { include: { attributeValue: { include: { attribute: true } } } } },
      },
      images: { orderBy: { sortOrder: 'asc' } },
      tags: true,
    },
  });
  if (!product) throw new AppError('Ürün bulunamadı', 404);
  return product;
}

export async function adminDeleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Ürün bulunamadı', 404);

  // Sipariş edilmiş ürün silinemez (OrderItem FK Restrict) — anlamlı mesaj ver
  const orderCount = await prisma.orderItem.count({ where: { variant: { productId: id } } });
  if (orderCount > 0) {
    throw new AppError(
      'Bu ürün daha önce sipariş edildiği için kalıcı olarak silinemez. Müşterilerden gizlemek için ürünü düzenleyip "Pasif" yapabilirsiniz.',
      409,
    );
  }

  try {
    await prisma.product.delete({ where: { id } });
  } catch (err) {
    // Sepet/favori gibi başka bir FK kısıtı engelliyorsa (P2003) anlaşılır mesaj
    if ((err as { code?: string })?.code === 'P2003') {
      throw new AppError(
        'Bu ürün şu anda müşterilerin sepetinde veya favorilerinde bulunduğu için silinemez. Müşterilerden gizlemek için ürünü "Pasif" yapabilirsiniz.',
        409,
      );
    }
    throw err;
  }
}

// ─── Admin Sipariş Yönetimi ───────────────────────────────────────────────────

export async function adminListOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  all?: boolean;
}) {
  const { page = 1, limit = 20, status, search, startDate, endDate, all = false } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status as never;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }
  if (search) {
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const include = {
    user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
    items: { select: { quantity: true, unitPrice: true } },
    address: { select: { city: true, district: true } },
    payment: { select: { status: true } },
    shipping: { select: { carrier: true, trackingNumber: true } },
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip: all ? 0 : skip,
      take: all ? undefined : limit,
      orderBy: { createdAt: 'desc' },
      include,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function adminUpdateOrderStatus(
  orderId: string,
  status: string,
  note?: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { variant: true } }, user: true },
  });
  if (!order) throw new AppError('Sipariş bulunamadı', 404);

  const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
  if (!validStatuses.includes(status)) throw new AppError('Geçersiz durum', 400);

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.order.update({
      where: { id: orderId },
      data: { status: status as never },
    });
    await tx.orderStatusLog.create({
      data: { orderId, status: status as never, note },
    });

    // Sipariş iptal/iade olursa stok geri ekle
    if ((status === 'CANCELLED' || status === 'REFUNDED') && order.items.length > 0) {
      for (const item of order.items) {
        const variant = item.variant;
        const newQty = variant.stockQty + item.quantity;

        // Varyant stoğunu güncelle
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stockQty: newQty },
        });

        // Stok hareketi logu oluştur
        await tx.stockMovement.create({
          data: {
            variantId: variant.id,
            oldQty: variant.stockQty,
            newQty,
            difference: item.quantity,
            reason: status === 'CANCELLED' ? 'order_cancelled' : 'order_cancelled',
          },
        });
      }
    }

    if (status === 'SHIPPED') {
      await tx.shipping.upsert({
        where: { orderId },
        update: {},
        create: { orderId, status: 'SHIPPED' },
      });
    }
    return u;
  });

  // ─── Müşteriye durum bildirimi e-postası (transaction dışında, hata sipariş güncellemesini etkilemez) ───
  void sendOrderStatusEmail(order, status).catch((e) =>
    logger.error('Sipariş durum e-postası gönderilemedi', { orderId, status, error: e?.message }),
  );

  return updated;
}

type OrderWithUser = Prisma.OrderGetPayload<{ include: { user: true } }>;

// Sipariş durumuna göre uygun müşteri e-postasını seçip gönderir
async function sendOrderStatusEmail(order: OrderWithUser, status: string): Promise<void> {
  const email = order.user?.email;
  if (!email) return;

  const orderRef = order.id.slice(-8).toUpperCase();
  const name = order.user.firstName || '';
  const total = Number(order.total);

  // Panelden düzenlenebilir şablonu olan durumlar
  const templateMap: Record<string, 'order_shipped' | 'order_delivered'> = {
    SHIPPED: 'order_shipped',
    DELIVERED: 'order_delivered',
  };

  if (templateMap[status]) {
    await emailSvc.sendOrderTemplateEmail(email, templateMap[status], {
      ad: name,
      siparis_no: orderRef,
      toplam: total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }),
    });
    return;
  }

  // Diğer durumlar (PROCESSING, CANCELLED, REFUNDED) için genel durum bildirimi
  const statusLabels: Record<string, string> = {
    PROCESSING: 'Hazırlanıyor',
    CANCELLED: 'İptal Edildi',
    REFUNDED: 'İade Edildi',
    PENDING: 'Beklemede',
  };
  const label = statusLabels[status];
  if (!label) return; // bilinmeyen/duplicate durum için e-posta gönderme

  await emailSvc.sendOrderStatusUpdate(email, order.id, status, label);
}

export async function adminUpdateOrderShipping(
  orderId: string,
  data: { carrier?: string; trackingNumber?: string }
) {
  const existing = await prisma.shipping.findUnique({ where: { orderId } });
  if (!existing) throw new AppError('Kargo kaydı bulunamadı. Önce siparişi "Kargoda" durumuna alın.', 404);

  return prisma.shipping.update({
    where: { orderId },
    data: {
      carrier: data.carrier ?? existing.carrier,
      trackingNumber: data.trackingNumber ?? existing.trackingNumber,
    },
  });
}

export async function adminUpdatePaymentStatus(orderId: string, status: string) {
  const allowed = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];
  if (!allowed.includes(status)) throw new AppError('Geçersiz ödeme durumu', 400);

  const existing = await prisma.payment.findUnique({ where: { orderId } });
  if (!existing) throw new AppError('Ödeme kaydı bulunamadı', 404);

  return prisma.payment.update({
    where: { orderId },
    data: { status: status as Prisma.PaymentUpdateInput['status'] },
  });
}

export async function adminGetOrderDetail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true, phone: true } } } },
      address: true,
      items: {
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } } },
            },
          },
        },
      },
      statusHistory: { orderBy: { createdAt: 'asc' } },
      payment: true,
      shipping: true,
    },
  });
  if (!order) throw new AppError('Sipariş bulunamadı', 404);
  return order;
}

// ─── Admin Müşteri Yönetimi ───────────────────────────────────────────────────

export async function adminListCustomers(params: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const { page = 1, limit = 20, search } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = { role: 'CUSTOMER' };
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { profile: { firstName: { contains: search, mode: 'insensitive' } } },
      { profile: { lastName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        profile: { select: { firstName: true, lastName: true, phone: true } },
        _count: { select: { orders: true } },
        orders: {
          select: { total: true },
          where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    customers: customers.map((c) => ({
      ...c,
      totalSpent: c.orders.reduce((sum, o) => sum + Number(o.total), 0),
      orders: undefined,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function adminToggleCustomerStatus(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Kullanıcı bulunamadı', 404);
  return prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
    select: { id: true, email: true, isActive: true },
  });
}

// ─── Admin Kategori/Marka Yönetimi ────────────────────────────────────────────

export async function adminListCategories() {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { products: true } },
      children: {
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: { select: { products: true } },
          children: {
            orderBy: { sortOrder: 'asc' },
            include: { _count: { select: { products: true } } },
          },
        },
      },
    },
  });
}

export interface AdminCategoryInput {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export async function adminCreateCategory(data: AdminCategoryInput) {
  const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
  if (existing) throw new AppError('Bu slug zaten kullanılıyor', 409);
  return prisma.category.create({ data: { ...data, sortOrder: data.sortOrder ?? 0 } });
}

export async function adminUpdateCategory(id: string, data: Partial<AdminCategoryInput>) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError('Kategori bulunamadı', 404);
  if (data.slug && data.slug !== category.slug) {
    const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
    if (existing) throw new AppError('Bu slug zaten kullanılıyor', 409);
  }
  return prisma.category.update({ where: { id }, data });
}

export async function adminDeleteCategory(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true, children: true } } },
  });
  if (!category) throw new AppError('Kategori bulunamadı', 404);
  if (category._count.products > 0)
    throw new AppError(`Bu kategoriye bağlı ${category._count.products} ürün var. Önce ürünleri taşıyın.`, 409);
  if (category._count.children > 0)
    throw new AppError(`Bu kategorinin ${category._count.children} alt kategorisi var. Önce alt kategorileri silin.`, 409);
  await prisma.category.delete({ where: { id } });
}

export async function getStockManagement() {
  const variants = await prisma.productVariant.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const movements = await prisma.stockMovement.findMany({
    include: {
      variant: { select: { sku: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const stocks = variants.map((v) => ({
    variantId: v.id,
    productId: v.product.id,
    productName: v.product.name,
    sku: v.sku,
    stockQty: v.stockQty,
    price: Number(v.price),
    categoryName: v.product.category.name,
    status: v.stockQty === 0 ? 'kritik' : v.stockQty < 5 ? 'düşük' : 'normal',
  }));

  return {
    stocks,
    movements: movements.map((m) => ({
      id: m.id,
      sku: m.variant.sku,
      oldQty: m.oldQty,
      newQty: m.newQty,
      difference: m.difference,
      reason: m.reason,
      createdAt: m.createdAt,
    })),
  };
}

export async function updateVariantStock(variantId: string, newQty: number, adminUserId?: string) {
  if (newQty < 0) throw new AppError('Stok negatif olamaz', 400);

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw new AppError('Varyant bulunamadı', 404);

  const oldStockQty = variant.stockQty;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.productVariant.update({
      where: { id: variantId },
      data: { stockQty: newQty },
    });

    if (oldStockQty !== newQty) {
      await tx.stockMovement.create({
        data: {
          variantId,
          oldQty: oldStockQty,
          newQty,
          difference: newQty - oldStockQty,
          reason: 'admin_update',
          adminUserId,
        },
      });
    }

    return updated;
  });
}

// ─── Fiyat & Ciro Raporu ──────────────────────────────────────────────────────
// Ürün bazında: satılan adet, ciro (gerçek satış fiyatlarından), ortalama satış
// fiyatı ve fiyat değişim sayısı. Ciro order_items.unit_price'tan gelir; fiyat
// değiştiyse bile geçmiş siparişler kendi fiyatıyla doğru hesaplanır.
export async function getProductPricingReport(from?: Date, to?: Date) {
  // Tarih aralığı filtresi (verilmişse). Satış sorguları o.created_at'e göre filtrelenir.
  const dateCond = from && to ? Prisma.sql`AND o.created_at BETWEEN ${from} AND ${to}` : Prisma.empty;
  const phDateCond = from && to ? Prisma.sql`AND ph.created_at BETWEEN ${from} AND ${to}` : Prisma.empty;

  const [products, sales, journey, cogsRows, prices, changes] = await Promise.all([
    prisma.product.findMany({ select: { id: true, name: true } }),
    prisma.$queryRaw<Array<{ product_id: string; units: number; revenue: number }>>`
      SELECT pv.product_id,
             SUM(oi.quantity)::int AS units,
             SUM(oi.unit_price * oi.quantity)::float AS revenue
      FROM order_items oi
      JOIN product_variants pv ON pv.id = oi.variant_id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status NOT IN ('CANCELLED', 'REFUNDED') ${dateCond}
      GROUP BY pv.product_id`,
    // İlk / son / en düşük / en yüksek SATIŞ fiyatı (siparişin gerçek unit_price'ından)
    prisma.$queryRaw<Array<{ product_id: string; first_sale: number; last_sale: number; min_sale: number; max_sale: number }>>`
      SELECT product_id,
             (array_agg(unit_price ORDER BY created_at ASC))[1]::float  AS first_sale,
             (array_agg(unit_price ORDER BY created_at DESC))[1]::float AS last_sale,
             MIN(unit_price)::float AS min_sale,
             MAX(unit_price)::float AS max_sale
      FROM (
        SELECT pv.product_id, oi.unit_price, o.created_at
        FROM order_items oi
        JOIN product_variants pv ON pv.id = oi.variant_id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status NOT IN ('CANCELLED', 'REFUNDED') ${dateCond}
      ) t
      GROUP BY product_id`,
    // Satılan malların maliyeti (COGS): varyant maliyet override'ı yoksa ürün maliyeti
    prisma.$queryRaw<Array<{ product_id: string; cogs: number; cost_known: number }>>`
      SELECT pv.product_id,
             SUM(COALESCE(pv.cost_price_override, p.cost_price, 0) * oi.quantity)::float AS cogs,
             MAX(CASE WHEN COALESCE(pv.cost_price_override, p.cost_price) IS NOT NULL THEN 1 ELSE 0 END)::int AS cost_known
      FROM order_items oi
      JOIN product_variants pv ON pv.id = oi.variant_id
      JOIN products p ON p.id = pv.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status NOT IN ('CANCELLED', 'REFUNDED') ${dateCond}
      GROUP BY pv.product_id`,
    prisma.$queryRaw<Array<{ product_id: string; min_price: number; max_price: number }>>`
      SELECT product_id, MIN(price)::float AS min_price, MAX(price)::float AS max_price
      FROM product_variants WHERE is_active = true
      GROUP BY product_id`,
    prisma.$queryRaw<Array<{ product_id: string; change_count: number; last_change: Date | null }>>`
      SELECT pv.product_id,
             COUNT(ph.id)::int AS change_count,
             MAX(ph.created_at) AS last_change
      FROM price_history ph
      JOIN product_variants pv ON pv.id = ph.variant_id
      WHERE 1=1 ${phDateCond}
      GROUP BY pv.product_id`,
  ]);

  const salesMap = Object.fromEntries(sales.map((s) => [s.product_id, s]));
  const journeyMap = Object.fromEntries(journey.map((j) => [j.product_id, j]));
  const cogsMap = Object.fromEntries(cogsRows.map((c) => [c.product_id, c]));
  const priceMap = Object.fromEntries(prices.map((p) => [p.product_id, p]));
  const changeMap = Object.fromEntries(changes.map((c) => [c.product_id, c]));

  return products
    .map((p) => {
      const s = salesMap[p.id];
      const j = journeyMap[p.id];
      const units = Number(s?.units ?? 0);
      const revenue = Number(s?.revenue ?? 0);
      const ch = changeMap[p.id];
      // Kâr marjı: maliyet girilmişse hesapla
      const cogsRow = cogsMap[p.id];
      const costKnown = Number(cogsRow?.cost_known ?? 0) === 1;
      const cogs = Number(cogsRow?.cogs ?? 0);
      const profit = costKnown ? revenue - cogs : null;
      const marginPct = costKnown && revenue > 0 ? ((revenue - cogs) / revenue) * 100 : null;
      return {
        productId: p.id,
        name: p.name,
        unitsSold: units,
        revenue,
        avgSellingPrice: units > 0 ? revenue / units : 0,
        cogs: costKnown ? cogs : null,
        profit,
        marginPct,
        costKnown,
        firstSalePrice: j?.first_sale ?? null,
        lastSalePrice: j?.last_sale ?? null,
        minSalePrice: j?.min_sale ?? null,
        maxSalePrice: j?.max_sale ?? null,
        currentMinPrice: priceMap[p.id]?.min_price ?? null,
        currentMaxPrice: priceMap[p.id]?.max_price ?? null,
        priceChangeCount: Number(ch?.change_count ?? 0),
        lastPriceChange: ch?.last_change ?? null,
      };
    })
    .filter((r) => r.unitsSold > 0 || r.priceChangeCount > 0)
    .sort((a, b) => b.revenue - a.revenue);
}

// Tek ürünün fiyat değişim geçmişi (detay görünümü için)
export async function getProductPriceHistory(productId: string) {
  const rows = await prisma.priceHistory.findMany({
    where: { variant: { productId } },
    include: { variant: { select: { sku: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    sku: r.variant.sku,
    oldPrice: Number(r.oldPrice),
    newPrice: Number(r.newPrice),
    createdAt: r.createdAt,
  }));
}

// ─── Müşteri detayı + alışveriş geçmişi ───────────────────────────────────────
export async function getCustomerDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      isActive: true, isGuest: true, createdAt: true,
      marketingConsent: true, smsConsent: true, adminNote: true,
      passwordHash: true,
      profile: { select: { firstName: true, lastName: true, phone: true } },
    },
  });
  if (!user) throw new AppError('Müşteri bulunamadı', 404);

  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { variant: { include: { product: { select: { name: true } } } } } },
      payment: { select: { provider: true, status: true } },
    },
  });

  const countsTowardSpend = (s: string) => !['CANCELLED', 'REFUNDED'].includes(s);
  const totalSpent = orders.filter((o) => countsTowardSpend(o.status)).reduce((s, o) => s + Number(o.total), 0);
  const openStatuses = ['PENDING', 'PROCESSING', 'SHIPPED'];
  const pendingOrShippingCount = orders.filter((o) => openStatuses.includes(o.status)).length;

  // Silme uygunluğu için favori + sepet sayıları
  const [wishlistCount, cartItemCount] = await Promise.all([
    prisma.wishlistItem.count({ where: { wishlist: { userId } } }),
    prisma.cartItem.count({ where: { cart: { userId } } }),
  ]);
  const deletable = orders.length === 0 && wishlistCount === 0 && cartItemCount === 0;

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.profile?.firstName || user.firstName || '',
      lastName: user.profile?.lastName || user.lastName || '',
      phone: user.profile?.phone || '',
      isActive: user.isActive,
      isGuest: user.isGuest,
      hasPassword: !!user.passwordHash,
      createdAt: user.createdAt,
      emailConsent: user.marketingConsent,
      smsConsent: user.smsConsent,
      adminNote: user.adminNote ?? '',
    },
    summary: {
      orderCount: orders.length,
      paidOrderCount: orders.filter((o) => countsTowardSpend(o.status)).length,
      totalSpent,
      pendingOrShippingCount,
      wishlistCount,
      cartItemCount,
      deletable,
    },
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      total: Number(o.total),
      createdAt: o.createdAt,
      paymentMethod: o.payment?.provider ?? null,
      paymentStatus: o.payment?.status ?? null,
      items: o.items.map((i) => ({
        name: i.variant.product.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
    })),
  };
}

/** Müşteriye özel admin notu günceller. */
export async function adminUpdateCustomerNote(userId: string, note: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new AppError('Müşteri bulunamadı', 404);
  await prisma.user.update({ where: { id: userId }, data: { adminNote: note.trim() || null } });
  return { ok: true };
}

/** Müşteriye şifre sıfırlama e-postası tetikler (mevcut forgotPassword akışını kullanır). */
export async function adminSendCustomerPasswordReset(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, passwordHash: true, isGuest: true } });
  if (!user) throw new AppError('Müşteri bulunamadı', 404);
  if (!user.passwordHash) {
    throw new AppError('Bu müşteri şifreli bir hesaba sahip değil (misafir / sosyal giriş), sıfırlama linki gönderilemez', 400);
  }
  const { forgotPassword } = await import('./authService');
  await forgotPassword(user.email);
  return { ok: true, email: user.email };
}

export interface AdminCustomerCouponInput {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minOrder?: number;
  maxUses?: number;
  expiresAt?: string; // ISO
  description?: string;
}

/** Müşteriye özel indirim kuponu oluşturur (Discount.userId = müşteri). */
export async function adminCreateCustomerCoupon(userId: string, input: AdminCustomerCouponInput) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new AppError('Müşteri bulunamadı', 404);

  const code = input.code.trim().toUpperCase();
  if (!code) throw new AppError('Kupon kodu gerekli', 400);
  if (!(input.value > 0)) throw new AppError('Kupon değeri 0’dan büyük olmalı', 400);

  const existing = await prisma.discount.findUnique({ where: { code } });
  if (existing) throw new AppError('Bu kupon kodu zaten kullanılıyor', 409);

  return prisma.discount.create({
    data: {
      code,
      type: input.type,
      value: input.value,
      minOrder: input.minOrder ?? null,
      maxUses: input.maxUses ?? 1,
      isActive: true,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      userId, // kişiye özel
      description: input.description?.trim() || 'Müşteriye özel kupon',
    },
    select: { id: true, code: true, type: true, value: true, expiresAt: true },
  });
}

/**
 * Müşteriyi siler — YALNIZCA siparişi, favorisi ve sepeti yoksa.
 * Bloklamayan bağlı veriler (yorum, kişiye özel kupon) önce temizlenir;
 * kalanı (profil, adres, boş sepet/favori, bildirim) FK cascade ile gider.
 */
export async function adminDeleteCustomer(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user) throw new AppError('Müşteri bulunamadı', 404);
  if (user.role === 'ADMIN') throw new AppError('Yönetici hesabı bu ekrandan silinemez', 400);

  const [orderCount, wishlistCount, cartItemCount] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.wishlistItem.count({ where: { wishlist: { userId } } }),
    prisma.cartItem.count({ where: { cart: { userId } } }),
  ]);

  if (orderCount > 0 || wishlistCount > 0 || cartItemCount > 0) {
    const parts: string[] = [];
    if (orderCount > 0) parts.push(`${orderCount} sipariş`);
    if (wishlistCount > 0) parts.push(`${wishlistCount} favori`);
    if (cartItemCount > 0) parts.push(`${cartItemCount} sepet ürünü`);
    throw new AppError(`Bu müşteri silinemez: ${parts.join(', ')} bulunuyor. Önce bunların temizlenmesi gerekir.`, 409);
  }

  await prisma.$transaction([
    prisma.review.deleteMany({ where: { userId } }),
    prisma.discount.deleteMany({ where: { userId } }), // kişiye özel kuponlar
    prisma.user.delete({ where: { id: userId } }), // profil/adres/boş sepet-favori/bildirim → cascade
  ]);

  return { ok: true };
}

export async function adminListBrands() {
  return prisma.brand.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
}

export interface AdminBrandInput {
  name: string;
  slug: string;
  logoUrl?: string;
  isActive?: boolean;
}

export async function adminCreateBrand(data: AdminBrandInput) {
  const existing = await prisma.brand.findUnique({ where: { slug: data.slug } });
  if (existing) throw new AppError('Bu slug zaten kullanılıyor', 409);
  return prisma.brand.create({ data });
}

export async function adminUpdateBrand(id: string, data: Partial<AdminBrandInput>) {
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) throw new AppError('Marka bulunamadı', 404);
  if (data.slug && data.slug !== brand.slug) {
    const existing = await prisma.brand.findUnique({ where: { slug: data.slug } });
    if (existing) throw new AppError('Bu slug zaten kullanılıyor', 409);
  }
  return prisma.brand.update({ where: { id }, data });
}

export async function adminDeleteBrand(id: string) {
  const brand = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) throw new AppError('Marka bulunamadı', 404);
  if (brand._count.products > 0)
    throw new AppError(`Bu markaya bağlı ${brand._count.products} ürün var. Önce ürünleri başka markaya taşıyın.`, 409);
  await prisma.brand.delete({ where: { id } });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getAnalyticsData(params: { range?: string }) {
  const { range = '30d' } = params;
  const now = new Date();

  let startDate: Date;
  let prevStartDate: Date;

  switch (range) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevStartDate = new Date(startDate.getTime() - 86400000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 86400000);
      prevStartDate = new Date(now.getTime() - 14 * 86400000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 86400000);
      prevStartDate = new Date(now.getTime() - 180 * 86400000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 86400000);
      prevStartDate = new Date(now.getTime() - 60 * 86400000);
  }

  const excludeFilter: Prisma.OrderWhereInput = {
    status: { notIn: ['CANCELLED', 'REFUNDED'] },
  };

  const [
    currentRevData,
    prevRevData,
    currentOrders,
    prevOrders,
    activeShippings,
    salesByDay,
    newUsersByDay,
    cityData,
    carrierData,
    topProducts,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { total: true },
      where: { ...excludeFilter, createdAt: { gte: startDate } },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { ...excludeFilter, createdAt: { gte: prevStartDate, lt: startDate } },
    }),
    prisma.order.count({ where: { ...excludeFilter, createdAt: { gte: startDate } } }),
    prisma.order.count({ where: { ...excludeFilter, createdAt: { gte: prevStartDate, lt: startDate } } }),
    prisma.shipping.count({ where: { status: { in: ['PREPARING', 'SHIPPED'] } } }),

    prisma.$queryRaw<{ day: Date; revenue: number; count: number }[]>`
      SELECT DATE_TRUNC('day', created_at) AS day,
             SUM(total)::float AS revenue,
             COUNT(*)::int AS count
      FROM orders
      WHERE created_at >= ${startDate}
        AND status NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY day ORDER BY day ASC
    `,

    prisma.$queryRaw<{ day: Date; count: number }[]>`
      SELECT DATE_TRUNC('day', created_at) AS day,
             COUNT(*)::int AS count
      FROM users
      WHERE created_at >= ${startDate} AND role = 'CUSTOMER'
      GROUP BY day ORDER BY day ASC
    `,

    prisma.$queryRaw<{ city: string; count: number; revenue: number }[]>`
      SELECT a.city,
             COUNT(o.id)::int AS count,
             SUM(o.total)::float AS revenue
      FROM orders o
      JOIN addresses a ON o.address_id = a.id
      WHERE o.created_at >= ${startDate}
        AND o.status NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY a.city
      ORDER BY count DESC LIMIT 8
    `,

    prisma.$queryRaw<{ carrier: string; total: number; delivered: number; avg_days: number | null }[]>`
      SELECT COALESCE(s.carrier, 'Belirtilmemiş') AS carrier,
             COUNT(*)::int AS total,
             COUNT(CASE WHEN s.delivered_at IS NOT NULL THEN 1 END)::int AS delivered,
             AVG(CASE WHEN s.delivered_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM (s.delivered_at - o.created_at)) / 86400.0
                 END)::float AS avg_days
      FROM shippings s
      JOIN orders o ON s.order_id = o.id
      WHERE o.created_at >= ${startDate}
      GROUP BY s.carrier ORDER BY total DESC LIMIT 6
    `,

    prisma.$queryRaw<{ id: string; name: string; sku: string; qty: number; revenue: number }[]>`
      SELECT p.id, p.name, pv.sku,
             SUM(oi.quantity)::int AS qty,
             SUM(oi.quantity * oi.unit_price)::float AS revenue
      FROM order_items oi
      JOIN product_variants pv ON oi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= ${startDate}
        AND o.status NOT IN ('CANCELLED', 'REFUNDED')
      GROUP BY p.id, p.name, pv.sku
      ORDER BY revenue DESC LIMIT 10
    `,
  ]);

  const currentRev = Number(currentRevData._sum?.total ?? 0);
  const prevRev = Number(prevRevData._sum?.total ?? 0);
  const aov = currentOrders > 0 ? currentRev / currentOrders : 0;

  return {
    kpi: {
      revenue: currentRev,
      revenueChange: prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : null,
      orders: currentOrders,
      ordersChange: prevOrders > 0 ? ((currentOrders - prevOrders) / prevOrders) * 100 : null,
      aov,
      activeShippings,
    },
    salesByDay: salesByDay.map((r) => ({ day: r.day, revenue: Number(r.revenue), count: Number(r.count) })),
    newUsersByDay: newUsersByDay.map((r) => ({ day: r.day, count: Number(r.count) })),
    cityData: cityData.map((r) => ({ city: r.city, count: Number(r.count), revenue: Number(r.revenue) })),
    carrierData: carrierData.map((r) => ({
      carrier: r.carrier,
      total: Number(r.total),
      delivered: Number(r.delivered),
      avgDays: r.avg_days !== null ? Number(r.avg_days) : null,
    })),
    topProducts: topProducts.map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      qty: Number(r.qty),
      revenue: Number(r.revenue),
    })),
  };
}

// ─── Bildirimler & Mesajlar ───────────────────────────────────────────────────

export async function adminGetNewOrders() {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const [orders, pendingCount] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.order.count({ where: { status: 'PENDING' } }),
  ]);
  return { orders, pendingCount };
}

export async function adminListMessages() {
  const [messages, unreadCount] = await Promise.all([
    prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: {
            email: true,
            profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    }),
    prisma.contactMessage.count({ where: { isRead: false } }),
  ]);
  return { messages, unreadCount };
}

export async function adminMarkMessageRead(id: string) {
  await prisma.contactMessage.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
}

// ─── Global Arama ────────────────────────────────────────────────────────────

export async function adminGlobalSearch(q: string) {
  const search = q.trim();
  const [products, orders, customers] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
        variants: { select: { sku: true, price: true }, take: 1 },
      },
      take: 5,
    }),
    prisma.order.findMany({
      where: {
        OR: [
          { id: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { profile: { firstName: { contains: search, mode: 'insensitive' } } } },
          { user: { profile: { lastName: { contains: search, mode: 'insensitive' } } } },
        ],
      },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        user: {
          select: { email: true, profile: { select: { firstName: true, lastName: true } } },
        },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { profile: { firstName: { contains: search, mode: 'insensitive' } } },
          { profile: { lastName: { contains: search, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        email: true,
        profile: { select: { firstName: true, lastName: true } },
      },
      take: 5,
    }),
  ]);
  return { products, orders, customers };
}

/** Tüm favorileri (wishlist) temizler. Silinen kalem sayısını döner. */
export async function clearAllWishlists(): Promise<{ deleted: number }> {
  const res = await prisma.wishlistItem.deleteMany({});
  return { deleted: res.count };
}

/** Tüm sepetleri (cart + cart_items) temizler. Silinen sepet sayısını döner. */
export async function clearAllCarts(): Promise<{ deleted: number }> {
  await prisma.cartItem.deleteMany({});
  const res = await prisma.cart.deleteMany({});
  return { deleted: res.count };
}

export async function getUserAnalyticsData() {
  const [
    cartItems,
    totalSubscribers,
    totalFavorites,
    wishlistItems,
    cartsWithItems,
    subscribers,
  ] = await Promise.all([
    prisma.cartItem.findMany({
      select: { quantity: true, priceAtAdd: true },
    }),
    prisma.newsletterSubscriber.count(),
    prisma.wishlistItem.count(),
    prisma.wishlistItem.findMany({
      include: {
        variant: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
      },
    }),
    prisma.cart.findMany({
      where: {
        items: { some: {} },
        userId: { not: null },
      },
      include: {
        user: {
          include: {
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        items: {
          include: {
            variant: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Sepette bekleyen toplam değer
  const totalCartValue = cartItems.reduce(
    (sum, item) => sum + item.quantity * Number(item.priceAtAdd),
    0,
  );

  // En çok favorilenenler (Group by Product in-memory)
  const favMap = new Map<string, { id: string; image: string; name: string; sku: string; count: number }>();
  for (const item of wishlistItems) {
    const prod = item.variant?.product;
    if (!prod) continue;

    const key = prod.id;
    const existing = favMap.get(key);
    const primaryImg = prod.images[0]?.url || '/product-placeholder.png';

    if (existing) {
      existing.count += 1;
    } else {
      favMap.set(key, {
        id: prod.id,
        image: primaryImg,
        name: prod.name,
        sku: item.variant.sku,
        count: 1,
      });
    }
  }

  const favoritesList = Array.from(favMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Sepette bekleyenler (Terk edilme riski olan sepetler)
  const cartUsersList = cartsWithItems.map((cart, idx) => {
    const total = cart.items.reduce(
      (sum, item) => sum + item.quantity * Number(item.priceAtAdd),
      0,
    );
    const itemsCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    const diffMs = Date.now() - new Date(cart.updatedAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    let timeStr = 'Az önce';
    if (diffMins >= 1440) {
      timeStr = `${Math.floor(diffMins / 1440)} gün önce`;
    } else if (diffMins >= 60) {
      timeStr = `${Math.floor(diffMins / 60)} saat önce`;
    } else if (diffMins > 0) {
      timeStr = `${diffMins} dk önce`;
    }

    return {
      id: cart.id || String(idx),
      name: cart.user?.profile
        ? `${cart.user.profile.firstName} ${cart.user.profile.lastName}`
        : 'Misafir Müşteri',
      email: cart.user?.email || 'N/A',
      items: itemsCount,
      total,
      updatedAt: timeStr,
    };
  });

  // Bülten aboneleri
  const mappedSubscribers = subscribers.map((sub) => ({
    id: sub.id,
    email: sub.email,
    date: sub.createdAt.toISOString().split('T')[0],
    status: sub.status as 'confirmed' | 'pending',
  }));

  // Trafik Kaynakları ve Cihaz Dağılımı — Demo veriler
  const trafficSources = [
    { label: 'Doğrudan', value: 35 },
    { label: 'Google', value: 30 },
    { label: 'Instagram', value: 20 },
    { label: 'Reklam', value: 15 },
  ];
  const deviceDistribution = { mobile: 75, desktop: 25 };

  return {
    kpi: {
      totalCartValue,
      totalSubscribers,
      totalFavorites,
      cartUsersCount: cartsWithItems.length,
    },
    favorites: favoritesList,
    cartUsers: cartUsersList,
    subscribers: mappedSubscribers,
    trafficSources,
    deviceDistribution,
  };
}

export async function adminSendCartReminder(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      user: { include: { profile: { select: { firstName: true, lastName: true } } } },
      items: { include: { variant: { include: { product: { select: { name: true } } } } } },
    },
  });

  if (!cart) throw new AppError('Sepet bulunamadı', 404);
  if (cart.items.length === 0) throw new AppError('Sepet boş', 400);

  const email = cart.user?.email;
  if (!email) {
    throw new AppError('Bu sepetin sahibine ait e-posta adresi bulunamadı', 400);
  }

  const items = cart.items.map((item) => ({
    name: item.variant?.product?.name || 'Ürün',
    quantity: item.quantity,
    unitPrice: Number(item.priceAtAdd),
  }));
  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const name = cart.user?.profile
    ? `${cart.user.profile.firstName ?? ''} ${cart.user.profile.lastName ?? ''}`.trim()
    : '';

  const { sendCartReminderEmail } = await import('./emailService');
  await sendCartReminderEmail(email, name, items, total);

  return { success: true, email };
}

export async function getTrafficAnalyticsData() {
  return {
    dataSource: 'demo' as const,
    trafficSources: [
      { source: 'Doğrudan', visitors: 1250, percentage: 35 },
      { source: 'Google', visitors: 1080, percentage: 30 },
      { source: 'Instagram', visitors: 720, percentage: 20 },
      { source: 'Reklam', visitors: 540, percentage: 15 },
    ],
    topPages: [
      { url: '/', title: 'Ana Sayfa', views: 4800, visitors: 2400 },
      { url: '/products', title: 'Ürünler', views: 3200, visitors: 1600 },
      { url: '/categories/tekstil', title: 'Tekstil Kategorisi', views: 2100, visitors: 1200 },
      { url: '/about', title: 'Hakkımızda', views: 1500, visitors: 800 },
      { url: '/contact', title: 'İletişim', views: 980, visitors: 500 },
    ],
    deviceDistribution: { mobile: 65, desktop: 30, tablet: 5 },
    browserDistribution: [
      { name: 'Chrome', percentage: 60, count: 2100 },
      { name: 'Safari', percentage: 20, count: 700 },
      { name: 'Firefox', percentage: 12, count: 420 },
      { name: 'Diğer', percentage: 8, count: 280 },
    ],
    osDistribution: [
      { name: 'Windows', percentage: 45, count: 1575 },
      { name: 'iOS', percentage: 28, count: 980 },
      { name: 'Android', percentage: 20, count: 700 },
      { name: 'macOS', percentage: 7, count: 245 },
    ],
    summary: {
      totalVisitors: 3500,
      totalSessions: 4200,
      avgSessionDuration: 420,
      bounceRate: 35,
    },
  };
}

export async function adminToggleSubscriberStatus(id: string) {
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { id } });
  if (!sub) throw new AppError('Abone bulunamadı', 404);
  return prisma.newsletterSubscriber.update({
    where: { id },
    data: { status: sub.status === 'confirmed' ? 'pending' : 'confirmed' },
  });
}

export async function adminDeleteSubscriber(id: string) {
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { id } });
  if (!sub) throw new AppError('Abone bulunamadı', 404);
  await prisma.newsletterSubscriber.delete({ where: { id } });
}

export async function adminCreateSubscriber(email: string, status?: string) {
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing) throw new AppError('Bu e-posta adresi zaten kayıtlı', 409);
  return prisma.newsletterSubscriber.create({
    data: { email, status: status ?? 'confirmed' },
  });
}

export async function adminSendNewsletterEmail(subject: string, htmlContent: string, subscriberIds?: string[]) {
  const { sendMarketingEmail } = await import('./emailService');
  let emails: string[] = [];
  
  if (subscriberIds && subscriberIds.length > 0) {
    const subs = await prisma.newsletterSubscriber.findMany({
      where: { id: { in: subscriberIds }, status: 'confirmed' }
    });
    emails = subs.map(s => s.email);
  } else {
    // If no specific IDs provided, send to all confirmed subscribers
    const subs = await prisma.newsletterSubscriber.findMany({
      where: { status: 'confirmed' }
    });
    emails = subs.map(s => s.email);
  }

  if (emails.length === 0) {
    throw new AppError('E-posta gönderilecek onaylı abone bulunamadı', 400);
  }

  // Run in background without blocking
  sendMarketingEmail(emails, subject, htmlContent).catch(err => {
    logger.error('Toplu e-posta gönderimi başarısız:', err);
  });

  return { success: true, count: emails.length };
}

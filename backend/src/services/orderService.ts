import { prisma } from '../config/database';
import { getShippingConfig, computeShipping } from './settingsService';
import { logger } from '../config/logger';
import * as emailSvc from './emailService';
import { validateCoupon, redeemCoupon } from './discountService';

export { computeShipping };

// Bu eşik veya altına düşen stoklarda yöneticiye uyarı gönderilir
const LOW_STOCK_THRESHOLD = 5;

const CART_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              category: { select: { name: true } },
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
      },
    },
  },
} as const;

export async function getCartForCheckout(userId: string) {
  const cart = await prisma.cart.findFirst({ where: { userId }, include: CART_INCLUDE });
  if (!cart || cart.items.length === 0) {
    throw Object.assign(new Error('Sepet boş'), { status: 400 });
  }
  return cart;
}

export interface OrderBilling {
  isCorporate?: boolean;
  billingName?: string;
  taxNumber?: string; // VKN
  identityNo?: string; // TCKN
  taxOffice?: string;
}

export async function createOrder(
  userId: string,
  addressId: string,
  couponCode?: string,
  billing?: OrderBilling,
) {
  const cart = await getCartForCheckout(userId);

  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw Object.assign(new Error('Adres bulunamadı'), { status: 404 });

  // Stock validation
  for (const item of cart.items) {
    if (item.variant.stockQty < item.quantity) {
      throw Object.assign(
        new Error(`"${item.variant.product.name}" için yeterli stok kalmadı`),
        { status: 400 },
      );
    }
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.priceAtAdd) * item.quantity,
    0,
  );
  const config = await getShippingConfig();
  const shippingFee = computeShipping(subtotal, config);

  // Kupon doğrulama (varsa) — indirim net (KDV hariç) ara toplam üzerinden
  let discount = 0;
  let discountId: string | null = null;
  if (couponCode) {
    const result = await validateCoupon(couponCode, userId, subtotal);
    if (!result.ok) throw Object.assign(new Error(result.error), { status: 400 });
    discount = result.discountAmount;
    discountId = result.discount.id;
  }

  // Ürün fiyatları KDV dahil (vatIncluded=true). Kargo da KDV dahil gösterilir.
  // Ekstra KDV eklenmez — toplam = (subtotal - indirim) + kargo.
  const total = subtotal - discount + shippingFee;

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId, addressId, subtotal, shippingFee, discount, total, status: 'PENDING',
        isCorporate: billing?.isCorporate ?? false,
        billingName: billing?.billingName ?? null,
        taxNumber: billing?.taxNumber ?? null,
        identityNo: billing?.identityNo ?? null,
        taxOffice: billing?.taxOffice ?? null,
      },
    });

    if (discountId) {
      await redeemCoupon(tx, discountId, userId, newOrder.id);
    }

    for (const item of cart.items) {
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.priceAtAdd,
        },
      });

      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stockQty: { decrement: item.quantity } },
      });
    }

    await tx.orderStatusLog.create({
      data: { orderId: newOrder.id, status: 'PENDING', note: 'Sipariş oluşturuldu' },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return newOrder;
  });

  // Return full order with items for email
  const fullOrder = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: {
      items: {
        include: {
          variant: {
            include: { product: { select: { name: true, slug: true } } },
          },
        },
      },
      address: true,
      user: { select: { firstName: true } },
    },
  });

  // ─── Yönetici uyarıları (sipariş akışını bloklamaz / hata yutulur) ───
  void (async () => {
    try {
      // Yeni sipariş bildirimi
      await emailSvc.notifyAdminNewOrder({
        orderId: fullOrder.id,
        customerName: fullOrder.user?.firstName || fullOrder.address.firstName || '',
        total: Number(fullOrder.total),
        itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
      });

      // Düşük stok bildirimi — siparişle eşiğe düşen / tükenen ürünler
      const lowItems = cart.items
        .map((item) => {
          const oldStock = item.variant.stockQty;
          const newStock = oldStock - item.quantity;
          return { item, oldStock, newStock };
        })
        .filter(({ oldStock, newStock }) =>
          (oldStock > LOW_STOCK_THRESHOLD && newStock <= LOW_STOCK_THRESHOLD) || (oldStock > 0 && newStock <= 0),
        )
        .map(({ item, newStock }) => ({
          name: item.variant.product.name,
          sku: item.variant.sku ?? '',
          stock: Math.max(0, newStock),
        }));

      await emailSvc.notifyAdminLowStock(lowItems);
    } catch (e) {
      logger.error('Yönetici uyarı e-postası gönderilemedi', { orderId: fullOrder.id, error: (e as Error)?.message });
    }
  })();

  return fullOrder;
}

// ─────────────────────────────────────────────────────────────────────────────
// Manuel / Offline satış — sistem dışında yapılan satışları (telefon, mağaza vb.)
// yönetici panelinden kaydeder. Sepetten bağımsız çalışır; müşteri hesabı yoksa
// misafir kullanıcı + adres oluşturur, ödemesi peşin alınmış kabul edilir.
// ─────────────────────────────────────────────────────────────────────────────

export interface ManualOrderCustomer {
  email?: string;      // opsiyonel; verilirse mevcut hesaba bağlanır, yoksa misafir açılır
  firstName: string;
  lastName: string;
  phone: string;
}

export interface ManualOrderAddress {
  city: string;
  district: string;
  neighborhood?: string;
  address: string;
  postalCode?: string;
}

export interface ManualOrderItem {
  variantId: string;
  quantity: number;
  unitPrice?: number;  // verilmezse varyantın güncel fiyatı kullanılır
}

export interface ManualOrderInput {
  customer: ManualOrderCustomer;
  address: ManualOrderAddress;
  items: ManualOrderItem[];
  billing?: OrderBilling;
  paymentMethod?: string;   // "NAKIT" | "HAVALE" | "KREDI_KARTI" | "DIGER" ...
  paid?: boolean;           // ödeme alındı mı (varsayılan true → Payment.status = SUCCESS)
  status?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED';
  shippingFee?: number;
  discount?: number;
  note?: string;
  decrementStock?: boolean; // stok düşülsün mü (varsayılan true)
}

/** Yönetici panelinden manuel/offline satış kaydı oluşturur. */
export async function createManualOrder(input: ManualOrderInput, adminUserId?: string) {
  const {
    customer, address, items, billing,
    paymentMethod = 'MANUEL',
    paid = true,
    status = 'DELIVERED',
    shippingFee = 0,
    discount = 0,
    note,
    decrementStock = true,
  } = input;

  if (!items || items.length === 0) {
    throw Object.assign(new Error('En az bir ürün eklemelisiniz'), { status: 400 });
  }
  if (!customer?.firstName?.trim() || !customer?.lastName?.trim()) {
    throw Object.assign(new Error('Müşteri ad ve soyadı zorunludur'), { status: 400 });
  }

  // Varyantları çek ve doğrula
  const variantIds = items.map((i) => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: { select: { name: true } } },
  });
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const lines = items.map((item) => {
    const variant = variantMap.get(item.variantId);
    if (!variant) throw Object.assign(new Error('Ürün varyantı bulunamadı'), { status: 404 });
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw Object.assign(new Error(`"${variant.product.name}" için geçersiz adet`), { status: 400 });
    }
    if (decrementStock && variant.stockQty < item.quantity) {
      throw Object.assign(
        new Error(`"${variant.product.name}" için yeterli stok yok (kalan: ${variant.stockQty})`),
        { status: 400 },
      );
    }
    const unitPrice = item.unitPrice != null ? Number(item.unitPrice) : Number(variant.price);
    if (!(unitPrice >= 0)) {
      throw Object.assign(new Error(`"${variant.product.name}" için geçersiz fiyat`), { status: 400 });
    }
    return { variant, quantity: item.quantity, unitPrice };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const total = Math.max(0, subtotal - Number(discount) + Number(shippingFee));

  const order = await prisma.$transaction(async (tx) => {
    // 1) Müşteri hesabını bul/oluştur
    let userId: string;
    const email = customer.email?.trim().toLowerCase();
    const existing = email ? await tx.user.findUnique({ where: { email } }) : null;

    if (existing) {
      userId = existing.id;
    } else {
      // e-posta yoksa çakışmayacak sentetik bir adres üret (misafir kaydı)
      const syntheticEmail = email || `manuel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@manuel.local`;
      const created = await tx.user.create({
        data: {
          email: syntheticEmail,
          firstName: customer.firstName,
          lastName: customer.lastName,
          role: 'CUSTOMER',
          isGuest: true,
          isActive: false,
          profile: { create: { firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone } },
        },
      });
      userId = created.id;
    }

    // 2) Adres oluştur (fatura/teslimat snapshot'ı)
    const addr = await tx.address.create({
      data: {
        userId,
        type: 'BOTH',
        title: 'Manuel Satış',
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        city: address.city,
        district: address.district,
        neighborhood: address.neighborhood || null,
        postalCode: address.postalCode || null,
        address: address.address,
      },
    });

    // 3) Sipariş
    const newOrder = await tx.order.create({
      data: {
        userId,
        addressId: addr.id,
        subtotal,
        shippingFee: Number(shippingFee),
        discount: Number(discount),
        total,
        status,
        notes: note || 'Manuel satış',
        isCorporate: billing?.isCorporate ?? false,
        billingName: billing?.billingName ?? null,
        taxNumber: billing?.taxNumber ?? null,
        identityNo: billing?.identityNo ?? null,
        taxOffice: billing?.taxOffice ?? null,
      },
    });

    // 4) Kalemler + stok düşümü
    for (const l of lines) {
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          variantId: l.variant.id,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        },
      });
      if (decrementStock) {
        const newQty = l.variant.stockQty - l.quantity;
        await tx.productVariant.update({
          where: { id: l.variant.id },
          data: { stockQty: { decrement: l.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            variantId: l.variant.id,
            oldQty: l.variant.stockQty,
            newQty,
            difference: -l.quantity,
            reason: 'manual_sale',
            adminUserId: adminUserId ?? null,
            note: `Manuel satış (sipariş ${newOrder.id})`,
          },
        });
      }
    }

    // 5) Ödeme kaydı (offline satış peşin kabul edilir)
    await tx.payment.create({
      data: {
        orderId: newOrder.id,
        provider: paymentMethod,
        amount: total,
        status: paid ? 'SUCCESS' : 'PENDING',
      },
    });

    // 6) Durum geçmişi
    await tx.orderStatusLog.create({
      data: { orderId: newOrder.id, status, note: 'Manuel satış oluşturuldu' },
    });

    return newOrder;
  });

  return prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: {
      items: { include: { variant: { include: { product: { select: { name: true, slug: true } } } } } },
      address: true,
      payment: true,
      user: { select: { id: true, email: true, isGuest: true } },
    },
  });
}

export async function listOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          variant: { include: { product: { select: { name: true, slug: true, images: true } } } },
        },
      },
      shipping: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrderDetail(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                select: {
                  name: true,
                  slug: true,
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
        },
      },
      address: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
      payment: true,
      shipping: true,
    },
  });

  if (!order) throw Object.assign(new Error('Sipariş bulunamadı'), { status: 404 });

  return {
    ...order,
    paymentMethod: order.payment?.provider || undefined,
    paymentId: order.payment?.transactionId || undefined,
  };
}

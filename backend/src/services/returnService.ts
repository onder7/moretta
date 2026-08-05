import { prisma } from '../config/database';
import { AppError } from '../types';
import { ReturnReason, ReturnStatus, Prisma } from '@prisma/client';
import * as emailSvc from './emailService';
import { logger } from '../config/logger';

// İade talebi yalnızca kargolanmış/teslim edilmiş siparişlerde açılabilir
const RETURNABLE_ORDER_STATUSES = ['SHIPPED', 'DELIVERED'];
// Kalan adet hesabında sayılan iade durumları (reddedilenler serbest bırakılır)
const ACTIVE_RETURN_STATUSES: ReturnStatus[] = ['REQUESTED', 'APPROVED'];

interface RequestReturnItem {
  orderItemId: string;
  quantity: number;
}

/**
 * Bir siparişin kalemleri için halihazırda iade edilmiş (aktif) adetleri döndürür.
 * key = orderItemId, value = toplam iade adedi.
 */
async function getReturnedQtyMap(orderId: string): Promise<Record<string, number>> {
  const rows = await prisma.orderReturnItem.findMany({
    where: {
      return: { orderId, status: { in: ACTIVE_RETURN_STATUSES } },
    },
    select: { orderItemId: true, quantity: true },
  });
  const map: Record<string, number> = {};
  for (const r of rows) map[r.orderItemId] = (map[r.orderItemId] ?? 0) + r.quantity;
  return map;
}

export async function requestReturn(
  orderId: string,
  userId: string,
  reason: ReturnReason,
  description: string | undefined,
  items: RequestReturnItem[],
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: true },
  });
  if (!order) throw new AppError('Sipariş bulunamadı', 404);
  if (order.userId !== userId) throw new AppError('Bu siparişe erişim yetkiniz yok', 403);
  if (!RETURNABLE_ORDER_STATUSES.includes(order.status)) {
    throw new AppError('Bu sipariş için iade talebi oluşturulamaz (kargo/teslim sonrası olmalı)', 400);
  }
  if (!items?.length) throw new AppError('İade edilecek en az bir ürün seçmelisiniz', 400);

  const returnedMap = await getReturnedQtyMap(orderId);
  const orderItemById = new Map(order.items.map((i) => [i.id, i]));

  // Doğrulama: her kalem siparişe ait, adet geçerli ve kalan adedi aşmıyor
  for (const it of items) {
    const oi = orderItemById.get(it.orderItemId);
    if (!oi) throw new AppError('Geçersiz sipariş kalemi', 400);
    const qty = Math.floor(Number(it.quantity));
    if (!Number.isFinite(qty) || qty < 1) throw new AppError('Geçersiz adet', 400);
    const remaining = oi.quantity - (returnedMap[it.orderItemId] ?? 0);
    if (qty > remaining) {
      throw new AppError(`Bir ürün için iade edilebilecek adedi aştınız (kalan: ${remaining})`, 400);
    }
  }

  const created = await prisma.orderReturn.create({
    data: {
      orderId,
      userId,
      reason,
      description: description?.trim() || null,
      status: 'REQUESTED',
      items: {
        create: items.map((it) => ({
          orderItemId: it.orderItemId,
          quantity: Math.floor(Number(it.quantity)),
        })),
      },
    },
    include: { items: true },
  });

  // ─── Bildirimler (async, hata yutulur) ───
  const orderRef = orderId.slice(-8).toUpperCase();
  if (order.user?.email) {
    void emailSvc
      .sendReturnRequestedEmail(order.user.email, orderId)
      .catch((e) => logger.error('İade talebi e-postası gönderilemedi', { orderId, error: e?.message }));
  }
  void emailSvc
    .notifyAdminNewReturn({ orderRef, itemCount: created.items.length })
    .catch((e) => logger.error('Admin iade bildirimi gönderilemedi', { orderId, error: e?.message }));

  return created;
}

/**
 * İadeyi onaylar: iade edilen kalemlerin stoğunu GÜVENLİ (transaction + atomik increment)
 * geri yükler, stok hareketi loglar, iade tutarını hesaplar ve durumu APPROVED yapar.
 */
export async function approveReturn(returnId: string, adminUserId?: string) {
  const result = await prisma.$transaction(async (tx) => {
    const ret = await tx.orderReturn.findUnique({
      where: { id: returnId },
      include: { items: { include: { orderItem: true } }, order: { include: { user: true } } },
    });
    if (!ret) throw new AppError('İade talebi bulunamadı', 404);
    if (ret.status !== 'REQUESTED') throw new AppError('Bu iade talebi zaten işlenmiş', 400);

    let refundTotal = 0;
    for (const it of ret.items) {
      const variantId = it.orderItem.variantId;

      // ATOMİK stok artışı → eşzamanlı güncellemelerde "lost update" olmaz
      const v = await tx.productVariant.update({
        where: { id: variantId },
        data: { stockQty: { increment: it.quantity } },
        select: { stockQty: true },
      });

      await tx.stockMovement.create({
        data: {
          variantId,
          oldQty: v.stockQty - it.quantity,
          newQty: v.stockQty,
          difference: it.quantity,
          reason: 'order_returned',
          adminUserId,
          note: `İade onayı #${returnId.slice(-8).toUpperCase()}`,
        },
      });

      refundTotal += Number(it.orderItem.unitPrice) * it.quantity;
    }
    refundTotal = Math.round(refundTotal * 100) / 100;

    const updated = await tx.orderReturn.update({
      where: { id: returnId },
      data: { status: 'APPROVED', approvedAt: new Date(), refundAmount: refundTotal, adminUserId },
    });

    // Sipariş durumu kısmi iadede değişmez; yalnızca log
    await tx.orderStatusLog.create({
      data: {
        orderId: ret.orderId,
        status: ret.order.status,
        note: `İade onaylandı: ${refundTotal.toFixed(2)} TRY — ${ret.items.length} kalem, stok geri yüklendi`,
      },
    });

    return { updated, orderId: ret.orderId, email: ret.order.user?.email ?? null, refundTotal };
  });

  if (result.email) {
    void emailSvc
      .sendReturnApprovedEmail(result.email, result.orderId, result.refundTotal)
      .catch((e) => logger.error('İade onay e-postası gönderilemedi', { returnId, error: e?.message }));
  }

  return result.updated;
}

export async function rejectReturn(returnId: string, reason?: string) {
  const ret = await prisma.orderReturn.findUnique({
    where: { id: returnId },
    include: { order: { include: { user: true } } },
  });
  if (!ret) throw new AppError('İade talebi bulunamadı', 404);
  if (ret.status !== 'REQUESTED') throw new AppError('Bu iade talebi zaten işlenmiş', 400);

  const updated = await prisma.orderReturn.update({
    where: { id: returnId },
    data: { status: 'REJECTED', rejectedAt: new Date(), adminNotes: reason?.trim() || null },
  });

  if (ret.order.user?.email) {
    void emailSvc
      .sendReturnRejectedEmail(ret.order.user.email, ret.orderId, reason)
      .catch((e) => logger.error('İade red e-postası gönderilemedi', { returnId, error: e?.message }));
  }

  return updated;
}

const RETURN_INCLUDE = {
  items: {
    include: {
      orderItem: {
        include: {
          variant: { include: { product: { select: { name: true, slug: true } } } },
        },
      },
    },
  },
  order: { select: { id: true, status: true, total: true, createdAt: true } },
  user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.OrderReturnInclude;

export async function listReturns(filters?: { status?: ReturnStatus; limit?: number; offset?: number }) {
  const where: Prisma.OrderReturnWhereInput = filters?.status ? { status: filters.status } : {};
  const [items, total] = await Promise.all([
    prisma.orderReturn.findMany({
      where,
      include: RETURN_INCLUDE,
      orderBy: { requestedAt: 'desc' },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    }),
    prisma.orderReturn.count({ where }),
  ]);
  // ZPL etiketi ve HepsiJET payload'ı listede işe yaramaz, kaydı şişirir — ayrı uçtan alınır.
  const lean = items.map(({ barcodeData, shipmentPayload, ...rest }) => ({
    ...rest,
    hasLabel: Boolean(barcodeData),
  }));
  return { items: lean, total };
}

export async function getReturn(returnId: string) {
  const ret = await prisma.orderReturn.findUnique({ where: { id: returnId }, include: RETURN_INCLUDE });
  if (!ret) throw new AppError('İade talebi bulunamadı', 404);
  return ret;
}

/**
 * Bir siparişin iadeleri (frontend'de kalan-adet hesabı ve durum gösterimi için).
 */
export async function getOrderReturns(orderId: string) {
  return prisma.orderReturn.findMany({
    where: { orderId },
    orderBy: { requestedAt: 'desc' },
    include: { items: { select: { orderItemId: true, quantity: true } } },
  });
}

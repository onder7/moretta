import { Prisma, Discount } from '@prisma/client';
import { prisma } from '../config/database';

// ─── Kupon doğrulama ────────────────────────────────────────────────────────
// Sonuç tipi: throw etmeden, çağıran tarafın mesajı gösterebilmesi için.
export type CouponValidation =
  | { ok: true; discount: Discount; discountAmount: number }
  | { ok: false; error: string };

/**
 * Kupon kodunu doğrular ve net (KDV hariç) ara toplam üzerinden indirim tutarını hesaplar.
 * Kişiye özel kupon (userId dolu) yalnızca sahibi tarafından kullanılabilir.
 */
export async function validateCoupon(
  code: string,
  userId: string,
  subtotalNet: number,
): Promise<CouponValidation> {
  const discount = await prisma.discount.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!discount) return { ok: false, error: 'Kupon kodu geçersiz' };
  if (!discount.isActive) return { ok: false, error: 'Bu kupon aktif değil' };

  // Kişiye özel kupon: sahibinden başkası kullanamaz
  if (discount.userId && discount.userId !== userId) {
    return { ok: false, error: 'Bu kupon size ait değil' };
  }

  if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
    return { ok: false, error: 'Bu kupon süresi dolmuş' };
  }

  if (discount.maxUses && discount.usedCount >= discount.maxUses) {
    return { ok: false, error: 'Bu kupon kullanım limitine ulaştı' };
  }

  const minOrder = discount.minOrder ? Number(discount.minOrder) : 0;
  if (minOrder > 0 && subtotalNet < minOrder) {
    return { ok: false, error: `Bu kupon için minimum sepet tutarı ${minOrder} TL` };
  }

  // İndirim tutarı (net ara toplamı aşamaz)
  const raw =
    discount.type === 'PERCENT'
      ? (subtotalNet * Number(discount.value)) / 100
      : Number(discount.value);
  const discountAmount = Math.min(Math.round(raw * 100) / 100, subtotalNet);

  return { ok: true, discount, discountAmount };
}

/**
 * Kuponu sipariş kapsamında kullanır: usedCount artırır + DiscountUsage kaydı oluşturur.
 * Sipariş oluşturma transaction'ı içinde çağrılmalıdır.
 */
export async function redeemCoupon(
  tx: Prisma.TransactionClient,
  discountId: string,
  userId: string,
  orderId: string,
): Promise<void> {
  await tx.discount.update({
    where: { id: discountId },
    data: { usedCount: { increment: 1 } },
  });
  await tx.discountUsage.create({
    data: { discountId, userId, orderId },
  });
}

// ─── Kişiye özel kupon üretimi ──────────────────────────────────────────────
function randomCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karışabilen 0/O, 1/I çıkarıldı
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}

/**
 * Kullanıcıya özel, tek kullanımlık, sabit tutarlı (FIXED) bir kupon oluşturur.
 * İptalden vazgeçirme teklifi kabul edildiğinde kullanılır.
 */
export async function createPersonalCoupon(params: {
  userId: string;
  value: number;
  sourceOrderId?: string;
  expiresInDays?: number;
  description?: string;
}): Promise<Discount> {
  const { userId, value, sourceOrderId, expiresInDays = 90, description } = params;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  // Benzersiz kod (nadir çakışmada yeniden dene)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode('HEDIYE');
    try {
      return await prisma.discount.create({
        data: {
          code,
          type: 'FIXED',
          value,
          maxUses: 1,
          isActive: true,
          expiresAt,
          userId,
          sourceOrderId,
          description: description ?? 'İptalden vazgeçme hediyesi',
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        continue; // kod çakıştı, yeniden dene
      }
      throw err;
    }
  }
  throw new Error('Kupon kodu üretilemedi, lütfen tekrar deneyin');
}

/**
 * Kullanıcının kişiye özel kuponlarını (kullanılabilir + kullanılmış) döndürür.
 */
export async function getUserCoupons(userId: string) {
  const discounts = await prisma.discount.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return discounts.map((d) => {
    const expired = d.expiresAt ? new Date(d.expiresAt) < new Date() : false;
    const usedUp = d.maxUses ? d.usedCount >= d.maxUses : false;
    return {
      code: d.code,
      value: Number(d.value),
      type: d.type,
      minOrder: d.minOrder ? Number(d.minOrder) : null,
      expiresAt: d.expiresAt,
      sourceOrderId: d.sourceOrderId,
      description: d.description,
      used: usedUp,
      expired,
      usable: d.isActive && !usedUp && !expired,
    };
  });
}

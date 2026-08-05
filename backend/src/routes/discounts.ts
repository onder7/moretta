import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { AuthRequest } from '../types';
import { validateCoupon } from '../services/discountService';

const router = Router();

// ─── POST /api/discounts/validate - İndirim kodunu doğrula
router.post('/validate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Kupon kodu gerekli' });
    }

    // Doğrulama hatası "kaynak bulunamadı" değildir → 200 + success:false
    // (Tarayıcı konsolu 404/400 kırmızı hatayla dolmaz; frontend mesajı gösterir)
    const result = await validateCoupon(code, req.user!.id, Number(subtotal) || 0);
    if (!result.ok) {
      return res.json({ success: false, error: result.error });
    }

    res.json({ success: true, data: { ...result.discount, discountAmount: result.discountAmount } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/discounts - İndirimleri listele (ADMIN)
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const discounts = await prisma.discount.findMany({
      include: {
        // Kişiye özel kuponun sahibi
        user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
        // Kuponu kullanan (sipariş veren) kişiler
        usages: {
          orderBy: { usedAt: 'desc' },
          select: {
            usedAt: true,
            orderId: true,
            user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const fullName = (p?: { firstName?: string | null; lastName?: string | null } | null) =>
      p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : '';

    const data = discounts.map((d: any) => ({
      ...d,
      usageCount: d.usages.length,
      owner: d.user
        ? { id: d.user.id, email: d.user.email, name: fullName(d.user.profile) || d.user.email }
        : null,
      user: undefined,
      usages: d.usages.map((u: any) => ({
        name: fullName(u.user?.profile) || u.user?.email || '—',
        email: u.user?.email ?? '',
        orderRef: u.orderId ? `TR-${String(u.orderId).slice(-8).toUpperCase()}` : '',
        usedAt: u.usedAt,
      })),
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/discounts - İndirim oluştur (ADMIN)
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { code, type, value, minOrder, maxUses, expiresAt, description, isActive } = req.body;

    const discount = await prisma.discount.create({
      data: {
        code: code.toUpperCase(),
        type,
        value: parseFloat(value),
        minOrder: minOrder ? parseFloat(minOrder) : null,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive ?? true,
        description: description ?? null,
      },
    });

    res.status(201).json({ success: true, data: discount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/discounts/:id - İndirim detayı (ADMIN)
router.get('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const discount = await prisma.discount.findUnique({
      where: { id },
      include: { usages: true },
    });

    if (!discount) {
      return res.status(404).json({ error: 'İndirim bulunamadı' });
    }

    res.json({ success: true, data: discount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PUT /api/discounts/:id - İndirim güncelle (ADMIN)
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { code, type, value, minOrder, maxUses, expiresAt, isActive } = req.body;

    const discount = await prisma.discount.update({
      where: { id },
      data: {
        code: code?.toUpperCase(),
        type,
        value: value ? parseFloat(value) : undefined,
        minOrder: minOrder ? parseFloat(minOrder) : null,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive,
      },
    });

    res.json({ success: true, data: discount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE /api/discounts/:id - İndirim sil (ADMIN)
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    // Kullanılmış kuponlarda discount_usages FK (RESTRICT) silmeyi engeller.
    // Önce kullanım kayıtlarını, sonra kuponu sil (tek transaction).
    await prisma.$transaction([
      prisma.discountUsage.deleteMany({ where: { discountId: id } }),
      prisma.discount.delete({ where: { id } }),
    ]);

    res.json({ success: true, message: 'İndirim silindi' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

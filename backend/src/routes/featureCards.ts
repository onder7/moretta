import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { prisma } from '../config/database';

const router = Router();

// Varsayılan kartlar — tablo boşsa bir kez eklenir (mevcut ana sayfa kartları)
const DEFAULTS = [
  { icon: 'truck',       title: 'Ücretsiz & Hızlı Kargo', description: '750₺ üzeri alışverişlerinizde kargo bedava.', sortOrder: 0 },
  { icon: 'rotate-ccw',  title: '14 Gün Kolay İade',      description: 'Koşulsuz iade ve kolay değişim garantisi.',     sortOrder: 1 },
  { icon: 'headphones',  title: '7/24 Canlı Destek',      description: 'Sorularınız için her an yardıma hazırız.',       sortOrder: 2 },
  { icon: 'shield-check',title: 'Güvenli Ödeme Altyapısı', description: '256-bit SSL ve İyzico güvencesiyle ödeyin.',     sortOrder: 3 },
];

async function seedIfEmpty(): Promise<void> {
  const count = await prisma.featureCard.count();
  if (count === 0) {
    await prisma.featureCard.createMany({ data: DEFAULTS });
  }
}

// ─── Public ──────────────────────────────────────────────────────────────────

router.get('/feature-cards', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await seedIfEmpty();
    const cards = await prisma.featureCard.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, icon: true, title: true, description: true, sortOrder: true },
    });
    res.json({ success: true, data: cards });
  } catch (err) { next(err); }
});

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

router.get('/admin/feature-cards', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await seedIfEmpty();
    const cards = await prisma.featureCard.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ success: true, data: cards });
  } catch (err) { next(err); }
});

router.post('/admin/feature-cards', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { icon, title, description, sortOrder, isActive } = req.body as {
      icon?: string; title: string; description: string; sortOrder?: number; isActive?: boolean;
    };
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ success: false, error: 'title ve description zorunlu' });
    }
    const card = await prisma.featureCard.create({
      data: {
        icon: icon?.trim() || 'truck',
        title: title.trim(),
        description: description.trim(),
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
      },
    });
    res.status(201).json({ success: true, data: card });
  } catch (err) { next(err); }
});

router.put('/admin/feature-cards/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const { icon, title, description, sortOrder, isActive } = req.body as {
      icon?: string; title?: string; description?: string; sortOrder?: number; isActive?: boolean;
    };
    const card = await prisma.featureCard.update({
      where: { id },
      data: {
        ...(icon !== undefined && { icon: icon.trim() || 'truck' }),
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json({ success: true, data: card });
  } catch (err) { next(err); }
});

router.delete('/admin/feature-cards/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.featureCard.delete({ where: { id: req.params['id'] as string } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;

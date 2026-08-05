import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { prisma } from '../config/database';

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────────────

router.get('/nav-links', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const links = await prisma.navLink.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, label: true, url: true, openInNewTab: true, sortOrder: true },
    });
    res.json({ success: true, data: links });
  } catch (err) { next(err); }
});

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

router.get('/admin/nav-links', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const links = await prisma.navLink.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ success: true, data: links });
  } catch (err) { next(err); }
});

router.post('/admin/nav-links', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { label, url, openInNewTab, sortOrder, isActive } = req.body as {
      label: string; url: string; openInNewTab?: boolean; sortOrder?: number; isActive?: boolean;
    };
    if (!label?.trim() || !url?.trim()) {
      return res.status(400).json({ success: false, error: 'label ve url zorunlu' });
    }
    const link = await prisma.navLink.create({
      data: { label: label.trim(), url: url.trim(), openInNewTab: openInNewTab ?? false, sortOrder: sortOrder ?? 0, isActive: isActive ?? true },
    });
    res.status(201).json({ success: true, data: link });
  } catch (err) { next(err); }
});

router.put('/admin/nav-links/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const { label, url, openInNewTab, sortOrder, isActive } = req.body as {
      label?: string; url?: string; openInNewTab?: boolean; sortOrder?: number; isActive?: boolean;
    };
    const link = await prisma.navLink.update({
      where: { id },
      data: {
        ...(label !== undefined && { label: label.trim() }),
        ...(url !== undefined && { url: url.trim() }),
        ...(openInNewTab !== undefined && { openInNewTab }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json({ success: true, data: link });
  } catch (err) { next(err); }
});

router.delete('/admin/nav-links/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.navLink.delete({ where: { id: req.params['id'] as string } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;

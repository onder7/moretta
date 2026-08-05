import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth';
import * as svc from '../services/pageService';

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────────────

// Menüde gösterilecek sayfalar (Footer + SupportPage kenar çubuğu)
router.get('/pages', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.listMenuPages();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Tek sayfa içeriği (başlık + HTML)
router.get('/pages/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const page = await svc.getPageBySlug(slug as string);
    if (!page) return res.status(404).json({ success: false, error: 'Sayfa bulunamadı' });
    res.json({ success: true, data: { slug: page.slug, title: page.title, content: page.content, isSystem: page.isSystem } });
  } catch (err) { next(err); }
});

// ─── Admin (CRUD) ────────────────────────────────────────────────────────────

router.get('/admin/pages', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await svc.listAllPages() });
  } catch (err) { next(err); }
});

router.post('/admin/pages', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({ success: true, data: await svc.createPage(req.body) });
  } catch (err) { next(err); }
});

// reorder, /:id'den önce tanımlanmalı
router.put('/admin/pages/reorder', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids)) return res.status(400).json({ success: false, error: 'ids array gerekli' });
    await svc.reorderPages(ids);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.put('/admin/pages/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.json({ success: true, data: await svc.updatePage(id as string, req.body) });
  } catch (err) { next(err); }
});

router.delete('/admin/pages/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await svc.deletePage(id as string);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;

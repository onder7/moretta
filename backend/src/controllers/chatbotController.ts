import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as svc from '../services/chatbotService';

// Public: frontend'in kuralları çektiği endpoint
export async function getActiveRules(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.listActiveRules();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Admin: tüm kurallar (aktif + pasif)
export async function listRules(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.listRules();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createRule(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.createRule(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateRule(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.updateRule(String(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteRule(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await svc.deleteRule(String(req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function reorderRules(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids)) return res.status(400).json({ success: false, error: 'ids array gerekli' });
    await svc.reorderRules(ids);
    res.json({ success: true });
  } catch (err) { next(err); }
}

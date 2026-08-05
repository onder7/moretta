import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as svc from '../services/popupService';

export async function getActivePopup(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getActivePopup();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getPopupAdmin(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.getPopup();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function upsertPopup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, content, imageUrl, buttonText, buttonLink, isActive, displayFreq } = req.body;
    const data = await svc.upsertPopup({ title, content, imageUrl: imageUrl || null, buttonText: buttonText || null, buttonLink: buttonLink || null, isActive: !!isActive, displayFreq: displayFreq || 'session' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

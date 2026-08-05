import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as svc from '../services/discountCampaignService';

export async function getActiveCampaign(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getActiveCampaign();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getCampaignAdmin(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.getCampaign();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function upsertCampaign(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, discountText, endDate, showOnHome, color, displayType, ctaText, ctaLink } = req.body;
    if (!name || !discountText || !endDate) {
      const missing = [!name && 'Kampanya Adı', !discountText && 'İndirim Metni', !endDate && 'Bitiş Tarihi']
        .filter(Boolean).join(', ');
      return res.status(400).json({ success: false, message: `Zorunlu alanlar eksik: ${missing}` });
    }
    const parsedEnd = new Date(endDate);
    if (isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ success: false, message: 'Geçersiz bitiş tarihi formatı.' });
    }
    const data = await svc.upsertCampaign({
      name,
      discountText,
      endDate: parsedEnd,
      showOnHome: !!showOnHome,
      color: color || 'primary',
      displayType: displayType || 'sticky',
      ctaText: ctaText || null,
      ctaLink: ctaLink || null,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

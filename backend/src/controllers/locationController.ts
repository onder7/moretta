import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/locationService';

// GET /api/locations/iller
export function iller(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: svc.getIller() });
  } catch (err) { next(err); }
}

// GET /api/locations/ilceler?il=İstanbul
export function ilceler(req: Request, res: Response, next: NextFunction) {
  try {
    const il = String(req.query['il'] ?? '');
    res.json({ success: true, data: svc.getIlceler(il) });
  } catch (err) { next(err); }
}

// GET /api/locations/mahalleler?il=İstanbul&ilce=Kadıköy
export function mahalleler(req: Request, res: Response, next: NextFunction) {
  try {
    const il = String(req.query['il'] ?? '');
    const ilce = String(req.query['ilce'] ?? '');
    res.json({ success: true, data: svc.getMahalleler(il, ilce) });
  } catch (err) { next(err); }
}

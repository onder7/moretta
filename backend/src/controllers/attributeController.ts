import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as svc from '../services/attributeService';

export async function listAttributes(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.listAllAttributes();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createAttribute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, inputType, sortOrder } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Özellik adı zorunludur.' });
    const data = await svc.createAttribute({ name, inputType, sortOrder });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateAttribute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.updateAttribute(String(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteAttribute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await svc.deleteAttribute(String(req.params.id));
    res.json({ success: true, message: 'Özellik silindi.' });
  } catch (err) { next(err); }
}

export async function addAttributeValue(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { value, colorHex, sortOrder } = req.body;
    if (!value) return res.status(400).json({ success: false, message: 'Değer zorunludur.' });
    const data = await svc.addAttributeValue(String(req.params.id), { value, colorHex, sortOrder });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateAttributeValue(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.updateAttributeValue(String(req.params.valueId), req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteAttributeValue(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await svc.deleteAttributeValue(String(req.params.valueId));
    res.json({ success: true, message: 'Değer silindi.' });
  } catch (err) { next(err); }
}

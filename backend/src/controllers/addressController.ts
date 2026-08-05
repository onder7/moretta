import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as svc from '../services/addressService';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.listAddresses(req.user!.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.createAddress(req.user!.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.updateAddress(req.user!.id, req.params['id'] as string, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await svc.deleteAddress(req.user!.id, req.params['id'] as string);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function setDefault(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.setDefaultAddress(req.user!.id, req.params['id'] as string);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

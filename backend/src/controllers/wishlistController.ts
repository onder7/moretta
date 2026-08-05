import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as svc from '../services/wishlistService';

export async function get(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const wishlist = await svc.getWishlist(req.user!.id);
    res.json({ success: true, data: wishlist });
  } catch (err) {
    next(err);
  }
}

export async function toggle(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.body;
    if (!productId) {
      res.status(400).json({ success: false, error: 'productId gereklidir' });
      return;
    }
    const result = await svc.toggleWishlistItem(req.user!.id, productId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

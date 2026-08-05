import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as svc from '../services/reviewService';

export async function getReviews(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params as { productId: string };
    const result = await svc.getReviews(productId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function addReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params as { productId: string };
    const userId = req.user!.id;
    const { rating, title, body } = req.body as { rating: number; title?: string; body?: string };
    const review = await svc.addReview(productId, userId, { rating, title, body });
    res.status(201).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
}

export async function deleteReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reviewId } = req.params as { reviewId: string };
    await svc.deleteReview(reviewId, req.user!.id, req.user!.role === 'ADMIN');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

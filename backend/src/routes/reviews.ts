import { Router, Request, Response, NextFunction } from 'express';
import * as ctrl from '../controllers/reviewController';
import { authenticate } from '../middlewares/auth';
import { prisma } from '../config/database';
import { AuthRequest } from '../types';

const router = Router({ mergeParams: true });

// GET /api/reviews/my-reviews - Kullanıcının yazdiği incelemeler
router.get('/my-reviews', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user!.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: {
              orderBy: { sortOrder: 'asc' as const },
              select: { id: true, url: true, altText: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
});

// GET /products/:productId/reviews
router.get('/', ctrl.getReviews);

// POST /products/:productId/reviews  (giriş zorunlu)
router.post('/', authenticate, ctrl.addReview);

// DELETE /products/:productId/reviews/:reviewId
router.delete('/:reviewId', authenticate, ctrl.deleteReview);

export default router;

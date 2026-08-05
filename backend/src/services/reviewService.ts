import { prisma } from '../config/database';
import { AppError } from '../types';
import { logger } from '../config/logger';
import * as emailSvc from './emailService';
import { maskProfile } from '../utils/maskName';

export async function getReviews(productId: string) {
  const raw = await prisma.review.findMany({
    where: { productId, isApproved: true },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  // Gizlilik: müşteriye dönük listede ad/soyad maskelenir
  const reviews = raw.map((r) => ({
    ...r,
    user: r.user ? { ...r.user, profile: maskProfile(r.user.profile) } : r.user,
  }));

  const total = reviews.length;
  const avgRating =
    total > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
      : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return { reviews, total, avgRating, distribution };
}

export async function addReview(
  productId: string,
  userId: string,
  data: { rating: number; title?: string; body?: string }
) {
  if (data.rating < 1 || data.rating > 5) {
    throw new AppError('Puan 1-5 arasında olmalıdır', 400);
  }

  // Aynı kullanıcı aynı ürüne ikinci kez yorum yapamaz
  const existing = await prisma.review.findUnique({
    where: { productId_userId: { productId, userId } },
  });
  if (existing) {
    throw new AppError('Bu ürün için zaten bir değerlendirme yapmışsınız', 409);
  }

  const review = await prisma.review.create({
    data: {
      productId,
      userId,
      rating: data.rating,
      title: data.title,
      body: data.body,
      isApproved: false, // Admin onayı bekler; onaylanana kadar müşteri tarafında görünmez
    },
    include: {
      user: {
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
      product: { select: { name: true } },
    },
  });

  // ─── Yöneticiye yeni değerlendirme bildirimi (hata yutulur) ───
  void emailSvc
    .notifyAdminNewReview({
      productName: review.product?.name ?? 'Ürün',
      rating: review.rating,
      author: [review.user?.profile?.firstName, review.user?.profile?.lastName].filter(Boolean).join(' ').trim(),
      title: review.title ?? undefined,
      body: review.body ?? undefined,
    })
    .catch((e) => logger.error('Yeni değerlendirme e-postası gönderilemedi', { reviewId: review.id, error: e?.message }));

  return review;
}

export async function deleteReview(reviewId: string, userId: string, isAdmin: boolean) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError('Değerlendirme bulunamadı', 404);
  if (!isAdmin && review.userId !== userId) throw new AppError('Yetkisiz işlem', 403);
  await prisma.review.delete({ where: { id: reviewId } });
}

// ─── Admin moderasyonu ────────────────────────────────────────────────────────

// Admin: tüm değerlendirmeleri listele (status filtresi: pending | approved | all)
export async function listAllReviews(status: 'pending' | 'approved' | 'all' = 'all') {
  const where =
    status === 'pending' ? { isApproved: false }
    : status === 'approved' ? { isApproved: true }
    : {};

  return prisma.review.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { id: true, name: true, slug: true } },
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
}

// Admin: onay durumunu değiştir
export async function setReviewApproval(reviewId: string, approved: boolean) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError('Değerlendirme bulunamadı', 404);
  return prisma.review.update({
    where: { id: reviewId },
    data: { isApproved: approved },
  });
}

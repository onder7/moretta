import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middlewares/auth';
import { AuthRequest } from '../types';

const router = Router();

// GET /api/profile - Profil bilgilerini getir
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile - Profil bilgilerini güncelle
router.put('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone } = req.body;

    // Validate input
    if (firstName === undefined && lastName === undefined && phone === undefined) {
      return res.status(400).json({ success: false, error: 'Güncellenecek alan belirtiniz' });
    }

    // Update or create profile
    const profile = await prisma.userProfile.upsert({
      where: { userId: req.user!.id },
      update: {
        ...(firstName !== undefined && { firstName: firstName || null }),
        ...(lastName !== undefined && { lastName: lastName || null }),
        ...(phone !== undefined && { phone: phone || null }),
      },
      create: {
        userId: req.user!.id,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
      },
    });

    // Get updated user
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { profile: true },
    });

    res.json({
      success: true,
      data: {
        id: user!.id,
        email: user!.email,
        profile: user!.profile,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

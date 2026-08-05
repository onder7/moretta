import { Router, Request, Response, NextFunction } from 'express';
import { sign, verify, SignOptions } from 'jsonwebtoken';
import { authenticate } from '../middlewares/auth';
import * as mfaService from '../services/mfaService';
import { AppError, AuthRequest } from '../types';
import { env } from '../config/env';
import { prisma } from '../config/database';
import * as jwt from 'jsonwebtoken';

const router = Router();

// MFA durumu kontrolü
router.get('/status', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId || (req as any).user?.id;
    if (!userId) throw new AppError('Kullanıcı bulunamadı', 401);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    res.json({
      success: true,
      data: {
        mfaEnabled: user?.mfaEnabled ?? false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// MFA setup başla - QR code ve yedek kodlar oluştur
router.post('/setup', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId || (req as any).user?.id;
    if (!userId) throw new AppError('Kullanıcı bulunamadı', 401);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Kullanıcı bulunamadı', 404);

    const { secret, qrCode, backupCodes } = await mfaService.generateMFASecret(user.email);

    res.json({
      success: true,
      data: {
        secret,
        qrCode,
        backupCodes,
      },
    });
  } catch (err) {
    next(err);
  }
});

// MFA'yı etkinleştir
router.post(
  '/enable',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Kullanıcı bulunamadı', 401);

      const { secret, token, backupCodes } = req.body as {
        secret: string;
        token: string;
        backupCodes: string[];
      };

      if (!secret || !token || !backupCodes) {
        throw new AppError('Eksik parametreler', 400);
      }

      // Token doğrula
      const isValid = await mfaService.verifyMFAToken(secret, token);
      if (!isValid) {
        throw new AppError('Geçersiz token', 400);
      }

      // MFA'yı etkinleştir
      await mfaService.enableMFA(userId, secret, backupCodes);

      res.json({
        success: true,
        message: 'MFA etkinleştirildi',
      });
    } catch (err) {
      next(err);
    }
  }
);

// MFA'yı devre dışı bırak
router.post('/disable', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Kullanıcı bulunamadı', 401);

    await mfaService.disableMFA(userId);

    res.json({
      success: true,
      message: 'MFA devre dışı bırakıldı',
    });
  } catch (err) {
    next(err);
  }
});

// MFA login tamamla (tempToken + MFA token doğrula)
router.post('/login-complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tempToken, mfaToken } = req.body as { tempToken: string; mfaToken: string };

    if (!tempToken || !mfaToken) {
      throw new AppError('Eksik parametreler', 400);
    }

    // Geçici token doğrula
    let decoded: any;
    try {
      decoded = verify(tempToken, env.JWT_SECRET) as any;
    } catch {
      throw new AppError('Geçersiz veya süresi dolmuş token', 401);
    }

    const userId = decoded.id;

    // MFA token doğrula
    const result = await mfaService.verifyMFALogin(userId, mfaToken);

    if (!result.success) {
      throw new AppError('Geçersiz MFA token', 401);
    }

    // Asıl access ve refresh token'ları oluştur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı', 404);
    }

    const accessToken = sign(
      { id: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );

    const refreshToken = sign(
      { id: user.id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );

    // Refresh token kaydet
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokens: { push: refreshToken } },
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile: {
            firstName: user.profile?.firstName,
            lastName: user.profile?.lastName,
          },
        },
        backupCodeUsed: result.backupCodeUsed,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

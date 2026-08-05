import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sign } from 'jsonwebtoken';
import * as jwt from 'jsonwebtoken';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { getGoogleClientId } from '../services/settingsService';
import { promoteGuestToMember } from '../services/authService';

const router = Router();

interface OAuthProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  provider: 'google' | 'facebook' | 'instagram';
}

/**
 * Social login ile kullanıcı bul veya oluştur
 */
async function findOrCreateUser(profile: OAuthProfile) {
  const provider = profile.provider;
  const providerId = `${provider}:${profile.id}`;

  // Email ile kullanıcı bul
  let user = await prisma.user.findUnique({
    where: { email: profile.email }
  });

  if (user) {
    // Sosyal sağlayıcı e-posta sahipliğini doğruluyor → misafir hesabı üyeliğe
    // yükselt. Yükseltilmezse "Hesabınızı Aktifleştirin" kartı kalıcı olur ve
    // aktivasyon, şifre sıfırlamayla şifre kazanmış hesabı reddeder.
    if (await promoteGuestToMember(user)) {
      user = (await prisma.user.findUnique({ where: { id: user.id } }))!;
    }

    // Mevcut kullanıcı - OAuth ID'yi ekle + eksik profil alanlarını Google verisiyle tamamla
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id }
    });

    if (userProfile) {
      const updates: Record<string, unknown> = {};
      if (!userProfile.oauthIds.includes(providerId)) {
        updates.oauthIds = { push: providerId };
      }
      // Sadece boş alanları doldur — kullanıcının elle girdiği bilgiyi ezme
      if (!userProfile.firstName && profile.firstName) updates.firstName = profile.firstName;
      if (!userProfile.lastName && profile.lastName) updates.lastName = profile.lastName;
      if (!userProfile.avatarUrl && profile.picture) updates.avatarUrl = profile.picture;
      if (Object.keys(updates).length > 0) {
        await prisma.userProfile.update({ where: { userId: user.id }, data: updates });
      }
    }
  } else {
    // Yeni kullanıcı oluştur
    const firstName = profile.firstName || profile.email.split('@')[0];
    const lastName = profile.lastName || '';

    user = await prisma.user.create({
      data: {
        email: profile.email,
        firstName,
        lastName,
        role: 'CUSTOMER',
        profile: {
          create: {
            // İsim profil tablosuna da yazılmalı — getMe/profil ekranı buradan okur
            firstName,
            lastName,
            phone: '',
            bio: '',
            // Profil ekranı avatarUrl okur; avatar alanını da geriye dönük uyumluluk için dolduruyoruz
            avatar: profile.picture || '',
            avatarUrl: profile.picture || '',
            oauthIds: [providerId]
          }
        }
      }
    });
  }

  // Profil bilgisiyle birlikte güncel kullanıcıyı döndür — response şekli login/getMe ile aynı olmalı
  return prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { profile: true },
  });
}

/**
 * OAuth response için kullanıcı nesnesini login/getMe ile aynı şekle getirir
 * (frontend her yerde user.profile.firstName/lastName/avatarUrl okur).
 */
function toPublicUser(user: {
  id: string;
  email: string;
  role: string;
  profile?: { firstName: string | null; lastName: string | null; phone: string | null; avatarUrl: string | null } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    profile: user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          phone: user.profile.phone,
          avatarUrl: user.profile.avatarUrl,
        }
      : null,
  };
}

/**
 * OAuth kullanıcısı için access + refresh token üretir.
 * Önemli: access token claim'i { id, email, role } olmalı — auth middleware payload.id okur.
 */
function issueTokens(user: { id: string; email: string; role: string }) {
  const accessToken = sign(
    { id: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );
  const refreshToken = sign(
    { id: user.id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );
  return { accessToken, refreshToken };
}

/**
 * Normal login ile aynı çerezleri set eder (authController.setTokenCookies ile birebir).
 * Frontend bazı korumalı uçları (orders/wishlist/addresses...) Authorization header'ı
 * olmadan, sadece cookie ile çağırıyor — bu yüzden sosyal girişte de cookie şart.
 */
const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

function setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

/**
 * Google OAuth callback
 * Beklenen payload: { idToken: string }
 */
router.post('/auth/oauth/google', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken } = req.body as { idToken?: string };

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'ID token gerekli'
      });
    }

    // Google ID Token'ı Google'ın tokeninfo ucu ile doğrula (imza + son kullanma kontrolü Google tarafında yapılır)
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!verifyRes.ok) {
      return res.status(401).json({ success: false, error: 'Geçersiz veya süresi dolmuş Google token' });
    }
    const payload = (await verifyRes.json()) as {
      aud?: string;
      sub?: string;
      email?: string;
      email_verified?: string | boolean;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };

    // Token bu uygulama için mi? (Client ID env veya admin panelinde tanımlıysa zorunlu)
    const expectedClientId = await getGoogleClientId();
    if (expectedClientId && payload.aud !== expectedClientId) {
      return res.status(401).json({ success: false, error: 'Token bu uygulama için geçerli değil' });
    }

    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    if (!payload.email || !emailVerified) {
      return res.status(401).json({ success: false, error: 'E-posta doğrulanmamış veya alınamadı' });
    }

    const user = await findOrCreateUser({
      id: payload.sub || payload.email,
      email: payload.email,
      firstName: payload.given_name,
      lastName: payload.family_name,
      picture: payload.picture,
      provider: 'google'
    });

    const { accessToken, refreshToken } = issueTokens(user);

    // Refresh token'ı kaydet
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokens: { push: refreshToken } }
    });

    logger.info('Google OAuth başarılı', { userId: user.id, email: user.email });

    setTokenCookies(res, accessToken, refreshToken);
    res.json({
      success: true,
      data: {
        user: toPublicUser(user),
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    logger.error('Google OAuth hatası', { err: (err as Error).message });
    next(err);
  }
});

/**
 * Facebook OAuth callback
 * Beklenen payload: { accessToken: string }
 */
router.post('/auth/oauth/facebook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accessToken } = req.body as { accessToken?: string };

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token gerekli'
      });
    }

    // Facebook API'sine kullanıcı bilgisini sor
    const fbRes = await fetch('https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=' + accessToken);
    const fbData = await fbRes.json() as any;

    if (!fbData.email) {
      return res.status(400).json({
        success: false,
        error: 'E-posta bilgisi alınamadı'
      });
    }

    const user = await findOrCreateUser({
      id: fbData.id,
      email: fbData.email,
      firstName: fbData.first_name,
      lastName: fbData.last_name,
      picture: fbData.picture?.data?.url,
      provider: 'facebook'
    });

    const { accessToken: jwtAccessToken, refreshToken } = issueTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokens: { push: refreshToken } }
    });

    logger.info('Facebook OAuth başarılı', { userId: user.id, email: user.email });

    setTokenCookies(res, jwtAccessToken, refreshToken);
    res.json({
      success: true,
      data: {
        user: toPublicUser(user),
        accessToken: jwtAccessToken,
        refreshToken
      }
    });
  } catch (err) {
    logger.error('Facebook OAuth hatası', { err: (err as Error).message });
    next(err);
  }
});

/**
 * Instagram OAuth callback (via Facebook)
 * Beklenen payload: { accessToken: string }
 */
router.post('/auth/oauth/instagram', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accessToken } = req.body as { accessToken?: string };

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token gerekli'
      });
    }

    // Instagram API'sine (Facebook Graph API üzerinden) kullanıcı bilgisini sor
    const igRes = await fetch('https://graph.instagram.com/me?fields=id,username&access_token=' + accessToken);
    const igData = await igRes.json() as any;

    if (!igData.id) {
      return res.status(400).json({
        success: false,
        error: 'Instagram kullanıcısı bulunamadı'
      });
    }

    // Instagram'da email olmayabileceği için username@instagram.local kullan
    const email = `${igData.username}@instagram.local`;

    const user = await findOrCreateUser({
      id: igData.id,
      email,
      firstName: igData.username,
      lastName: '',
      picture: igData.profile_picture_url,
      provider: 'instagram'
    });

    const { accessToken: jwtAccessToken, refreshToken } = issueTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokens: { push: refreshToken } }
    });

    logger.info('Instagram OAuth başarılı', { userId: user.id });

    setTokenCookies(res, jwtAccessToken, refreshToken);
    res.json({
      success: true,
      data: {
        user: toPublicUser(user),
        accessToken: jwtAccessToken,
        refreshToken
      }
    });
  } catch (err) {
    logger.error('Instagram OAuth hatası', { err: (err as Error).message });
    next(err);
  }
});

export default router;

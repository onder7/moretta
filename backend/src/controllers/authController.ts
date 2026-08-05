import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { AuthRequest } from '../types';
import { env } from '../config/env';

function getRootCookieDomain(): string | undefined {
  if (env.NODE_ENV !== 'production') return undefined;
  try {
    const hostname = new URL(env.FRONTEND_URL).hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    return parts.length >= 2 ? `.${parts.slice(-2).join('.')}` : undefined;
  } catch { return undefined; }
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  domain: getRootCookieDomain(),
};

function setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body);

    // Doğrulama zorunluysa oturum açılmaz; kullanıcı e-postasını doğrulamalı.
    if ('verificationRequired' in result) {
      res.status(201).json({
        success: true,
        message: result.emailSent
          ? 'Kayıt başarılı. E-posta adresinize doğrulama linki gönderildi.'
          : 'Kayıt başarılı, ancak doğrulama e-postası gönderilemedi. Lütfen "Tekrar gönder" ile yeniden deneyin.',
        data: { verificationRequired: true, email: result.email, emailSent: result.emailSent },
      });
      return;
    }

    setTokenCookies(res, result.accessToken, result.refreshToken);
    res.status(201).json({
      success: true,
      message: 'Kayıt başarılı',
      data: { accessToken: result.accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body) as any;

    // MFA gerekli mi?
    if (result.mfaRequired && result.tempToken) {
      res.json({
        success: true,
        mfaRequired: true,
        tempToken: result.tempToken,
        user: result.user,
      });
      return;
    }

    // Normal login
    setTokenCookies(res, result.accessToken, result.refreshToken);
    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user },
    });
  } catch (err) {
    next(err);
  }
}

export async function guestLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.guestLogin(req.body) as any;
    setTokenCookies(res, result.accessToken, result.refreshToken);
    res.json({
      success: true,
      message: 'Misafir girişi başarılı',
      data: { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user?.id) await authService.logout(req.user.id);
    res.clearCookie('access_token', COOKIE_OPTS);
    res.clearCookie('refresh_token', COOKIE_OPTS);
    res.json({ success: true, message: 'Çıkış yapıldı' });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refresh_token ?? req.body?.refreshToken;
    if (!token) {
      res.status(401).json({ success: false, message: 'Refresh token bulunamadı' });
      return;
    }
    const tokens = await authService.refreshTokens(token);
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    res.json({ success: true, data: { accessToken: tokens.accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await authService.updateProfile(req.user!.id, req.body);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword,
    );
    res.json({ success: true, message: 'Şifre değiştirildi' });
  } catch (err) {
    next(err);
  }
}

export async function setPassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.setPassword(req.user!.id, req.body.newPassword);
    res.json({ success: true, message: 'Şifre belirlendi' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.forgotPassword(req.body.email);
    // Güvenlik: kullanıcı var ya da yok, aynı mesajı döndür
    res.json({ success: true, message: 'Eğer bu e-posta kayıtlıysa şifre sıfırlama linki gönderildi' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ success: true, message: 'Şifreniz başarıyla sıfırlandı' });
  } catch (err) {
    next(err);
  }
}

// ─── E-posta doğrulama ───────────────────────────────────────────────────────

/** Aktivasyon linkinden gelen token'ı doğrular ve oturum açar. */
export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = String(req.body.token ?? req.query.token ?? '').trim();
    if (!token) {
      res.status(400).json({ success: false, error: 'Doğrulama token’ı eksik' });
      return;
    }
    const { accessToken, refreshToken, user } = await authService.verifyEmail(token);
    setTokenCookies(res, accessToken, refreshToken);
    res.json({
      success: true,
      message: 'E-posta adresiniz doğrulandı. Hesabınız aktif.',
      data: { accessToken, user },
    });
  } catch (err) {
    next(err);
  }
}

/** Aktivasyon e-postasını yeniden gönderir. */
export async function resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.resendVerification(String(req.body.email ?? '').trim());
    // Güvenlik: hesap var ya da yok, aynı mesaj
    res.json({
      success: true,
      message: 'Hesap doğrulanmamışsa aktivasyon linki e-posta adresine yeniden gönderildi.',
    });
  } catch (err) {
    next(err);
  }
}

/** Doğrulama ayarının açık olup olmadığını herkese açık şekilde bildirir (arayüz için). */
export async function verificationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const required = await authService.isEmailVerificationRequired();
    res.json({ success: true, data: { required } });
  } catch (err) {
    next(err);
  }
}

// ─── Misafir doğrulama kodu ──────────────────────────────────────────────────

export async function sendGuestCode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.sendGuestCode(req.user!.id);
    res.json({ success: true, message: 'Doğrulama kodu e-posta adresinize gönderildi.' });
  } catch (err) {
    next(err);
  }
}

export async function verifyGuestCode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const code = String(req.body.code ?? '').trim();
    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({ success: false, error: '6 haneli doğrulama kodunu girin.' });
      return;
    }
    await authService.verifyGuestCode(req.user!.id, code);
    res.json({ success: true, message: 'E-posta adresiniz doğrulandı.' });
  } catch (err) {
    next(err);
  }
}

// ─── Misafir hesabı aktivasyonu ──────────────────────────────────────────────

export async function activateGuest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.activateGuest(req.user!.id, req.body.newPassword);
    setTokenCookies(res, result.accessToken, result.refreshToken);
    res.json({
      success: true,
      message: 'Hesabınız başarıyla aktifleştirildi. Artık tam üyesiniz!',
      data: { accessToken: result.accessToken, user: result.user },
    });
  } catch (err) {
    next(err);
  }
}


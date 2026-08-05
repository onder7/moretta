import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { AppError } from '../types';
import { logger } from '../config/logger';
import { getSettingsGroup } from './settingsService';

// ─── E-posta doğrulama ───────────────────────────────────────────────────────

const VERIFY_TOKEN_TTL = 24 * 60 * 60; // aktivasyon linki: 24 saat
const GUEST_CODE_TTL   = 10 * 60;      // misafir kodu: 10 dakika
const GUEST_CODE_MAX_ATTEMPTS = 5;

/** Yönetim panelindeki "E-posta doğrulaması zorunlu" ayarı. Varsayılan: kapalı. */
export async function isEmailVerificationRequired(): Promise<boolean> {
  try {
    const s = await getSettingsGroup('auth_');
    return s.email_verification_required === 'true';
  } catch {
    return false; // ayar okunamazsa akışı kilitleme
  }
}

/**
 * Aktivasyon token'ı üretip Redis'e yazar ve doğrulama e-postasını gönderir.
 *
 * Gönderim hatası BİLEREK yutulur: hesap zaten oluşturulmuş oluyor, burada
 * exception fırlatmak kullanıcıya "Sunucu hatası" gösterip onu çıkışsız bırakır
 * (tekrar kayıt denemesi "e-posta zaten kayıtlı" der). Bunun yerine false döner,
 * arayüz "tekrar gönder" seçeneği sunar.
 *
 * @returns e-posta gerçekten gönderilebildi mi
 */
async function issueVerificationToken(userId: string, email: string): Promise<boolean> {
  const token = crypto.randomUUID();
  await redis.setex(`verify:${token}`, VERIFY_TOKEN_TTL, userId);
  try {
    const { sendVerificationEmail } = await import('./emailService');
    await sendVerificationEmail(email, token);
    return true;
  } catch (err) {
    const { logger } = await import('../config/logger');
    logger.error('Aktivasyon e-postası gönderilemedi', {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  marketingConsent?: boolean; // e-posta izni
  smsConsent?: boolean;
  acceptTerms?: boolean; // üyelik koşulları + KVKK (zorunlu)
}

interface LoginInput {
  email: string;
  password: string;
}

export interface GuestLoginInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  marketingConsent?: boolean;
  smsConsent?: boolean;
  acceptTerms?: boolean;
}

function signAccess(userId: string, email: string, role: string): string {
  return jwt.sign({ id: userId, email, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

function signRefresh(userId: string): string {
  return jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const ttlSeconds = 7 * 24 * 60 * 60; // 7 days
  await redis.setex(`refresh:${userId}`, ttlSeconds, token);
}

async function revokeRefreshToken(userId: string): Promise<void> {
  await redis.del(`refresh:${userId}`);
}

export async function register(
  input: RegisterInput,
): Promise<TokenPair | { verificationRequired: true; email: string; emailSent: boolean }> {
  if (!input.acceptTerms) {
    throw new AppError('Üyelik koşullarını ve kişisel verilerin korunmasını kabul etmelisiniz', 400);
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email }, include: { profile: true } });

  // Doğrulama zorunluysa hesap pasif açılır ve otomatik giriş yapılmaz.
  const verificationRequired = await isEmailVerificationRequired();
  const activation = verificationRequired
    ? { isActive: false, emailVerifiedAt: null }
    : { isActive: true, emailVerifiedAt: new Date() };

  const hashed = await bcrypt.hash(input.password, 12);
  let user;

  if (existing) {
    if (!existing.isGuest) {
      throw new AppError('Bu e-posta adresi zaten kayıtlı', 409);
    }
    // Guest hesabını gerçek hesaba dönüştür
    user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: hashed,
        isGuest: false,
        ...activation,
        marketingConsent: input.marketingConsent ?? existing.marketingConsent,
        smsConsent: input.smsConsent ?? existing.smsConsent,
        termsAcceptedAt: new Date(),
        profile: {
          update: {
            firstName: input.firstName || existing.profile?.firstName,
            lastName: input.lastName || existing.profile?.lastName,
            phone: input.phone || existing.profile?.phone,
          }
        }
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: hashed,
        role: 'CUSTOMER',
        isGuest: false,
        ...activation,
        marketingConsent: input.marketingConsent ?? false,
        smsConsent: input.smsConsent ?? false,
        termsAcceptedAt: new Date(),
        profile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
          },
        },
      },
    });
  }

  // Doğrulama zorunluysa token verilmez; kullanıcı e-postadaki linke tıklamalı.
  if (verificationRequired) {
    const emailSent = await issueVerificationToken(user.id, user.email);
    return { verificationRequired: true, email: user.email, emailSent };
  }

  const accessToken = signAccess(user.id, user.email, user.role);
  const refreshToken = signRefresh(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return { accessToken, refreshToken };
}

/** Aktivasyon linkindeki token'ı doğrular, hesabı aktifleştirir ve oturum açar. */
export async function verifyEmail(token: string): Promise<TokenPair & { user: object }> {
  const userId = await redis.get(`verify:${token}`);
  if (!userId) {
    throw new AppError('Doğrulama linki geçersiz veya süresi dolmuş. Yeni link talep edebilirsiniz.', 400);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive: true, emailVerifiedAt: new Date() },
    include: { profile: true },
  });

  await redis.del(`verify:${token}`); // tek kullanımlık

  const accessToken = signAccess(user.id, user.email, user.role);
  const refreshToken = signRefresh(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isGuest: user.isGuest,
      profile: {
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        phone: user.profile?.phone,
        avatarUrl: user.profile?.avatarUrl,
      },
    },
  };
}

/**
 * Aktivasyon e-postasını yeniden gönderir.
 * Hesap varlığı sızmasın diye sonuç her durumda başarılı döner.
 */
export async function resendVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.isGuest || user.emailVerifiedAt) return;
  await issueVerificationToken(user.id, user.email);
}

export async function guestLogin(input: GuestLoginInput): Promise<(TokenPair & { user: object })> {
  if (!input.acceptTerms) {
    throw new AppError('Üyelik koşullarını ve kişisel verilerin korunmasını kabul etmelisiniz', 400);
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    include: { profile: true },
  });

  let user;

  if (existing) {
    // Şifresi olan kullanıcı gerçek üyedir, misafir girişine izin verme
    if (existing.passwordHash) {
      throw new AppError('Bu e-posta adresi ile kayıtlı bir hesap var. Lütfen üye girişi yapınız.', 409);
    }
    // Misafiri düzelt + onayları güncelle
    user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        isGuest: true,
        marketingConsent: input.marketingConsent ?? existing.marketingConsent,
        smsConsent: input.smsConsent ?? existing.smsConsent,
        termsAcceptedAt: new Date(),
      },
      include: { profile: true },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: input.email,
        role: 'CUSTOMER',
        isGuest: true,
        // Doğrulama kapalıysa misafir doğrulanmış sayılır; açıksa sipariş
        // tamamlanırken 6 haneli kodla doğrulaması istenir.
        emailVerifiedAt: (await isEmailVerificationRequired()) ? null : new Date(),
        marketingConsent: input.marketingConsent ?? false,
        smsConsent: input.smsConsent ?? false,
        termsAcceptedAt: new Date(),
        profile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
          },
        },
      },
      include: { profile: true },
    });
  }

  const accessToken = signAccess(user.id, user.email, user.role);
  const refreshToken = signRefresh(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return { 
    accessToken, 
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isGuest: true,
      profile: user.profile,
    }
  };
}

// ─── Misafir doğrulama (6 haneli kod) ────────────────────────────────────────

/**
 * Misafirin e-postasına 6 haneli kod gönderir.
 * Kod Redis'te tutulur; sipariş tamamlanırken doğrulanır.
 */
export async function sendGuestCode(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Kullanıcı bulunamadı', 404);
  if (user.emailVerifiedAt) return; // zaten doğrulanmış, kod göndermeye gerek yok

  const code = String(crypto.randomInt(100000, 1000000)); // 6 hane
  await redis.setex(`guestcode:${userId}`, GUEST_CODE_TTL, code);
  await redis.del(`guestcode:${userId}:attempts`);

  const { sendGuestCodeEmail } = await import('./emailService');
  await sendGuestCodeEmail(user.email, code);
}

/** Misafirin girdiği kodu doğrular ve e-postasını doğrulanmış işaretler. */
export async function verifyGuestCode(userId: string, code: string): Promise<void> {
  const attemptsKey = `guestcode:${userId}:attempts`;
  const attempts = Number((await redis.get(attemptsKey)) ?? 0);
  if (attempts >= GUEST_CODE_MAX_ATTEMPTS) {
    throw new AppError('Çok fazla hatalı deneme. Lütfen yeni kod isteyin.', 429);
  }

  const stored = await redis.get(`guestcode:${userId}`);
  if (!stored) {
    throw new AppError('Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.', 400);
  }

  if (stored !== code.trim()) {
    await redis.setex(attemptsKey, GUEST_CODE_TTL, String(attempts + 1));
    throw new AppError('Doğrulama kodu hatalı.', 400);
  }

  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  await redis.del(`guestcode:${userId}`);
  await redis.del(attemptsKey);
}

/** Sipariş oluşturmadan önce çağrılır: doğrulama gerekiyorsa ve yapılmamışsa hata verir. */
export async function assertEmailVerifiedForOrder(userId: string): Promise<void> {
  if (!(await isEmailVerificationRequired())) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerifiedAt) return;

  throw new AppError(
    'Siparişi tamamlamak için e-posta adresinizi doğrulamanız gerekiyor.',
    403,
    true,
    'GUEST_EMAIL_NOT_VERIFIED',
  );
}

export async function login(input: LoginInput): Promise<(TokenPair & { user: object; mfaRequired?: boolean; tempToken?: string }) | any> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { profile: true },
  });

  if (!user) throw new AppError('E-posta veya şifre hatalı', 401);

  if (!user.passwordHash) throw new AppError('Bu hesap sosyal giriş ile oluşturulmuş, şifre ile giriş yapılamaz', 401);

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new AppError('E-posta veya şifre hatalı', 401);

  // Şifre doğru — hesap durumunu şimdi bildirebiliriz (hesap sayımı sızmaz).
  // Doğrulanmamış hesapla yönetici tarafından kapatılmış hesap ayrı mesaj alır.
  if (!user.isActive) {
    if (!user.emailVerifiedAt) {
      throw new AppError(
        'Hesabınız henüz doğrulanmamış. E-posta adresinize gönderilen aktivasyon linkine tıklayın.',
        403,
        true,
        'EMAIL_NOT_VERIFIED',
      );
    }
    throw new AppError('Hesabınız devre dışı bırakılmış. Lütfen bizimle iletişime geçin.', 403);
  }

  // Şifresini bilerek giren misafir artık gerçek üye sayılır (şifreyi sıfırlama
  // linkiyle almış olabilir; o durumda aktivasyon kartı sonsuza dek kalıyordu).
  await promoteGuestToMember(user);

  // MFA kontrol et
  const userAny = user as any;
  if (userAny.mfaEnabled || userAny.mfa_enabled) {
    // Geçici token oluştur (MFA doğrulaması için)
    const tempToken = jwt.sign({ id: user.id, mfaRequired: true }, env.JWT_SECRET as string, {
      expiresIn: '5m', // 5 dakika geçerli
    });

    return {
      mfaRequired: true,
      tempToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  const accessToken = signAccess(user.id, user.email, user.role);
  const refreshToken = signRefresh(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: {
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        phone: user.profile?.phone,
        avatarUrl: user.profile?.avatarUrl,
      },
    },
  };
}

export async function refreshTokens(token: string): Promise<TokenPair> {
  let payload: { id: string };
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
  } catch {
    throw new AppError('Geçersiz refresh token', 401);
  }

  const stored = await redis.get(`refresh:${payload.id}`);
  if (!stored || stored !== token) throw new AppError('Refresh token geçersiz veya iptal edilmiş', 401);

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || !user.isActive) throw new AppError('Kullanıcı bulunamadı', 401);

  const accessToken = signAccess(user.id, user.email, user.role);
  const refreshToken = signRefresh(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return { accessToken, refreshToken };
}

export async function logout(userId: string): Promise<void> {
  await revokeRefreshToken(userId);
}

export async function getMe(userId: string): Promise<object> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user) throw new AppError('Kullanıcı bulunamadı', 404);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isGuest: user.isGuest,                // ← eklendi
    hasPassword: !!user.passwordHash,     // sosyal girişli hesapta false → "Şifre Belirle"
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
 * Sosyal girişle oluşmuş (şifresiz) hesap için ilk şifreyi belirler.
 * Hesabın zaten şifresi varsa reddeder (o durumda changePassword kullanılmalı).
 */
export async function setPassword(userId: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Kullanıcı bulunamadı', 404);
  if (user.passwordHash) {
    throw new AppError('Hesabınızda zaten şifre var. Şifre değiştirmeyi kullanın.', 400);
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashed } });
}

export async function updateProfile(
  userId: string,
  data: { firstName?: string; lastName?: string; phone?: string },
) {
  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return getMe(userId);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Kullanıcı bulunamadı', 404);

  if (!user.passwordHash) throw new AppError('Bu hesap sosyal giriş ile oluşturulmuş, şifre değiştirilemiyor', 400);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError('Mevcut şifre hatalı', 400);

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashed } });
  await revokeRefreshToken(userId);
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Güvenlik: kullanıcı bulunamasa da hata vermiyoruz
  if (!user) return;

  const token = crypto.randomUUID();
  await redis.setex(`reset:${token}`, 60 * 60, user.id); // 1 saat TTL

  // SMTP yoksa token'ı logla (geliştirme için)
  const { sendPasswordResetEmail } = await import('./emailService');
  await sendPasswordResetEmail(email, token);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const userId = await redis.get(`reset:${token}`);
  if (!userId) throw new AppError('Şifre sıfırlama linki geçersiz veya süresi dolmuş', 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Kullanıcı bulunamadı', 404);

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashed } });
  // Sıfırlama linki e-posta sahipliğini kanıtlar → misafir üyeliğe yükselir.
  // Yükseltilmezse "Hesabınızı Aktifleştirin" uyarısı kalır, aktivasyon da
  // "zaten bir şifre belirlenmiş" deyip reddeder; hesap kilitlenirdi.
  await promoteGuestToMember(user);
  await redis.del(`reset:${token}`);
  await revokeRefreshToken(userId);
}

/**
 * Misafir hesabını gerçek üyeliğe yükseltir. Zaten üyeyse hiçbir şey yapmaz.
 *
 * isGuest bayrağını eskiden yalnızca activateGuest kaldırıyordu, o da hesapta
 * şifre varsa reddediyor. Şifre sıfırlama / sosyal giriş / şifreyle giriş
 * yollarının üçü de e-posta sahipliğini kanıtladığı için yükseltme burada
 * ortaklandı. isActive'e dokunulmuyor — yönetici kapattıysa kapalı kalmalı.
 */
export async function promoteGuestToMember(
  user: { id: string; isGuest: boolean; emailVerifiedAt: Date | null },
): Promise<boolean> {
  if (!user.isGuest) return false;
  await prisma.user.update({
    where: { id: user.id },
    data: { isGuest: false, emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
  });
  logger.info('Misafir hesabı üyeliğe yükseltildi', { userId: user.id });
  return true;
}

// ─── Misafir hesabı aktivasyonu ───────────────────────────────────────────────

/**
 * Misafir olarak sipariş vermiş kullanıcı bir şifre belirleyerek
 * gerçek üyeye dönüşür. isGuest=false yapılır ve oturum açılır.
 *
 * Güvenlik: yalnızca oturum açmış misafir kullanıcı çağırabilir (authenticate middleware).
 */
export async function activateGuest(userId: string, newPassword: string): Promise<TokenPair & { user: object }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user) throw new AppError('Kullanıcı bulunamadı', 404);
  if (!user.isGuest) throw new AppError('Bu hesap zaten aktif bir üyelik hesabıdır.', 400);
  // Şifreyi ezmiyoruz: mevcut şifreyi bilmeden değiştirmek, oturum çalınması
  // hâlinde hesabı devretmek olurdu (changePassword bu yüzden mevcut şifreyi
  // ister). Giriş yapmak zaten üyeliğe yükseltiyor, kullanıcıyı oraya yönlendir.
  if (user.passwordHash) {
    throw new AppError(
      'Bu hesapta şifre sıfırlama ile bir şifre belirlenmiş. Çıkış yapıp e-posta ve şifrenizle giriş yapın; üyeliğiniz otomatik aktifleşecek.',
      400,
    );
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashed,
      isGuest: false,
      isActive: true,
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      termsAcceptedAt: user.termsAcceptedAt ?? new Date(),
    },
    include: { profile: true },
  });

  const accessToken = signAccess(updated.id, updated.email, updated.role);
  const refreshToken = signRefresh(updated.id);
  await storeRefreshToken(updated.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      isGuest: false,
      profile: {
        firstName: updated.profile?.firstName,
        lastName: updated.profile?.lastName,
        phone: updated.profile?.phone,
        avatarUrl: updated.profile?.avatarUrl,
      },
    },
  };
}

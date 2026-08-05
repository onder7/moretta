import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { prisma } from '../config/database';
import { AppError } from '../types';
import { getStoreName } from './settingsService';

export async function generateMFASecret(email: string) {
  const storeName = await getStoreName();
  const secret = speakeasy.generateSecret({
    name: `${storeName} (${email})`,
    issuer: storeName,
    length: 32,
  });

  // QR code oluştur
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

  // Yedek kodlar oluştur (10 adet)
  const backupCodes = Array.from({ length: 10 }, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase()
  );

  return {
    secret: secret.base32,
    qrCode: qrCodeUrl,
    backupCodes,
  };
}

export async function verifyMFAToken(secret: string, token: string): Promise<boolean> {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // ±2 time steps tolerans
  });
}

export async function enableMFA(userId: string, secret: string, backupCodes: string[]) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: true,
      mfaSecret: secret,
      backupCodes,
    },
  });
}

export async function disableMFA(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      backupCodes: [],
    },
  });
}

export async function verifyMFALogin(
  userId: string,
  token: string
): Promise<{ success: boolean; backupCodeUsed?: boolean }> {
  const user = await prisma.user.findUnique({ where: { id: userId } }) as any;

  if (!user || (!user.mfaEnabled && !user.mfa_enabled) || (!user.mfaSecret && !user.mfa_secret)) {
    throw new AppError('MFA etkinleştirilmemiş', 400);
  }

  const secret = user.mfaSecret || user.mfa_secret;

  // Normal TOTP token kontrol et
  const isValidToken = await verifyMFAToken(secret, token);
  if (isValidToken) {
    return { success: true };
  }

  // Yedek kod kontrol et
  const backupCodes = user.backupCodes || user.backup_codes || [];
  const backupCodeIndex = backupCodes.indexOf(token);
  if (backupCodeIndex !== -1) {
    // Kullanılan yedek kodu sil
    const newBackupCodes = backupCodes.filter((_: any, i: number) => i !== backupCodeIndex);
    await prisma.user.update({
      where: { id: userId },
      data: { backupCodes: newBackupCodes },
    });
    return { success: true, backupCodeUsed: true };
  }

  return { success: false };
}

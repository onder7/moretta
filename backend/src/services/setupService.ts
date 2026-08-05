import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { AppError } from '../types';
import { updateSettingsGroup } from './settingsService';
import { seedDefaultRulesIfEmpty } from './chatbotService';
import { seedDefaultPagesIfEmpty } from './pageService';

// ─── İlk Kurulum Sihirbazı ────────────────────────────────────────────────────
// Altyapı (DATABASE_URL, REDIS_URL, JWT_SECRET) uygulama açılmadan gerektiği için
// .env / deploy.sh'da kalır. Bu sihirbaz yalnızca uygulama seviyesi ayarları
// (admin hesabı, mağaza bilgisi, e-posta) tek seferde kaydeder.

export interface SetupInput {
  admin: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  };
  store: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  email?: {
    provider: 'smtp' | 'brevo' | 'none';
    smtp?: { host: string; port?: string; user?: string; pass?: string; from?: string; fromName?: string };
    brevo?: { apiKey: string; senderEmail?: string; senderName?: string };
  };
}

// Kurulum tamamlandı mı? Tek doğruluk kaynağı: en az bir ADMIN kullanıcısı var mı.
// Bu sayede mevcut kurulumlar (zaten admin'i olanlar) sihirbazı asla görmez.
export async function isSetupCompleted(): Promise<boolean> {
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  return adminCount > 0;
}

export async function completeSetup(input: SetupInput): Promise<{ email: string }> {
  // Güvenlik: kurulum tamamlandıysa (admin varsa) bu endpoint kilitlidir —
  // aksi halde herkes yeni admin oluşturabilirdi.
  if (await isSetupCompleted()) {
    throw new AppError('Kurulum zaten tamamlanmış', 409);
  }

  const email = input.admin.email.trim().toLowerCase();
  if (!email || !input.admin.password) {
    throw new AppError('Admin e-posta ve şifre gerekli', 400);
  }
  if (input.admin.password.length < 8) {
    throw new AppError('Admin şifresi en az 8 karakter olmalı', 400);
  }
  if (!input.store.name?.trim()) {
    throw new AppError('Mağaza adı gerekli', 400);
  }

  // E-posta zaten kayıtlı mı (ör. müşteri olarak)? — admin'e yükselt değil, reddet
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Bu e-posta adresi zaten kayıtlı', 409);
  }

  const passwordHash = await bcrypt.hash(input.admin.password, 12);

  // 1) Admin kullanıcısını oluştur
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      profile: {
        create: {
          firstName: input.admin.firstName?.trim() || 'Admin',
          lastName: input.admin.lastName?.trim() || '',
        },
      },
    },
  });

  // 2) Mağaza bilgisi (general_ — panel ve frontend bunları okuyor)
  await updateSettingsGroup('general_', {
    store_name: input.store.name.trim(),
    ...(input.store.email ? { email: input.store.email.trim() } : {}),
    ...(input.store.phone ? { phone: input.store.phone.trim() } : {}),
    ...(input.store.address ? { address: input.store.address.trim() } : {}),
  });

  // 3) E-posta (opsiyonel) — emailService env yoksa notif_ ayarlarına düşüyor
  if (input.email && input.email.provider === 'smtp' && input.email.smtp?.host) {
    const s = input.email.smtp;
    await updateSettingsGroup('notif_', {
      smtp_host: s.host.trim(),
      smtp_port: s.port?.trim() || '587',
      smtp_user: s.user?.trim() || '',
      smtp_pass: s.pass || '',
      smtp_from: s.from?.trim() || '',
      smtp_from_name: s.fromName?.trim() || '',
    });
  } else if (input.email && input.email.provider === 'brevo' && input.email.brevo?.apiKey) {
    const b = input.email.brevo;
    await updateSettingsGroup('notif_', {
      brevo_api_key: b.apiKey.trim(),
      brevo_sender_email: b.senderEmail?.trim() || '',
      brevo_sender_name: b.senderName?.trim() || '',
    });
  }

  // 4) Varsayılan asistan (chatbot) kurallarını ve statik sayfaları ekle — admin sonradan düzenleyebilir
  await seedDefaultRulesIfEmpty();
  await seedDefaultPagesIfEmpty();

  // 5) İşaretle (admin varlığı asıl kapı olsa da niyet kaydı için)
  await updateSettingsGroup('setup_', { completed: 'true', completed_at: new Date().toISOString() });

  return { email };
}

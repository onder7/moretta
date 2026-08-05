import { prisma } from '../config/database';
import { AppError } from '../types';
import { env } from '../config/env';

/**
 * Google Sign-In Client ID — önce .env (GOOGLE_CLIENT_ID), yoksa admin panel (oauth_googleClientId).
 * Public bir değerdir; hem token doğrulamada hem de public config endpoint'inde kullanılır.
 */
export async function getGoogleClientId(): Promise<string> {
  if (env.GOOGLE_CLIENT_ID) return env.GOOGLE_CLIENT_ID;
  try {
    const row = await prisma.siteSettings.findUnique({ where: { key: 'oauth_googleClientId' } });
    return row?.value?.trim() || '';
  } catch {
    return '';
  }
}

export interface ShippingConfig {
  shippingFee: number;
  freeShippingThreshold: number;
}

export interface TaxConfig {
  taxRate: number;
}

const DEFAULTS: ShippingConfig = {
  shippingFee: 49.9,
  freeShippingThreshold: 500,
};

const TAX_DEFAULTS: TaxConfig = {
  taxRate: 20,
};

export async function getShippingConfig(): Promise<ShippingConfig> {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { in: ['shipping_fee', 'free_shipping_threshold'] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    shippingFee: map['shipping_fee'] !== undefined
      ? Number(map['shipping_fee'])
      : DEFAULTS.shippingFee,
    freeShippingThreshold: map['free_shipping_threshold'] !== undefined
      ? Number(map['free_shipping_threshold'])
      : DEFAULTS.freeShippingThreshold,
  };
}

export async function updateShippingConfig(fee: number, threshold: number): Promise<ShippingConfig> {
  await prisma.$transaction([
    prisma.siteSettings.upsert({
      where: { key: 'shipping_fee' },
      update: { value: String(fee) },
      create: { key: 'shipping_fee', value: String(fee) },
    }),
    prisma.siteSettings.upsert({
      where: { key: 'free_shipping_threshold' },
      update: { value: String(threshold) },
      create: { key: 'free_shipping_threshold', value: String(threshold) },
    }),
  ]);
  return { shippingFee: fee, freeShippingThreshold: threshold };
}

export function computeShipping(subtotal: number, config: ShippingConfig): number {
  return subtotal >= config.freeShippingThreshold ? 0 : config.shippingFee;
}

export async function getTaxConfig(): Promise<TaxConfig> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: 'tax_rate' },
  });
  return {
    taxRate: row ? Number(row.value) : TAX_DEFAULTS.taxRate,
  };
}

export async function updateTaxConfig(taxRate: number): Promise<TaxConfig> {
  await prisma.siteSettings.upsert({
    where: { key: 'tax_rate' },
    update: { value: String(taxRate) },
    create: { key: 'tax_rate', value: String(taxRate) },
  });
  return { taxRate };
}

// ─── Mağaza Kimliği ───────────────────────────────────────────────────────────
// Marka adı kodda sabit yazılmaz; kurulumda/ayarlarda girilen değerden gelir.

export async function getStoreName(): Promise<string> {
  try {
    const row = await prisma.siteSettings.findUnique({ where: { key: 'general_store_name' } });
    return row?.value?.trim() || 'Mağaza';
  } catch {
    return 'Mağaza';
  }
}

export async function getStoreIdentity(): Promise<{ name: string; legalName: string; email: string }> {
  try {
    const rows = await prisma.siteSettings.findMany({
      where: { key: { in: ['general_store_name', 'general_legal_name', 'general_email'] } },
    });
    const m = Object.fromEntries(rows.map((r) => [r.key.slice('general_'.length), r.value]));
    const name = m.store_name?.trim() || 'Mağaza';
    return {
      name,
      legalName: m.legal_name?.trim() || name,
      email: m.email?.trim() || 'info@example.com',
    };
  } catch {
    return { name: 'Mağaza', legalName: 'Mağaza', email: 'info@example.com' };
  }
}

/** Manuel/offline satışta üretilen placeholder e-posta (…@manuel.local) mi? */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && /@manuel\.local$/i.test(email.trim());
}

/**
 * Müşteriye e-posta gönderilecek gerçek adresi çözer. Manuel satış placeholder'ı
 * (…@manuel.local) ise, teslim edilemeyeceği için mağaza e-postasına (general_email)
 * yönlendirir. Aksi halde adresi olduğu gibi döner.
 */
export async function resolveContactEmail(rawEmail: string): Promise<string> {
  if (!isPlaceholderEmail(rawEmail)) return rawEmail;
  const { email } = await getStoreIdentity();
  return email || rawEmail;
}

// ─── Generic Key-Value Settings ───────────────────────────────────────────────

export async function getSettingsGroup(prefix: string): Promise<Record<string, string>> {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { startsWith: prefix } },
  });
  return Object.fromEntries(rows.map((r) => [r.key.slice(prefix.length), r.value]));
}

export async function updateSettingsGroup(
  prefix: string,
  data: Record<string, string>,
): Promise<void> {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  await prisma.$transaction(
    entries.map(([k, v]) =>
      prisma.siteSettings.upsert({
        where:  { key: prefix + k },
        update: { value: v },
        create: { key: prefix + k, value: v },
      }),
    ),
  );
}

// ─── OAuth Settings ───────────────────────────────────────────────────────────

export interface OAuthSettings {
  googleClientId?: string;
  facebookAppId?: string;
  instagramAppId?: string;
}

export async function getOAuthSettings(): Promise<OAuthSettings> {
  return getSettingsGroup('oauth:') as Promise<OAuthSettings>;
}

export async function updateOAuthSettings(data: OAuthSettings): Promise<OAuthSettings> {
  const normalizedData: Record<string, string> = {};
  if (data.googleClientId !== undefined) normalizedData['googleClientId'] = data.googleClientId;
  if (data.facebookAppId !== undefined) normalizedData['facebookAppId'] = data.facebookAppId;
  if (data.instagramAppId !== undefined) normalizedData['instagramAppId'] = data.instagramAppId;

  await updateSettingsGroup('oauth:', normalizedData);
  return getOAuthSettings();
}

// ─── Team Management ──────────────────────────────────────────────────────────

const SUB_ROLE_PREFIX = 'team_subrole_';

export async function listAdminUsers() {
  const [admins, subRoleRows] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.siteSettings.findMany({ where: { key: { startsWith: SUB_ROLE_PREFIX } } }),
  ]);

  const subRoleMap = Object.fromEntries(
    subRoleRows.map((r) => [r.key.slice(SUB_ROLE_PREFIX.length), r.value]),
  );

  return admins.map((u) => ({
    ...u,
    subRole: subRoleMap[u.id] ?? 'SUPER_ADMIN',
  }));
}

export async function updateTeamMember(
  userId: string,
  data: { subRole?: string; isActive?: boolean },
  requesterId?: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Kullanıcı bulunamadı', 404);
  if (user.role !== 'ADMIN') throw new AppError('Bu kullanıcı bir ekip üyesi (yönetici) değil', 400);

  // Kilitlenmeyi (lockout) önle: kendini ve son aktif yöneticiyi pasifleştirme
  if (data.isActive === false) {
    if (requesterId && userId === requesterId) {
      throw new AppError('Kendi hesabınızı pasifleştiremezsiniz', 400);
    }
    if (user.isActive) {
      const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
      if (activeAdmins <= 1) {
        throw new AppError('Son aktif yöneticiyi pasifleştiremezsiniz', 400);
      }
    }
  }

  await Promise.all([
    data.isActive !== undefined
      ? prisma.user.update({ where: { id: userId }, data: { isActive: data.isActive } })
      : Promise.resolve(),
    data.subRole !== undefined
      ? prisma.siteSettings.upsert({
          where: { key: SUB_ROLE_PREFIX + userId },
          update: { value: data.subRole },
          create: { key: SUB_ROLE_PREFIX + userId, value: data.subRole },
        })
      : Promise.resolve(),
  ]);
}

export async function inviteAdminUser(email: string, subRole: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Bu e-posta ile kayıtlı kullanıcı bulunamadı', 404);
  if (user.role === 'ADMIN') throw new AppError('Bu kullanıcı zaten admin', 409);

  await Promise.all([
    prisma.user.update({ where: { email }, data: { role: 'ADMIN' } }),
    prisma.siteSettings.upsert({
      where: { key: SUB_ROLE_PREFIX + user.id },
      update: { value: subRole },
      create: { key: SUB_ROLE_PREFIX + user.id, value: subRole },
    }),
  ]);

  return { ...user, role: 'ADMIN', subRole };
}

export async function removeAdminUser(userId: string, requesterId: string) {
  if (userId === requesterId) throw new AppError('Kendi hesabınızı düşüremezsiniz', 400);
  await prisma.user.update({ where: { id: userId }, data: { role: 'CUSTOMER' } });
}

// ─── Payment Methods ──────────────────────────────────────────────────────────

export interface PaymentMethodsConfig {
  card:   { enabled: boolean };
  cod:    { enabled: boolean; fee: number };
  havale: { enabled: boolean; bankName: string; iban: string; accountName: string; description: string };
}

export async function getPaymentMethods(): Promise<PaymentMethodsConfig> {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { startsWith: 'payment_' } },
  });
  const m = Object.fromEntries(rows.map((r) => [r.key.slice('payment_'.length), r.value]));

  return {
    card: {
      enabled: m['iyzico_enabled'] === 'true' || m['paytr_enabled'] === 'true',
    },
    cod: {
      enabled: m['cod_enabled'] === 'true',
      fee: m['cod_fee'] ? Number(m['cod_fee']) : 0,
    },
    havale: {
      enabled: m['havale_enabled'] === 'true',
      bankName:    m['havale_bank_name']    ?? '',
      iban:        m['havale_iban']         ?? '',
      accountName: m['havale_account_name'] ?? '',
      description: m['havale_description']  ?? '',
    },
  };
}

// ─── Maintenance Mode Settings ───────────────────────────────────────────────

export interface MaintenanceConfig {
  isActive: boolean;
  message: string;
}

export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { in: ['maintenance_mode', 'maintenance_message'] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    isActive: map['maintenance_mode'] === 'true',
    message: map['maintenance_message'] ?? 'Sistemimizde güncelleme yapılmaktadır, kısa süre sonra görüşmek üzere!',
  };
}

export async function updateMaintenanceConfig(isActive: boolean, message: string): Promise<MaintenanceConfig> {
  await prisma.$transaction([
    prisma.siteSettings.upsert({
      where: { key: 'maintenance_mode' },
      update: { value: String(isActive) },
      create: { key: 'maintenance_mode', value: String(isActive) },
    }),
    prisma.siteSettings.upsert({
      where: { key: 'maintenance_message' },
      update: { value: message },
      create: { key: 'maintenance_message', value: message },
    }),
  ]);
  return { isActive, message };
}


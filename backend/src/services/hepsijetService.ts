import { logger } from '../config/logger';
import { getSettingsGroup } from './settingsService';

// ─────────────────────────────────────────────────────────────────────────────
// HepsiJET RETAIL TR entegrasyonu — düşük seviye API istemcisi.
//
// Kimlik bilgileri Admin > Ayarlar > Kargo sekmesinden (SiteSettings, "shipping_"
// öneki) okunur. Token 60 dakika geçerlidir; süre dolmadan önce yeniden alınır.
// ─────────────────────────────────────────────────────────────────────────────

// Not: Postman dokumaninda test adresi "integrationapitest" (tiresiz) yaziyor,
// dogrusu tireli olani — tiresiz olan DNS'te hic yok.
const TEST_URL = 'https://integration-apitest.hepsijet.com';
const PROD_URL = 'https://integration.hepsijet.com';

export interface HepsijetConfig {
  enabled: boolean;
  baseUrl: string;
  mode: 'test' | 'prod';
  username: string;
  password: string;
  companyName: string;
  companyCode: string;      // company.abbreviationCode
  deliveryPrefix: string;   // customerDeliveryNo'nun ilk 3 hanesi
  xdockCode: string;        // currentXDock.abbreviationCode
  senderAddressId: string;  // senderAddress.companyAddressId (HepsiJET verir)
  senderCity: string;
  senderTown: string;
  senderDistrict: string;
  senderAddressLine: string;
  productCode: string;      // HX_STD | HX_SD | HX_ND | HJ_DT
  returnProductCode: string; // iade gönderisinin ürün kodu (genelde giden ile aynı)
  defaultDesi: string;
}

/** Ayarlardan HepsiJET yapılandırmasını okur. */
export async function getConfig(): Promise<HepsijetConfig> {
  const s = await getSettingsGroup('shipping_');
  const mode = s.hepsijet_mode === 'prod' ? 'prod' : 'test';
  return {
    enabled: s.hepsijet_enabled === 'true',
    baseUrl: mode === 'prod' ? PROD_URL : TEST_URL,
    mode,
    username: s.hepsijet_username ?? '',
    password: s.hepsijet_password ?? '',
    companyName: s.hepsijet_company_name ?? '',
    companyCode: s.hepsijet_company_code ?? '',
    deliveryPrefix: s.hepsijet_delivery_prefix ?? '',
    xdockCode: s.hepsijet_xdock ?? '',
    senderAddressId: s.hepsijet_sender_address_id ?? '',
    senderCity: s.hepsijet_sender_city ?? '',
    senderTown: s.hepsijet_sender_town ?? '',
    senderDistrict: s.hepsijet_sender_district ?? '',
    senderAddressLine: s.hepsijet_sender_address ?? '',
    productCode: s.hepsijet_product_code || 'HX_STD',
    returnProductCode: s.hepsijet_return_product_code || s.hepsijet_product_code || 'HX_STD',
    defaultDesi: s.hepsijet_default_desi || '4',
  };
}

/** Gönderi oluşturmak için zorunlu alanların dolu olduğunu doğrular. */
export function assertConfigured(cfg: HepsijetConfig): void {
  if (!cfg.enabled) {
    throw Object.assign(new Error('HepsiJET entegrasyonu kapalı. Ayarlar > Kargo bölümünden etkinleştirin.'), { status: 400 });
  }
  const missing: string[] = [];
  if (!cfg.username) missing.push('kullanıcı adı');
  if (!cfg.password) missing.push('şifre');
  if (!cfg.companyName) missing.push('firma adı');
  if (!cfg.companyCode) missing.push('firma kodu');
  if (!cfg.deliveryPrefix) missing.push('gönderi no öneki');
  if (!cfg.xdockCode) missing.push('XDock kodu');
  if (!cfg.senderAddressId) missing.push('gönderici adres ID');
  if (!cfg.senderCity) missing.push('gönderici il');
  if (!cfg.senderTown) missing.push('gönderici ilçe');
  if (!cfg.senderAddressLine) missing.push('gönderici açık adres');
  if (missing.length) {
    throw Object.assign(
      new Error(`HepsiJET ayarları eksik: ${missing.join(', ')}. Ayarlar > Kargo bölümünden tamamlayın.`),
      { status: 400 },
    );
  }
}

// ─── Token yönetimi ──────────────────────────────────────────────────────────

interface TokenCache {
  key: string;      // mode + username — ayar değişince cache geçersiz olur
  token: string;
  expiresAt: number;
  xdock?: string;
  company?: string;
}

let cached: TokenCache | null = null;

function baseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Origin': 'integration',
    'X-ClientId': 'hjintegration',
  };
}

/**
 * fetch'in ham ağ hatalarını ("fetch failed") anlaşılır mesaja çevirir.
 * DNS/bağlantı sorunlarını yapılandırma hatalarından ayırt edebilmek için.
 */
async function safeFetch(cfg: HepsijetConfig, url: string, init: RequestInit): Promise<globalThis.Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const cause = (err as { cause?: { code?: string; message?: string } })?.cause;
    const host = (() => { try { return new URL(cfg.baseUrl).hostname; } catch { return cfg.baseUrl; } })();
    const envLabel = cfg.mode === 'test' ? 'Test' : 'Canlı';

    if (cause?.code === 'ENOTFOUND' || cause?.code === 'EAI_AGAIN') {
      throw new Error(
        `${envLabel} sunucusuna ulaşılamıyor: "${host}" adresi DNS'te çözülemiyor. ` +
        `Adres HepsiJET tarafından kapatılmış veya değiştirilmiş olabilir; test ortamı erişimi için HepsiJET'e başvurun.`,
      );
    }
    if (cause?.code === 'ECONNREFUSED' || cause?.code === 'ECONNRESET' || cause?.code === 'ETIMEDOUT') {
      throw new Error(
        `${envLabel} sunucusuna bağlanılamadı ("${host}", ${cause.code}). ` +
        `Sunucu erişime kapalı olabilir veya IP adresinizin yetkilendirilmesi gerekebilir.`,
      );
    }
    throw new Error(`HepsiJET bağlantı hatası ("${host}"): ${cause?.message ?? (err as Error).message}`);
  }
}

async function login(cfg: HepsijetConfig): Promise<TokenCache> {
  const res = await safeFetch(cfg, `${cfg.baseUrl}/auth/token`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({ username: cfg.username, password: cfg.password }),
  });
  const data = (await res.json().catch(() => null)) as any;
  const token = data?.data?.token;
  if (!res.ok || !token) {
    const msg = data?.message ?? data?.errorMessage ?? `HTTP ${res.status}`;
    throw Object.assign(new Error(`HepsiJET kimlik doğrulama hatası: ${msg}`), { status: 400 });
  }
  logger.info('HepsiJET token alındı', { mode: cfg.mode, xdock: data.data?.xdock?.abbreviationCode });
  return {
    key: `${cfg.mode}:${cfg.username}`,
    token,
    // Token 60 dk geçerli; 5 dk pay bırakıyoruz.
    expiresAt: Date.now() + 55 * 60 * 1000,
    xdock: data.data?.xdock?.abbreviationCode,
    company: data.data?.company?.abbreviationCode,
  };
}

async function ensureToken(cfg: HepsijetConfig): Promise<string> {
  const key = `${cfg.mode}:${cfg.username}`;
  if (cached && cached.key === key && Date.now() < cached.expiresAt) {
    return cached.token;
  }
  cached = await login(cfg);
  return cached.token;
}

/** Token cache'ini temizler (ayarlar değiştiğinde çağrılır). */
export function invalidateToken(): void {
  cached = null;
}

async function request<T>(
  cfg: HepsijetConfig,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await ensureToken(cfg);
  const res = await safeFetch(cfg, `${cfg.baseUrl}${path}`, {
    method,
    headers: { ...baseHeaders(), 'X-Auth-Token': token },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`HepsiJET geçersiz yanıt (${res.status}): ${text.slice(0, 300)}`);
  }
  // HepsiJET'in mesajı admin panelinde görünsün diye hatalara status iliştiriyoruz;
  // status taşımayan hatalar errorHandler'da generic "Sunucu hatası"na düşüyor.
  if (!res.ok) {
    const msg = data?.message ?? data?.errorMessage ?? text.slice(0, 300);
    throw Object.assign(new Error(`HepsiJET API ${res.status}: ${msg}`), {
      status: res.status < 500 ? 400 : 502,
    });
  }
  // HepsiJET HTTP 200 ile de hata dönebiliyor: { status: "ERROR", message: "..." }
  if (data?.status && data.status !== 'OK' && data.status !== 'SUCCESS') {
    throw Object.assign(
      new Error(`HepsiJET: ${data.message ?? data.errorMessage ?? data.status}`),
      { status: 400 },
    );
  }
  return data as T;
}

// ─── Tipler ──────────────────────────────────────────────────────────────────

export interface HjAddress {
  companyAddressId: string;
  country: { name: string };
  city: { name: string };
  town: { name: string };
  district: { name: string };
  addressLine1: string;
}

export interface HjDeliveryOrder {
  company: { name: string; abbreviationCode: string };
  delivery: {
    customerDeliveryNo: string;
    customerOrderId: string;
    totalParcels: string;
    desi: string;
    deliverySlotOriginal: string;
    deliveryDateOriginal: string;
    deliveryType: string;
    product: { productCode: string };
    senderAddress: HjAddress;
    receiver: {
      companyCustomerId: string;
      firstName: string;
      lastName: string;
      phone1: string;
      phone2: string;
      email: string;
    };
    recipientAddress: HjAddress;
    recipientPerson: string;
    recipientPersonPhone1: string;
  };
  currentXDock: { abbreviationCode: string };
}

/** zplBarcodeDTOList elemanı — gönderi başına bir barkod/etiket. */
export interface HjZplBarcode {
  barcodeNo?: string;    // HepsiJET barkodu (customerDeliveryNo ile aynı geliyor)
  zplBarcode?: string;   // ZPL etiket verisi
  trackingUrl?: string;
  [k: string]: unknown;
}

export interface HjEnhancedResponse {
  status: string;
  data?: {
    customerDeliveryNo?: string;
    zplBarcodeDTOList?: HjZplBarcode[];
    [k: string]: unknown;
  };
}

export interface HjShipmentOutcome {
  trackingNumber: string | null;
  barcodeData: string | null;
  trackingUrl: string | null;
}

/**
 * sendDeliveryOrderEnhanced yanıtından takip no / ZPL etiketi çıkarır.
 *
 * Gerçek yanıt (2026-07-30, test ortamı) barkodu düz `barcodeData` alanında
 * değil `data.zplBarcodeDTOList[0]` içinde döndürüyor.
 */
export function readShipmentOutcome(res: HjEnhancedResponse): HjShipmentOutcome {
  const first = res.data?.zplBarcodeDTOList?.[0];
  return {
    trackingNumber: first?.barcodeNo ?? null,
    barcodeData: first?.zplBarcode ?? null,
    trackingUrl: first?.trackingUrl ?? null,
  };
}

/** Gönderi oluşturur ve ZPL barkodu ile takip numarasını döner. */
export async function sendDeliveryOrderEnhanced(
  cfg: HepsijetConfig,
  order: HjDeliveryOrder,
): Promise<HjEnhancedResponse> {
  return request<HjEnhancedResponse>(cfg, 'POST', '/delivery/sendDeliveryOrderEnhanced', order);
}

export interface HjTrackItem {
  barcode: string;
  trackingUrl?: string;
  [k: string]: unknown;
}

/** customerDeliveryNo (barkod) ile gönderi takip bilgisini sorgular. */
export async function queryTracking(cfg: HepsijetConfig, barcodes: string[]): Promise<HjTrackItem[]> {
  const res = await request<{ status: string; data?: HjTrackItem[] }>(
    cfg,
    'POST',
    '/delivery/integration/track',
    { barcodes },
  );
  return res.data ?? [];
}

/** Uygun teslim/iade tarihlerini sorgular. */
export async function findAvailableDeliveryDates(
  cfg: HepsijetConfig,
  params: { startDate: string; endDate: string; deliveryType: string; city: string; town: string },
): Promise<unknown> {
  const qs = new URLSearchParams(params).toString();
  return request(cfg, 'GET', `/delivery/findAvailableDeliveryDatesV2?${qs}`);
}

/** Bağlantı testi — sadece token alır. */
export async function ping(): Promise<{ ok: boolean; mode: string; xdock?: string; company?: string; message?: string }> {
  const cfg = await getConfig();
  if (!cfg.username || !cfg.password) {
    return { ok: false, mode: cfg.mode, message: 'Kullanıcı adı / şifre girilmemiş' };
  }
  try {
    invalidateToken();
    await ensureToken(cfg);
    return { ok: true, mode: cfg.mode, xdock: cached?.xdock, company: cached?.company };
  } catch (err) {
    return { ok: false, mode: cfg.mode, message: err instanceof Error ? err.message : 'Bilinmeyen hata' };
  }
}

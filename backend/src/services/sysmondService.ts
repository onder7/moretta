import { logger } from '../config/logger';

const BASE_URL = (process.env.SYSMOND_API_URL ?? 'https://integration-test.sysmond.com.tr/api').replace(/\/$/, '');

interface TokenCache {
  accessToken: string;
  expiration: Date;
  refreshToken: string;
}

let cached: TokenCache | null = null;

async function login(): Promise<TokenCache> {
  const res = await fetch(`${BASE_URL}/IntegrationKullanici/Login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userName: process.env.SYSMOND_USERNAME ?? 'SysmondWS',
      password: process.env.SYSMOND_PASSWORD ?? 'SysmondWS',
    }),
  });
  const data = (await res.json()) as any;
  if (!data.status || !data.jwtToken?.accessToken) {
    throw new Error(`Sysmond login hatası: ${data.message ?? 'bilinmeyen hata'}`);
  }
  logger.info('Sysmond token alındı');
  return {
    accessToken: data.jwtToken.accessToken,
    expiration: new Date(data.jwtToken.expiration),
    refreshToken: data.refreshToken ?? '',
  };
}

async function ensureToken(): Promise<string> {
  if (cached && new Date() < new Date(cached.expiration.getTime() - 60_000)) {
    return cached.accessToken;
  }
  if (cached?.refreshToken) {
    try {
      const res = await fetch(`${BASE_URL}/IntegrationKullanici/RefreshToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: cached.refreshToken }),
      });
      const data = (await res.json()) as any;
      if (data.status && data.jwtToken?.accessToken) {
        cached = {
          accessToken: data.jwtToken.accessToken,
          expiration: new Date(data.jwtToken.expiration),
          refreshToken: data.refreshToken ?? cached.refreshToken,
        };
        return cached.accessToken;
      }
    } catch {
      // refresh başarısız — tam login
    }
  }
  cached = await login();
  return cached.accessToken;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await ensureToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Sysmond API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Tipler ──────────────────────────────────────────────────────────────────

export interface FaturaLineTax {
  taxName: string;  // "KDV"
  taxCode: string;  // "0015"
  taxRate: number;
  taxAmount: number;
}

export interface FaturaLineItem {
  productName: string;
  quantity: number;
  unitCode: string;   // C62 = adet
  unitPrice: number;  // NET (KDV hariç)
  vatRate: number;    // örn. 20
  malHizmetKaydet: boolean;
  tax: FaturaLineTax[];
}

export interface FaturaItem {
  profile: string;      // TEMELFATURA | EARSIVFATURA
  invoiceType: string;  // SATIS
  ettn: string;         // UUID — biz üretiriz
  docDate: string;      // ISO 8601 (örn. "2026-07-07T00:00:00")
  docNo?: string;       // prefix veya docNo'dan biri zorunlu
  prefix?: string;      // Sysmond portalde tanımlı seri öneki (örn. "MAB")
  currencyCode: string; // TRY
  isDraft: boolean;
  senderType?: string;  // e-Arşiv için: ELEKTRONIK
  pkAlias?: string;     // e-Fatura için: alıcının GİB posta kutusu etiketi (urn:mail:...)
  invoiceAccount?: {
    vknTckn?: string;
    accountName?: string;
    taxOfficeName?: string;
    countryName?: string;
    cityName?: string;
    citySubdivision?: string; // ilçe — zorunlu
    streetName?: string;
    postalCode?: string;
    telephone?: string;
    email?: string;
  };
  invoiceDetail: FaturaLineItem[];
  notes?: string[];
  isCalculateByApi: boolean;
  refNo: string; // UUID — bizim iç referansımız
}

export interface CreateItemResult {
  status: boolean;
  message?: string;
  exceptionMessage?: string;
  ettn?: string;
  documentNo?: string;
  refNo?: string;
}

export interface CreateResponse {
  status: boolean;
  message?: string;
  exceptionMessage?: string;
  data?: CreateItemResult[];
  errorList?: string[];
}

export interface StatusItem {
  ettn?: string;
  docNo?: string;
  refNo?: string;
  status?: string;
  description?: string;
  gibStatus?: string;
  gibStatusMessage?: string;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function createInvoice(itemDto: FaturaItem[]): Promise<CreateResponse> {
  return apiPost<CreateResponse>('/IntegrationGidenFatura/Create', { itemDto });
}

/**
 * Taslak (isDraft:true) olarak oluşturulmuş faturaları GİB'e gönderir.
 * Create'ten dönen ETTN(ler) ile çağrılır; Sysmond belgeyi GİB'e iletir.
 * Yanıt gövdesi Create ile aynı şekildedir (status + data[].status/documentNo).
 */
export async function sendToGib(ettnList: string[]): Promise<CreateResponse> {
  return apiPost<CreateResponse>('/IntegrationGidenFatura/SendInvoice', { ettnList });
}

export async function getStatus(ettnList: string[]): Promise<StatusItem[]> {
  const res = await apiPost<{ status: boolean; data?: StatusItem[] }>(
    '/IntegrationGidenFatura/GetOutboxInvoiceStatus',
    { ettnList },
  );
  return res.data ?? [];
}

export async function downloadPdf(ettn: string): Promise<Buffer> {
  const res = await apiPost<{ status: boolean; byteArray?: string; exceptionMessage?: string }>(
    '/IntegrationGidenFatura/DownloadOutboxInvoice',
    { ettnList: [ettn], isDefaultXslt: false },
  );
  if (!res.status || !res.byteArray) {
    throw Object.assign(new Error(res.exceptionMessage ?? 'PDF indirilemedi'), { status: 400 });
  }
  return Buffer.from(res.byteArray, 'base64');
}

export function isConfigured(): boolean {
  return !!(process.env.SYSMOND_USERNAME && process.env.SYSMOND_PASSWORD);
}

export interface CancelResult {
  status: boolean;
  message?: string;
  exceptionMessage?: string;
  data?: Array<{ ettn?: string; status?: boolean; message?: string; exceptionMessage?: string }>;
}

export async function cancelEArsiv(ettnList: string[]): Promise<CancelResult> {
  return apiPost<CancelResult>('/IntegrationGidenFatura/CancelInvoice', { ettnList });
}

interface GibUserDetailItem {
  alias?: string;
  aliasType?: string;
  aliasCreationTime?: string;
  aliasDeletionTime?: string | null;
}

/**
 * VKN/TCKN'nin e-Fatura mükellefi olup olmadığını sorgular.
 * Mükellefse aktif GİB posta kutusu etiketini (alias) döner; değilse null.
 * Tek çağrı hem "mükellef mi" hem "hangi posta kutusu" sorusunu cevaplar.
 */
export async function getEFaturaAlias(identifier: string): Promise<string | null> {
  const res = await apiPost<{ status: boolean; data?: GibUserDetailItem[] }>(
    '/IntegrationGibKullaniciListe/CheckUserDetail',
    { identifier, documentType: 'Invoice' },
  );
  if (!res.status || !res.data?.length) return null;
  // Silinmemiş (aktif) etiketler; birden fazlaysa en son oluşturulan tercih edilir.
  const active = res.data
    .filter((d) => d.alias && !d.aliasDeletionTime)
    .sort((a, b) => (b.aliasCreationTime ?? '').localeCompare(a.aliasCreationTime ?? ''));
  return active[0]?.alias ?? null;
}

export async function ping(): Promise<{ ok: boolean; message: string }> {
  try {
    await ensureToken();
    return { ok: true, message: 'Sysmond bağlantısı başarılı' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

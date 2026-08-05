import crypto from 'crypto';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

// PayTR iFrame API — https://dev.paytr.com/iframe-api
// Ayarlar site_settings tablosunda payment_paytr_* anahtarlarında tutulur.

export interface PaytrConfig {
  enabled: boolean;
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
  testMode: boolean;
}

export async function getPaytrConfig(): Promise<PaytrConfig> {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { startsWith: 'payment_paytr_' } },
  });
  const m = Object.fromEntries(rows.map((r) => [r.key.slice('payment_paytr_'.length), r.value]));
  return {
    enabled: m['enabled'] === 'true',
    merchantId: m['merchant_id'] ?? '',
    merchantKey: m['merchant_key'] ?? '',
    merchantSalt: m['merchant_salt'] ?? '',
    // test_mode ayarı yoksa güvenli varsayılan: TEST modu (canlıya alınca admin'den kapatılır)
    testMode: m['test_mode'] === undefined ? true : m['test_mode'] === 'true',
  };
}

export interface PaytrTokenParams {
  merchantOid: string;
  email: string;
  amountKurus: number;       // ödeme tutarı kuruş cinsinden (TL * 100)
  userName: string;
  userAddress: string;
  userPhone: string;
  userIp: string;
  basket: Array<[string, string, number]>; // [ad, birim fiyat "0.00", adet]
  okUrl: string;
  failUrl: string;
  noInstallment: 0 | 1;      // 1 = taksit kapalı
  maxInstallment: number;    // 0 = PayTR panel varsayılanı
}

export type TokenResult = { ok: true; token: string } | { ok: false; reason: string };

export async function getIframeToken(p: PaytrTokenParams): Promise<TokenResult> {
  const cfg = await getPaytrConfig();
  if (!cfg.merchantId || !cfg.merchantKey || !cfg.merchantSalt) {
    return { ok: false, reason: 'PayTR ayarları eksik (Merchant ID/Key/Salt)' };
  }

  const userBasket = Buffer.from(JSON.stringify(p.basket)).toString('base64');
  const testMode = cfg.testMode ? '1' : '0';
  const currency = 'TL';

  const hashStr =
    `${cfg.merchantId}${p.userIp}${p.merchantOid}${p.email}${p.amountKurus}` +
    `${userBasket}${p.noInstallment}${p.maxInstallment}${currency}${testMode}`;
  const paytrToken = crypto
    .createHmac('sha256', cfg.merchantKey)
    .update(hashStr + cfg.merchantSalt)
    .digest('base64');

  const body = new URLSearchParams({
    merchant_id: cfg.merchantId,
    user_ip: p.userIp,
    merchant_oid: p.merchantOid,
    email: p.email,
    payment_amount: String(p.amountKurus),
    paytr_token: paytrToken,
    user_basket: userBasket,
    debug_on: '1',
    no_installment: String(p.noInstallment),
    max_installment: String(p.maxInstallment),
    user_name: p.userName,
    user_address: p.userAddress,
    user_phone: p.userPhone,
    merchant_ok_url: p.okUrl,
    merchant_fail_url: p.failUrl,
    timeout_limit: '30',
    currency,
    test_mode: testMode,
    lang: 'tr',
  });

  try {
    const res = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      body,
    });
    const data = (await res.json()) as { status: string; token?: string; reason?: string };
    if (data.status === 'success' && data.token) {
      return { ok: true, token: data.token };
    }
    logger.error('PayTR get-token başarısız', { data });
    return { ok: false, reason: data.reason ?? 'PayTR token alınamadı' };
  } catch (err) {
    logger.error('PayTR get-token isteği hatası', { err });
    return { ok: false, reason: 'PayTR bağlantı hatası' };
  }
}

/** PayTR iframe gömme HTML'i — frontend checkoutFormContent olarak enjekte eder. */
export function buildIframeHtml(token: string): string {
  // PayTR iframe'i içeriğe göre boyutlanır. Resizer script'i ASENKRON yüklendiği için
  // iFrameResize'ı script YÜKLENDİKTEN sonra (onload) çağırıyoruz — aksi halde
  // (eski kodda olduğu gibi) iFrameResize henüz tanımsızken çağrılıp resizer hiç
  // çalışmaz, iframe 700px'te sabit kalır ve mobilde taksitlerin altındaki "Öde"
  // butonu kesilir. Resizer yüklenemez/çalışmazsa büyük min-height + iç kaydırma
  // devreye girip butonun yine de erişilebilir olmasını garanti eder.
  return (
    `<iframe src="https://www.paytr.com/odeme/guvenli/${token}" id="paytriframe" ` +
    'frameborder="0" scrolling="no" style="width:100%;min-height:700px;border:none;"></iframe>' +
    '<script>(function(){' +
    "function go(){try{iFrameResize({checkOrigin:false},'#paytriframe');}catch(e){}}" +
    'function grow(){var f=document.getElementById("paytriframe");' +
    'if(f){f.style.minHeight="1400px";f.setAttribute("scrolling","auto");}}' +
    "var s=document.createElement('script');" +
    "s.src='https://www.paytr.com/js/iframeResizer.min.js';" +
    's.onload=go;s.onerror=grow;document.body.appendChild(s);' +
    // Güvenlik ağı: 4 sn sonra iframe hâlâ ~700px ise (resizer sessizce başarısız olduysa) büyüt
    'setTimeout(function(){var f=document.getElementById("paytriframe");' +
    'if(f&&f.offsetHeight<760){grow();}},4000);' +
    '})();</script>'
  );
}

/** Bildirim (callback) hash doğrulaması. */
export function verifyCallbackHash(
  merchantOid: string,
  status: string,
  totalAmount: string,
  hash: string,
  merchantKey: string,
  merchantSalt: string,
): boolean {
  const calc = crypto
    .createHmac('sha256', merchantKey)
    .update(`${merchantOid}${merchantSalt}${status}${totalAmount}`)
    .digest('base64');
  return calc === hash;
}

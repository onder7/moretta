import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { getStoreName, getSettingsGroup } from './settingsService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmtpConfig {
  method: 'smtp';
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
  fromName: string;
}

interface BrevoConfig {
  method: 'brevo';
  apiKey: string;
  senderEmail: string;
  senderName: string;
}

interface NoneConfig {
  method: 'none';
}

type EmailConfig = SmtpConfig | BrevoConfig | NoneConfig;

// ─── Config Resolution (env → DB) ────────────────────────────────────────────

async function resolveEmailConfig(): Promise<EmailConfig> {
  // Marka adı ayarlardan gelir (kurulumda girilen mağaza adı)
  const storeName = await getStoreName();

  // 1. SMTP from env (highest priority)
  if (env.SMTP_HOST) {
    return {
      method: 'smtp',
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.SMTP_FROM ?? 'noreply@example.com',
      fromName: storeName,
    };
  }

  // 2. Brevo from env
  if (env.BREVO_API_KEY) {
    return {
      method: 'brevo',
      apiKey: env.BREVO_API_KEY,
      senderEmail: env.BREVO_SENDER_EMAIL ?? 'noreply@example.com',
      senderName: env.BREVO_SENDER_NAME ?? storeName,
    };
  }

  // 3. SMTP from DB (admin panel settings)
  try {
    const { prisma } = await import('../config/database');
    const rows = await prisma.siteSettings.findMany({
      where: {
        key: {
          in: [
            'notif_smtp_host', 'notif_smtp_port', 'notif_smtp_user',
            'notif_smtp_pass', 'notif_smtp_from_email', 'notif_smtp_from_name',
          ],
        },
      },
    });
    const m = Object.fromEntries(rows.map((r) => [r.key.slice('notif_'.length), r.value]));
    if (m.smtp_host) {
      return {
        method: 'smtp',
        host: m.smtp_host,
        port: Number(m.smtp_port) || 587,
        user: m.smtp_user || undefined,
        pass: m.smtp_pass || undefined,
        from: m.smtp_from_email || 'noreply@example.com',
        fromName: m.smtp_from_name || storeName,
      };
    }

    // 4. Brevo from DB (admin panel settings)
    const brevoRows = await prisma.siteSettings.findMany({
      where: {
        key: {
          in: ['notif_brevo_api_key', 'notif_brevo_sender_email', 'notif_brevo_sender_name'],
        },
      },
    });
    const bm = Object.fromEntries(brevoRows.map((r) => [r.key.slice('notif_'.length), r.value]));
    if (bm.brevo_api_key) {
      return {
        method: 'brevo',
        apiKey: bm.brevo_api_key,
        senderEmail: bm.brevo_sender_email || 'noreply@example.com',
        senderName: bm.brevo_sender_name || storeName,
      };
    }
  } catch (err) {
    logger.warn('Email config DB okunamadı, env değerlerine dönülüyor', { err });
  }

  return { method: 'none' };
}

// ─── Core Send ────────────────────────────────────────────────────────────────

interface MailAttachment {
  filename: string;
  content: Buffer;
}

interface MailPayload {
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}

async function sendViaBrevo(cfg: BrevoConfig, payload: MailPayload): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': cfg.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: cfg.senderName, email: cfg.senderEmail },
      to: [{ email: payload.to }],
      subject: payload.subject,
      htmlContent: payload.html,
      ...(payload.attachments?.length
        ? { attachment: payload.attachments.map((a) => ({ name: a.filename, content: a.content.toString('base64') })) }
        : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API hatası ${res.status}: ${body}`);
  }
}

async function sendMail(payload: MailPayload): Promise<void> {
  const cfg = await resolveEmailConfig();

  if (cfg.method === 'smtp') {
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
    await transport.sendMail({
      from: `"${cfg.fromName}" <${cfg.from}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      attachments: payload.attachments,
    });
    logger.info('Email gönderildi (SMTP)', { to: payload.to, host: cfg.host });
    return;
  }

  if (cfg.method === 'brevo') {
    await sendViaBrevo(cfg, payload);
    logger.info('Email gönderildi (Brevo API)', { to: payload.to });
    return;
  }

  logger.info('Email transport yok — loglandı', { to: payload.to, subject: payload.subject });
}

// ─── Status Helper (for admin controller) ────────────────────────────────────

export async function getEmailStatus(): Promise<{
  method: 'smtp' | 'brevo' | 'none';
  source: 'env' | 'db' | 'none';
  details: Record<string, string | number | boolean>;
}> {
  // Determine source separately so we can report it
  const hasEnvSmtp  = !!env.SMTP_HOST;
  const hasEnvBrevo = !!env.BREVO_API_KEY;

  const cfg = await resolveEmailConfig();

  if (cfg.method === 'smtp') {
    return {
      method: 'smtp',
      source: hasEnvSmtp ? 'env' : 'db',
      details: { host: cfg.host, port: cfg.port, from: cfg.from },
    };
  }
  if (cfg.method === 'brevo') {
    return {
      method: 'brevo',
      source: hasEnvBrevo ? 'env' : 'db',
      details: {
        senderEmail: cfg.senderEmail,
        senderName: cfg.senderName,
        keySet: true,
      },
    };
  }
  return { method: 'none', source: 'none', details: {} };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// {{ad}}, {{siparis_no}} gibi değişkenleri doldurur
function applyVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

// Düz metin şablon gövdesini güvenli HTML kabuğuna sarar
function wrapTemplateHtml(bodyText: string, opts?: { extraHtml?: string }): string {
  const paragraphs = escapeHtml(bodyText)
    .split('\n')
    .map((line) => (line.trim() === '' ? '<div style="height:8px"></div>' : `<p style="margin:0 0 12px;line-height:1.6">${line}</p>`))
    .join('');

  const ordersUrl = `${env.FRONTEND_URL}/hesabim/siparisler`;

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      ${paragraphs}
      ${opts?.extraHtml ?? ''}
      <p style="margin:24px 0">
        <a href="${ordersUrl}"
           style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          Siparişlerimi Görüntüle
        </a>
      </p>
    </div>
  `;
}

// Sipariş durum şablonları — panel boşsa bu varsayılanlar kullanılır
type OrderTemplatePrefix = 'order_received' | 'order_shipped' | 'order_delivered';

const ORDER_TEMPLATE_DEFAULTS: Record<OrderTemplatePrefix, { label: string; subject: string; body: string }> = {
  order_received: {
    label: 'Alındı',
    subject: 'Siparişiniz Alındı — #{{siparis_no}}',
    body: 'Sayın {{ad}},\n\nSiparişiniz (#{{siparis_no}}) başarıyla alındı. Toplam tutar: {{toplam}}.\n\nSiparişinizi hesabınızdan takip edebilirsiniz. Bizi tercih ettiğiniz için teşekkürler!\n\n{{magaza}}',
  },
  order_shipped: {
    label: 'Kargoya Verildi',
    subject: 'Siparişiniz Kargoya Verildi — #{{siparis_no}}',
    body: 'Sayın {{ad}},\n\nSiparişiniz (#{{siparis_no}}) kargoya verildi ve yola çıktı. Kargo durumunu hesabınızdan takip edebilirsiniz.\n\n{{magaza}}',
  },
  order_delivered: {
    label: 'Teslim Edildi',
    subject: 'Siparişiniz Teslim Edildi — #{{siparis_no}}',
    body: 'Sayın {{ad}},\n\nSiparişiniz (#{{siparis_no}}) teslim edildi. Umarız beğenirsiniz!\n\nGörüşlerinizi ürün sayfasından bizimle paylaşabilirsiniz. Bizi tercih ettiğiniz için teşekkürler.\n\n{{magaza}}',
  },
};

interface OrderTemplateVars {
  ad: string;        // müşteri adı
  siparis_no: string;
  toplam?: string;
}

/**
 * Paneldeki düzenlenebilir şablonu (notif_<prefix>_subject/body) okuyup,
 * değişkenleri doldurarak müşteriye e-posta gönderir.
 */
export async function sendOrderTemplateEmail(
  to: string,
  prefix: OrderTemplatePrefix,
  vars: OrderTemplateVars,
  extraHtml?: string,
): Promise<void> {
  const def = ORDER_TEMPLATE_DEFAULTS[prefix];
  const [settings, storeName] = await Promise.all([
    getSettingsGroup('notif_').catch(() => ({} as Record<string, string>)),
    getStoreName(),
  ]);

  const allVars: Record<string, string> = {
    ad: vars.ad?.trim() || 'Müşterimiz',
    siparis_no: vars.siparis_no,
    toplam: vars.toplam ?? '',
    durum: def.label,
    magaza: storeName,
  };

  const subjectTpl = settings[`${prefix}_subject`]?.trim() || def.subject;
  const bodyTpl = settings[`${prefix}_body`]?.trim() || def.body;

  const subject = applyVars(subjectTpl, allVars);
  const html = wrapTemplateHtml(applyVars(bodyTpl, allVars), { extraHtml });

  await sendMail({ to, subject, html });
}

// ─── Admin Uyarıları ──────────────────────────────────────────────────────────

interface AdminAlertSettings {
  recipients: string[];
  newOrder: boolean;
  lowStock: boolean;
  newReview: boolean;
  newQuestion: boolean;
  newReturn: boolean;
}

async function getAdminAlertSettings(): Promise<AdminAlertSettings> {
  const s = await getSettingsGroup('notif_').catch(() => ({} as Record<string, string>));
  const recipients = (s['admin_email'] || '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
  return {
    recipients,
    newOrder: s['new_order_alert'] === 'true',
    lowStock: s['low_stock_alert'] === 'true',
    newReview: s['new_review_alert'] === 'true',
    newQuestion: s['new_question_alert'] === 'true',
    newReturn: s['new_return_alert'] === 'true',
  };
}

function adminShell(title: string, inner: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#2563eb">${escapeHtml(title)}</h2>
      ${inner}
      <p style="color:#9ca3af;font-size:12px;margin-top:24px">Bu otomatik bir yönetici bildirimidir.</p>
    </div>
  `;
}

export async function notifyAdminNewOrder(info: {
  orderId: string;
  customerName: string;
  total: number;
  itemCount: number;
}): Promise<void> {
  const cfg = await getAdminAlertSettings();
  if (!cfg.newOrder || cfg.recipients.length === 0) return;

  const orderRef = info.orderId.slice(-8).toUpperCase();
  const inner = `
    <p>Yeni bir sipariş alındı.</p>
    <table style="border-collapse:collapse;margin-top:8px">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Sipariş No</td><td style="font-weight:bold">#${orderRef}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Müşteri</td><td>${escapeHtml(info.customerName || '—')}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Ürün adedi</td><td>${info.itemCount}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Toplam</td><td style="font-weight:bold">${formatPrice(info.total)}</td></tr>
    </table>
  `;
  await sendMail({
    to: cfg.recipients.join(', '),
    subject: `🛒 Yeni Sipariş — #${orderRef}`,
    html: adminShell('Yeni Sipariş', inner),
  });
}

export async function notifyAdminLowStock(
  items: Array<{ name: string; sku: string; stock: number }>,
): Promise<void> {
  const cfg = await getAdminAlertSettings();
  if (!cfg.lowStock || cfg.recipients.length === 0 || items.length === 0) return;

  const rows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml(i.name)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;color:#6b7280">${escapeHtml(i.sku)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;color:${i.stock <= 0 ? '#dc2626' : '#d97706'}">${i.stock}</td>
        </tr>`,
    )
    .join('');
  const inner = `
    <p>Aşağıdaki ürünlerin stoğu kritik seviyeye indi:</p>
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:6px 12px;text-align:left">Ürün</th>
          <th style="padding:6px 12px;text-align:left">SKU</th>
          <th style="padding:6px 12px;text-align:right">Kalan</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  await sendMail({
    to: cfg.recipients.join(', '),
    subject: `⚠️ Stok Uyarısı — ${items.length} ürün`,
    html: adminShell('Düşük Stok Uyarısı', inner),
  });
}

export async function notifyAdminNewReview(info: {
  productName: string;
  rating: number;
  author: string;
  title?: string;
  body?: string;
}): Promise<void> {
  const cfg = await getAdminAlertSettings();
  if (!cfg.newReview || cfg.recipients.length === 0) return;

  const stars = '★'.repeat(info.rating) + '☆'.repeat(5 - info.rating);
  const inner = `
    <p>Yeni bir ürün değerlendirmesi yapıldı (onay bekliyor).</p>
    <table style="border-collapse:collapse;margin-top:8px">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Ürün</td><td style="font-weight:bold">${escapeHtml(info.productName)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Müşteri</td><td>${escapeHtml(info.author || '—')}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Puan</td><td style="color:#f59e0b">${stars} (${info.rating}/5)</td></tr>
    </table>
    ${info.title ? `<p style="margin-top:12px;font-weight:bold">${escapeHtml(info.title)}</p>` : ''}
    ${info.body ? `<p style="color:#374151">${escapeHtml(info.body)}</p>` : ''}
    <p style="color:#6b7280;font-size:13px;margin-top:12px">Onaylamak için admin panelindeki Değerlendirmeler sayfasını ziyaret edin.</p>
  `;
  await sendMail({
    to: cfg.recipients.join(', '),
    subject: `⭐ Yeni Değerlendirme — ${info.productName}`,
    html: adminShell('Yeni Değerlendirme', inner),
  });
}

export async function notifyAdminNewQuestion(info: {
  productName: string;
  author: string;
  body: string;
}): Promise<void> {
  const cfg = await getAdminAlertSettings();
  if (!cfg.newQuestion || cfg.recipients.length === 0) return;

  const inner = `
    <p>Bir ürüne yeni bir soru soruldu (onay bekliyor).</p>
    <table style="border-collapse:collapse;margin-top:8px">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Ürün</td><td style="font-weight:bold">${escapeHtml(info.productName)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Soran</td><td>${escapeHtml(info.author || '—')}</td></tr>
    </table>
    <p style="margin-top:12px;color:#374151">${escapeHtml(info.body)}</p>
    <p style="color:#6b7280;font-size:13px;margin-top:12px">Yanıtlamak için admin panelindeki Soru-Cevap sayfasını ziyaret edin.</p>
  `;
  await sendMail({
    to: cfg.recipients.join(', '),
    subject: `❓ Yeni Soru — ${info.productName}`,
    html: adminShell('Yeni Ürün Sorusu', inner),
  });
}

export async function notifyAdminNewReturn(info: {
  orderRef: string;
  itemCount: number;
}): Promise<void> {
  const cfg = await getAdminAlertSettings();
  if (!cfg.newReturn || cfg.recipients.length === 0) return;

  const inner = `
    <p>Bir sipariş için yeni bir <strong>iade talebi</strong> oluşturuldu (onay bekliyor).</p>
    <table style="border-collapse:collapse;margin-top:8px">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Sipariş No</td><td style="font-weight:bold">#${info.orderRef}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">İade kalemi</td><td>${info.itemCount} ürün</td></tr>
    </table>
    <p style="color:#6b7280;font-size:13px;margin-top:12px">Onaylamak için admin panelindeki İptal & İade → İadeler sekmesini ziyaret edin.</p>
  `;
  await sendMail({
    to: cfg.recipients.join(', '),
    subject: `↩️ Yeni İade Talebi — #${info.orderRef}`,
    html: adminShell('Yeni İade Talebi', inner),
  });
}

// ─── Public Functions ─────────────────────────────────────────────────────────

export async function sendOrderConfirmation(
  to: string,
  orderId: string,
  total: number,
  items: Array<{ name: string; quantity: number; unitPrice: number }>,
  customerName = '',
): Promise<void> {
  const orderRef = orderId.slice(-8).toUpperCase();

  const rows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(i.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${formatPrice(i.unitPrice)}</td>
        </tr>`,
    )
    .join('');

  // Sipariş kalemleri tablosu — şablon gövdesinin altına eklenir
  const itemsTable = `
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:8px 12px;text-align:left">Ürün</th>
          <th style="padding:8px 12px;text-align:center">Adet</th>
          <th style="padding:8px 12px;text-align:right">Fiyat</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:18px;font-weight:bold;text-align:right;margin-top:16px">
      Toplam: ${formatPrice(total)}
    </p>
  `;

  await sendOrderTemplateEmail(
    to,
    'order_received',
    { ad: customerName, siparis_no: orderRef, toplam: formatPrice(total) },
    itemsTable,
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/sifre-sifirla?token=${token}`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#2563eb">Şifre Sıfırlama</h2>
      <p>Hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
      <p style="margin:24px 0">
        <a href="${resetUrl}"
           style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          Şifremi Sıfırla
        </a>
      </p>
      <p style="color:#666;font-size:14px">Bu link 1 saat geçerlidir. Eğer bu talebi siz yapmadıysanız bu emaili görmezden gelebilirsiniz.</p>
    </div>
  `;

  await sendMail({ to, subject: 'Şifre Sıfırlama Talebi', html });
}

/** Yeni üyeye hesap aktivasyon linki gönderir. */
export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${env.FRONTEND_URL}/e-posta-dogrula?token=${token}`;
  const storeName = await getStoreName();

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#2563eb">Hesabınızı Aktifleştirin</h2>
      <p>${storeName} üyeliğiniz oluşturuldu. Hesabınızı kullanabilmek için e-posta adresinizi doğrulamanız gerekiyor.</p>
      <p style="margin:24px 0">
        <a href="${verifyUrl}"
           style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          Hesabımı Aktifleştir
        </a>
      </p>
      <p style="color:#666;font-size:14px">
        Buton çalışmazsa bu adresi tarayıcınıza yapıştırın:<br>
        <span style="color:#2563eb;word-break:break-all">${verifyUrl}</span>
      </p>
      <p style="color:#666;font-size:14px">Bu link 24 saat geçerlidir. Bu kaydı siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
    </div>
  `;

  await sendMail({ to, subject: `${storeName} — Hesabınızı Aktifleştirin`, html });
}

/** Misafir siparişi için 6 haneli doğrulama kodu gönderir. */
export async function sendGuestCodeEmail(to: string, code: string): Promise<void> {
  const storeName = await getStoreName();

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#2563eb">Doğrulama Kodunuz</h2>
      <p>Siparişinizi tamamlayabilmek için aşağıdaki kodu ${storeName} sitesindeki doğrulama alanına girin.</p>
      <p style="margin:24px 0;text-align:center">
        <span style="display:inline-block;background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;
                     padding:16px 32px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#111">
          ${code}
        </span>
      </p>
      <p style="color:#666;font-size:14px">Bu kod 10 dakika geçerlidir. Bu işlemi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
    </div>
  `;

  await sendMail({ to, subject: `${storeName} — Doğrulama Kodunuz: ${code}`, html });
}

export async function sendOrderStatusUpdate(
  to: string,
  orderId: string,
  status: string,
  statusLabel: string,
): Promise<void> {
  const orderRef = orderId.slice(-8).toUpperCase();
  const ordersUrl = `${env.FRONTEND_URL}/hesabim/siparisler`;
  const storeName = await getStoreName();

  const statusColors: Record<string, string> = {
    CONFIRMED:  '#16a34a',
    PROCESSING: '#2563eb',
    SHIPPED:    '#7c3aed',
    DELIVERED:  '#16a34a',
    CANCELLED:  '#dc2626',
  };
  const color = statusColors[status] ?? '#374151';

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#2563eb">Sipariş Durumu Güncellendi</h2>
      <p>Sipariş No: <strong>#${orderRef}</strong></p>
      <p style="margin:16px 0">
        Siparişinizin durumu güncellendi:
        <span style="font-weight:bold;color:${color}">${statusLabel}</span>
      </p>
      <p style="margin:24px 0">
        <a href="${ordersUrl}"
           style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          Siparişlerimi Görüntüle
        </a>
      </p>
      <p style="color:#666;font-size:14px">${storeName}'i tercih ettiğiniz için teşekkürler.</p>
    </div>
  `;

  await sendMail({ to, subject: `Sipariş Durumu: ${statusLabel} — #${orderRef}`, html });
}

export async function sendRefundEmail(
  to: string,
  orderId: string,
  amount: number,
): Promise<void> {
  const orderRef = orderId.slice(-8).toUpperCase();
  const ordersUrl = `${env.FRONTEND_URL}/hesabim/siparisler`;
  const storeName = await getStoreName();

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#16a34a">İadeniz Tamamlandı</h2>
      <p>Sipariş No: <strong>#${orderRef}</strong></p>
      <p style="margin:16px 0">
        Siparişinizle ilgili iade işleminiz tamamlanmıştır. İade tutarı
        <strong>${formatPrice(amount)}</strong> ödeme yönteminize iade edilmiştir.
        Bankanıza bağlı olarak hesabınıza yansıması <strong>1–7 iş günü</strong> sürebilir.
      </p>
      <p style="margin:24px 0">
        <a href="${ordersUrl}"
           style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          Siparişlerimi Görüntüle
        </a>
      </p>
      <p style="color:#666;font-size:14px">${storeName}'i tercih ettiğiniz için teşekkürler.</p>
    </div>
  `;

  await sendMail({ to, subject: `İadeniz Tamamlandı — #${orderRef}`, html });
}

function customerShell(titleColor: string, title: string, bodyHtml: string, btnColor = '#2563eb'): string {
  const ordersUrl = `${env.FRONTEND_URL}/hesabim/siparisler`;
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:${titleColor}">${escapeHtml(title)}</h2>
      ${bodyHtml}
      <p style="margin:24px 0">
        <a href="${ordersUrl}" style="background:${btnColor};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          Siparişlerimi Görüntüle
        </a>
      </p>
    </div>
  `;
}

export async function sendCancellationRequestedEmail(to: string, orderId: string): Promise<void> {
  const orderRef = orderId.slice(-8).toUpperCase();
  const body = `
    <p>Sipariş No: <strong>#${orderRef}</strong></p>
    <p style="margin:16px 0">Sipariş <strong>iptal talebiniz</strong> tarafımıza ulaştı ve incelemeye alındı.
    Talebiniz onaylandığında ödemeniz iade edilecektir. Süreç sonucu hakkında ayrıca e-posta ile bilgilendirileceksiniz.</p>
  `;
  await sendMail({ to, subject: `İptal Talebiniz Alındı — #${orderRef}`, html: customerShell('#2563eb', 'İptal Talebiniz Alındı', body) });
}

export async function sendCancellationApprovedEmail(
  to: string,
  orderId: string,
  coupon?: { code: string; value: number },
): Promise<void> {
  const orderRef = orderId.slice(-8).toUpperCase();
  const body = coupon
    ? `<p>Sipariş No: <strong>#${orderRef}</strong></p>
       <p style="margin:16px 0">İptal talebiniz <strong>onaylandı</strong>. Size özel
       <strong>${formatPrice(coupon.value)}</strong> değerinde indirim kuponu tanımlandı:</p>
       <p style="font-family:monospace;font-size:18px;font-weight:bold;background:#f3f4f6;padding:10px 16px;border-radius:6px;display:inline-block">${escapeHtml(coupon.code)}</p>
       <p style="margin:16px 0;color:#374151">Kuponunuzu bir sonraki alışverişinizde kullanabilirsiniz.</p>`
    : `<p>Sipariş No: <strong>#${orderRef}</strong></p>
       <p style="margin:16px 0">İptal talebiniz <strong>onaylandı</strong>. Ödemeniz en kısa sürede iade edilecek; iade tamamlandığında ayrıca bilgilendirileceksiniz.</p>`;
  await sendMail({ to, subject: `İptal Talebiniz Onaylandı — #${orderRef}`, html: customerShell('#16a34a', 'İptal Talebiniz Onaylandı', body, '#16a34a') });
}

export async function sendCancellationRejectedEmail(to: string, orderId: string, reason?: string): Promise<void> {
  const orderRef = orderId.slice(-8).toUpperCase();
  const body = `
    <p>Sipariş No: <strong>#${orderRef}</strong></p>
    <p style="margin:16px 0">İptal talebiniz değerlendirildi ancak <strong>onaylanamadı</strong>.</p>
    ${reason ? `<p style="margin:12px 0;color:#374151"><strong>Açıklama:</strong> ${escapeHtml(reason)}</p>` : ''}
    <p style="margin:16px 0;color:#374151">Sorularınız için bizimle iletişime geçebilirsiniz.</p>
  `;
  await sendMail({ to, subject: `İptal Talebiniz Hakkında — #${orderRef}`, html: customerShell('#dc2626', 'İptal Talebiniz Onaylanamadı', body, '#dc2626') });
}

export async function sendReturnRequestedEmail(to: string, orderId: string): Promise<void> {
  const orderRef = orderId.slice(-8).toUpperCase();
  const body = `
    <p>Sipariş No: <strong>#${orderRef}</strong></p>
    <p style="margin:16px 0">Sipariş <strong>iade talebiniz</strong> tarafımıza ulaştı ve incelemeye alındı.
    Talebiniz onaylandığında iade tutarınız ödeme yönteminize iade edilecektir. Süreç sonucu hakkında ayrıca e-posta ile bilgilendirileceksiniz.</p>
  `;
  await sendMail({ to, subject: `İade Talebiniz Alındı — #${orderRef}`, html: customerShell('#2563eb', 'İade Talebiniz Alındı', body) });
}

export async function sendReturnApprovedEmail(to: string, orderId: string, amount: number): Promise<void> {
  const orderRef = orderId.slice(-8).toUpperCase();
  const body = `
    <p>Sipariş No: <strong>#${orderRef}</strong></p>
    <p style="margin:16px 0">İade talebiniz <strong>onaylandı</strong> ve
    <strong>${formatPrice(amount)}</strong> tutarındaki iadeniz ödeme yönteminize işlenmiştir.
    Bankanıza bağlı olarak hesabınıza yansıması <strong>1–7 iş günü</strong> sürebilir.</p>
  `;
  await sendMail({ to, subject: `İade Talebiniz Onaylandı — #${orderRef}`, html: customerShell('#16a34a', 'İade Talebiniz Onaylandı', body, '#16a34a') });
}

export async function sendReturnRejectedEmail(to: string, orderId: string, reason?: string): Promise<void> {
  const orderRef = orderId.slice(-8).toUpperCase();
  const body = `
    <p>Sipariş No: <strong>#${orderRef}</strong></p>
    <p style="margin:16px 0">İade talebiniz değerlendirildi ancak <strong>onaylanamadı</strong>.</p>
    ${reason ? `<p style="margin:12px 0;color:#374151"><strong>Açıklama:</strong> ${escapeHtml(reason)}</p>` : ''}
    <p style="margin:16px 0;color:#374151">Sorularınız için bizimle iletişime geçebilirsiniz.</p>
  `;
  await sendMail({ to, subject: `İade Talebiniz Hakkında — #${orderRef}`, html: customerShell('#dc2626', 'İade Talebiniz Onaylanamadı', body, '#dc2626') });
}

export async function sendCartReminderEmail(
  to: string,
  customerName: string,
  items: Array<{ name: string; quantity: number; unitPrice: number }>,
  total: number,
): Promise<void> {
  const cartUrl = `${env.FRONTEND_URL}/sepet`;
  const storeName = await getStoreName();
  const greetingName = customerName?.trim() || 'Değerli Müşterimiz';

  const rows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(i.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${formatPrice(i.unitPrice)}</td>
        </tr>`,
    )
    .join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#2563eb">Sepetinizi unutmayın!</h2>
      <p>Merhaba ${escapeHtml(greetingName)},</p>
      <p>Sepetinizde tamamlanmayı bekleyen ürünleriniz var. Stoklar tükenmeden siparişinizi tamamlayabilirsiniz.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:8px 12px;text-align:left">Ürün</th>
            <th style="padding:8px 12px;text-align:center">Adet</th>
            <th style="padding:8px 12px;text-align:right">Fiyat</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="font-size:18px;font-weight:bold;text-align:right;margin-top:16px">
        Toplam: ${formatPrice(total)}
      </p>
      <p style="margin:24px 0">
        <a href="${cartUrl}"
           style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          Sepete Git
        </a>
      </p>
      <p style="color:#666;font-size:14px">${storeName}'i tercih ettiğiniz için teşekkürler.</p>
    </div>
  `;

  await sendMail({ to, subject: 'Sepetinizde ürünler sizi bekliyor 🛒', html });
}

// ─── Invoice Email ────────────────────────────────────────────────────────────

export interface InvoiceEmailOrder {
  id: string;
  createdAt: Date | string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  customerName: string;
  customerEmail: string;
  address: {
    firstName: string;
    lastName: string;
    address: string;
    neighborhood?: string | null;
    district: string;
    city: string;
    postalCode?: string | null;
    phone: string;
  };
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    attributes?: Record<string, string> | null;
  }>;
  payment?: { provider: string; status: string } | null;
  /** Sysmond'dan kesilmiş resmi e-Fatura/e-Arşiv. Varsa PDF eklenir ve müşteri bilgilendirilir. */
  officialInvoice?: { pdf: Buffer; label: string; invoiceNo?: string | null };
}

export async function sendInvoiceEmail(order: InvoiceEmailOrder): Promise<void> {
  const [storeName, companyData] = await Promise.all([
    getStoreName(),
    (async () => {
      try {
        const { prisma } = await import('../config/database');
        const rows = await prisma.siteSettings.findMany({
          where: { key: { in: ['general_address', 'general_city', 'general_email', 'general_phone', 'general_legal_name', 'general_tax_office', 'general_tax_number'] } },
        });
        return Object.fromEntries(rows.map((r) => [r.key.replace('general_', ''), r.value]));
      } catch { return {}; }
    })(),
  ]);

  const official = order.officialInvoice;
  const orderRef = `#TR-${order.id.slice(-8).toUpperCase()}`;
  const orderDate = new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const legalName = companyData['legal_name'] || storeName;
  const companyAddress = [companyData['address'], companyData['city']].filter(Boolean).join(', ');
  const taxOffice = companyData['tax_office'] || '';
  const taxNumber = companyData['tax_number'] || '';

  const subtotal = Number(order.subtotal);
  const discount = Number(order.discount);
  const shipping = Number(order.shippingFee);
  const total = Number(order.total);
  const vatNet = subtotal - discount;
  const vatAmount = Math.max(0, Math.round((total - shipping - vatNet) * 100) / 100);
  const vatRate = vatNet > 0 ? Math.round((vatAmount / vatNet) * 100) : 0;

  const PROVIDER_LABEL: Record<string, string> = {
    iyzico: 'İyzico', stripe: 'Stripe', cod: 'Kapıda Ödeme', bank: 'Havale/EFT',
  };
  const paymentLabel = order.payment
    ? `${PROVIDER_LABEL[order.payment.provider] ?? order.payment.provider}`
    : '—';

  const addrLine = [
    `${order.address.firstName} ${order.address.lastName}`,
    order.address.phone,
    order.address.address,
    [order.address.neighborhood, order.address.district].filter(Boolean).join(', '),
    [order.address.city, order.address.postalCode].filter(Boolean).join(' '),
  ].map(escapeHtml).join('<br>');

  const itemRows = order.items.map((item) => {
    const attrs = Object.entries(item.attributes ?? {}).map(([k, v]) => `${k}: ${v}`).join(' / ');
    const lineTotal = item.unitPrice * item.quantity;
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eee">
          <div style="font-weight:500;color:#111">${escapeHtml(item.name)}</div>
          ${attrs ? `<div style="font-size:12px;color:#888;margin-top:2px">${escapeHtml(attrs)}</div>` : ''}
          <div style="font-size:11px;color:#aaa;font-family:monospace;margin-top:2px">${escapeHtml(item.sku)}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">${formatPrice(item.unitPrice)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${formatPrice(lineTotal)}</td>
      </tr>`;
  }).join('');

  const html = `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<div style="max-width:700px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">

  <!-- Header -->
  <div style="background:#1e3a5f;padding:28px 32px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:.5px">${escapeHtml(storeName)}</div>
      ${companyAddress ? `<div style="color:#a8c7f0;font-size:13px;margin-top:4px">${escapeHtml(companyAddress)}</div>` : ''}
      ${companyData['email'] ? `<div style="color:#a8c7f0;font-size:13px">${escapeHtml(companyData['email'])}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div style="color:#fff;font-size:28px;font-weight:700;letter-spacing:1px">FATURA</div>
      <div style="color:#a8c7f0;font-size:14px;margin-top:4px">${orderRef}</div>
      <div style="color:#a8c7f0;font-size:13px">${orderDate}</div>
    </div>
  </div>

  <!-- Info Grid -->
  <div style="padding:24px 32px;display:grid;grid-template-columns:1fr 1fr;gap:24px;border-bottom:1px solid #eee">
    <div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:8px">Teslimat Adresi</div>
      <div style="font-size:14px;color:#333;line-height:1.7">${addrLine}</div>
    </div>
    <div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:8px">Sipariş Bilgileri</div>
      <table style="font-size:13px;color:#444;border-collapse:collapse;width:100%">
        <tr><td style="padding:3px 0;color:#888">Sipariş No</td><td style="padding:3px 0;padding-left:12px;font-weight:600;color:#111">${orderRef}</td></tr>
        <tr><td style="padding:3px 0;color:#888">Tarih</td><td style="padding:3px 0;padding-left:12px">${orderDate}</td></tr>
        <tr><td style="padding:3px 0;color:#888">Ödeme</td><td style="padding:3px 0;padding-left:12px">${escapeHtml(paymentLabel)}</td></tr>
        <tr><td style="padding:3px 0;color:#888">Alıcı</td><td style="padding:3px 0;padding-left:12px">${escapeHtml(order.customerName || order.customerEmail)}</td></tr>
      </table>
    </div>
  </div>

  <!-- Items Table -->
  <div style="padding:0 32px">
    <table style="width:100%;border-collapse:collapse;margin-top:4px">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#666;border-bottom:2px solid #e5e7eb">Ürün</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#666;border-bottom:2px solid #e5e7eb">Adet</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#666;border-bottom:2px solid #e5e7eb">Birim Fiyat</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#666;border-bottom:2px solid #e5e7eb">Toplam</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>

  <!-- Price Summary -->
  <div style="padding:16px 32px 28px">
    <div style="max-width:280px;margin-left:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr>
          <td style="padding:5px 0;color:#555">Ara Toplam (KDV Hariç)</td>
          <td style="padding:5px 0;text-align:right;color:#333">${formatPrice(subtotal)}</td>
        </tr>
        ${discount > 0 ? `<tr>
          <td style="padding:5px 0;color:#16a34a">İndirim</td>
          <td style="padding:5px 0;text-align:right;color:#16a34a">−${formatPrice(discount)}</td>
        </tr>` : ''}
        ${vatAmount > 0 ? `<tr>
          <td style="padding:5px 0;color:#555">KDV${vatRate > 0 ? ` (%${vatRate})` : ''}</td>
          <td style="padding:5px 0;text-align:right;color:#333">${formatPrice(vatAmount)}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:5px 0;color:#555">Kargo</td>
          <td style="padding:5px 0;text-align:right;${shipping === 0 ? 'color:#16a34a;font-weight:600' : 'color:#333'}">${shipping === 0 ? 'Ücretsiz' : formatPrice(shipping)}</td>
        </tr>
        <tr style="border-top:2px solid #1e3a5f">
          <td style="padding:10px 0;font-size:15px;font-weight:700;color:#111">Genel Toplam</td>
          <td style="padding:10px 0;text-align:right;font-size:15px;font-weight:700;color:#1e3a5f">${formatPrice(total)}</td>
        </tr>
      </table>
    </div>
  </div>

  ${official ? `
  <!-- Resmi e-Fatura / e-Arşiv bilgi notu -->
  <div style="margin:0 32px 24px;padding:14px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px">
    <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.6">
      📄 <strong>${escapeHtml(official.label)}${official.invoiceNo ? ` (${escapeHtml(String(official.invoiceNo))})` : ''}</strong> düzenlenmiştir ve bu e-postaya PDF olarak eklenmiştir. Yukarıdaki döküm bilgilendirme amaçlıdır; resmi belge ekteki PDF'tir.
    </p>
  </div>` : ''}

  <!-- Footer -->
  <div style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #eee">
    <p style="margin:0;font-size:12px;color:#888">${escapeHtml(legalName)} — Bizi tercih ettiğiniz için teşekkürler.</p>
    ${taxOffice ? `<p style="margin:4px 0 0;font-size:11px;color:#aaa">Vergi Dairesi: ${escapeHtml(taxOffice)}${taxNumber ? ` | Vergi No: ${escapeHtml(taxNumber)}` : ''}</p>` : ''}
    <p style="margin:4px 0 0;font-size:12px;color:#aaa">Bu e-posta bilgilendirme amaçlıdır.</p>
  </div>

</div>
</body>
</html>`;

  const attachments = official
    ? [{ filename: `${official.label.replace(/\s+/g, '-')}-${orderRef.replace('#', '')}.pdf`, content: official.pdf }]
    : undefined;

  await sendMail({
    to: order.customerEmail,
    subject: official
      ? `${official.label}${official.invoiceNo ? ` ${official.invoiceNo}` : ''} — ${orderRef}`
      : `Siparişinizin Faturası — ${orderRef}`,
    html,
    attachments,
  });
}

export async function sendMarketingEmail(
  emails: string[],
  subject: string,
  htmlContent: string,
): Promise<void> {
  const cfg = await resolveEmailConfig();
  if (cfg.method === 'none') {
    logger.warn('Toplu e-posta gönderilemedi: Geçerli bir SMTP/Brevo yapılandırması bulunamadı.');
    return;
  }

  // Güvenli HTML kabuğuna sarmala (aynı tasarım dilini kullanmak için)
  const wrappedHtml = wrapTemplateHtml(htmlContent);

  if (cfg.method === 'brevo') {
    // Brevo API allows sending to multiple recipients at once using bcc
    // But sending to up to 50 recipients at a time is safer
    const chunkSize = 50;
    for (let i = 0; i < emails.length; i += chunkSize) {
      const chunk = emails.slice(i, i + chunkSize);
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': cfg.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: cfg.senderName, email: cfg.senderEmail },
          bcc: chunk.map((email) => ({ email })),
          subject,
          htmlContent: wrappedHtml,
        }),
      });
    }
    logger.info(`Toplu e-posta gönderildi (Brevo API) - ${emails.length} alıcı`);
    return;
  }

  // SMTP yöntemi
  if (cfg.method === 'smtp') {
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });

    const chunkSize = 50;
    for (let i = 0; i < emails.length; i += chunkSize) {
      const chunk = emails.slice(i, i + chunkSize);
      await transport.sendMail({
        from: `"${cfg.fromName}" <${cfg.from}>`,
        bcc: chunk, // Hide emails from each other
        subject,
        html: wrappedHtml,
      });
    }
    logger.info(`Toplu e-posta gönderildi (SMTP) - ${emails.length} alıcı`);
    return;
  }
}

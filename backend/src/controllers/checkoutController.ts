import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import * as orderSvc from '../services/orderService';
import * as paymentSvc from '../services/paymentService';
import * as paytrSvc from '../services/paytrService';
import * as emailSvc from '../services/emailService';
import { validateCoupon } from '../services/discountService';
import { assertEmailVerifiedForOrder } from '../services/authService';
import { getShippingConfig, computeShipping, getPaymentMethods, getStoreName } from '../services/settingsService';

// Pending checkout data stored in Redis with 30-min TTL
const PENDING_TTL = 1800;
const pendingKey = (id: string) => `checkout:pending:${id}`;

interface Billing {
  isCorporate: boolean;
  billingName?: string;
  taxNumber?: string; // VKN
  identityNo?: string; // TCKN
  taxOffice?: string;
}

/** İstek gövdesinden fatura bilgisini normalize eder (boş alanları eler). */
function normalizeBilling(b: unknown): Billing | undefined {
  if (!b || typeof b !== 'object') return undefined;
  const o = b as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return {
    isCorporate: !!o.isCorporate,
    billingName: str(o.billingName),
    taxNumber: str(o.taxNumber),
    identityNo: str(o.identityNo),
    taxOffice: str(o.taxOffice),
  };
}

interface PendingData { userId: string; addressId: string; couponCode?: string; billing?: Billing }

async function setPending(conversationId: string, data: PendingData) {
  await redis.setex(pendingKey(conversationId), PENDING_TTL, JSON.stringify(data));
}

async function getPending(conversationId: string): Promise<PendingData | null> {
  const raw = await redis.get(pendingKey(conversationId));
  return raw ? (JSON.parse(raw) as PendingData) : null;
}

async function delPending(conversationId: string) {
  await redis.del(pendingKey(conversationId));
}

function apiBase(_req: Request) {
  // Use configured FRONTEND_URL to ensure correct redirect URLs
  // This avoids issues with proxy headers or browser-detected ports
  return env.FRONTEND_URL;
}

// ─── POST /api/checkout/initialize ───────────────────────────────────────────
export async function initialize(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    // E-posta doğrulaması zorunluysa, doğrulanmamış kullanıcı ödemeye başlayamaz.
    await assertEmailVerifiedForOrder(userId);
    const { addressId, couponCode } = req.body as { addressId: string; couponCode?: string };
    const billing = normalizeBilling((req.body as { billing?: unknown }).billing);

    const [user, cart] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }),
      orderSvc.getCartForCheckout(userId),
    ]);

    if (!user) return next(Object.assign(new Error('Kullanıcı bulunamadı'), { status: 404 }));

    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) return next(Object.assign(new Error('Adres bulunamadı'), { status: 404 }));

    const subtotal = cart.items.reduce(
      (s, i) => s + Number(i.priceAtAdd) * i.quantity,
      0,
    );
    const shippingConfig = await getShippingConfig();
    const shippingFee = computeShipping(subtotal, shippingConfig);

    // Kupon (varsa) — indirim net (KDV hariç) ara toplam üzerinden
    let discount = 0;
    if (couponCode) {
      const result = await validateCoupon(couponCode, userId, subtotal);
      if (!result.ok) return next(Object.assign(new Error(result.error), { status: 400 }));
      discount = result.discountAmount;
    }

    // Ürün fiyatları KDV dahil (vatIncluded=true). Kargo da KDV dahil.
    // Ekstra KDV eklenmez — toplam = (subtotal - indirim) + kargo.
    const tax = 0;
    const total = subtotal - discount + shippingFee;

    const conversationId = `${userId.slice(-6)}-${Date.now()}`;
    await setPending(conversationId, { userId, addressId, couponCode, billing });

    const contactName = `${address.firstName} ${address.lastName}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const base = apiBase(req);

    // ─── PayTR aktifse kart ödemesini PayTR iFrame ile yürüt ───
    const paytrCfg = await paytrSvc.getPaytrConfig();
    if (paytrCfg.enabled) {
      const merchantOid = ('MG' + userId.slice(-6) + Date.now().toString(36) + Math.random().toString(36).slice(2, 6))
        .replace(/[^A-Za-z0-9]/g, '');
      await setPending(merchantOid, { userId, addressId, couponCode, billing });

      const clientIp = (
        (req.headers['cf-connecting-ip'] as string) ||
        ((req.headers['x-forwarded-for'] as string) ?? '').split(',')[0] ||
        req.ip ||
        '127.0.0.1'
      ).replace('::ffff:', '').trim();

      const basket: Array<[string, string, number]> = cart.items.map((item) => [
        (item.variant as { product: { name: string } }).product.name,
        Number(item.priceAtAdd).toFixed(2),
        item.quantity,
      ]);

      const tokenRes = await paytrSvc.getIframeToken({
        merchantOid,
        email: user.email,
        amountKurus: Math.round(total * 100),
        userName: contactName,
        userAddress: address.address,
        userPhone: address.phone || '05000000000',
        userIp: clientIp,
        basket,
        okUrl: `${base}/api/checkout/paytr-return?oid=${merchantOid}`,
        failUrl: `${env.FRONTEND_URL}/sepet?error=payment_failed`,
        noInstallment: 0,
        maxInstallment: 0,
      });

      if (!tokenRes.ok) {
        await delPending(merchantOid);
        logger.error('PayTR token alınamadı', { reason: tokenRes.reason });
        return next(Object.assign(new Error(tokenRes.reason), { status: 502 }));
      }

      return res.json({
        success: true,
        data: {
          checkoutFormContent: paytrSvc.buildIframeHtml(tokenRes.token),
          conversationId: merchantOid,
          subtotal,
          discount,
          tax,
          shippingFee,
          total,
        },
      });
    }

    const formRes = await paymentSvc.initializeCheckoutForm(
      {
        conversationId,
        price: subtotal.toFixed(2),
        paidPrice: total.toFixed(2),
        callbackUrl: `${base}/api/checkout/callback?cid=${conversationId}`,
        buyer: {
          id: userId,
          name: user.profile?.firstName ?? 'Müşteri',
          surname: user.profile?.lastName ?? 'Ad',
          identityNumber: '11111111110',
          email: user.email,
          registrationDate: user.createdAt.toISOString().slice(0, 19).replace('T', ' '),
          lastLoginDate: now,
          registrationAddress: address.address,
          city: address.city,
          country: 'Turkey',
          ip: (req.ip ?? '127.0.0.1').replace('::ffff:', ''),
        },
        shippingAddress: {
          contactName,
          address: address.address,
          zipCode: address.postalCode ?? '00000',
          city: address.city,
          country: 'Turkey',
        },
        billingAddress: {
          contactName,
          address: address.address,
          zipCode: address.postalCode ?? '00000',
          city: address.city,
          country: 'Turkey',
        },
        basketItems: cart.items.map((item) => ({
          id: item.variantId,
          name: (item.variant as { product: { name: string; category: { name: string } } }).product.name,
          price: (Number(item.priceAtAdd) * item.quantity).toFixed(2),
          category1: (item.variant as { product: { name: string; category: { name: string } } }).product.category.name,
          itemType: 'PHYSICAL' as const,
        })),
      },
      base,
    );

    if (formRes.status !== 'success') {
      logger.error('Iyzico form hatası', { formRes });
      return next(Object.assign(new Error(formRes.errorMessage ?? 'Ödeme başlatılamadı'), { status: 502 }));
    }

    res.json({
      success: true,
      data: {
        checkoutFormContent: formRes.checkoutFormContent,
        token: formRes.token,
        conversationId,
        subtotal,
        discount,
        tax,
        shippingFee,
        total,
      },
    });
  } catch (err) { next(err); }
}

// ─── POST /api/checkout/callback (Iyzico browser redirect) ───────────────────
export async function callback(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, status, conversationId } = req.body as {
      token?: string;
      status?: string;
      conversationId?: string;
    };

    logger.info('Iyzico callback', { token, status, conversationId });

    if (!token || status === 'failure') {
      return res.redirect(`${env.FRONTEND_URL}/sepet?error=payment_failed`);
    }

    const detail = await paymentSvc.retrieveCheckoutForm(token);

    if (detail.status !== 'success' || detail.paymentStatus !== 'SUCCESS') {
      logger.warn('Iyzico ödeme başarısız', { detail });
      return res.redirect(`${env.FRONTEND_URL}/sepet?error=payment_failed`);
    }

    // conversationId önceliği: callbackUrl query (cid) > body > Iyzico detail yanıtı
    const cId = (req.query.cid as string | undefined) ?? conversationId ?? detail.conversationId;
    if (!cId) return res.redirect(`${env.FRONTEND_URL}/sepet?error=session_lost`);

    const pending = await getPending(cId);
    if (!pending) {
      logger.error('Pending checkout bulunamadı', { cId });
      return res.redirect(`${env.FRONTEND_URL}/sepet?error=session_expired`);
    }

    const order = await orderSvc.createOrder(pending.userId, pending.addressId, pending.couponCode, pending.billing);

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'iyzico',
        amount: order.total,
        status: 'SUCCESS',
        transactionId: detail.paymentId,
      },
    });

    const user = await prisma.user.findUnique({ where: { id: pending.userId } });
    if (user) {
      emailSvc
        .sendOrderConfirmation(user.email, order.id, Number(order.total),
          order.items.map((i) => ({
            name: i.variant.product.name,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
          })),
          user.firstName,
        )
        .catch((e) => logger.error('Email hatası', { error: e.message }));
    }

    await delPending(cId);
    res.redirect(`${env.FRONTEND_URL}/siparis-tamamlandi?orderId=${order.id}`);
  } catch (err) {
    logger.error('Callback hatası', { err });
    next(err);
  }
}

// ─── POST /api/checkout/dev-callback (test mode bypass) ──────────────────────
export async function devCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { conversationId } = req.query as { conversationId: string };
    const pending = await getPending(conversationId);
    if (!pending) {
      return res.status(400).json({ success: false, error: 'Oturum bulunamadı veya süresi doldu' });
    }

    const order = await orderSvc.createOrder(pending.userId, pending.addressId, pending.couponCode, pending.billing);

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'dev_bypass',
        amount: order.total,
        status: 'SUCCESS',
        transactionId: `DEV_${Date.now()}`,
      },
    });

    const user = await prisma.user.findUnique({ where: { id: pending.userId } });
    if (user) {
      emailSvc
        .sendOrderConfirmation(user.email, order.id, Number(order.total),
          order.items.map((i) => ({
            name: i.variant.product.name,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
          })),
          user.firstName,
        )
        .catch(() => {});
    }

    await delPending(conversationId);
    res.json({
      success: true,
      redirectUrl: `${env.FRONTEND_URL}/siparis-tamamlandi?orderId=${order.id}`,
    });
  } catch (err) { next(err); }
}

// ─── POST /api/checkout/paytr-callback (PayTR bildirim - server-to-server) ────
export async function paytrCallback(req: Request, res: Response) {
  try {
    const pb = req.body as Record<string, string>;
    const oid = pb['merchant_oid'];
    const cfg = await paytrSvc.getPaytrConfig();

    if (!oid || !paytrSvc.verifyCallbackHash(oid, pb['status'] ?? '', pb['total_amount'] ?? '', pb['hash'] ?? '', cfg.merchantKey, cfg.merchantSalt)) {
      logger.error('PayTR callback hash uyuşmuyor', { oid });
      return res.status(400).send('PAYTR notification failed: bad hash');
    }

    // Idempotency — aynı bildirim tekrar gelirse sipariş ikinci kez oluşturulmaz
    const existing = await redis.get(`paytr:result:${oid}`);
    if (existing) return res.send('OK');

    if (pb['status'] !== 'success') {
      logger.warn('PayTR ödeme başarısız', { oid, reason: pb['failed_reason_msg'] });
      await redis.setex(`paytr:result:${oid}`, 3600, 'FAILED');
      await delPending(oid);
      return res.send('OK');
    }

    const pending = await getPending(oid);
    if (!pending) {
      logger.error('PayTR pending checkout bulunamadı', { oid });
      return res.send('OK'); // tekrar denemeyi durdurmak için OK dön
    }

    const order = await orderSvc.createOrder(pending.userId, pending.addressId, pending.couponCode, pending.billing);
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'paytr',
        amount: order.total,
        status: 'SUCCESS',
        transactionId: oid,
      },
    });
    await redis.setex(`paytr:result:${oid}`, 3600, order.id);
    await delPending(oid);

    const user = await prisma.user.findUnique({ where: { id: pending.userId } });
    if (user) {
      emailSvc
        .sendOrderConfirmation(user.email, order.id, Number(order.total),
          order.items.map((i) => ({ name: i.variant.product.name, quantity: i.quantity, unitPrice: Number(i.unitPrice) })),
          user.firstName,
        )
        .catch((e) => logger.error('Email hatası', { error: e.message }));
    }

    return res.send('OK');
  } catch (err) {
    logger.error('PayTR callback hatası', { err });
    return res.status(500).send('error');
  }
}

// ─── GET /api/checkout/paytr-return (PayTR ok_url - kullanıcı yönlendirmesi) ──
// PayTR ödeme iframe'i içinden çağrılır: 302 redirect iframe'i yönlendirir ve
// sayfa frame içinde kalır. Bunun yerine üst pencereyi (window.top) yönlendirip
// iframe'den çıkarız.
function breakoutRedirect(res: Response, url: string) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(
    '<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Yönlendiriliyor…</title></head>' +
    '<body style="font-family:sans-serif;text-align:center;padding:40px;color:#334155">' +
    '<p>Ödeme tamamlandı, yönlendiriliyorsunuz…</p>' +
    '<script>var u=' + JSON.stringify(url) + ';' +
    'try{(window.top||window).location.replace(u);}catch(e){window.location.replace(u);}</script>' +
    '</body></html>'
  );
}

export async function paytrReturn(req: Request, res: Response) {
  const oid = (req.query['oid'] as string) ?? '';
  // Bildirim (callback) siparişi oluşturana kadar kısa süre bekle
  for (let i = 0; i < 12; i++) {
    const r = await redis.get(`paytr:result:${oid}`);
    if (r && r !== 'FAILED') {
      // Ödeme başarılı → kullanıcıyı profildeki Siparişlerim (ödemeler) sayfasına yönlendir
      return breakoutRedirect(res, `${env.FRONTEND_URL}/hesabim/siparisler?odeme=basarili&orderId=${r}`);
    }
    if (r === 'FAILED') {
      return breakoutRedirect(res, `${env.FRONTEND_URL}/sepet?error=payment_failed`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return breakoutRedirect(res, `${env.FRONTEND_URL}/hesabim/siparisler`);
}

// ─── GET /api/checkout/payment-methods ───────────────────────────────────────
export async function paymentMethods(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getPaymentMethods();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// ─── POST /api/checkout/place-order (COD / Havale) ───────────────────────────
export async function placeOrder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    // E-posta doğrulaması zorunluysa, doğrulanmamış kullanıcı sipariş veremez.
    await assertEmailVerifiedForOrder(userId);
    const { addressId, method, couponCode } = req.body as { addressId: string; method: 'cod' | 'havale' | 'free'; couponCode?: string };
    const billing = normalizeBilling((req.body as { billing?: unknown }).billing);

    if (!addressId || !['cod', 'havale', 'free'].includes(method)) {
      return res.status(400).json({ success: false, error: 'Geçersiz istek' });
    }

    // Validate method is enabled
    const methods = await getPaymentMethods();
    if (method === 'cod' && !methods.cod.enabled) {
      return res.status(400).json({ success: false, error: 'Kapıda ödeme şu an aktif değil' });
    }
    if (method === 'havale' && !methods.havale.enabled) {
      return res.status(400).json({ success: false, error: 'Havale/EFT ödemesi şu an aktif değil' });
    }

    // free method: toplam ₺0 olmalı (ör. %100 indirim kuponu)
    if (method === 'free') {
      const cart = await orderSvc.getCartForCheckout(userId);
      const subtotal = cart.items.reduce((s, i) => s + Number(i.priceAtAdd) * i.quantity, 0);
      const shippingConfig = await getShippingConfig();
      const shippingFee = computeShipping(subtotal, shippingConfig);
      let discount = 0;
      if (couponCode) {
        const result = await validateCoupon(couponCode, userId, subtotal);
        if (result.ok) discount = result.discountAmount;
      }
      const total = subtotal - discount + shippingFee;
      if (total > 0) {
        return res.status(400).json({ success: false, error: 'Toplam tutar sıfır değil, ödeme gerekli' });
      }
    }

    const order = await orderSvc.createOrder(userId, addressId, couponCode, billing);

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: method === 'free' ? 'free' : method === 'cod' ? 'cod' : 'havale',
        amount: order.total,
        status: method === 'free' ? 'SUCCESS' : 'PENDING',
        transactionId: `${method.toUpperCase()}_${Date.now()}`,
      },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      emailSvc
        .sendOrderConfirmation(user.email, order.id, Number(order.total),
          order.items.map((i) => ({
            name: i.variant.product.name,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
          })),
          user.firstName,
        )
        .catch((e) => logger.error('Email hatası', { error: e.message }));
    }

    const responseData: Record<string, unknown> = { orderId: order.id };
    if (method === 'havale') {
      const storeName = await getStoreName();
      const orderNum = order.id.slice(-8).toUpperCase();
      responseData['havale'] = {
        bankName:    methods.havale.bankName,
        iban:        methods.havale.iban,
        accountName: methods.havale.accountName,
        orderNumber: orderNum,
        description: methods.havale.description
          ? `${methods.havale.description} #${orderNum}`
          : `${storeName}-${orderNum}`,
      };
    }

    res.json({ success: true, data: responseData });
  } catch (err) { next(err); }
}

// ─── GET /api/orders ──────────────────────────────────────────────────────────
export async function listOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orders = await orderSvc.listOrders(req.user!.id);
    res.json({ success: true, data: orders });
  } catch (err) { next(err); }
}

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
export async function getOrder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const order = await orderSvc.getOrderDetail(req.user!.id, req.params['id'] as string);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}

// ─── POST /api/checkout/orders/:id/resend-invoice ─────────────────────────────
export async function resendInvoice(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const order = await orderSvc.getOrderDetail(req.user!.id, req.params['id'] as string);
    const customerName = (order as any).user?.profile?.firstName
      ? `${(order as any).user.profile.firstName} ${(order as any).user.profile.lastName ?? ''}`.trim()
      : '';
    await emailSvc.sendInvoiceEmail({
      id: order.id,
      createdAt: order.createdAt,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      shippingFee: Number(order.shippingFee),
      total: Number(order.total),
      customerName,
      customerEmail: req.user!.email,
      address: (order as any).address,
      items: order.items.map((item: any) => ({
        name: item.variant.product.name,
        sku: item.variant.sku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        attributes: item.variant.attributes ?? null,
      })),
      payment: (order as any).payment ?? null,
    });
    res.json({ success: true });
  } catch (err) { next(err); }
}

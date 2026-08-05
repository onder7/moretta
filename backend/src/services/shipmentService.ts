import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { getSettingsGroup } from './settingsService';
import * as hj from './hepsijetService';

// ─────────────────────────────────────────────────────────────────────────────
// Sipariş → HepsiJET gönderi oluşturma.
//
// sendDeliveryOrderEnhanced kullanılır: ZPL barkod + takip numarası döner.
// Sonuç Shipping kaydına yazılır, tekrar denemede aynı customerDeliveryNo
// yeniden kullanılır (HepsiJET tarafında mükerrer kayıt oluşmasın diye).
// ─────────────────────────────────────────────────────────────────────────────

type OrderForShipment = Prisma.OrderGetPayload<{
  include: {
    address: true;
    user: { select: { email: true; profile: { select: { phone: true } } } };
    shipping: true;
  };
}>;

async function loadOrder(orderId: string): Promise<OrderForShipment> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      address: true,
      user: { select: { email: true, profile: { select: { phone: true } } } },
      shipping: true,
    },
  });
  if (!order) throw Object.assign(new Error('Sipariş bulunamadı'), { status: 404 });
  if (!order.address) throw Object.assign(new Error('Siparişte teslimat adresi yok'), { status: 400 });
  return order;
}

/** Türkiye saatiyle YYYY-MM-DD. Container TZ=UTC olduğunda tarih kayması olmasın diye. */
function istanbulDate(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
  return parts; // en-CA → "2026-07-18"
}

/**
 * Aynı girdiden hep aynı UUID'yi üretir. HepsiJET her gönderi için ayrı
 * companyCustomerId / companyAddressId istiyor; sipariş bazında deterministik
 * üretmek hem bu koşulu sağlar hem de tekrar denemede aynı değeri verir.
 */
function uuidFrom(seed: string): string {
  const h = crypto.createHash('sha256').update(seed).digest('hex');
  return [h.slice(0, 8), h.slice(8, 12), '4' + h.slice(13, 16), '8' + h.slice(17, 20), h.slice(20, 32)].join('-');
}

/** 05xxxxxxxxx biçimine normalize eder. */
function normalizePhone(raw: string | null | undefined): string {
  const d = (raw ?? '').replace(/\D/g, '');
  if (d.length === 10) return `0${d}`;                    // 5xxxxxxxxx
  if (d.length === 12 && d.startsWith('90')) return `0${d.slice(2)}`; // 905xxxxxxxxx
  if (d.length === 13 && d.startsWith('090')) return d.slice(2);
  return d;
}

/** customerDeliveryNo: 8-21 karakter, 3 haneli firma koduyla başlamalı. */
function buildDeliveryNo(prefix: string): string {
  return `${prefix}${String(Date.now()).slice(-12)}`; // 3 + 12 = 15 karakter
}

/** HX_STD ve HJ_DT sabit 0 slot kullanır; SD/ND için gün içi dilim gerekir. */
function slotFor(productCode: string): string {
  return productCode === 'HX_SD' || productCode === 'HX_ND' ? '1' : '0';
}

const COUNTRY = { name: 'Türkiye' };

type CustomerAddress = {
  city: string;
  district: string;
  neighborhood: string | null;
  address: string;
};

/**
 * Müşteri adresini HepsiJET adres bloğuna çevirir.
 *
 * town = ilçe, district = mahalle. HepsiJET'in tanım mailinde GÖNDERİCİ adresi
 * için tersi verilmişti (town=KIZILTOPRAK mahallesi); doğrusu bu eşleme:
 * 2026-07-30 test gönderisinde HepsiJET yanıtı receiverTown='SEYHAN' döndü ve
 * gönderiyi SEYHAN XDock'una yönlendirdi, yani town'u ilçe olarak okuyor.
 * Müşteri adresi her iki yönde de (giden gönderide alıcı, iade gönderisinde
 * gönderici) buradan üretilir.
 *
 * neighborhood opsiyonel; boşsa ilçe gönderilir (mahalle zaten adres satırında).
 */
function customerAddressBlock(addr: CustomerAddress, seed: string): hj.HjAddress {
  return {
    companyAddressId: uuidFrom(seed),
    country: COUNTRY,
    city: { name: addr.city },
    town: { name: addr.district },
    district: { name: addr.neighborhood?.trim() || addr.district },
    addressLine1: addr.address,
  };
}

/** Mağaza deposu — değerler ayarlara HepsiJET'in verdiği haliyle giriliyor. */
function merchantAddressBlock(cfg: hj.HepsijetConfig): hj.HjAddress {
  return {
    companyAddressId: cfg.senderAddressId,
    country: COUNTRY,
    city: { name: cfg.senderCity },
    town: { name: cfg.senderTown },
    district: { name: cfg.senderDistrict || cfg.senderTown },
    addressLine1: cfg.senderAddressLine,
  };
}

export interface ShipmentResult {
  trackingNumber: string | null;
  deliveryNo: string;
  hasLabel: boolean;
  carrier: string;
  alreadyExists?: boolean;
}

/** Sipariş için HepsiJET gönderisi oluşturur. */
export async function createShipment(orderId: string): Promise<ShipmentResult> {
  const cfg = await hj.getConfig();
  hj.assertConfigured(cfg);

  const order = await loadOrder(orderId);
  const addr = order.address!;

  if (order.shipping?.trackingNumber) {
    throw Object.assign(
      new Error(`Bu sipariş için zaten kargo oluşturulmuş (${order.shipping.trackingNumber}).`),
      { status: 409 },
    );
  }

  if (!addr.neighborhood?.trim()) {
    logger.warn('HepsiJET: mahalle bilgisi yok, ilçe gönderiliyor', { orderId, district: addr.district });
  }

  const phone = normalizePhone(addr.phone || order.user?.profile?.phone);
  if (!phone) {
    throw Object.assign(new Error('Teslimat adresinde geçerli telefon numarası yok'), { status: 400 });
  }

  const deliveryNo = order.shipping?.deliveryNo || buildDeliveryNo(cfg.deliveryPrefix);

  const payload: hj.HjDeliveryOrder = {
    company: { name: cfg.companyName, abbreviationCode: cfg.companyCode },
    delivery: {
      customerDeliveryNo: deliveryNo,
      customerOrderId: order.id.slice(-8).toUpperCase(),
      totalParcels: '1',
      desi: cfg.defaultDesi,
      deliverySlotOriginal: slotFor(cfg.productCode),
      deliveryDateOriginal: istanbulDate(),
      deliveryType: 'RETAIL',
      product: { productCode: cfg.productCode },
      senderAddress: merchantAddressBlock(cfg),
      receiver: {
        companyCustomerId: uuidFrom(`customer:${order.id}`),
        firstName: addr.firstName,
        lastName: addr.lastName,
        phone1: phone,
        phone2: '',
        email: order.user?.email ?? '',
      },
      recipientAddress: customerAddressBlock(addr, `address:${order.id}`),
      recipientPerson: `${addr.firstName} ${addr.lastName}`.trim(),
      recipientPersonPhone1: phone,
    },
    currentXDock: { abbreviationCode: cfg.xdockCode },
  };

  let response: hj.HjEnhancedResponse;
  try {
    response = await hj.sendDeliveryOrderEnhanced(cfg, payload);
  } catch (err) {
    const msg = String(err);
    // 409: gönderi bu numarayla HepsiJET'te zaten kayıtlı → mükerrer basış. Mevcut
    // kaydı "oluşturuldu" sayıp döndür (500 vermek yerine idempotent davran).
    if (/\b409\b|kay[ıi]tl[ıi]/i.test(msg)) {
      const existing = await prisma.shipping.findUnique({ where: { orderId } });
      const trackingNumber = existing?.trackingNumber || deliveryNo;
      await prisma.shipping
        .upsert({
          where: { orderId },
          update: { carrier: 'HepsiJET', trackingNumber, deliveryNo },
          create: { orderId, carrier: 'HepsiJET', trackingNumber, deliveryNo },
        })
        .catch(() => {});
      logger.info('HepsiJET gönderi zaten mevcut (409), mükerrer oluşturma atlandı', { orderId, deliveryNo });
      return { trackingNumber, deliveryNo, hasLabel: Boolean(existing?.barcodeData), carrier: 'HepsiJET', alreadyExists: true };
    }
    // Başarısız denemede de deliveryNo'yu saklıyoruz ki tekrar denerken aynısı kullanılsın.
    await prisma.shipping.upsert({
      where: { orderId },
      update: { deliveryNo, payload: { request: payload as object, error: String(err) } },
      create: { orderId, carrier: 'HepsiJET', deliveryNo, payload: { request: payload as object, error: String(err) } },
    });
    throw err;
  }

  // HepsiJET takibi customerDeliveryNo (barkod) üzerinden yapılır; ayrı bir takip no
  // dönmezse barkodu takip numarası olarak kullanırız (müşteri bununla takip eder).
  const outcome = hj.readShipmentOutcome(response);
  const trackingNumber = outcome.trackingNumber ?? deliveryNo;
  const barcodeData = outcome.barcodeData;

  await prisma.shipping.upsert({
    where: { orderId },
    update: {
      carrier: 'HepsiJET',
      trackingNumber,
      deliveryNo,
      barcodeData,
      payload: { request: payload as object, response: response as object },
    },
    create: {
      orderId,
      carrier: 'HepsiJET',
      trackingNumber,
      deliveryNo,
      barcodeData,
      payload: { request: payload as object, response: response as object },
    },
  });

  logger.info('HepsiJET gönderisi oluşturuldu', { orderId, deliveryNo, trackingNumber });

  return { trackingNumber, deliveryNo, hasLabel: Boolean(barcodeData), carrier: 'HepsiJET' };
}

// ─── İade gönderisi (deliveryType: RETURNED) ─────────────────────────────────

type ReturnForShipment = Prisma.OrderReturnGetPayload<{
  include: {
    order: {
      include: {
        address: true;
        user: { select: { email: true; profile: { select: { phone: true } } } };
      };
    };
  };
}>;

async function loadReturn(returnId: string): Promise<ReturnForShipment> {
  const ret = await prisma.orderReturn.findUnique({
    where: { id: returnId },
    include: {
      order: {
        include: {
          address: true,
          user: { select: { email: true, profile: { select: { phone: true } } } },
        },
      },
    },
  });
  if (!ret) throw Object.assign(new Error('İade talebi bulunamadı'), { status: 404 });
  if (!ret.order.address) throw Object.assign(new Error('Siparişte teslimat adresi yok'), { status: 400 });
  return ret;
}

/**
 * İade talebi için HepsiJET iade gönderisi oluşturur.
 *
 * Giden gönderinin tersi: gönderici müşteri adresi, alıcı mağaza deposudur ve
 * deliveryType 'RETURNED' gider. Sonuç OrderReturn kaydına yazılır; aynı talep
 * için tekrar denendiğinde aynı customerDeliveryNo yeniden kullanılır.
 */
export async function createReturnShipment(returnId: string): Promise<ShipmentResult> {
  const cfg = await hj.getConfig();
  hj.assertConfigured(cfg);

  const ret = await loadReturn(returnId);
  const order = ret.order;
  const addr = order.address!;

  if (ret.status === 'REJECTED') {
    throw Object.assign(new Error('Reddedilmiş iade talebi için kargo oluşturulamaz'), { status: 400 });
  }
  if (ret.trackingNumber) {
    throw Object.assign(
      new Error(`Bu iade için zaten kargo oluşturulmuş (${ret.trackingNumber}).`),
      { status: 409 },
    );
  }

  const customerPhone = normalizePhone(addr.phone || order.user?.profile?.phone);
  if (!customerPhone) {
    throw Object.assign(new Error('Teslimat adresinde geçerli telefon numarası yok'), { status: 400 });
  }

  // İadede alıcı mağazanın kendisi; iletişim bilgisi Ayarlar > Genel'den gelir.
  const general = await getSettingsGroup('general_').catch(() => ({} as Record<string, string>));
  const storePhone = normalizePhone(general.phone);
  if (!storePhone) {
    throw Object.assign(
      new Error('Mağaza telefonu tanımlı değil. Ayarlar > Genel > İletişim Bilgileri bölümünden ekleyin.'),
      { status: 400 },
    );
  }

  const deliveryNo = ret.deliveryNo || buildDeliveryNo(cfg.deliveryPrefix);

  const payload: hj.HjDeliveryOrder = {
    company: { name: cfg.companyName, abbreviationCode: cfg.companyCode },
    delivery: {
      customerDeliveryNo: deliveryNo,
      customerOrderId: ret.id.slice(-8).toUpperCase(),
      totalParcels: '1',
      desi: cfg.defaultDesi,
      deliverySlotOriginal: slotFor(cfg.returnProductCode),
      deliveryDateOriginal: istanbulDate(),
      deliveryType: 'RETURNED',
      product: { productCode: cfg.returnProductCode },
      senderAddress: customerAddressBlock(addr, `return-sender:${ret.id}`),
      receiver: {
        companyCustomerId: uuidFrom(`return-receiver:${cfg.companyCode}`),
        firstName: cfg.companyName,
        lastName: '',
        phone1: storePhone,
        phone2: '',
        email: general.email ?? '',
      },
      recipientAddress: merchantAddressBlock(cfg),
      recipientPerson: cfg.companyName,
      recipientPersonPhone1: storePhone,
    },
    currentXDock: { abbreviationCode: cfg.xdockCode },
  };

  let response: hj.HjEnhancedResponse;
  try {
    response = await hj.sendDeliveryOrderEnhanced(cfg, payload);
  } catch (err) {
    const msg = String(err);
    // 409: bu numarayla gönderi HepsiJET'te zaten var → idempotent davran.
    if (/\b409\b|kay[ıi]tl[ıi]/i.test(msg)) {
      const trackingNumber = ret.trackingNumber || deliveryNo;
      await prisma.orderReturn
        .update({ where: { id: returnId }, data: { trackingNumber, deliveryNo } })
        .catch(() => {});
      logger.info('HepsiJET iade gönderisi zaten mevcut (409)', { returnId, deliveryNo });
      return { trackingNumber, deliveryNo, hasLabel: Boolean(ret.barcodeData), carrier: 'HepsiJET', alreadyExists: true };
    }
    // Başarısız denemede de deliveryNo saklanır ki tekrarda aynısı kullanılsın.
    await prisma.orderReturn.update({
      where: { id: returnId },
      data: { deliveryNo, shipmentPayload: { request: payload as object, error: String(err) } },
    });
    // İade gönderisi randevu ister; findAvailableDeliveryDatesV2 test ortamında
    // (2026-07-30) her tarih aralığı için "randevulu iade limiti tükenmiştir"
    // dönüyor, yani kapasiteyi HepsiJET'in açması gerekiyor.
    if (/randevu/i.test(msg)) {
      throw Object.assign(
        new Error(
          `${msg.replace(/^Error:\s*/, '')} — İade gönderisi randevu gerektiriyor; ` +
          `HepsiJET tarafında uygun randevu günü açılmamış görünüyor.`,
        ),
        { status: 400 },
      );
    }
    throw err;
  }

  const outcome = hj.readShipmentOutcome(response);
  const trackingNumber = outcome.trackingNumber ?? deliveryNo;
  const barcodeData = outcome.barcodeData;

  await prisma.orderReturn.update({
    where: { id: returnId },
    data: {
      trackingNumber,
      deliveryNo,
      barcodeData,
      shipmentPayload: { request: payload as object, response: response as object },
    },
  });

  logger.info('HepsiJET iade gönderisi oluşturuldu', { returnId, deliveryNo, trackingNumber });

  return { trackingNumber, deliveryNo, hasLabel: Boolean(barcodeData), carrier: 'HepsiJET' };
}

/** İade gönderisinin ZPL etiketini döner. */
export async function getReturnLabel(returnId: string): Promise<string> {
  const ret = await prisma.orderReturn.findUnique({ where: { id: returnId } });
  if (!ret?.barcodeData) {
    throw Object.assign(new Error('Bu iade için kayıtlı kargo etiketi yok'), { status: 404 });
  }
  return ret.barcodeData;
}

export interface TrackingResult {
  trackingNumber: string | null;
  trackingUrl: string | null;
}

/**
 * HepsiJET'ten gönderi takip bilgisini (customerDeliveryNo/barkod ile) sorgular ve
 * kaydı günceller. Takip numarası = barkod; ayrıca resmi takip URL'i döner.
 */
export async function refreshTracking(orderId: string): Promise<TrackingResult> {
  const shipping = await prisma.shipping.findUnique({ where: { orderId } });
  if (!shipping?.deliveryNo) {
    throw Object.assign(new Error('Bu sipariş için HepsiJET gönderisi bulunamadı'), { status: 404 });
  }
  const cfg = await hj.getConfig();
  hj.assertConfigured(cfg);

  const items = await hj.queryTracking(cfg, [shipping.deliveryNo]);
  const item = items.find((i) => i.barcode === shipping.deliveryNo) ?? items[0];
  const trackingUrl = (item?.trackingUrl as string | undefined) ?? null;
  const trackingNumber = shipping.trackingNumber || shipping.deliveryNo;

  await prisma.shipping.update({
    where: { orderId },
    data: {
      trackingNumber,
      ...(item ? { payload: { ...(shipping.payload as object ?? {}), track: item } as object } : {}),
    },
  });

  logger.info('HepsiJET takip bilgisi güncellendi', { orderId, deliveryNo: shipping.deliveryNo, trackingUrl });
  return { trackingNumber, trackingUrl };
}

/** Kayıtlı ZPL etiket verisini döner. */
export async function getLabel(orderId: string): Promise<string> {
  const shipping = await prisma.shipping.findUnique({ where: { orderId } });
  if (!shipping?.barcodeData) {
    throw Object.assign(new Error('Bu sipariş için kayıtlı kargo etiketi yok'), { status: 404 });
  }
  return shipping.barcodeData;
}

/** Admin panelinde gönderi oluşturmadan payload'ı görmek için (hata ayıklama). */
export async function previewPayload(orderId: string): Promise<object> {
  const cfg = await hj.getConfig();
  const order = await loadOrder(orderId);
  const addr = order.address!;
  const phone = normalizePhone(addr.phone || order.user?.profile?.phone);
  return {
    company: { name: cfg.companyName, abbreviationCode: cfg.companyCode },
    delivery: {
      customerDeliveryNo: order.shipping?.deliveryNo || `${cfg.deliveryPrefix}(üretilecek)`,
      customerOrderId: order.id.slice(-8).toUpperCase(),
      totalParcels: '1',
      desi: cfg.defaultDesi,
      deliverySlotOriginal: slotFor(cfg.productCode),
      deliveryDateOriginal: istanbulDate(),
      deliveryType: 'RETAIL',
      product: { productCode: cfg.productCode },
      senderAddress: merchantAddressBlock(cfg),
      receiver: {
        companyCustomerId: uuidFrom(`customer:${order.id}`),
        firstName: addr.firstName,
        lastName: addr.lastName,
        phone1: phone,
        phone2: '',
        email: order.user?.email ?? '',
      },
      recipientAddress: customerAddressBlock(addr, `address:${order.id}`),
      recipientPerson: `${addr.firstName} ${addr.lastName}`.trim(),
      recipientPersonPhone1: phone,
    },
    currentXDock: { abbreviationCode: cfg.xdockCode },
  };
}

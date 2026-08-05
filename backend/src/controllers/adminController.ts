import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { env } from '../config/env';
import * as adminService from '../services/adminService';
import * as settingsService from '../services/settingsService';
import { getEmailStatus as emailStatus, sendOrderConfirmation, sendInvoiceEmail } from '../services/emailService';
import * as backupSvc from '../services/backupService';
import { importProductsFromBuffer } from '../services/importService';
import { getSystemStats } from '../services/systemService';
import * as reviewService from '../services/reviewService';
import * as qaService from '../services/qaService';
import * as watermarkService from '../services/watermarkService';
import * as hepsijet from '../services/hepsijetService';
import * as orderService from '../services/orderService';
import * as invoiceService from '../services/invoiceService';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export async function getStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getDashboardStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// Products
export async function listProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const brandId = req.query.brandId as string | undefined;
    const data = await adminService.adminListProducts({ page, limit, search, categoryId, brandId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const product = await adminService.adminGetProduct(String(req.params.id));
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const product = await adminService.adminCreateProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const product = await adminService.adminUpdateProduct(String(req.params.id), req.body);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await adminService.adminDeleteProduct(String(req.params.id));
    res.json({ success: true, message: 'Ürün silindi' });
  } catch (err) {
    next(err);
  }
}

export async function clearWishlists(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await adminService.clearAllWishlists();
    res.json({ success: true, message: `${result.deleted} favori temizlendi`, data: result });
  } catch (err) {
    next(err);
  }
}

export async function clearCarts(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await adminService.clearAllCarts();
    res.json({ success: true, message: `${result.deleted} sepet temizlendi`, data: result });
  } catch (err) {
    next(err);
  }
}

// Orders
export async function listOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const all = req.query.all === 'true';
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const data = await adminService.adminListOrders({ page, limit, status, search, startDate, endDate, all });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getOrderDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const order = await adminService.adminGetOrderDetail(String(req.params.id));
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, note } = req.body;
    const order = await adminService.adminUpdateOrderStatus(String(req.params.id), status, note);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderShipping(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { carrier, trackingNumber } = req.body as { carrier?: string; trackingNumber?: string };
    const data = await adminService.adminUpdateOrderShipping(String(req.params.id), { carrier, trackingNumber });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updatePaymentStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.body as { status: string };
    const data = await adminService.adminUpdatePaymentStatus(String(req.params.id), status);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createManualOrder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const order = await orderService.createManualOrder(req.body, req.user?.id);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function sendOrderInvoiceEmail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const order = await adminService.adminGetOrderDetail(String(req.params.id));
    const customerName = order.user.profile?.firstName
      ? `${order.user.profile.firstName} ${order.user.profile.lastName ?? ''}`.trim()
      : '';

    // Manuel/offline satışta placeholder e-posta (…@manuel.local) teslim edilemez →
    // mağaza e-postasına (info@…) yönlendir.
    const recipientEmail = await settingsService.resolveContactEmail(order.user.email);

    // Resmi e-Fatura/e-Arşiv kesilmişse PDF'ini indirip müşteriye ek olarak gönder.
    // İndirme başarısız olursa e-posta yine de proforma döküm ile gider.
    let officialInvoice: { pdf: Buffer; label: string; invoiceNo?: string | null } | undefined;
    const invoice = await invoiceService.getInvoice(order.id);
    if (invoice && invoice.status === 'SENT' && invoice.ettn) {
      try {
        const pdf = await invoiceService.getInvoicePdf(order.id);
        officialInvoice = {
          pdf,
          label: invoice.type === 'EFATURA' ? 'e-Fatura' : 'e-Arşiv Faturası',
          invoiceNo: invoice.invoiceNo,
        };
      } catch (e) {
        logger.warn(`Resmi fatura PDF eklenemedi (order ${order.id}), proforma gönderilecek: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await sendInvoiceEmail({
      id: order.id,
      createdAt: order.createdAt,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      shippingFee: Number(order.shippingFee),
      total: Number(order.total),
      customerName,
      customerEmail: recipientEmail,
      address: order.address as any,
      items: order.items.map((item: any) => ({
        name: item.variant.product.name,
        sku: item.variant.sku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        attributes: item.variant.attributes ?? null,
      })),
      payment: order.payment,
      officialInvoice,
    });
    res.json({ success: true, data: { officialInvoice: !!officialInvoice, invoiceType: officialInvoice?.label ?? null } });
  } catch (err) {
    next(err);
  }
}

// Customers
export async function listCustomers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const data = await adminService.adminListCustomers({ page, limit, search });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function toggleCustomerStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await adminService.adminToggleCustomerStatus(String(req.params.id));
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getCustomerDetail(String(req.params.id));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomerNote(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.adminUpdateCustomerNote(String(req.params.id), String(req.body?.note ?? ''));
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function sendCustomerPasswordReset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.adminSendCustomerPasswordReset(String(req.params.id));
    res.json({ success: true, message: 'Şifre sıfırlama linki gönderildi', data });
  } catch (err) { next(err); }
}

export async function createCustomerCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.adminCreateCustomerCoupon(String(req.params.id), req.body);
    res.status(201).json({ success: true, message: 'Kupon oluşturuldu', data });
  } catch (err) { next(err); }
}

export async function deleteCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await adminService.adminDeleteCustomer(String(req.params.id));
    res.json({ success: true, message: 'Müşteri silindi' });
  } catch (err) { next(err); }
}

// Categories
export async function listCategories(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.adminListCategories();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.adminCreateCategory(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.adminUpdateCategory(String(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await adminService.adminDeleteCategory(String(req.params.id));
    res.json({ success: true, message: 'Kategori silindi' });
  } catch (err) { next(err); }
}

// Stock Management
export async function getStockManagement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getStockManagement();
    res.json(data);
  } catch (err) { next(err); }
}

export async function updateVariantStock(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.updateVariantStock(String(req.params.id), req.body.newQty, req.user?.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Fiyat & Ciro Raporu
export async function getProductPricingReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const fromStr = req.query.from ? String(req.query.from) : undefined;
    const toStr = req.query.to ? String(req.query.to) : undefined;
    const from = fromStr ? new Date(fromStr) : undefined;
    const to = toStr ? new Date(toStr) : undefined;
    const data = await adminService.getProductPricingReport(from, to);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getProductPriceHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getProductPriceHistory(String(req.params.productId));
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Brands
export async function listBrands(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.adminListBrands();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createBrand(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.adminCreateBrand(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateBrand(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.adminUpdateBrand(String(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteBrand(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await adminService.adminDeleteBrand(String(req.params.id));
    res.json({ success: true, message: 'Marka silindi' });
  } catch (err) { next(err); }
}

// Shipping Config
export async function getShippingConfig(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await settingsService.getShippingConfig();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateShippingConfig(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { shippingFee, freeShippingThreshold } = req.body as {
      shippingFee: number;
      freeShippingThreshold: number;
    };
    if (typeof shippingFee !== 'number' || typeof freeShippingThreshold !== 'number') {
      return res.status(400).json({ success: false, error: 'Geçersiz değerler' });
    }
    const data = await settingsService.updateShippingConfig(shippingFee, freeShippingThreshold);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getTaxConfigAdmin(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await settingsService.getTaxConfig();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateTaxConfigAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { taxRate } = req.body as { taxRate: number };
    if (typeof taxRate !== 'number' || taxRate < 0 || taxRate > 100) {
      return res.status(400).json({ success: false, error: 'KDV oranı 0-100 arasında olmalıdır' });
    }
    const data = await settingsService.updateTaxConfig(taxRate);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Analytics
export async function getAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const range = req.query.range as string | undefined;
    const data = await adminService.getAnalyticsData({ range });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getUserAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getUserAnalyticsData();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getTrafficAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getTrafficAnalyticsData();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getMaintenanceSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await settingsService.getMaintenanceConfig();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateMaintenanceSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { isActive, message } = req.body;
    if (typeof isActive !== 'boolean' || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Geçersiz parametreler' });
    }
    const data = await settingsService.updateMaintenanceConfig(isActive, message);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Watermark (Filigran) Settings
export async function getWatermarkSettings(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await watermarkService.getWatermarkConfig();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateWatermarkSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { enabled, url, position, opacity, size, margin } = req.body ?? {};
    const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'tiled'];
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'enabled boolean olmalıdır' });
    }
    if (position !== undefined && !positions.includes(position)) {
      return res.status(400).json({ success: false, error: 'Geçersiz konum' });
    }
    const data = await watermarkService.updateWatermarkConfig({
      enabled,
      url: typeof url === 'string' ? url : '',
      position: position ?? 'bottom-right',
      opacity: Number(opacity),
      size: Number(size),
      margin: Number(margin),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Email Status & Test
export async function getEmailStatus(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await emailStatus();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function sendTestEmail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const to = String(req.body.to ?? '').trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ success: false, error: 'Geçerli bir e-posta adresi girin.' });
    }
    const { method } = await emailStatus();
    if (method === 'none') {
      return res.status(400).json({ success: false, error: 'Hiçbir email transport yapılandırılmamış. .env dosyasına SMTP veya BREVO_API_KEY ekleyin.' });
    }
    await sendOrderConfirmation(to, 'TEST-EMAIL-0000', 0, [{ name: 'Test Ürün', quantity: 1, unitPrice: 0 }]);
    res.json({ success: true, message: `Test e-postası "${to}" adresine ${method.toUpperCase()} üzerinden gönderildi.` });
  } catch (err) { next(err); }
}

// Generic Settings
export async function getSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const group = String(req.params.group);
    const data = await settingsService.getSettingsGroup(group + '_');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const group = String(req.params.group);
    await settingsService.updateSettingsGroup(group + '_', req.body as Record<string, string>);
    // Kargo ayarları değiştiyse HepsiJET token cache'i geçersiz kılınmalı
    if (group === 'shipping') hepsijet.invalidateToken();
    const data = await settingsService.getSettingsGroup(group + '_');
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Team
export async function listTeam(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await settingsService.listAdminUsers();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateTeamMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await settingsService.updateTeamMember(
      String(req.params.userId),
      req.body as { subRole?: string; isActive?: boolean },
      req.user!.id,
    );
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function inviteTeamMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, subRole } = req.body as { email: string; subRole: string };
    const data = await settingsService.inviteAdminUser(email, subRole ?? 'EDITOR');
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function removeTeamMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await settingsService.removeAdminUser(String(req.params.userId), req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

// New Orders / Notifications
export async function getNewOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.adminGetNewOrders();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Messages
export async function listMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.adminListMessages();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function markMessageRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await adminService.adminMarkMessageRead(String(req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
}

// Global Search
export async function globalSearch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) {
      return res.json({ success: true, data: { products: [], orders: [], customers: [] } });
    }
    const data = await adminService.adminGlobalSearch(q);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// ─── Backup ───────────────────────────────────────────────────────────────────

export async function createBackup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { encrypt } = req.body as { encrypt?: boolean };
    const adminPassword = encrypt ? env.ADMIN_PASSWORD : undefined;
    const result = await backupSvc.createBackup(adminPassword);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function listBackups(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: backupSvc.listBackups() });
  } catch (err) { next(err); }
}

export async function downloadBackup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const filename = String(req.params.filename);
    const filePath = backupSvc.getBackupPath(filename);
    if (!filePath) return res.status(404).json({ success: false, error: 'Yedek bulunamadı' });
    res.download(filePath, filename);
  } catch (err) { next(err); }
}

export async function deleteBackup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ok = backupSvc.deleteBackup(String(req.params.filename));
    if (!ok) return res.status(404).json({ success: false, error: 'Yedek bulunamadı' });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function getBackupSchedule(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await backupSvc.getBackupSchedule() });
  } catch (err) { next(err); }
}

export async function saveBackupSchedule(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await backupSvc.saveBackupSchedule(req.body);
    // notify cron to reload (fire-and-forget, server module handles it)
    backupSvc.triggerScheduleReload?.();
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function restoreBackup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const filename = req.params.filename as string;
    const { password } = req.body as { password: string };

    if (!filename || !password) {
      return res.status(400).json({ success: false, error: 'Dosya adı ve şifre gerekli' });
    }

    // Şifreyi kontrol et (admin default şifresi)
    const adminPassword = env.ADMIN_PASSWORD || 'Admin123!';
    if (password !== adminPassword) {
      return res.status(403).json({ success: false, error: 'Şifre yanlış' });
    }

    // Şifreli dosya ise aynı şifreyi kullan, değilse undefined
    const decryptPassword = filename.endsWith('.sql.enc') ? adminPassword : undefined;
    await backupSvc.restoreBackup(filename, decryptPassword);
    res.json({ success: true, message: 'Veritabanı başarıyla geri yüklendi' });
  } catch (err) { next(err); }
}

// ─── DB Optimize ──────────────────────────────────────────────────────────────

export async function optimizeDb(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.$executeRawUnsafe('VACUUM ANALYZE');
    res.json({ success: true, message: 'VACUUM ANALYZE tamamlandı' });
  } catch (err) { next(err); }
}

export async function getDbStats(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.$queryRaw<{ table_name: string; row_count: bigint; size: string }[]>`
      SELECT
        relname AS table_name,
        n_live_tup AS row_count,
        pg_size_pretty(pg_total_relation_size(relid)) AS size
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 20
    `;
    // bigint → number for JSON serialization
    const data = rows.map((r) => ({ ...r, row_count: Number(r.row_count) }));
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// ─── System Stats ─────────────────────────────────────────────────────────────

export async function getSystemInfo(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await getSystemStats();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// ─── Product Import ───────────────────────────────────────────────────────────

export async function importProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Dosya yüklenmedi' });
    const result = await importProductsFromBuffer(req.file.buffer, req.file.mimetype);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function createSubscriber(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, status } = req.body;
    const data = await adminService.adminCreateSubscriber(email, status);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function toggleSubscriberStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.adminToggleSubscriberStatus(String(req.params.id));
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteSubscriber(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await adminService.adminDeleteSubscriber(String(req.params.id));
    res.json({ success: true, message: 'Abone silindi' });
  } catch (err) { next(err); }
}

export async function sendNewsletterEmail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { subject, htmlContent, subscriberIds } = req.body;
    if (!subject || !htmlContent) {
      return res.status(400).json({ success: false, message: 'Konu ve içerik zorunludur.' });
    }
    const result = await adminService.adminSendNewsletterEmail(subject, htmlContent, subscriberIds);
    res.json({ success: true, message: `${result.count} kişiye e-posta gönderimi başlatıldı.` });
  } catch (err) { next(err); }
}

export async function sendCartReminder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await adminService.adminSendCartReminder(String(req.params.cartId));
    res.json({ success: true, message: `Hatırlatma e-postası ${result.email} adresine gönderildi.` });
  } catch (err) { next(err); }
}


// ─── Değerlendirme Moderasyonu ───────────────────────────────────────────────

export async function listReviews(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const status = (req.query.status as 'pending' | 'approved' | 'all') || 'all';
    const data = await reviewService.listAllReviews(status);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function approveReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await reviewService.setReviewApproval(String(req.params.id), true);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function unapproveReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await reviewService.setReviewApproval(String(req.params.id), false);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteReviewAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await reviewService.deleteReview(String(req.params.id), req.user!.id, true);
    res.json({ success: true, message: 'Değerlendirme silindi' });
  } catch (err) { next(err); }
}

// ─── Soru & Cevap (moderasyon) ────────────────────────────────────────────────

export async function listQuestions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const status = (req.query.status as string) || 'all';
    const data = await qaService.listAllQuestions(status as any);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function approveQuestion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await qaService.setQuestionApproval(String(req.params.id), true);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function unapproveQuestion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await qaService.setQuestionApproval(String(req.params.id), false);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteQuestionAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await qaService.deleteQuestion(String(req.params.id));
    res.json({ success: true, message: 'Soru silindi' });
  } catch (err) { next(err); }
}

export async function answerQuestionAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { body } = req.body as { body: string };
    const data = await qaService.adminAnswerQuestion(String(req.params.id), req.user!.id, body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}


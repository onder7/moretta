import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireAdmin } from '../middlewares/auth';
import * as ctrl from '../controllers/adminController';
import * as chatbotCtrl from '../controllers/chatbotController';
import * as popupCtrl from '../controllers/popupController';
import * as campaignCtrl from '../controllers/discountCampaignController';
import * as attrCtrl from '../controllers/attributeController';
import * as invoiceCtrl from '../controllers/invoiceController';
import * as shipmentCtrl from '../controllers/shipmentController';
import { uploadImage } from '../middlewares/upload';
import { uploadProductImage, uploadProductImageWatermarked } from '../controllers/uploadController';

const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.use(authenticate, requireAdmin);

// Dashboard
router.get('/stats', ctrl.getStats);
router.get('/analytics', ctrl.getAnalytics);
router.get('/user-analytics', ctrl.getUserAnalytics);
router.delete('/wishlists', ctrl.clearWishlists); // En Çok Favorilenenler temizle
router.delete('/carts', ctrl.clearCarts); // Sepette Bekleyenler temizle
router.get('/analytics/traffic', ctrl.getTrafficAnalytics);

// Upload
router.post('/upload', uploadImage.single('file'), uploadProductImage);
// Ürün görseli — filigran ayarı açıksa dosyaya basar
router.post('/upload/product', uploadImage.single('file'), uploadProductImageWatermarked);

// Products
router.get('/products', ctrl.listProducts);
router.post('/products', ctrl.createProduct);
router.get('/products/:id', ctrl.getProduct);
router.put('/products/:id', ctrl.updateProduct);
router.delete('/products/:id', ctrl.deleteProduct);

// Orders
router.get('/orders', ctrl.listOrders);
router.post('/orders/manual', ctrl.createManualOrder); // Manuel / offline satış
router.get('/orders/:id', ctrl.getOrderDetail);
router.put('/orders/:id/status', ctrl.updateOrderStatus);
router.put('/orders/:id/shipping', ctrl.updateOrderShipping);
router.put('/orders/:id/payment-status', ctrl.updatePaymentStatus);
router.post('/orders/:id/send-invoice', ctrl.sendOrderInvoiceEmail);

// e-Fatura / e-Arşiv (Sysmond E-Dönüşüm)
router.get('/e-invoice/ping', invoiceCtrl.ping);
router.post('/orders/:id/e-invoice', invoiceCtrl.issue);
router.get('/orders/:id/e-invoice', invoiceCtrl.get);
router.post('/orders/:id/e-invoice/send-gib', invoiceCtrl.sendGib);
router.post('/orders/:id/e-invoice/refresh', invoiceCtrl.refresh);
router.get('/orders/:id/e-invoice/pdf', invoiceCtrl.pdf);
router.get('/orders/:id/e-invoice/preview-xml', invoiceCtrl.previewXml);
router.post('/orders/:id/e-invoice/cancel', invoiceCtrl.cancel);

// Kargo (HepsiJET)
router.get('/hepsijet/ping', shipmentCtrl.ping);
router.post('/orders/:id/shipment', shipmentCtrl.create);
router.post('/orders/:id/shipment/refresh-tracking', shipmentCtrl.refreshTracking);
router.get('/orders/:id/shipment/label', shipmentCtrl.label);
router.get('/orders/:id/shipment/preview', shipmentCtrl.preview);
router.post('/returns/:returnId/shipment', shipmentCtrl.createReturn);
router.get('/returns/:returnId/shipment/label', shipmentCtrl.returnLabel);

// Reviews (moderasyon — onaylanmadan müşteri tarafında görünmez)
router.get('/reviews', ctrl.listReviews);
router.put('/reviews/:id/approve', ctrl.approveReview);
router.put('/reviews/:id/unapprove', ctrl.unapproveReview);
router.delete('/reviews/:id', ctrl.deleteReviewAdmin);

// Soru & Cevap (moderasyon — onaylanmadan müşteri tarafında görünmez)
router.get('/questions', ctrl.listQuestions);
router.put('/questions/:id/approve', ctrl.approveQuestion);
router.put('/questions/:id/unapprove', ctrl.unapproveQuestion);
router.delete('/questions/:id', ctrl.deleteQuestionAdmin);
router.post('/questions/:id/answer', ctrl.answerQuestionAdmin);

// Customers
router.get('/customers', ctrl.listCustomers);
router.get('/customers/:id', ctrl.getCustomerDetail);
router.put('/customers/:id/toggle-status', ctrl.toggleCustomerStatus);
router.put('/customers/:id/note', ctrl.updateCustomerNote);
router.post('/customers/:id/reset-password', ctrl.sendCustomerPasswordReset);
router.post('/customers/:id/coupon', ctrl.createCustomerCoupon);
router.delete('/customers/:id', ctrl.deleteCustomer); // sadece sipariş/favori/sepet yoksa

// Newsletter Subscribers
router.post('/newsletter/subscribers', ctrl.createSubscriber);
router.put('/newsletter/subscribers/:id/toggle-status', ctrl.toggleSubscriberStatus);
router.delete('/newsletter/subscribers/:id', ctrl.deleteSubscriber);
router.post('/newsletter/send', ctrl.sendNewsletterEmail);

// Sepette bekleyenlere hatırlatma maili
router.post('/cart-reminder/:cartId', ctrl.sendCartReminder);

// Categories
router.get('/categories', ctrl.listCategories);
router.post('/categories', ctrl.createCategory);
router.put('/categories/:id', ctrl.updateCategory);
router.patch('/categories/:id', ctrl.updateCategory);
router.delete('/categories/:id', ctrl.deleteCategory);

// Stock Management
router.get('/stock-management', ctrl.getStockManagement);
router.patch('/variants/:id/stock', ctrl.updateVariantStock);

// Fiyat & Ciro Raporu
router.get('/reports/product-pricing', ctrl.getProductPricingReport);
router.get('/reports/product-pricing/:productId', ctrl.getProductPriceHistory);

// Brands
router.get('/brands', ctrl.listBrands);
router.post('/brands', ctrl.createBrand);
router.put('/brands/:id', ctrl.updateBrand);
router.delete('/brands/:id', ctrl.deleteBrand);

// Shipping Config
router.get('/shipping-config', ctrl.getShippingConfig);
router.put('/shipping-config', ctrl.updateShippingConfig);

// Tax Config
router.get('/tax-config', ctrl.getTaxConfigAdmin);
router.put('/tax-config', ctrl.updateTaxConfigAdmin);

// Maintenance Settings
router.get('/settings/maintenance', ctrl.getMaintenanceSettings);
router.put('/settings/maintenance', ctrl.updateMaintenanceSettings);

// Watermark (Filigran)
router.get('/settings/watermark', ctrl.getWatermarkSettings);
router.put('/settings/watermark', ctrl.updateWatermarkSettings);

// Email
router.get('/email-status', ctrl.getEmailStatus);
router.post('/email-test', ctrl.sendTestEmail);

// Generic Settings
router.get('/settings/:group', ctrl.getSettings);
router.put('/settings/:group', ctrl.updateSettings);

// Team
router.get('/team', ctrl.listTeam);
router.post('/team/invite', ctrl.inviteTeamMember);
router.put('/team/:userId', ctrl.updateTeamMember);
router.delete('/team/:userId', ctrl.removeTeamMember);

// Notifications & Messages
router.get('/new-orders', ctrl.getNewOrders);
router.get('/messages', ctrl.listMessages);
router.put('/messages/:id/read', ctrl.markMessageRead);

// Search
router.get('/search', ctrl.globalSearch);

// Backup
router.post('/tools/backup/create', ctrl.createBackup);
router.get('/tools/backup/list', ctrl.listBackups);
router.get('/tools/backup/:filename/download', ctrl.downloadBackup);
router.delete('/tools/backup/:filename', ctrl.deleteBackup);
router.post('/tools/backup/:filename/restore', ctrl.restoreBackup);
router.get('/tools/backup/schedule', ctrl.getBackupSchedule);
router.put('/tools/backup/schedule', ctrl.saveBackupSchedule);

// DB Optimize
router.post('/tools/db/optimize', ctrl.optimizeDb);
router.get('/tools/db/stats', ctrl.getDbStats);

// System Stats
router.get('/tools/system/stats', ctrl.getSystemInfo);

// Product Import (Excel / CSV)
router.post('/tools/products/import', uploadMemory.single('file'), ctrl.importProducts);

// Popup
router.get('/popup', popupCtrl.getPopupAdmin);
router.post('/popup', popupCtrl.upsertPopup);

// Discount Campaign
router.get('/campaign', campaignCtrl.getCampaignAdmin);
router.post('/campaign', campaignCtrl.upsertCampaign);

// Attributes (Product Variant System)
router.get('/attributes', attrCtrl.listAttributes);
router.post('/attributes', attrCtrl.createAttribute);
router.put('/attributes/:id', attrCtrl.updateAttribute);
router.delete('/attributes/:id', attrCtrl.deleteAttribute);
router.post('/attributes/:id/values', attrCtrl.addAttributeValue);
router.put('/attributes/:id/values/:valueId', attrCtrl.updateAttributeValue);
router.delete('/attributes/:id/values/:valueId', attrCtrl.deleteAttributeValue);

// Chatbot Rules
router.get('/chatbot/rules', chatbotCtrl.listRules);
router.post('/chatbot/rules', chatbotCtrl.createRule);
router.put('/chatbot/rules/reorder', chatbotCtrl.reorderRules);
router.put('/chatbot/rules/:id', chatbotCtrl.updateRule);
router.delete('/chatbot/rules/:id', chatbotCtrl.deleteRule);

export default router;

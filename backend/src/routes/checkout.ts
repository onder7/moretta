import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as ctrl from '../controllers/checkoutController';
import * as cancelCtrl from '../controllers/cancellationController';
import * as returnCtrl from '../controllers/returnController';

const router = Router();

const billingSchema = z
  .object({
    isCorporate: z.boolean().optional(),
    billingName: z.string().max(300).optional(),
    taxNumber: z.string().max(11).optional(),
    identityNo: z.string().max(11).optional(),
    taxOffice: z.string().max(200).optional(),
  })
  .optional();

const initSchema = z.object({
  addressId: z.string().min(1),
  couponCode: z.string().optional(),
  billing: billingSchema,
});

const placeOrderSchema = z.object({
  addressId: z.string().min(1),
  method: z.enum(['cod', 'havale', 'free']),
  couponCode: z.string().optional(),
  billing: billingSchema,
});

// Public
router.get('/payment-methods', ctrl.paymentMethods);

// Checkout flow
router.post('/initialize', authenticate, validate(initSchema), ctrl.initialize);
router.post('/place-order', authenticate, validate(placeOrderSchema), ctrl.placeOrder);
router.post('/callback', ctrl.callback);            // Iyzico posts here (no auth)
router.post('/dev-callback', ctrl.devCallback);     // Test mode bypass
router.post('/paytr-callback', ctrl.paytrCallback); // PayTR bildirim (server-to-server, no auth)
router.get('/paytr-return', ctrl.paytrReturn);      // PayTR ok_url yönlendirmesi (no auth)

// Orders (authenticated)
router.get('/orders', authenticate, ctrl.listOrders);
router.get('/orders/:id', authenticate, ctrl.getOrder);
router.post('/orders/:id/resend-invoice', authenticate, ctrl.resendInvoice);

// Order Cancellation (customer)
router.post('/orders/:orderId/cancel-request', authenticate, cancelCtrl.requestCancellation as any);
router.get('/orders/:orderId/cancellation', authenticate, cancelCtrl.getOrderCancellation as any);

// Kullanıcının kazandığı kuponlar
router.get('/my-coupons', authenticate, cancelCtrl.getUserCoupons as any);

// Cancellation Management (admin)
router.get('/admin/cancellations', authenticate, requireAdmin, cancelCtrl.listCancellations as any);
router.get('/admin/cancellations/:cancellationId', authenticate, requireAdmin, cancelCtrl.getCancellation as any);
router.put('/admin/cancellations/:cancellationId/approve', authenticate, requireAdmin, cancelCtrl.approveCancellation as any);
router.put('/admin/cancellations/:cancellationId/reject', authenticate, requireAdmin, cancelCtrl.rejectCancellation as any);
router.delete('/admin/cancellations/:cancellationId/unreject', authenticate, requireAdmin, cancelCtrl.unrejectCancellation as any);
router.post('/admin/cancellations/:cancellationId/refund', authenticate, requireAdmin, cancelCtrl.processRefund as any);

// Order Return / İade (customer)
router.post('/orders/:orderId/return-request', authenticate, returnCtrl.requestReturn as any);
router.get('/orders/:orderId/returns', authenticate, returnCtrl.getOrderReturns as any);

// Return Management (admin)
router.get('/admin/returns', authenticate, requireAdmin, returnCtrl.listReturns as any);
router.get('/admin/returns/:returnId', authenticate, requireAdmin, returnCtrl.getReturn as any);
router.put('/admin/returns/:returnId/approve', authenticate, requireAdmin, returnCtrl.approveReturn as any);
router.put('/admin/returns/:returnId/reject', authenticate, requireAdmin, returnCtrl.rejectReturn as any);

export default router;

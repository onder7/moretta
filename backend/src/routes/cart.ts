import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate';
import { authenticate, optionalAuthenticate } from '../middlewares/auth';
import * as ctrl from '../controllers/cartController';

const router = Router();

const addItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(0),
});

const mergeSchema = z.object({
  sessionId: z.string().min(1),
});

router.get('/', optionalAuthenticate, ctrl.getCart);
router.post('/items', optionalAuthenticate, validate(addItemSchema), ctrl.addItem);
router.put('/items/:itemId', optionalAuthenticate, validate(updateItemSchema), ctrl.updateItem);
router.delete('/items/:itemId', optionalAuthenticate, ctrl.removeItem);
router.delete('/', optionalAuthenticate, ctrl.clearCart);
router.post('/merge', authenticate, validate(mergeSchema), ctrl.mergeCart);

export default router;

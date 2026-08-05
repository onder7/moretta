import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as cartService from '../services/cartService';

function serialize(cart: ReturnType<typeof cartService.getOrCreateCart> extends Promise<infer T> ? T : never) {
  const c = cart as any;
  return {
    id: c.id,
    items: c.items.map((item: any) => ({
      id: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      priceAtAdd: Number(item.priceAtAdd),
      variant: {
        id: item.variant.id,
        sku: item.variant.sku,
        price: Number(item.variant.price),
        compareAt: item.variant.compareAt != null ? Number(item.variant.compareAt) : null,
        stockQty: item.variant.stockQty,
        attributeValues: item.variant.attributeValues ?? [],
        product: item.variant.product,
      },
    })),
  };
}

function getKey(req: AuthRequest) {
  const userId = req.user?.id;
  const sessionId = req.headers['x-session-id'];
  return {
    userId,
    sessionId: typeof sessionId === 'string' ? sessionId : undefined,
  };
}

export async function getCart(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, sessionId } = getKey(req);
    if (!userId && !sessionId) return res.json({ success: true, data: null });
    const cart = await cartService.getOrCreateCart(userId, sessionId);
    res.json({ success: true, data: serialize(cart) });
  } catch (err) {
    next(err);
  }
}

export async function addItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, sessionId } = getKey(req);
    const { variantId, quantity = 1 } = req.body as { variantId: string; quantity?: number };
    const cart = await cartService.addItem(userId, sessionId, variantId, Number(quantity));
    res.json({ success: true, data: serialize(cart) });
  } catch (err) {
    next(err);
  }
}

export async function updateItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, sessionId } = getKey(req);
    const itemId = req.params['itemId'] as string;
    const { quantity } = req.body as { quantity: number };
    const cart = await cartService.updateItem(userId, sessionId, itemId, Number(quantity));
    res.json({ success: true, data: serialize(cart) });
  } catch (err) {
    next(err);
  }
}

export async function removeItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, sessionId } = getKey(req);
    const itemId = req.params['itemId'] as string;
    const cart = await cartService.removeItem(userId, sessionId, itemId);
    res.json({ success: true, data: serialize(cart) });
  } catch (err) {
    next(err);
  }
}

export async function clearCart(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, sessionId } = getKey(req);
    const cart = await cartService.clearCart(userId, sessionId);
    res.json({ success: true, data: cart ? serialize(cart) : null });
  } catch (err) {
    next(err);
  }
}

export async function mergeCart(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.body as { sessionId: string };
    if (sessionId) await cartService.mergeGuestCart(sessionId, userId);
    const cart = await cartService.getOrCreateCart(userId);
    res.json({ success: true, data: serialize(cart) });
  } catch (err) {
    next(err);
  }
}

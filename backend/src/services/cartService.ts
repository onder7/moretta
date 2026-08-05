import { prisma } from '../config/database';
import type { CartItem } from '@prisma/client';

const CART_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          attributeValues: {
            include: {
              attributeValue: {
                include: {
                  attribute: { select: { id: true, name: true, slug: true, inputType: true, sortOrder: true } },
                },
              },
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

async function findCart(userId?: string, sessionId?: string) {
  if (userId) return prisma.cart.findFirst({ where: { userId }, include: CART_INCLUDE });
  if (sessionId) return prisma.cart.findFirst({ where: { sessionId }, include: CART_INCLUDE });
  return null;
}

async function createCart(userId?: string, sessionId?: string) {
  const expiresAt = userId
    ? undefined
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return prisma.cart.create({
    data: userId ? { userId } : { sessionId, expiresAt },
    include: CART_INCLUDE,
  });
}

export async function getOrCreateCart(userId?: string, sessionId?: string) {
  const cart = await findCart(userId, sessionId);
  return cart ?? createCart(userId, sessionId);
}

function stockError() {
  return Object.assign(new Error('Yetersiz stok'), { status: 400 });
}
function notFoundError(msg: string) {
  return Object.assign(new Error(msg), { status: 404 });
}

export async function addItem(
  userId: string | undefined,
  sessionId: string | undefined,
  variantId: string,
  quantity: number,
) {
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant || !variant.isActive) throw notFoundError('Ürün bulunamadı');

  const cart = await getOrCreateCart(userId, sessionId);
  const existing = cart.items.find((i: CartItem) => i.variantId === variantId);
  const newQty = (existing?.quantity ?? 0) + quantity;

  if (variant.stockQty < newQty) throw stockError();

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, variantId, quantity, priceAtAdd: variant.price },
    });
  }

  return getOrCreateCart(userId, sessionId);
}

export async function updateItem(
  userId: string | undefined,
  sessionId: string | undefined,
  itemId: string,
  quantity: number,
) {
  const cart = await findCart(userId, sessionId);
  if (!cart) throw notFoundError('Sepet bulunamadı');

  const item = cart.items.find((i: CartItem) => i.id === itemId);
  if (!item) throw notFoundError('Ürün sepette bulunamadı');

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
    if (variant && variant.stockQty < quantity) throw stockError();
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  return getOrCreateCart(userId, sessionId);
}

export async function removeItem(
  userId: string | undefined,
  sessionId: string | undefined,
  itemId: string,
) {
  const cart = await findCart(userId, sessionId);
  if (!cart) throw notFoundError('Sepet bulunamadı');

  const item = cart.items.find((i: CartItem) => i.id === itemId);
  if (!item) throw notFoundError('Ürün sepette bulunamadı');

  await prisma.cartItem.delete({ where: { id: itemId } });
  return getOrCreateCart(userId, sessionId);
}

export async function clearCart(userId?: string, sessionId?: string) {
  const cart = await findCart(userId, sessionId);
  if (!cart) return null;
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return getOrCreateCart(userId, sessionId);
}

export async function mergeGuestCart(guestSessionId: string, userId: string) {
  const guestCart = await prisma.cart.findFirst({
    where: { sessionId: guestSessionId },
    include: { items: true },
  });

  if (!guestCart) return;

  if (guestCart.items.length > 0) {
    const userCart = await getOrCreateCart(userId);

    for (const guestItem of guestCart.items) {
      const existing = await prisma.cartItem.findUnique({
        where: { cartId_variantId: { cartId: userCart.id, variantId: guestItem.variantId } },
      });

      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + guestItem.quantity },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            variantId: guestItem.variantId,
            quantity: guestItem.quantity,
            priceAtAdd: guestItem.priceAtAdd,
          },
        });
      }
    }
  }

  await prisma.cart.delete({ where: { id: guestCart.id } });
}

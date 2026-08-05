import { prisma } from '../config/database';
import { AppError } from '../types';

export async function getWishlist(userId: string) {
  let wishlist = await prisma.wishlist.findFirst({
    where: { userId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  category: { select: { id: true, name: true, slug: true } },
                  brand: { select: { id: true, name: true, slug: true } },
                  images: {
                    orderBy: { sortOrder: 'asc' as const },
                    select: { id: true, url: true, altText: true, isPrimary: true },
                  },
                  variants: {
                    where: { isActive: true },
                    select: {
                      id: true, sku: true, price: true, compareAt: true,
                      stockQty: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!wishlist) {
    wishlist = await prisma.wishlist.create({
      data: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    category: { select: { id: true, name: true, slug: true } },
                    brand: { select: { id: true, name: true, slug: true } },
                    images: {
                      orderBy: { sortOrder: 'asc' as const },
                      select: { id: true, url: true, altText: true, isPrimary: true },
                    },
                    variants: {
                      where: { isActive: true },
                      select: {
                        id: true, sku: true, price: true, compareAt: true,
                        stockQty: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  return wishlist;
}

export async function toggleWishlistItem(userId: string, productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });

  if (!product) {
    throw new AppError('Ürün bulunamadı', 404);
  }

  const variantId = product.variants[0]?.id;
  if (!variantId) {
    throw new AppError('Ürünün varyantı bulunamadı', 400);
  }

  // Get or create wishlist
  let wishlist = await prisma.wishlist.findFirst({ where: { userId } });
  if (!wishlist) {
    wishlist = await prisma.wishlist.create({ data: { userId } });
  }

  // Check if item exists
  const existingItem = await prisma.wishlistItem.findUnique({
    where: {
      wishlistId_variantId: {
        wishlistId: wishlist.id,
        variantId,
      },
    },
  });

  if (existingItem) {
    await prisma.wishlistItem.delete({
      where: { id: existingItem.id },
    });
    return { added: false };
  } else {
    await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        variantId,
      },
    });
    return { added: true };
  }
}

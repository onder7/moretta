import express, { Request, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = express.Router();

// ─── GET /api/campaigns - Tüm kampanyaları listele
router.get('/', async (req: Request, res: Response) => {
  try {
    const { isActive, showOnHome } = req.query;

    const campaigns = await prisma.campaign.findMany({
      where: {
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        ...(showOnHome !== undefined && { showOnHome: showOnHome === 'true' }),
      },
      include: {
        products: {
          select: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: campaigns });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/campaigns/:id - Kampanya detayı
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: {
              include: {
                variants: {
                  select: {
                    id: true,
                    sku: true,
                    price: true,
                    stockQty: true,
                  },
                },
                images: {
                  select: {
                    id: true,
                    url: true,
                    isPrimary: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/campaigns - Yeni kampanya oluştur (ADMIN)
router.post(
  '/',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        discountText,
        discountAmount,
        discountType,
        startDate,
        endDate,
        isActive,
        showOnHome,
        color,
        displayType,
        imageUrl,
        ctaText,
        ctaLink,
      } = req.body;

      if (!name || !discountText || !startDate || !endDate) {
        return res.status(400).json({
          error: 'Missing required fields: name, discountText, startDate, endDate',
        });
      }

      const campaign = await prisma.campaign.create({
        data: {
          name,
          description,
          discountText,
          discountAmount: discountAmount ? parseFloat(discountAmount) : null,
          discountType: discountType || 'percentage',
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isActive: isActive ?? true,
          showOnHome: showOnHome ?? false,
          color: color || 'primary',
          displayType: displayType || 'sticky',
          imageUrl,
          ctaText,
          ctaLink,
        },
      });

      res.status(201).json({ success: true, data: campaign });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ─── PUT /api/campaigns/:id - Kampanya güncelle (ADMIN)
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const {
        name,
        description,
        discountText,
        discountAmount,
        discountType,
        startDate,
        endDate,
        isActive,
        showOnHome,
        color,
        displayType,
        imageUrl,
        ctaText,
        ctaLink,
      } = req.body;

      const campaign = await prisma.campaign.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(discountText && { discountText }),
          ...(discountAmount !== undefined && {
            discountAmount: discountAmount ? parseFloat(discountAmount) : null,
          }),
          ...(discountType && { discountType }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
          ...(isActive !== undefined && { isActive }),
          ...(showOnHome !== undefined && { showOnHome }),
          ...(color && { color }),
          ...(displayType && { displayType }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...(ctaText !== undefined && { ctaText }),
          ...(ctaLink !== undefined && { ctaLink }),
        },
      });

      res.json({ success: true, data: campaign });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ─── DELETE /api/campaigns/:id - Kampanya sil (ADMIN)
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);

      await prisma.campaign.delete({ where: { id } });

      res.json({ success: true, message: 'Campaign deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ─── POST /api/campaigns/:id/products - Kampanyaya ürün ekle (ADMIN)
router.post(
  '/:id/products',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const { productIds } = req.body;

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'productIds must be a non-empty array' });
      }

      const campaignProducts = await prisma.campaignProduct.createMany({
        data: productIds.map((productId: string) => ({
          id: `${id}-${productId}`,
          campaignId: id as string,
          productId,
        })),
        skipDuplicates: true,
      });

      res.json({ success: true, data: campaignProducts });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ─── DELETE /api/campaigns/:id/products - Kampanyadan tüm ürünleri çıkar (ADMIN)
router.delete(
  '/:id/products',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);

      await prisma.campaignProduct.deleteMany({
        where: { campaignId: id },
      });

      res.json({ success: true, message: 'All products removed from campaign' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ─── DELETE /api/campaigns/:id/products/:productId - Kampanyadan ürün çıkar (ADMIN)
router.delete(
  '/:id/products/:productId',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : (req.params.productId as string);

      await prisma.campaignProduct.delete({
        where: {
          campaignId_productId: {
            campaignId: id,
            productId,
          },
        },
      });

      res.json({ success: true, message: 'Product removed from campaign' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;

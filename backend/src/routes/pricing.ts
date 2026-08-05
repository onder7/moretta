import express from 'express';
import { PrismaClient } from '@prisma/client';
import { calculateVariantPricing, calculateProductPricing } from '../utils/pricing';

const router = express.Router();
const prisma = new PrismaClient();

// Update product pricing method and cost
router.put('/products/:productId/pricing', async (req, res) => {
  try {
    const { productId } = req.params;
    const { pricingMethod, costPrice, markupPercentage } = req.body;

    // Validation
    if (!['fixed', 'markup'].includes(pricingMethod)) {
      return res.status(400).json({ error: 'pricingMethod must be "fixed" or "markup"' });
    }

    if (pricingMethod === 'markup' && (!costPrice || !markupPercentage)) {
      return res.status(400).json({ error: 'costPrice and markupPercentage required for markup method' });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        pricingMethod,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        markupPercentage: markupPercentage ? parseFloat(markupPercentage) : null,
      },
      include: { variants: true },
    });

    // İlişkili varyantları da döndür (pricing hesaplarken gerekli)
    const variants = await Promise.all(
      product.variants.map(async (variant) => {
        const pricing = calculateVariantPricing(variant, product);
        return { ...variant, ...pricing };
      })
    );

    res.json({
      success: true,
      data: { ...product, variants },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get product pricing details
router.get('/products/:productId/pricing', async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Her varyant için fiyat detaylarını hesapla
    const variants = product.variants.map((variant) => {
      const pricing = calculateVariantPricing(variant, product);
      return {
        id: variant.id,
        sku: variant.sku,
        ...pricing,
      };
    });

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          pricingMethod: product.pricingMethod,
          costPrice: product.costPrice ? Number(product.costPrice) : null,
          markupPercentage: product.markupPercentage ? Number(product.markupPercentage) : null,
        },
        variants,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update variant pricing override
router.put('/variants/:variantId/pricing-override', async (req, res) => {
  try {
    const { variantId } = req.params;
    const { costPriceOverride, markupPercentageOverride } = req.body;

    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        costPriceOverride: costPriceOverride ? parseFloat(costPriceOverride) : null,
        markupPercentageOverride: markupPercentageOverride ? parseFloat(markupPercentageOverride) : null,
      },
      include: { product: true },
    });

    const pricing = calculateVariantPricing(variant, variant.product);

    res.json({
      success: true,
      data: {
        variant: {
          id: variant.id,
          sku: variant.sku,
          ...pricing,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clear variant pricing override (use product defaults)
router.delete('/variants/:variantId/pricing-override', async (req, res) => {
  try {
    const { variantId } = req.params;

    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        costPriceOverride: null,
        markupPercentageOverride: null,
      },
      include: { product: true },
    });

    const pricing = calculateVariantPricing(variant, variant.product);

    res.json({
      success: true,
      message: 'Pricing override cleared, using product defaults',
      data: {
        variant: {
          id: variant.id,
          sku: variant.sku,
          ...pricing,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Pricing report for all variants of a product
router.get('/products/:productId/pricing-report', async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          include: {
            orderItems: {
              select: { quantity: true, subtotal: true },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Tüm varyantlar için detaylı rapor
    const variantReports = product.variants.map((variant) => {
      const pricing = calculateVariantPricing(variant, product);
      const totalSold = variant.orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalRevenue = variant.orderItems.reduce((sum, item) => sum + Number(item.subtotal), 0);

      return {
        id: variant.id,
        sku: variant.sku,
        ...pricing,
        sales: {
          unitsSold: totalSold,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalCost: pricing.costPrice ? Math.round(pricing.costPrice * totalSold * 100) / 100 : null,
          totalProfit: pricing.profit ? Math.round(pricing.profit * totalSold * 100) / 100 : null,
        },
      };
    });

    // Ürün seviyesi özet
    const totalUnitsSold = variantReports.reduce((sum, v) => sum + v.sales.unitsSold, 0);
    const totalRevenue = variantReports.reduce((sum, v) => sum + v.sales.totalRevenue, 0);
    const totalCost = variantReports.reduce((sum, v) => sum + (v.sales.totalCost || 0), 0);
    const totalProfit = totalRevenue - totalCost;

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          pricingMethod: product.pricingMethod,
        },
        variants: variantReports,
        summary: {
          totalUnitsSold,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalCost: Math.round(totalCost * 100) / 100,
          totalProfit: Math.round(totalProfit * 100) / 100,
          profitMargin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100 * 100) / 100 : 0,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

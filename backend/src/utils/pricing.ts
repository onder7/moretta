import { Decimal } from '@prisma/client/runtime/library';

export interface PricingInfo {
  sellingPrice: number;
  costPrice: number | null;
  markupPercentage: number | null;
  profit: number | null;
  profitPercentage: number | null;
}

export interface VariantPricingData {
  price: Decimal;
  costPriceOverride: Decimal | null;
  markupPercentageOverride: Decimal | null;
}

export interface ProductPricingData {
  pricingMethod: string;
  costPrice: Decimal | null;
  markupPercentage: Decimal | null;
}

/**
 * Varyant için gerçek fiyat bilgisini hesapla
 * Product seviyesinde override varsa onu kullan, yoksa product default'ını kullan
 */
export function calculateVariantPricing(
  variant: VariantPricingData,
  product: ProductPricingData
): PricingInfo {
  const sellingPrice = Number(variant.price);

  // Varyant override varsa onu kullan, yoksa product default'ını kullan
  const costPrice = variant.costPriceOverride || product.costPrice;
  const markupPercentage = variant.markupPercentageOverride || product.markupPercentage;

  // Markup modda ise, costPrice + % hesapla
  if (product.pricingMethod === 'markup' && costPrice && markupPercentage) {
    const costPriceNum = Number(costPrice);
    const markupNum = Number(markupPercentage);
    const calculatedPrice = costPriceNum + (costPriceNum * markupNum / 100);

    return {
      sellingPrice: Math.round(calculatedPrice * 100) / 100,
      costPrice: costPriceNum,
      markupPercentage: markupNum,
      profit: calculatedPrice - costPriceNum,
      profitPercentage: markupNum,
    };
  }

  // Fixed mode ise, satış fiyatını direkt kullan
  if (costPrice) {
    const costPriceNum = Number(costPrice);
    const profit = sellingPrice - costPriceNum;
    const profitPercentage = (profit / costPriceNum) * 100;

    return {
      sellingPrice,
      costPrice: costPriceNum,
      markupPercentage: null,
      profit: Math.round(profit * 100) / 100,
      profitPercentage: Math.round(profitPercentage * 100) / 100,
    };
  }

  // Alış fiyatı yoksa sadece satış fiyatını dön
  return {
    sellingPrice,
    costPrice: null,
    markupPercentage: null,
    profit: null,
    profitPercentage: null,
  };
}

/**
 * Ürün seviyesinde hesaplama (tüm varyantlar için)
 */
export function calculateProductPricing(
  product: ProductPricingData,
  sellingPrice: number
): PricingInfo {
  // Markup modda ise, costPrice + % hesapla
  if (product.pricingMethod === 'markup' && product.costPrice && product.markupPercentage) {
    const costPrice = Number(product.costPrice);
    const markup = Number(product.markupPercentage);
    const calculatedPrice = costPrice + (costPrice * markup / 100);

    return {
      sellingPrice: Math.round(calculatedPrice * 100) / 100,
      costPrice,
      markupPercentage: markup,
      profit: calculatedPrice - costPrice,
      profitPercentage: markup,
    };
  }

  // Fixed mode ise, satış fiyatını direkt kullan
  if (product.costPrice) {
    const costPrice = Number(product.costPrice);
    const profit = sellingPrice - costPrice;
    const profitPercentage = (profit / costPrice) * 100;

    return {
      sellingPrice,
      costPrice,
      markupPercentage: null,
      profit: Math.round(profit * 100) / 100,
      profitPercentage: Math.round(profitPercentage * 100) / 100,
    };
  }

  return {
    sellingPrice,
    costPrice: null,
    markupPercentage: null,
    profit: null,
    profitPercentage: null,
  };
}

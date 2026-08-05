import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/productService';

function qs(val: unknown): string | undefined {
  if (typeof val === 'string') return val || undefined;
  if (Array.isArray(val)) return typeof val[0] === 'string' ? val[0] : undefined;
  return undefined;
}

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, minPrice, maxPrice, inStock, onSale } = req.query;

    // attributes[renk][]=Beyaz&attributes[renk][]=Mavi  veya  attributes[beden][]=35
    const rawAttrs = req.query.attributes as Record<string, string | string[]> | undefined;
    let attributes: Record<string, string[]> | undefined;
    if (rawAttrs && typeof rawAttrs === 'object') {
      attributes = {};
      for (const [slug, val] of Object.entries(rawAttrs)) {
        attributes[slug] = Array.isArray(val) ? val : [val];
      }
    }

    const result = await svc.listProducts({
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
      search: qs(req.query.search),
      categorySlug: qs(req.query.category),
      brandId: qs(req.query.brand),
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort: qs(req.query.sort) as svc.ProductFilters['sort'],
      inStock: inStock === 'true',
      onSale: onSale === 'true',
      attributes,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getFilterOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categorySlug = qs(req.query.category);
    const options = await svc.getFilterOptions(categorySlug);
    res.json({ success: true, data: options });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await svc.getProductBySlug(req.params['slug'] as string);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function getFeatured(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const products = await svc.getFeaturedProducts(Number(req.query.limit) || 8);
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

export async function getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await svc.listCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

export async function getCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await svc.getCategoryBySlug(req.params['slug'] as string);
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

export async function getBrands(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const brands = await svc.listBrands();
    res.json({ success: true, data: brands });
  } catch (err) {
    next(err);
  }
}

import { api } from './api';
import type { Product, Category, Brand } from '@/types';

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  inStock?: boolean;
  onSale?: boolean;
  attributes?: Record<string, string[]>;
}

export interface ProductListResponse {
  success: boolean;
  items: Product[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface FilterAttributeValue {
  id: string;
  value: string;
  colorHex: string | null;
  sortOrder: number;
}

export interface FilterAttribute {
  id: string;
  name: string;
  slug: string;
  inputType: string;
  values: FilterAttributeValue[];
}

export interface FilterOptions {
  attributes: FilterAttribute[];
  brands: Pick<Brand, 'id' | 'name' | 'slug'>[];
  priceRange: { min: number; max: number };
}

export const productApi = {
  list: (filters: ProductFilters = {}) => {
    const params = new URLSearchParams();
    const { attributes, ...rest } = filters;
    Object.entries(rest).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
    // attributes[renk][]=Beyaz&attributes[renk][]=Mavi
    if (attributes) {
      for (const [slug, values] of Object.entries(attributes)) {
        values.forEach((val) => params.append(`attributes[${slug}][]`, val));
      }
    }
    return api.get<ProductListResponse>(`/products?${params}`);
  },

  filterOptions: (categorySlug?: string) => {
    const params = categorySlug ? `?category=${categorySlug}` : '';
    return api.get<{ success: boolean; data: FilterOptions }>(`/products/filter-options${params}`);
  },

  featured: (limit = 8) =>
    api.get<{ success: boolean; data: Product[] }>(`/products/featured?limit=${limit}`),

  get: (slug: string) =>
    api.get<{ success: boolean; data: Product }>(`/products/${slug}`),

  categories: () =>
    api.get<{ success: boolean; data: Category[] }>('/categories'),

  category: (slug: string) =>
    api.get<{ success: boolean; data: Category }>(`/categories/${slug}`),

  brands: () =>
    api.get<{ success: boolean; data: Brand[] }>('/brands'),

  shippingConfig: () =>
    api.get<{ success: boolean; data: { shippingFee: number; freeShippingThreshold: number } }>('/shipping-config'),
};

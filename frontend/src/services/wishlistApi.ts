import { api } from './api';
import type { Product } from '@/types';

export interface WishlistItem {
  id: string;
  wishlistId: string;
  variantId: string;
  variant: {
    id: string;
    sku: string;
    price: number;
    compareAt?: number;
    product: Product;
  };
}

export interface Wishlist {
  id: string;
  userId: string;
  items: WishlistItem[];
}

export interface WishlistResponse {
  success: boolean;
  data: Wishlist;
}

export interface WishlistToggleResponse {
  success: boolean;
  data: {
    added: boolean;
  };
}

export const wishlistApi = {
  get: () => api.get<WishlistResponse>('/wishlist'),
  toggle: (productId: string) => api.post<WishlistToggleResponse>('/wishlist/toggle', { productId }),
};

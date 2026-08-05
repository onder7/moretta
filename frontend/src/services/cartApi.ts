import { api } from './api';
import type { Cart } from '@/types';
import { useCartStore } from '@/store/cartStore';

export interface CartResponse {
  success: boolean;
  data: Cart;
}

function sessionHeaders() {
  return { 'X-Session-ID': useCartStore.getState().sessionId };
}

export const cartApi = {
  get: () =>
    api.get<CartResponse>('/cart', { headers: sessionHeaders() }),

  addItem: (variantId: string, quantity = 1) =>
    api.post<CartResponse>('/cart/items', { variantId, quantity }, { headers: sessionHeaders() }),

  updateItem: (itemId: string, quantity: number) =>
    api.put<CartResponse>(`/cart/items/${itemId}`, { quantity }, { headers: sessionHeaders() }),

  removeItem: (itemId: string) =>
    api.delete<CartResponse>(`/cart/items/${itemId}`, { headers: sessionHeaders() }),

  clear: () =>
    api.delete<CartResponse>('/cart', { headers: sessionHeaders() }),

  merge: (sessionId: string) =>
    api.post<CartResponse>('/cart/merge', { sessionId }),
};

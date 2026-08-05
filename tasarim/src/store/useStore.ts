import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, GrindOption } from '@/types';

interface StoreState {
  cart: CartItem[];
  favorites: string[];
  addToCart: (product: Product, grind: GrindOption, quantity?: number) => void;
  removeFromCart: (productId: string, grind: GrindOption) => void;
  updateQuantity: (productId: string, grind: GrindOption, quantity: number) => void;
  clearCart: () => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  cartCount: () => number;
  cartTotal: () => number;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      cart: [],
      favorites: [],

      addToCart: (product, grind, quantity = 1) =>
        set((state) => {
          const existing = state.cart.find(
            (item) => item.product.id === product.id && item.grind === grind,
          );
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.product.id === product.id && item.grind === grind
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              ),
            };
          }
          return { cart: [...state.cart, { product, grind, quantity }] };
        }),

      removeFromCart: (productId, grind) =>
        set((state) => ({
          cart: state.cart.filter(
            (item) => !(item.product.id === productId && item.grind === grind),
          ),
        })),

      updateQuantity: (productId, grind, quantity) =>
        set((state) => ({
          cart: state.cart
            .map((item) =>
              item.product.id === productId && item.grind === grind
                ? { ...item, quantity: Math.max(0, quantity) }
                : item,
            )
            .filter((item) => item.quantity > 0),
        })),

      clearCart: () => set({ cart: [] }),

      toggleFavorite: (productId) =>
        set((state) => ({
          favorites: state.favorites.includes(productId)
            ? state.favorites.filter((id) => id !== productId)
            : [...state.favorites, productId],
        })),

      isFavorite: (productId) => get().favorites.includes(productId),

      cartCount: () => get().cart.reduce((sum, item) => sum + item.quantity, 0),

      cartTotal: () =>
        get().cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    }),
    { name: 'aroma-coffee-store' },
  ),
);

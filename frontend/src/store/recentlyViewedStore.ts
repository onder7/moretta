import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types';

const MAX_ITEMS = 10;

interface RecentlyViewedState {
  items: Product[];
  add: (product: Product) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      add: (product) =>
        set((state) => {
          const filtered = state.items.filter((p) => p.id !== product.id);
          return { items: [product, ...filtered].slice(0, MAX_ITEMS) };
        }),
      clear: () => set({ items: [] }),
    }),
    { name: 'recently-viewed' }
  )
);

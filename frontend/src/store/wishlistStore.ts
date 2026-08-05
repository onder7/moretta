import { create } from 'zustand';
import { wishlistApi } from '@/services/wishlistApi';
import { useAuthStore } from './authStore';
import { toast } from 'sonner';

interface WishlistState {
  items: any[];
  isLoading: boolean;
  fetchWishlist: () => Promise<void>;
  toggleFavorite: (productId: string) => Promise<boolean>;
  isFavorite: (productId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  isLoading: false,

  fetchWishlist: async () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) return;

    set({ isLoading: true });
    try {
      const res = await wishlistApi.get();
      set({ items: res.data.data?.items ?? [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleFavorite: async (productId: string) => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) {
      toast.error('Favorilere eklemek için lütfen giriş yapın.');
      return false;
    }

    try {
      const res = await wishlistApi.toggle(productId);
      const added = res.data.data.added;
      
      // Re-fetch to get complete updated items list
      await get().fetchWishlist();
      
      if (added) {
        toast.success('Ürün favorilere eklendi');
      } else {
        toast.success('Ürün favorilerden çıkarıldı');
      }
      return added;
    } catch {
      toast.error('İşlem gerçekleştirilemedi');
      return false;
    }
  },

  isFavorite: (productId: string) => {
    return get().items.some(
      (item) => item.variant?.product?.id === productId
    );
  },

  clearWishlist: () => set({ items: [] }),
}));
export default useWishlistStore;

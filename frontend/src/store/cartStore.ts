import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cart } from '@/types';

export interface AppliedCoupon {
  code: string;
  value: number;
  type: 'PERCENT' | 'FIXED';
}

/**
 * Misafir sepeti için oturum kimliği üretir.
 *
 * crypto.randomUUID yalnızca güvenli bağlamda (HTTPS / localhost) tanımlıdır ve
 * Safari 15.4 öncesinde hiç yoktur. Store'un ilk değerinde çağrıldığı için,
 * eksik olduğunda modül yüklenirken patlayıp tüm uygulamayı boş sayfaya
 * çeviriyordu. Yoksa getRandomValues ile RFC 4122 v4 UUID üretiyoruz.
 */
function makeSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; // sürüm 4
  b[8] = (b[8] & 0x3f) | 0x80; // varyant 10x
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

interface CartState {
  cart: Cart | null;
  sessionId: string;
  itemCount: number;
  appliedCoupon: AppliedCoupon | null;
  setCart: (cart: Cart | null) => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  clearSession: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: null,
      sessionId: makeSessionId(),
      itemCount: 0,
      appliedCoupon: null,
      setCart: (cart) =>
        set({
          cart,
          itemCount: cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
        }),
      setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),
      clearSession: () => set({ sessionId: makeSessionId(), cart: null, itemCount: 0, appliedCoupon: null }),
    }),
    { name: 'cart' },
  ),
);

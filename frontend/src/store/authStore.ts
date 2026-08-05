import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User, token: string) => void;
  setTokens: (token: string) => void;
  logout: () => void;
}

// isGuest'i store state'inden ayır; user nesnesinden türet.
// Bu sayede persist/hydrate tutarsızlığı olmaz.
export function selectIsGuest(state: AuthState): boolean {
  return (state.user as unknown as { isGuest?: boolean } | null)?.isGuest === true;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setUser: (user, accessToken) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
        }),
      setTokens: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'auth',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        isAuthenticated: s.isAuthenticated,
      }),
    },
  ),
);

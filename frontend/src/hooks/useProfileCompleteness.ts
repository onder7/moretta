import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';

/**
 * Kullanıcının profilinde eksik (tanımlı adres / telefon) bilgi olup olmadığını döndürür.
 * Header'daki hesap ikonunda uyarı noktası ve /hesabim sayfasındaki uyarı banner'ı için kullanılır.
 * Adres sorgusu AccountDashboard ile aynı query key'i (['addresses']) kullandığından ekstra istek yapmaz.
 */
export function useProfileCompleteness() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  // Misafir kullanıcılar için uyarı gösterme (onların profil yönetimi yok)
  const enabled = Boolean(isAuthenticated && !user?.isGuest);

  const { data: addresses = [], isLoading } = useQuery<any[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/addresses', { credentials: 'include' });
        if (!res.ok) return [];
        const data = await res.json();
        return data.data || [];
      } catch {
        return [];
      }
    },
    enabled,
    staleTime: 60_000,
  });

  const hasPhone = Boolean(user?.profile?.phone?.trim());
  const missingPhone = enabled && !hasPhone;
  // Adres sorgusu henüz yüklenirken "adres yok" uyarısı gösterme (yanıp sönmesin)
  const missingAddress = enabled && !isLoading && addresses.length === 0;
  const hasWarning = Boolean(missingPhone || missingAddress);

  let message = '';
  if (missingAddress && missingPhone) {
    message = 'Tanımlı adresiniz ve telefon numaranız bulunmamaktadır.';
  } else if (missingAddress) {
    message = 'Tanımlı adresiniz bulunmamaktadır.';
  } else if (missingPhone) {
    message = 'Tanımlı telefon numaranız bulunmamaktadır.';
  }

  return { hasWarning, missingPhone, missingAddress, message, enabled };
}

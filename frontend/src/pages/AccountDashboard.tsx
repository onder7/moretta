import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { CancellationModal } from '@/components/order/CancellationModal';
import { CancellationStatus } from '@/components/order/CancellationStatus';
import { ReturnModal } from '@/components/order/ReturnModal';
import { ReturnStatus } from '@/components/order/ReturnStatus';
import { GuestActivationCard } from '@/components/auth/GuestActivationCard';
import { useQuery } from '@tanstack/react-query';
import { checkoutApi } from '@/services/checkoutApi';
import { authApi } from '@/services/authApi';
import { toast } from 'sonner';
import {
  ShoppingBag,
  Heart,
  Star,
  Gift,
  User,
  Lock,
  LogOut,
  ChevronRight,
  Edit2,
  Mail,
  Phone,
  ArrowLeft,
  MapPin,
  MessageCircle,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';
import { useAuthStore, selectIsGuest } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { useTaxConfig } from '@/hooks/useTaxConfig';

// ─── Hesabım sekmeleri ↔ URL eşlemesi ───────────────────────────────────────
// Her sekmenin kendi adresi var; aktif sekme yoldan türetilir.

export const SECTION_TO_PATH: Record<string, string> = {
  overview:  '/hesabim',
  cart:      '/hesabim/sepetim',
  orders:    '/hesabim/siparisler',
  favorites: '/hesabim/favoriler',
  reviews:   '/hesabim/degerlendirmelerim',
  questions: '/hesabim/sorularim',
  coupons:   '/hesabim/indirimlerim',
  profile:   '/hesabim/profil',
  addresses: '/hesabim/adresler',
  activation:'/hesabim/aktiflestir',
};

const PATH_TO_SECTION: Record<string, string> = Object.fromEntries(
  Object.entries(SECTION_TO_PATH).map(([section, path]) => [path, section]),
);

/**
 * Aktif sekmeyi adresten çözer. Eski `?tab=` bağlantıları da çalışmaya devam
 * etsin diye, yol eşleşmediğinde sorgu parametresine bakılır.
 */
function sectionFromPath(pathname: string, tabParam: string | null): string {
  const clean = pathname.replace(/\/+$/, '') || '/hesabim';
  // Eski `/hesabim?tab=reviews` biçimindeki bağlantılar çalışmaya devam etsin.
  // Yalnızca temel adreste geçerli; alt yollarda yol bilgisi esas alınır.
  if (clean === '/hesabim' && tabParam && SECTION_TO_PATH[tabParam]) return tabParam;
  return PATH_TO_SECTION[clean] ?? 'overview';
}

function formatPrice(price: number) {
  return price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

// Sipariş özeti kırılımı için 2 ondalıklı (fatura ile aynı hassasiyet)
function formatPrice2(price: number) {
  return price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-800' },
  PROCESSING: { label: 'İşleniyor', color: 'bg-blue-100 text-blue-800' },
  SHIPPED: { label: 'Kargoda', color: 'bg-purple-100 text-purple-800' },
  DELIVERED: { label: 'Teslim Edildi', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'İptal Edildi', color: 'bg-red-100 text-red-800' },
  REFUNDED: { label: 'İade Edildi', color: 'bg-orange-100 text-orange-800' },
};

export function AccountDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { name: storeName } = useStoreInfo();
  const { taxRate } = useTaxConfig();
  const { hasWarning: profileHasWarning, missingAddress, missingPhone, message: profileWarningMessage } = useProfileCompleteness();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setCart, setAppliedCoupon } = useCartStore();
  const location = useLocation();
  // Aktif sekme URL'den türetilir; state tutulmaz. Böylece hem doğrudan link
  // paylaşılabilir hem de zaten /hesabim'dayken menüden başka sekmeye geçilebilir
  // (state kullanıldığında bileşen yeniden mount olmadığı için sekme değişmiyordu).
  const activeSection = sectionFromPath(location.pathname, searchParams.get('tab'));
  const setActiveSection = (id: string) => navigate(SECTION_TO_PATH[id] ?? '/hesabim');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    phone: user?.profile?.phone || '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Sosyal girişli (şifresiz) hesap → "Şifre Belirle" göster. hasPassword'ı mount'ta tazele.
  const noPassword = user?.hasPassword === false;
  useEffect(() => {
    authApi.me()
      .then((res) => setUser(res.data.data as any, accessToken ?? ''))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [appliedCoupons, setAppliedCoupons] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [orderCancellation, setOrderCancellation] = useState<any>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnVersion, setReturnVersion] = useState(0);

  function handleLogout() {
    logout();
    navigate('/');
  }

  async function handleSelectOrder(orderId: string) {
    setSelectedOrderId(orderId);
    setLoadingOrderDetail(true);
    try {
      const res = await fetch(`/api/checkout/orders/${orderId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Sipariş detayı yüklenemedi');
      const data = await res.json();
      setSelectedOrderDetail(data.data);

      // Varsa iptal talebi durumunu da yükle
      try {
        const cRes = await fetch(`/api/checkout/orders/${orderId}/cancellation`, { credentials: 'include' });
        setOrderCancellation(cRes.ok ? (await cRes.json()).data || null : null);
      } catch {
        setOrderCancellation(null);
      }
    } catch (err: any) {
      alert(err.message || 'Sipariş detayı yüklenemedi');
    } finally {
      setLoadingOrderDetail(false);
    }
  }

  async function handleSaveProfile() {
    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Profil güncellenemedi');
      }

      const data = await res.json();
      const raw = data.data?.profile;
      setUser(
        {
          ...user!,
          profile: raw
            ? {
                firstName: raw.firstName ?? undefined,
                lastName: raw.lastName ?? undefined,
                phone: raw.phone ?? undefined,
                avatarUrl: raw.avatarUrl ?? undefined,
              }
            : user!.profile,
        },
        accessToken ?? '',
      );
      setIsEditingProfile(false);
      toast.success('Profil güncellendi');
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu');
    } finally {
      setIsSavingProfile(false);
    }
  }

  function validateNewPassword(): boolean {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return false;
    }
    const pw = passwordForm.newPassword;
    if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) {
      toast.error('Yeni şifre en az 8 karakter, 1 büyük harf ve 1 rakam içermelidir');
      return false;
    }
    return true;
  }

  async function handleChangePassword() {
    // Sosyal girişli (şifresiz) hesap → mevcut şifre istemeden belirle
    if (noPassword) {
      if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
        toast.error('Yeni şifre alanlarını doldurun');
        return;
      }
      if (!validateNewPassword()) return;
      setIsSavingPassword(true);
      try {
        await authApi.setPassword(passwordForm.newPassword);
        toast.success('Şifre belirlendi. Artık e-posta ve şifrenizle de giriş yapabilirsiniz.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        authApi.me().then((res) => setUser(res.data.data as any, accessToken ?? '')).catch(() => {});
      } catch (err: any) {
        const resp = err?.response?.data;
        const detail = resp?.details ? Object.values(resp.details).flat()[0] : undefined;
        toast.error((detail as string) ?? resp?.message ?? resp?.error ?? 'Şifre belirlenemedi');
      } finally {
        setIsSavingPassword(false);
      }
      return;
    }

    // Şifresi olan hesap → mevcut şifre gerekli
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Tüm alanları doldurun');
      return;
    }
    if (!validateNewPassword()) return;
    setIsSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      toast.success('Şifre başarıyla değiştirildi');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Şifre değiştirilemedi');
    } finally {
      setIsSavingPassword(false);
    }
  }

  // Get user initials
  const initials = user?.email
    ?.split('@')[0]
    .split('')
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  // Fetch orders
  const { data: ordersData = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/checkout/orders', { credentials: 'include' });
        if (!res.ok) return [];
        const data = await res.json();
        return data.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 0, // Her zaman stale
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // PayTR ödemesi başarıyla tamamlanınca buraya yönlendiriliyoruz (?odeme=basarili).
  // Sunucu sepeti zaten temizledi; client sepet state'ini de temizle, kullanıcıyı
  // bilgilendir, siparişleri tazele ve URL'i temizle.
  useEffect(() => {
    if (searchParams.get('odeme') !== 'basarili') return;
    setCart(null);
    setAppliedCoupon(null);
    refetchOrders();
    toast.success('Ödemeniz başarıyla tamamlandı. Siparişiniz oluşturuldu.');
    // Siparişler sekmesine geç ve ödeme parametrelerini adresten temizle (tek adımda).
    navigate('/hesabim/siparisler', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch favorites
  const { data: favoritesData = [], isLoading: favoritesLoading, refetch: refetchFavorites } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/wishlist', { credentials: 'include' });
        if (!res.ok) return [];
        const data = await res.json();
        return data.data?.items || [];
      } catch {
        return [];
      }
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch reviews
  const { data: reviewsData = [], isLoading: reviewsLoading, refetch: refetchReviews } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/reviews/my-reviews', { credentials: 'include' });
        if (!res.ok) return [];
        const data = await res.json();
        return data.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch questions
  const { data: questionsData = [], isLoading: questionsLoading, refetch: refetchQuestions } = useQuery({
    queryKey: ['my-questions'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/questions/my-questions', { credentials: 'include' });
        if (!res.ok) return [];
        const data = await res.json();
        return data.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch addresses
  const { data: addressesData = [], isLoading: addressesLoading, refetch: refetchAddresses } = useQuery({
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
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch cart
  const { data: cartData = null, isLoading: cartLoading, refetch: refetchCart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/cart', { credentials: 'include' });
        if (!res.ok) return null;
        const data = await res.json();
        return data.data || null;
      } catch {
        return null;
      }
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Kargo & KDV ayarları (sepet özeti için)
  const { data: shippingConfig } = useQuery({
    queryKey: ['shipping-config'],
    queryFn: async () => {
      const res = await fetch('/api/shipping-config');
      return res.ok ? (await res.json()).data : null;
    },
  });
  const { data: taxConfig } = useQuery({
    queryKey: ['tax-config'],
    queryFn: async () => {
      const res = await fetch('/api/tax-config');
      return res.ok ? (await res.json()).data : null;
    },
  });

  // Refetch data when section changes
  useEffect(() => {
    if (activeSection === 'overview') {
      refetchOrders();
      refetchFavorites();
      refetchReviews();
      refetchCart();
    } else if (activeSection === 'orders') {
      refetchOrders();
    } else if (activeSection === 'favorites') {
      refetchFavorites();
    } else if (activeSection === 'reviews') {
      refetchReviews();
    } else if (activeSection === 'cart') {
      refetchCart();
    } else if (activeSection === 'profile') {
      refetchAddresses();
    } else if (activeSection === 'questions') {
      refetchQuestions();
    } else if (activeSection === 'coupons') {
      fetchAppliedCoupons();
    }
  }, [activeSection, refetchOrders, refetchFavorites, refetchReviews, refetchQuestions, refetchCart, refetchAddresses]);

  // Kullanıcının kazandığı kuponları tek endpoint'ten çek
  async function fetchAppliedCoupons() {
    try {
      const res = await checkoutApi.getMyCoupons();
      setAppliedCoupons(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch applied coupons:', err);
      setAppliedCoupons([]);
    }
  }

  const menuItems = [
    {
      id: 'overview',
      icon: User,
      label: 'Hesap Özeti',
      badge: null,
    },
    {
      id: 'cart',
      icon: ShoppingBag,
      label: 'Sepetim',
      badge: cartData?.items?.length ? String(cartData.items.length) : null,
    },
    {
      id: 'orders',
      icon: ShoppingBag,
      label: 'Siparişlerim',
      badge: ordersData.length > 0 ? String(ordersData.length) : null,
    },
    {
      id: 'favorites',
      icon: Heart,
      label: 'Beğendiklerim',
      badge: favoritesData.length > 0 ? String(favoritesData.length) : null,
    },
    {
      id: 'reviews',
      icon: Star,
      label: 'Değerlendirmelerim',
      badge: reviewsData.length > 0 ? String(reviewsData.length) : null,
    },
    {
      id: 'questions',
      icon: MessageCircle,
      label: 'Soru & Cevaplarım',
      badge: questionsData.length > 0 ? String(questionsData.length) : null,
    },
    {
      id: 'coupons',
      icon: Gift,
      label: 'İndirimlerim',
      badge: null,
    },
    {
      id: 'profile',
      icon: User,
      label: 'Profil Bilgileri',
      badge: null,
    },
    {
      id: 'addresses',
      icon: MapPin,
      label: 'Kayıtlı Adresler',
      badge: addressesData.length > 0 ? String(addressesData.length) : null,
    },
  ];

  const isGuest = useAuthStore(selectIsGuest);

  const filteredMenuItems = isGuest
    ? [
        {
          id: 'orders',
          icon: ShoppingBag,
          label: 'Siparişlerim',
          badge: ordersData.length > 0 ? String(ordersData.length) : null,
        },
        {
          id: 'activation',
          icon: UserPlus,
          label: 'Hesabı Aktifleştir',
          badge: null,
        },
      ]
    : menuItems;

  // Misafirlikten çıkmış kullanıcı /hesabim/aktiflestir'de kalırsa sayfa boş
  // görünür — GuestActivationCard üye hesapta hiçbir şey basmıyor. Özete al.
  useEffect(() => {
    if (activeSection === 'activation' && !isGuest) {
      navigate('/hesabim', { replace: true });
    }
  }, [activeSection, isGuest, navigate]);

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Eksik profil uyarısı (tanımlı adres / telefon yok) */}
      {profileHasWarning && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800 dark:text-amber-200">{profileWarningMessage}</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Siparişlerinizin sorunsuz iletilebilmesi için bilgilerinizi tamamlamanızı öneririz.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {missingAddress && (
                  <Link
                    to="/hesabim/adresler"
                    className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
                  >
                    <MapPin size={14} /> Adres Ekle
                  </Link>
                )}
                {missingPhone && (
                  <Link
                    to="/hesabim/profil"
                    onClick={() => setIsEditingProfile(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-600 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                  >
                    <Phone size={14} /> Telefon Ekle
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Profile Card */}
          <div className="bg-white rounded-lg border border-espresso-100 p-6 mb-6 dark:bg-espresso-900 dark:border-espresso-700 sticky top-20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-lg">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-espresso-900 dark:text-white truncate">
                  {user?.profile?.firstName || user?.email?.split('@')[0] || 'Kullanıcı'}
                </p>
                <p className="text-sm text-espresso-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => setActiveSection('profile')}
              className="text-sm text-primary hover:underline flex items-center gap-1 w-full justify-center py-2 hover:bg-primary/10 rounded transition"
            >
              <Edit2 size={14} /> Düzenle
            </button>
          </div>

          {/* Menu Items */}
          <nav className="space-y-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeSection === item.id
                      ? 'bg-primary text-white'
                      : 'text-espresso-600 hover:bg-cream-50 dark:text-cream-300 dark:hover:bg-espresso-800'
                  }`}
                >
                  <Icon size={18} />
                  <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 mt-6 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Çıkış Yap</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Activation */}
          {activeSection === 'activation' && (
            <div className="bg-white rounded-xl border p-6">
              <GuestActivationCard />
            </div>
          )}

          {/* Overview */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-espresso-900 dark:text-white mb-2">
                  Hoş geldin, {user?.profile?.firstName || user?.email?.split('@')[0]}!
                </h1>
                <p className="text-espresso-500 dark:text-cream-400">
                  Hesap özeti ve etkinliklerini burada yönetebilirsin.
                </p>
              </div>

              {/* Stats */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-espresso-100 p-6 dark:bg-espresso-900 dark:border-espresso-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-espresso-500 dark:text-cream-400">Toplam Sipariş</p>
                      <p className="text-3xl font-bold text-espresso-900 dark:text-white">
                        {ordersData.length}
                      </p>
                    </div>
                    <ShoppingBag size={32} className="text-primary opacity-20" />
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-espresso-100 p-6 dark:bg-espresso-900 dark:border-espresso-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-espresso-500 dark:text-cream-400">Beğendiler</p>
                      <p className="text-3xl font-bold text-espresso-900 dark:text-white">
                        {favoritesData.length}
                      </p>
                    </div>
                    <Heart size={32} className="text-red-500 opacity-20" />
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-espresso-100 p-6 dark:bg-espresso-900 dark:border-espresso-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-espresso-500 dark:text-cream-400">Kuponlarım</p>
                      <p className="text-3xl font-bold text-espresso-900 dark:text-white">0</p>
                    </div>
                    <Gift size={32} className="text-purple-500 opacity-20" />
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-espresso-100 p-6 dark:bg-espresso-900 dark:border-espresso-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-espresso-500 dark:text-cream-400">Değerlendirmelerim</p>
                      <p className="text-3xl font-bold text-espresso-900 dark:text-white">
                        {reviewsData.length}
                      </p>
                    </div>
                    <Star size={32} className="text-yellow-500 opacity-20" />
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              {ordersData.length > 0 && (
                <div className="bg-white rounded-lg border border-espresso-100 dark:bg-espresso-900 dark:border-espresso-700">
                  <div className="p-6 border-b border-espresso-100 dark:border-espresso-700">
                    <h2 className="text-lg font-bold text-espresso-900 dark:text-white">
                      Son Siparişler
                    </h2>
                  </div>

                  <div className="divide-y divide-espresso-100 dark:divide-espresso-700">
                    {ordersData.slice(0, 3).map((order: any) => (
                      <div key={order.id} className="p-4 hover:bg-cream-50 dark:hover:bg-espresso-800 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-espresso-900 dark:text-white">
                              Sipariş #{order.id.slice(0, 8)}
                            </p>
                            <p className="text-sm text-espresso-500 dark:text-cream-400">
                              {new Date(order.createdAt).toLocaleDateString('tr-TR')} • {order.items?.length || 0} Ürün
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold text-espresso-900 dark:text-white">
                                {order.total ? formatPrice(order.total) : '-'}
                              </p>
                              <span className={`inline-block text-sm font-medium px-2 py-1 rounded mt-1 ${ORDER_STATUS_MAP[order.status]?.color || 'bg-cream-100 text-espresso-700'}`}>
                                {ORDER_STATUS_MAP[order.status]?.label || order.status}
                              </span>
                            </div>
                            <ChevronRight size={20} className="text-espresso-300" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cart */}
          {activeSection === 'cart' && (
            <div className="bg-white rounded-lg border border-espresso-100 dark:bg-espresso-900 dark:border-espresso-700">
              <div className="p-6 border-b border-espresso-100 dark:border-espresso-700">
                <h2 className="text-2xl font-bold text-espresso-900 dark:text-white">Sepetim</h2>
              </div>

              {cartLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : !cartData || !cartData.items || cartData.items.length === 0 ? (
                <div className="p-12 text-center text-espresso-400 dark:text-cream-400">
                  <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="mb-4">Sepetiniz boş</p>
                  <Link
                    to="/"
                    className="inline-block text-primary hover:underline font-medium"
                  >
                    Alışverişe başla →
                  </Link>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Cart Items */}
                  <div className="space-y-4">
                    {cartData.items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex gap-4 p-4 bg-cream-50 dark:bg-espresso-800 rounded-lg"
                      >
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-cream-200 dark:bg-espresso-700 flex-shrink-0">
                          {item.variant?.product?.images?.[0] ? (
                            <img
                              src={item.variant.product.images[0].url}
                              alt={item.variant.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-espresso-200" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <Link
                              to={`/urun/${item.variant?.product?.slug}`}
                              className="font-medium text-espresso-900 dark:text-white hover:text-primary transition-colors"
                            >
                              {item.variant?.product?.name || 'Ürün'}
                            </Link>
                          </div>
                          {item.variant?.sku && (
                            <p className="text-xs text-espresso-400 dark:text-cream-400">SKU: {item.variant.sku}</p>
                          )}
                          <p className="text-sm text-espresso-500 dark:text-cream-400 mt-1">
                            Adet: {item.quantity}
                          </p>
                          <p className="text-sm font-semibold text-primary mt-2">
                            {formatPrice((item.priceAtAdd || 0) * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cart Summary */}
                  <div className="border-t border-espresso-100 dark:border-espresso-700 pt-6">
                    {(() => {
                      const subtotal = cartData.items.reduce(
                        (sum: number, item: any) => sum + (item.priceAtAdd || 0) * item.quantity,
                        0,
                      );
                      const shippingFee = shippingConfig?.shippingFee ?? 49.9;
                      const freeThreshold = shippingConfig?.freeShippingThreshold ?? 500;
                      const taxRate = taxConfig?.taxRate ?? 20;
                      const shipping = subtotal >= freeThreshold ? 0 : shippingFee;
                      const tax = Math.round(subtotal * taxRate) / 100;
                      const total = subtotal + tax + shipping;
                      return (
                        <div className="space-y-2 text-sm mb-6">
                          <div className="flex justify-between">
                            <span className="text-espresso-500 dark:text-cream-400">Ara Toplam (KDV Hariç)</span>
                            <span className="text-espresso-900 dark:text-white">{formatPrice(subtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-espresso-500 dark:text-cream-400">Kargo</span>
                            <span className={shipping === 0 ? 'text-green-600 font-medium' : 'text-espresso-900 dark:text-white'}>
                              {shipping === 0 ? 'Ücretsiz' : formatPrice(shipping)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-espresso-500 dark:text-cream-400">KDV (%{taxRate})</span>
                            <span className="text-espresso-900 dark:text-white">{formatPrice(tax)}</span>
                          </div>
                          {shipping > 0 && (
                            <p className="text-xs text-espresso-400 dark:text-cream-400">
                              {formatPrice(freeThreshold - subtotal)} daha ekleyin, kargo ücretsiz olsun.
                            </p>
                          )}
                          <div className="flex justify-between border-t border-espresso-100 dark:border-espresso-700 pt-2 font-semibold">
                            <span>Toplam</span>
                            <span className="text-primary text-lg">{formatPrice(total)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <Link
                      to="/sepet"
                      className="block w-full text-center px-4 py-3 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-all"
                    >
                      Sepete Git →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orders */}
          {activeSection === 'orders' && (
            <div className="bg-white rounded-lg border border-espresso-100 dark:bg-espresso-900 dark:border-espresso-700">
              {selectedOrderId ? (
                // Order Detail View
                <>
                  <div className="p-6 border-b border-espresso-100 dark:border-espresso-700 flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedOrderId(null);
                        setSelectedOrderDetail(null);
                        setOrderCancellation(null);
                      }}
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-2xl font-bold text-espresso-900 dark:text-white">
                      Sipariş #{selectedOrderId.slice(-8).toUpperCase()}
                    </h2>
                  </div>

                  {loadingOrderDetail ? (
                    <div className="p-6 text-center text-espresso-500">Yükleniyor...</div>
                  ) : !selectedOrderDetail ? (
                    <div className="p-6 text-center text-espresso-500">Sipariş bulunamadı</div>
                  ) : (
                    (() => {
                      const order = selectedOrderDetail;

                    return (
                      <div className="p-6 space-y-6">
                        {/* Order Header Info */}
                        <div className="bg-cream-50 dark:bg-espresso-800 rounded-lg p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-espresso-500 dark:text-cream-400 font-medium mb-1">Sipariş No</p>
                              <p className="font-mono font-semibold text-espresso-900 dark:text-white">#TR-{order.id.slice(-8).toUpperCase()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-espresso-500 dark:text-cream-400 font-medium mb-1">Sipariş Tarihi</p>
                              <p className="text-sm text-espresso-900 dark:text-white">
                                {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-espresso-500 dark:text-cream-400 font-medium mb-1">Toplam Tutar</p>
                              <p className="text-sm font-semibold text-espresso-900 dark:text-white">{formatPrice(Number(order.total))}</p>
                            </div>
                            <div>
                              <p className="text-xs text-espresso-500 dark:text-cream-400 font-medium mb-1">Ödeme Yöntemi</p>
                              <p className="text-sm font-mono text-espresso-900 dark:text-white">{order.paymentMethod || '—'}</p>
                            </div>
                            {order.paymentId && (
                              <div>
                                <p className="text-xs text-espresso-500 dark:text-cream-400 font-medium mb-1">Ödendi</p>
                                <p className="text-sm font-mono text-espresso-900 dark:text-white">{order.paymentId}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-espresso-500 dark:text-cream-400 font-medium mb-1">Sipariş Durumu</p>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${ORDER_STATUS_MAP[order.status]?.color || 'bg-cream-100 text-espresso-700'}`}>
                                {ORDER_STATUS_MAP[order.status]?.label || order.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="border-t border-espresso-100 dark:border-espresso-700 pt-6">
                          <h3 className="font-semibold text-espresso-900 dark:text-white mb-4">Sipariş Ürünleri</h3>
                          <div className="space-y-4">
                            {order.items?.length > 0 ? (
                              order.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex gap-4 p-4 bg-cream-50 dark:bg-espresso-800 rounded-lg">
                                  <div className="w-16 h-16 rounded-md overflow-hidden bg-cream-200 dark:bg-espresso-700 flex-shrink-0">
                                    {item.variant?.product?.images?.[0] ? (
                                      <img
                                        src={item.variant.product.images[0].url}
                                        alt={item.variant.product.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-espresso-200" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-espresso-900 dark:text-white">
                                      {item.variant?.product?.name || 'Ürün'}
                                    </p>
                                    <p className="text-sm text-espresso-500 dark:text-cream-400 mt-1">
                                      Adet: {item.quantity}
                                    </p>
                                    <p className="text-sm font-semibold text-primary mt-2">
                                      {item.priceAtAdd ? formatPrice(item.priceAtAdd * item.quantity) : '-'}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-espresso-500 dark:text-cream-400">Ürün bilgisi bulunamadı</p>
                            )}
                          </div>
                        </div>

                        {/* Order Summary */}
                        <div className="border-t border-espresso-100 dark:border-espresso-700 pt-6">
                          <h3 className="font-semibold text-espresso-900 dark:text-white mb-4">Sipariş Özeti</h3>
                          <div className="space-y-2 text-sm">
                            {order.discount !== undefined && Number(order.discount) > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span className="text-espresso-500 dark:text-cream-400">İskonto</span>
                                <span className="font-medium">
                                  −{formatPrice2(Number(order.discount))}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold">
                              <span className="text-espresso-900 dark:text-white">Toplam</span>
                              <span className="text-espresso-900 dark:text-white">
                                {order.total ? formatPrice2(Number(order.total)) : '-'}
                              </span>
                            </div>
                            <div className="border-t border-espresso-100 dark:border-espresso-700 pt-3 mt-1 flex justify-between">
                              <span className="text-espresso-500 dark:text-cream-400">Ara Toplam</span>
                              <span className="text-espresso-900 dark:text-white">
                                {order.total ? formatPrice2(Number(order.total) / (1 + taxRate / 100)) : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-espresso-500 dark:text-cream-400">KDV (%{taxRate})</span>
                              <span className="text-espresso-900 dark:text-white">
                                {formatPrice2(Math.max(0, Number(order.total) - Number(order.total) / (1 + taxRate / 100)))}
                              </span>
                            </div>
                            <div className="border-t border-espresso-100 dark:border-espresso-700 pt-2 flex justify-between font-semibold">
                              <span>Genel Toplam</span>
                              <span className="text-primary text-lg">
                                {order.total ? formatPrice2(Number(order.total)) : '-'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Shipping Address */}
                        {order.address && (
                          <div className="border-t border-espresso-100 dark:border-espresso-700 pt-6">
                            <h3 className="font-semibold text-espresso-900 dark:text-white mb-3 flex items-center gap-2">
                              <MapPin size={18} /> Teslimat Adresi
                            </h3>
                            <p className="text-espresso-600 dark:text-cream-300 text-sm">
                              {order.address.firstName} {order.address.lastName}
                            </p>
                            <p className="text-espresso-600 dark:text-cream-300 text-sm mt-1">
                              {order.address.address}, {order.address.district} / {order.address.city}
                            </p>
                            {order.address.phone && (
                              <p className="text-espresso-600 dark:text-cream-300 text-sm mt-2">
                                📱 {order.address.phone}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Shipping Info */}
                        {order.shipping && (
                          <div className="border-t border-espresso-100 dark:border-espresso-700 pt-6">
                            <h3 className="font-semibold text-espresso-900 dark:text-white mb-3">Kargo Bilgileri</h3>
                            <div className="space-y-2 text-sm">
                              {order.shipping.carrier && (
                                <div><span className="text-espresso-500 dark:text-cream-400">Kargo Firması:</span> <span className="font-medium text-espresso-900 dark:text-white">{order.shipping.carrier}</span></div>
                              )}
                              {order.shipping.trackingNumber && (
                                <div><span className="text-espresso-500 dark:text-cream-400">Takip No:</span> <span className="font-mono text-espresso-900 dark:text-white">{order.shipping.trackingNumber}</span></div>
                              )}
                              {order.shipping.estimatedAt && (
                                <div><span className="text-espresso-500 dark:text-cream-400">Tahmini Teslimat:</span> <span className="text-espresso-900 dark:text-white">{new Date(order.shipping.estimatedAt).toLocaleDateString('tr-TR')}</span></div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Status History */}
                        {order.statusHistory && order.statusHistory.length > 0 && (
                          <div className="border-t border-espresso-100 dark:border-espresso-700 pt-6">
                            <h3 className="font-semibold text-espresso-900 dark:text-white mb-4">Sipariş Geçmişi</h3>
                            <ol className="relative border-l border-espresso-100 dark:border-espresso-700 ml-2 space-y-4">
                              {order.statusHistory.map((log: any, idx: number) => (
                                <li key={idx} className="ml-4">
                                  <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-primary" />
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${ORDER_STATUS_MAP[log.status]?.color || 'bg-cream-100 text-espresso-700'}`}>
                                      {ORDER_STATUS_MAP[log.status]?.label || log.status}
                                    </span>
                                    <span className="text-xs text-espresso-400 dark:text-cream-400">
                                      {new Date(log.createdAt).toLocaleDateString('tr-TR')}
                                    </span>
                                  </div>
                                  {log.note && (
                                    <p className="text-xs text-espresso-500 dark:text-cream-400 mt-1">{log.note}</p>
                                  )}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* İptal talebi durumu / iptal butonu */}
                        {orderCancellation ? (
                          <div className="border-t border-espresso-100 dark:border-espresso-700 pt-6">
                            <CancellationStatus
                              status={orderCancellation.status}
                              reason={orderCancellation.reason}
                              adminNotes={orderCancellation.adminNotes}
                            />
                          </div>
                        ) : ['PENDING', 'PROCESSING'].includes(order.status) ? (
                          <div className="border-t border-espresso-100 dark:border-espresso-700 pt-6">
                            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800 flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-blue-900 dark:text-blue-200">Siparişi İptal Edebilirsiniz</p>
                                <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">Kargo gitmeden önce iptal talebi oluşturabilirsiniz. Onaylanırsa ödemeniz iade edilir.</p>
                              </div>
                              <button
                                onClick={() => setCancelModalOpen(true)}
                                className="flex-shrink-0 px-4 py-2 rounded-md border border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 text-sm font-medium transition-colors"
                              >
                                İptal Et
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {/* İade durumu + İade talebi butonu (kargolanmış/teslim) */}
                        <div className="border-t border-espresso-100 dark:border-espresso-700 pt-6">
                          <ReturnStatus orderId={order.id} version={returnVersion} />
                          {['SHIPPED', 'DELIVERED'].includes(order.status) && (
                            <div className="border rounded-lg p-4 bg-cream-50 border-espresso-100 dark:bg-espresso-800/40 dark:border-espresso-700 flex items-start justify-between gap-4 mt-3">
                              <div>
                                <p className="font-medium text-espresso-900 dark:text-cream-100">Ürün İadesi</p>
                                <p className="text-sm text-espresso-500 dark:text-cream-400 mt-1">Ürünlerin tamamını veya bir kısmını iade edebilirsiniz.</p>
                              </div>
                              <button
                                onClick={() => setReturnModalOpen(true)}
                                className="flex-shrink-0 px-4 py-2 rounded-md border border-espresso-200 text-espresso-600 hover:bg-cream-100 dark:border-espresso-600 dark:text-cream-300 text-sm font-medium transition-colors"
                              >
                                İade Talebi Oluştur
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                    })()
                  )}

                  {/* İptal talebi modalı */}
                  {selectedOrderId && (
                    <CancellationModal
                      orderId={selectedOrderId}
                      isOpen={cancelModalOpen}
                      onClose={() => setCancelModalOpen(false)}
                      onSuccess={() => {
                        setCancelModalOpen(false);
                        handleSelectOrder(selectedOrderId);
                        refetchOrders();
                      }}
                    />
                  )}

                  {/* İade talebi modalı */}
                  {selectedOrderId && selectedOrderDetail && (
                    <ReturnModal
                      orderId={selectedOrderId}
                      items={(selectedOrderDetail.items ?? []) as any}
                      isOpen={returnModalOpen}
                      onClose={() => setReturnModalOpen(false)}
                      onSuccess={() => { setReturnModalOpen(false); setReturnVersion((v) => v + 1); }}
                    />
                  )}
                </>
              ) : (
                // Orders List View
                <>
                  <div className="p-6 border-b border-espresso-100 dark:border-espresso-700">
                    <h2 className="text-2xl font-bold text-espresso-900 dark:text-white">Siparişlerim</h2>
                  </div>

                  {ordersLoading ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                    </div>
                  ) : ordersData.length === 0 ? (
                    <div className="p-12 text-center text-espresso-400 dark:text-cream-400">
                      Henüz sipariş bulunmamaktadır.
                    </div>
                  ) : (
                    <div className="p-6 space-y-3">
                      {ordersData.map((order: any) => {
                        const images = order.items?.map((item: any) => item.variant?.product?.images?.[0]?.url).filter(Boolean) || [];
                        const extraCount = (order.items?.length || 0) - 1;

                        return (
                          <button
                            key={order.id}
                            onClick={() => handleSelectOrder(order.id)}
                            className="w-full border border-espresso-100 dark:border-espresso-700 rounded-lg p-4 hover:bg-cream-50 dark:hover:bg-espresso-800 transition-colors text-left"
                          >
                            <div className="flex items-center gap-4">
                              {/* Product Images */}
                              <div className="flex gap-1 flex-shrink-0">
                                {images.slice(0, 2).map((img: string, idx: number) => (
                                  <div key={idx} className="w-14 h-14 rounded bg-cream-100 dark:bg-espresso-700 overflow-hidden flex-shrink-0">
                                    <img src={img} alt="Ürün" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                                {extraCount > 1 && (
                                  <div className="w-14 h-14 rounded bg-cream-100 dark:bg-espresso-700 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-semibold text-espresso-500 dark:text-cream-400">+{extraCount}</span>
                                  </div>
                                )}
                              </div>

                              {/* Order Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm text-primary font-medium">Sipariş no: {order.id.slice(-8).toUpperCase()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_MAP[order.status]?.color || 'bg-cream-100 text-espresso-700'}`}>
                                    ✓ {ORDER_STATUS_MAP[order.status]?.label || order.status}
                                  </span>
                                </div>
                              </div>

                              {/* Date & Price */}
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm text-espresso-500 dark:text-cream-400">
                                  {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                                </p>
                                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                  {order.total ? formatPrice(Number(order.total)) : '-'}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Favorites */}
          {activeSection === 'favorites' && (
            <div className="bg-white rounded-lg border border-espresso-100 dark:bg-espresso-900 dark:border-espresso-700">
              <div className="p-6 border-b border-espresso-100 dark:border-espresso-700">
                <h2 className="text-2xl font-bold text-espresso-900 dark:text-white">Beğendiklerim</h2>
              </div>

              {favoritesLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : favoritesData.length === 0 ? (
                <div className="p-12 text-center text-espresso-400 dark:text-cream-400">
                  Henüz beğenilen ürün bulunmamaktadır.
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4 p-6">
                  {favoritesData.map((item: any) => (
                    <Link
                      key={item.id}
                      to={`/urun/${item.variant?.product?.slug}`}
                      className="group border border-espresso-100 dark:border-espresso-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow dark:hover:shadow-lg dark:hover:shadow-primary/20"
                    >
                      <div className="aspect-square bg-cream-100 dark:bg-espresso-800 overflow-hidden relative">
                        {item.variant?.product?.images?.[0] ? (
                          <img
                            src={item.variant.product.images[0].url}
                            alt={item.variant.product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-espresso-300">
                            <ShoppingBag size={40} />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="font-medium text-espresso-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
                          {item.variant?.product?.name || 'Ürün'}
                        </p>
                        <p className="text-xs text-espresso-400 dark:text-cream-400 mt-1">
                          {item.variant?.product?.category?.name || 'Kategori'}
                        </p>
                        <div className="flex items-baseline gap-2 mt-3">
                          <p className="text-lg font-bold text-primary">
                            {item.variant?.price
                              ? formatPrice(Number(item.variant.price))
                              : '-'
                            }
                          </p>
                          {item.variant?.compareAt && Number(item.variant.compareAt) > Number(item.variant.price) && (
                            <p className="text-xs text-espresso-300 line-through">
                              {formatPrice(Number(item.variant.compareAt))}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile */}
          {activeSection === 'profile' && (
            <div className="bg-white rounded-lg border border-espresso-100 dark:bg-espresso-900 dark:border-espresso-700">
              <div className="p-6 border-b border-espresso-100 dark:border-espresso-700 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-espresso-900 dark:text-white">Profil Bilgileri</h2>
                <button
                  onClick={() => {
                    if (isEditingProfile) {
                      setProfileForm({
                        firstName: user?.profile?.firstName || '',
                        lastName: user?.profile?.lastName || '',
                        phone: user?.profile?.phone || '',
                      });
                    }
                    setIsEditingProfile(!isEditingProfile);
                  }}
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  {isEditingProfile ? 'İptal' : '✏️ Düzenle'}
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-espresso-600 dark:text-cream-300 mb-2">
                      Ad
                    </label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      disabled={!isEditingProfile}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                        isEditingProfile
                          ? 'border-primary bg-white text-espresso-900 dark:bg-espresso-700 dark:text-white'
                          : 'border-espresso-100 bg-cream-50 text-espresso-900 dark:border-espresso-700 dark:bg-espresso-800 dark:text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-espresso-600 dark:text-cream-300 mb-2">
                      Soyadı
                    </label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      disabled={!isEditingProfile}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                        isEditingProfile
                          ? 'border-primary bg-white text-espresso-900 dark:bg-espresso-700 dark:text-white'
                          : 'border-espresso-100 bg-cream-50 text-espresso-900 dark:border-espresso-700 dark:bg-espresso-800 dark:text-white'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-espresso-600 dark:text-cream-300 mb-2">
                    <Mail size={16} className="inline mr-2" />
                    E-posta (Değiştiremez)
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border border-espresso-100 bg-cream-50 text-espresso-900 dark:border-espresso-700 dark:bg-espresso-800 dark:text-white cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-espresso-600 dark:text-cream-300 mb-2">
                    <Phone size={16} className="inline mr-2" />
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    disabled={!isEditingProfile}
                    placeholder="+90 5XX XXX XXXX"
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isEditingProfile
                        ? 'border-primary bg-white text-espresso-900 dark:bg-espresso-700 dark:text-white'
                        : 'border-espresso-100 bg-cream-50 text-espresso-900 dark:border-espresso-700 dark:bg-espresso-800 dark:text-white'
                    }`}
                  />
                </div>

                {/* Addresses */}
                <div className="border-t border-espresso-100 dark:border-espresso-700 pt-6">
                  <h3 className="font-semibold text-espresso-900 dark:text-white mb-4 flex items-center gap-2">
                    <MapPin size={18} /> Kayıtlı Adresler
                  </h3>
                  {addressesLoading ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : addressesData.length === 0 ? (
                    <p className="text-sm text-espresso-500 dark:text-cream-400">
                      Henüz kayıtlı adres bulunmamaktadır.
                      <Link to="/hesabim/adresler" className="text-primary hover:underline ml-2">
                        Adres ekle →
                      </Link>
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {addressesData.map((address: any) => (
                        <div
                          key={address.id}
                          className="p-4 rounded-lg border border-espresso-100 dark:border-espresso-700 hover:border-primary transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium text-espresso-900 dark:text-white">
                              {address.firstName} {address.lastName}
                            </p>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {(address.type === 'SHIPPING' || address.type === 'BOTH') && (
                                <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded">📦 Gönderim</span>
                              )}
                              {(address.type === 'BILLING' || address.type === 'BOTH') && (
                                <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 rounded">💳 Fatura</span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-espresso-600 dark:text-cream-300">
                            {address.address}
                          </p>
                          <p className="text-sm text-espresso-500 dark:text-cream-400 mt-1">
                            {address.postalCode} {address.city}
                          </p>
                          {address.phone && (
                            <p className="text-sm text-espresso-500 dark:text-cream-400 mt-1">
                              📱 {address.phone}
                            </p>
                          )}
                        </div>
                      ))}
                      <Link
                        to="/hesabim/adresler"
                        className="inline-block text-sm text-primary hover:underline font-medium mt-2"
                      >
                        Adreslerinizi Yönetin →
                      </Link>
                    </div>
                  )}
                </div>

                {isEditingProfile && (
                  <div className="flex gap-3 pt-4 border-t border-espresso-100 dark:border-espresso-700">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="flex-1 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all"
                    >
                      {isSavingProfile ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingProfile(false);
                        setProfileForm({
                          firstName: user?.profile?.firstName || '',
                          lastName: user?.profile?.lastName || '',
                          phone: user?.profile?.phone || '',
                        });
                      }}
                      className="px-4 py-2 border border-espresso-100 dark:border-espresso-700 text-espresso-600 dark:text-cream-300 font-medium rounded-lg hover:bg-cream-50 dark:hover:bg-espresso-800 transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                )}

                {/* Şifre Değiştir / Belirle */}
                <div className="border-t border-espresso-100 dark:border-espresso-700 pt-6 mt-2">
                  <h3 className="font-semibold text-espresso-900 dark:text-white mb-4 flex items-center gap-2">
                    <Lock size={18} /> {noPassword ? 'Şifre Belirle' : 'Şifre Değiştir'}
                  </h3>
                  {noPassword && (
                    <p className="text-sm text-espresso-400 dark:text-cream-400 mb-4 max-w-md">
                      Hesabınız sosyal giriş (Google) ile oluşturulmuş ve henüz bir şifreniz yok. Şifre belirleyerek
                      bundan sonra e-posta ve şifrenizle de giriş yapabilirsiniz.
                    </p>
                  )}
                  <div className="space-y-4 max-w-md">
                    {[
                      ...(noPassword ? [] : [{ key: 'currentPassword', label: 'Mevcut Şifre', placeholder: '••••••••' }]),
                      { key: 'newPassword', label: 'Yeni Şifre', placeholder: 'En az 8 karakter, 1 büyük harf, 1 rakam' },
                      { key: 'confirmPassword', label: 'Yeni Şifre (Tekrar)', placeholder: '••••••••' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-espresso-600 dark:text-cream-300 mb-1">{label}</label>
                        <input
                          type="password"
                          placeholder={placeholder}
                          value={passwordForm[key as keyof typeof passwordForm]}
                          onChange={(e) => setPasswordForm({ ...passwordForm, [key]: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-espresso-100 dark:border-espresso-700 bg-white dark:bg-espresso-800 text-espresso-900 dark:text-white focus:border-primary outline-none transition-colors"
                        />
                      </div>
                    ))}
                    <button
                      onClick={handleChangePassword}
                      disabled={isSavingPassword}
                      className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      <Lock size={16} />
                      {isSavingPassword
                        ? (noPassword ? 'Belirleniyor...' : 'Değiştiriliyor...')
                        : (noPassword ? 'Şifre Belirle' : 'Şifreyi Değiştir')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reviews */}
          {activeSection === 'reviews' && (
            <div className="bg-white rounded-lg border border-espresso-100 dark:bg-espresso-900 dark:border-espresso-700">
              <div className="p-6 border-b border-espresso-100 dark:border-espresso-700">
                <h2 className="text-2xl font-bold text-espresso-900 dark:text-white">Değerlendirmelerim</h2>
              </div>

              {reviewsLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : reviewsData.length === 0 ? (
                <div className="p-12 text-center text-espresso-400 dark:text-cream-400">
                  Henüz değerlendirme yapılmamıştır.
                </div>
              ) : (
                <div className="divide-y divide-espresso-100 dark:divide-espresso-700">
                  {reviewsData.map((review: any) => (
                    <Link
                      key={review.id}
                      to={`/urun/${review.product?.slug}`}
                      className="p-6 hover:bg-cream-50 dark:hover:bg-espresso-800 transition-colors block group"
                    >
                      <div className="flex gap-4">
                        {review.product?.images?.[0] && (
                          <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-cream-100 dark:bg-espresso-800">
                            <img
                              src={review.product.images[0].url}
                              alt={review.product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-espresso-900 dark:text-white group-hover:text-primary transition-colors">
                                {review.product?.name || 'Ürün'}
                              </p>
                              <p className="text-xs text-espresso-400 dark:text-cream-400 mt-0.5">
                                {review.product?.category?.name || 'Kategori'}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star} className={`text-sm ${star <= review.rating ? 'text-yellow-400' : 'text-espresso-200'}`}>
                                      ★
                                    </span>
                                  ))}
                                </div>
                                <span className="text-sm font-medium text-espresso-900 dark:text-white">
                                  {review.rating}/5
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-espresso-400 whitespace-nowrap">
                                {new Date(review.createdAt).toLocaleDateString('tr-TR')}
                              </p>
                              {!review.isApproved && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                  ⏳ Onay Beklemede
                                </p>
                              )}
                              {review.isApproved && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  ✓ Onaylandı
                                </p>
                              )}
                            </div>
                          </div>
                          {review.title && (
                            <p className="font-medium text-espresso-900 dark:text-white mt-2">
                              {review.title}
                            </p>
                          )}
                          {review.body && (
                            <p className="text-sm text-espresso-600 dark:text-cream-300 mt-2 line-clamp-2">
                              {review.body}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Questions */}
          {activeSection === 'questions' && (
            <div className="bg-white rounded-lg border border-espresso-100 dark:bg-espresso-900 dark:border-espresso-700">
              <div className="p-6 border-b border-espresso-100 dark:border-espresso-700">
                <h2 className="text-2xl font-bold text-espresso-900 dark:text-white">Soru & Cevaplarım</h2>
              </div>

              {questionsLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : questionsData.length === 0 ? (
                <div className="p-12 text-center text-espresso-400 dark:text-cream-400">
                  <MessageCircle size={48} className="mx-auto text-espresso-200 mb-4" />
                  <p>Henüz soru sormadınız.</p>
                  <p className="text-sm mt-2">Ürün sayfalarından sorularınızı iletebilirsiniz.</p>
                </div>
              ) : (
                <div className="divide-y divide-espresso-100 dark:divide-espresso-700">
                  {questionsData.map((q: any) => (
                    <Link
                      key={q.id}
                      to={`/urun/${q.product?.slug}`}
                      className="p-6 hover:bg-cream-50 dark:hover:bg-espresso-800 transition-colors block group"
                    >
                      <div className="flex gap-4">
                        {q.product?.images?.[0] && (
                          <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-cream-100 dark:bg-espresso-800">
                            <img
                              src={q.product.images[0].url}
                              alt={q.product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-espresso-900 dark:text-white group-hover:text-primary transition-colors">
                                {q.product?.name || 'Ürün'}
                              </p>
                              <p className="text-sm text-espresso-600 dark:text-cream-300 mt-2">
                                {q.body}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <p className="text-xs text-espresso-400 whitespace-nowrap">
                                {new Date(q.createdAt).toLocaleDateString('tr-TR')}
                              </p>
                              {!q.isApproved && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                  ⏳ Onay Beklemede
                                </p>
                              )}
                              {q.isApproved && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  ✓ Onaylandı
                                </p>
                              )}
                            </div>
                          </div>

                          {q.answers && q.answers.length > 0 && (
                            <div className="mt-3 space-y-2 border-l-2 border-primary/30 pl-3">
                              {q.answers.map((ans: any) => {
                                const aName = ans.user?.profile?.firstName
                                  ? `${ans.user.profile.firstName} ${ans.user.profile.lastName || ''}`.trim()
                                  : 'Ekip';
                                return (
                                  <div key={ans.id}>
                                    <p className="text-xs font-semibold text-primary">
                                      {ans.user?.role === 'ADMIN' ? `✓ ${storeName || 'Satıcı'}` : aName}
                                    </p>
                                    <p className="text-sm text-espresso-500 dark:text-cream-400">{ans.body}</p>
                                    <p className="text-xs text-espresso-300 mt-0.5">
                                      {new Date(ans.createdAt).toLocaleDateString('tr-TR')}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {q.answers?.length === 0 && q.isApproved && (
                            <p className="text-xs text-espresso-300 mt-2 italic">Henüz cevaplanmadı</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Coupons — kullanılabilir kişiye özel kuponlar */}
          {activeSection === 'coupons' && (
            <div className="bg-white rounded-lg border border-espresso-100 p-6 dark:bg-espresso-900 dark:border-espresso-700">
              <h2 className="text-2xl font-bold text-espresso-900 dark:text-white mb-1">İndirimlerim</h2>
              <p className="text-sm text-espresso-400 dark:text-cream-400 mb-6">
                Size özel indirim kuponlarınız. Kupon kodunu sepette "Kupon Kodu" alanına girerek alışverişinizde kullanabilirsiniz.
              </p>
              {appliedCoupons.length === 0 ? (
                <div className="text-center py-12">
                  <Gift size={48} className="mx-auto text-espresso-300 mb-4" />
                  <p className="text-espresso-500 dark:text-cream-400">Henüz size özel bir kupon bulunmamaktadır.</p>
                  <p className="text-sm text-espresso-400 dark:text-espresso-400 mt-2">Bir siparişin iptalinden vazgeçip teklifi kabul ettiğinizde kuponunuz burada listelenir.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appliedCoupons.map((coupon, idx) => {
                    const statusBadge = coupon.usable
                      ? { text: 'Kullanılabilir', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' }
                      : coupon.used
                      ? { text: 'Kullanıldı', cls: 'bg-cream-100 text-espresso-400 dark:bg-espresso-800 dark:text-cream-400' }
                      : { text: 'Süresi Doldu', cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' };
                    return (
                      <div
                        key={idx}
                        className={`border rounded-lg p-4 ${coupon.usable
                          ? 'border-green-300 dark:border-green-800 bg-green-50/60 dark:bg-green-900/10'
                          : 'border-espresso-100 dark:border-espresso-700 bg-cream-50/60 dark:bg-espresso-800/30 opacity-80'}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-xs text-espresso-400 dark:text-cream-400 font-semibold uppercase tracking-wide mb-1">İndirim Tutarı</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                              {coupon.type === 'PERCENT' ? `%${coupon.value}` : `−${formatPrice(coupon.value)}`}
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadge.cls}`}>
                            {statusBadge.text}
                          </span>
                        </div>

                        {/* Kupon Kodu + Kopyala */}
                        <div className="flex items-center justify-between gap-2 bg-white dark:bg-espresso-900 border border-dashed border-green-300 dark:border-green-700 rounded-md px-3 py-2">
                          <span className="font-mono font-bold tracking-wider text-espresso-900 dark:text-white">{coupon.code}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(coupon.code);
                              setCopiedCode(coupon.code);
                              setTimeout(() => setCopiedCode(null), 1500);
                            }}
                            disabled={!coupon.usable}
                            className="text-xs font-semibold text-primary hover:underline disabled:text-espresso-300 disabled:no-underline"
                          >
                            {copiedCode === coupon.code ? '✓ Kopyalandı' : 'Kopyala'}
                          </button>
                        </div>

                        <div className="border-t border-espresso-100 dark:border-espresso-700 mt-3 pt-3 space-y-1">
                          {coupon.minOrder ? (
                            <p className="text-xs text-espresso-400 dark:text-cream-400">Min. sepet tutarı: <span className="font-medium text-espresso-600 dark:text-cream-300">{formatPrice(coupon.minOrder)}</span></p>
                          ) : null}
                          {coupon.expiresAt && (
                            <p className="text-xs text-espresso-400 dark:text-cream-400">
                              Son kullanım: <span className="font-medium text-espresso-600 dark:text-cream-300">
                                {new Date(coupon.expiresAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

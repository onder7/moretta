import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/sonner';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProtectedRoute, CustomerOnlyRoute } from '@/components/common/ProtectedRoute';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { LiveChat } from '@/components/common/LiveChat';
import { PopupNotification } from '@/components/common/PopupNotification';
import { CampaignDisplay } from '@/components/common/CampaignDisplay';
import { CookieConsent } from '@/components/common/CookieConsent';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { ResetPassword } from '@/pages/ResetPassword';
import { VerifyEmail } from '@/pages/VerifyEmail';
import { CategoryPage } from '@/pages/CategoryPage';
import { ProductDetail } from '@/pages/ProductDetail';
import CampaignDetail from '@/pages/CampaignDetail';
import { Search } from '@/pages/Search';
import { Cart } from '@/pages/Cart';
import { Checkout } from '@/pages/Checkout';
import { OrderSuccess } from '@/pages/OrderSuccess';
import { OrderDetail } from '@/pages/Orders';
import { Addresses } from '@/pages/Addresses';
import { NotFound } from '@/pages/NotFound';
import { AccountDashboard } from '@/pages/AccountDashboard';
import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import Maintenance from '@/pages/Maintenance';
import { SupportPage } from '@/pages/SupportPage';
import { CustomerServicePage } from '@/pages/CustomerServicePage';
import { CorporatePage } from '@/pages/CorporatePage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

function AppContent() {
  const location = useLocation();
  const isAuthPage = ['/giris', '/kayit', '/sifremi-unuttum', '/sifre-sifirla', '/e-posta-dogrula'].includes(location.pathname);
  // Ödeme sayfasında sabit alt menü, iyzico'nun sabitlenmiş "Öde" butonunu mobilde örtüyor — bu yüzden gizle
  const isCheckoutPage = location.pathname === '/odeme';

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <CampaignDisplay />
      {!isAuthPage && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Aşama 3 — Auth */}
        <Route path="/giris" element={<Login />} />
        <Route path="/kayit" element={<Register />} />
        <Route path="/sifremi-unuttum" element={<ForgotPassword />} />
        <Route path="/sifre-sifirla" element={<ResetPassword />} />
        <Route path="/e-posta-dogrula" element={<VerifyEmail />} />

        {/* Aşama 4 — Katalog */}
        <Route path="/kategori/:slug" element={<CategoryPage />} />
        <Route path="/urun/:slug" element={<ProductDetail />} />
        <Route path="/kampanya/:id" element={<CampaignDetail />} />
        <Route path="/ara" element={<Search />} />

        {/* Aşama 5 — Sepet */}
        <Route path="/sepet" element={<Cart />} />

        {/* Aşama 6 — Checkout */}
        <Route path="/siparis-tamamlandi" element={<OrderSuccess />} />

        {/* Müşteri Hizmetleri Rotaları */}
        <Route path="/musteri-hizmetleri" element={<CustomerServicePage />} />
        <Route path="/kurumsal" element={<CorporatePage />} />
        <Route path="/iletisim" element={<SupportPage />} />
        <Route path="/iade" element={<SupportPage />} />
        <Route path="/sss" element={<SupportPage />} />
        <Route path="/sozlesmeler" element={<SupportPage />} />
        <Route path="/hakkimizda" element={<SupportPage />} />
        <Route path="/kvkk" element={<SupportPage />} />
        <Route path="/uyelik" element={<SupportPage />} />
        <Route path="/sayfa/:slug" element={<SupportPage />} />

        {/* Korumalı route'lar */}
        <Route element={<ProtectedRoute />}>
          {/* Misafir yalnızca ödeme yapabilir; checkout ProtectedRoute altında kalır */}
          <Route path="/odeme" element={<Checkout />} />

          {/* Siparişler — misafir de kendi siparişlerini görebilir (JWT zorunlu) */}
          <Route path="/hesabim/siparisler" element={<AccountDashboard />} />
          <Route path="/hesabim/siparisler/:id" element={<OrderDetail />} />
          <Route path="/hesabim/aktiflestir" element={<AccountDashboard />} />

          {/* Tam üye sayfaları — misafir erişemez */}
          <Route element={<CustomerOnlyRoute />}>
            {/* Hesabım sekmeleri — her sekmenin kendi adresi var (paylaşılabilir, geri tuşu çalışır).
                Aktif sekme AccountDashboard içinde yoldan (pathname) türetilir. */}
            <Route path="/hesabim" element={<AccountDashboard />} />
            <Route path="/hesabim/sepetim" element={<AccountDashboard />} />
            <Route path="/hesabim/favoriler" element={<AccountDashboard />} />
            <Route path="/hesabim/degerlendirmelerim" element={<AccountDashboard />} />
            <Route path="/hesabim/sorularim" element={<AccountDashboard />} />
            <Route path="/hesabim/indirimlerim" element={<AccountDashboard />} />
            <Route path="/hesabim/profil" element={<AccountDashboard />} />
            <Route path="/hesabim/adresler" element={<Addresses />} />
          </Route>
        </Route>


        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isAuthPage && <Footer />}
      {!isCheckoutPage && <BottomNav />}
      {!isAuthPage && !isCheckoutPage && <LiveChat />}
      {!isAuthPage && <PopupNotification />}
      <CookieConsent />
    </div>
  );
}


export default function App() {
  const [maintenance, setMaintenance] = useState<{ isActive: boolean; message: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    api.get<{ success: boolean; data: { isActive: boolean; message: string } }>('/maintenance-status')
      .then((res) => {
        if (res.data?.success && res.data?.data?.isActive) {
          setMaintenance(res.data.data);
        }
      })
      .catch((err) => {
        console.error('Maintenance status check failed:', err);
      })
      .finally(() => {
        setChecking(false);
      });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-espresso-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Admin paneline giriş yapmış kişi de bypass eder
  const hasAdminPanelSession = !!localStorage.getItem('admin_token');

  const showMaintenance =
    maintenance?.isActive &&
    user?.role !== 'ADMIN' &&
    !hasAdminPanelSession &&
    window.location.pathname !== '/giris';

  if (showMaintenance) {
    return <Maintenance message={maintenance.message} />;
  }

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppContent />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

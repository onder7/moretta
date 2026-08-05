import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Grid2x2, ShoppingCart, User, LogOut } from 'lucide-react';
import { useAuthStore, selectIsGuest } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authApi } from '@/services/authApi';
import { toast } from 'sonner';

export function BottomNav() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const isGuest = useAuthStore(selectIsGuest);
  const itemCount = useCartStore((s) => s.itemCount);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    try { await authApi.logout(); } catch {}
    logout();
    toast.success('Cikis yapildi');
    navigate('/');
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-espresso-900 border-t border-espresso-100 dark:border-espresso-700 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around h-16">
        {/* Ana Sayfa */}
        <Link
          to="/"
          className={`relative flex flex-col items-center gap-1 py-2 px-4 transition-colors ${
            isActive('/') ? 'text-caramel-600' : 'text-espresso-500 dark:text-cream-300 hover:text-caramel-600'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Ana Sayfa</span>
        </Link>

        {/* Kategoriler */}
        <Link
          to="/ara"
          className={`relative flex flex-col items-center gap-1 py-2 px-4 transition-colors ${
            isActive('/ara') ? 'text-caramel-600' : 'text-espresso-500 dark:text-cream-300 hover:text-caramel-600'
          }`}
        >
          <Grid2x2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Kategoriler</span>
        </Link>

        {/* Sepet */}
        <Link
          to="/sepet"
          className={`relative flex flex-col items-center gap-1 py-2 px-4 transition-colors ${
            isActive('/sepet') ? 'text-caramel-600' : 'text-espresso-500 dark:text-cream-300 hover:text-caramel-600'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px] font-medium">Sepet</span>
          {itemCount > 0 && (
            <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-caramel-500 text-white text-[10px] flex items-center justify-center font-bold">
              {itemCount}
            </span>
          )}
        </Link>

        {/* Hesabim */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex flex-col items-center gap-1 py-2 px-4 text-espresso-500 dark:text-cream-300 hover:text-caramel-600 transition-colors cursor-pointer bg-transparent border-none outline-none">
              <User className="w-5 h-5" />
              <span className="text-[10px] font-medium">Hesabim</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
              <div className="px-3 py-2">
                <p className="text-xs font-medium truncate">{user?.profile?.firstName ?? user?.email}</p>
                <p className="text-[11px] text-espresso-400 truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/hesabim/siparisler')} className="text-xs cursor-pointer">Siparislerim</DropdownMenuItem>
              {!isGuest && (
                <>
                  <DropdownMenuItem onClick={() => navigate('/hesabim')} className="text-xs cursor-pointer">Hesap Ozeti</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/hesabim/profil')} className="text-xs cursor-pointer">Profil Bilgilerim</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/hesabim/favoriler')} className="text-xs cursor-pointer">Favori Urunlerim</DropdownMenuItem>
                </>
              )}
              {isGuest && (
                <DropdownMenuItem onClick={() => navigate('/hesabim/aktiflestir')} className="text-xs text-caramel-600 font-medium cursor-pointer">
                  Hesabi Aktiflestir
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive text-xs cursor-pointer">
                <LogOut className="h-3 w-3 mr-2" />
                Cikis Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            to="/giris"
            className="flex flex-col items-center gap-1 py-2 px-4 text-espresso-500 dark:text-cream-300 hover:text-caramel-600 transition-colors"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Hesabim</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

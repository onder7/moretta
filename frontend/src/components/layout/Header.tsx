import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Heart, ShoppingCart, User, Menu, X, ChevronDown,
  Truck, Tag, LogOut, Loader2, AlertTriangle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore, selectIsGuest } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { authApi } from '@/services/authApi';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/services/productApi';
import { api } from '@/services/api';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { useTaxConfig } from '@/hooks/useTaxConfig';
import type { Product } from '@/types';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const isGuest = useAuthStore(selectIsGuest);
  const { name: storeName } = useStoreInfo();
  const { hasWarning: profileHasWarning, message: profileWarningMessage } = useProfileCompleteness();
  const { taxRate } = useTaxConfig();
  const itemCount = useCartStore((s) => s.itemCount);
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [predictions, setPredictions] = useState<Product[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const { fetchWishlist } = useWishlistStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetch('/api/store-logo')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data?.logo_url) setLogoUrl(data.data.logo_url);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setPredictions([]);
      setLoadingPredictions(false);
      return;
    }
    setLoadingPredictions(true);
    const delay = setTimeout(() => {
      productApi.list({ search: searchQuery.trim(), limit: 5 })
        .then((res) => setPredictions(res.data?.items || []))
        .catch(() => {})
        .finally(() => setLoadingPredictions(false));
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  useEffect(() => {
    if (isAuthenticated) fetchWishlist();
  }, [isAuthenticated, fetchWishlist]);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.categories(),
  });
  const categories = (categoriesData?.data?.data ?? []).filter((cat: any) => cat.showInMenu !== false);

  const { data: navLinksData } = useQuery({
    queryKey: ['nav-links'],
    queryFn: () => api.get<{ success: boolean; data: Array<{ id: string; label: string; url: string; openInNewTab: boolean }> }>('/nav-links'),
    staleTime: 5 * 60 * 1000,
  });
  const navLinks = navLinksData?.data?.data ?? [];

  const { data: shippingData } = useQuery({
    queryKey: ['shipping-config'],
    queryFn: () => productApi.shippingConfig(),
    staleTime: 10 * 60 * 1000,
  });
  const freeShippingThreshold = shippingData?.data?.data?.freeShippingThreshold ?? 500;

  async function handleLogout() {
    try { await authApi.logout(); } catch {}
    logout();
    toast.success('Cikis yapildi');
    navigate('/');
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchFocused(false);
    if (searchQuery.trim()) {
      navigate(`/ara?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/ara');
    }
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement Bar */}
      <div className="bg-espresso-800 text-cream-100 text-xs sm:text-sm overflow-hidden">
        <div className="max-w-8xl mx-auto px-4 flex items-center justify-center gap-6 h-9">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Truck className="w-3.5 h-3.5 text-caramel-400" />
            {freeShippingThreshold} TL Uzeri Ucretsiz Kargo
          </span>
          <span className="hidden sm:flex items-center gap-1.5 whitespace-nowrap">
            <Tag className="w-3.5 h-3.5 text-caramel-400" />
            Hizli ve Guvenli Alisveris
          </span>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-cream-50 dark:bg-espresso-900 border-b border-espresso-100 dark:border-espresso-700 shadow-sm">
        <div className="max-w-8xl mx-auto px-4">
          <div className="flex items-center gap-4 h-16 lg:h-20">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 text-espresso-700 dark:text-cream-200"
              aria-label="Menuyu ac"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-10 sm:h-12 object-contain max-w-[120px] sm:max-w-[150px]" />
              ) : (
                <div className="hidden sm:block">
                  <p className="font-alatsi font-bold text-espresso-800 dark:text-cream-50 text-lg lg:text-xl leading-none">{storeName}</p>
                </div>
              )}
            </Link>

            {/* Search */}
            <div ref={searchRef} className="flex-1 max-w-2xl relative mx-2 lg:mx-6">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Urun, kategori veya marka ara..."
                  className="w-full h-10 lg:h-12 pl-4 pr-12 rounded-full border-2 border-espresso-200 dark:border-espresso-600 bg-white dark:bg-espresso-800 text-sm text-espresso-800 dark:text-cream-100 placeholder:text-espresso-300 dark:placeholder:text-espresso-400 focus:outline-none focus:border-caramel-400 transition-colors"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 px-4 rounded-full bg-caramel-400 hover:bg-caramel-500 text-white flex items-center justify-center transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              </form>

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {searchFocused && searchQuery.trim().length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 w-full bg-white dark:bg-espresso-800 rounded-xl shadow-xl border border-espresso-100 dark:border-espresso-600 overflow-hidden z-50 max-h-80 overflow-y-auto"
                  >
                    {loadingPredictions ? (
                      <div className="p-4 text-center text-xs text-espresso-400 flex items-center justify-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin text-caramel-400" />
                        <span>Araniyor...</span>
                      </div>
                    ) : predictions.length === 0 ? (
                      <div className="p-4 text-center text-xs text-espresso-400">
                        Uyumlu urun bulunamadi.
                      </div>
                    ) : (
                      <>
                        {predictions.map((prod) => {
                          const primaryImg = prod.images?.find(img => img.isPrimary)?.url || prod.images?.[0]?.url;
                          const rawPrice = prod.variants?.[0]?.price ? Number(prod.variants[0].price) : 0;
                          const grossPrice = prod.vatIncluded ? rawPrice : rawPrice * (1 + taxRate / 100);
                          const price = rawPrice ? grossPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '';
                          return (
                            <Link
                              key={prod.id}
                              to={`/urun/${prod.slug}`}
                              onClick={() => {
                                setSearchQuery('');
                                setSearchFocused(false);
                              }}
                              className="flex items-center gap-3 p-3 hover:bg-cream-100 dark:hover:bg-espresso-700 transition-colors border-b border-espresso-50 dark:border-espresso-600 last:border-0"
                            >
                              {primaryImg && (
                                <img src={primaryImg} alt={prod.name} className="w-12 h-12 rounded-lg object-cover" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-espresso-800 dark:text-cream-100 truncate">{prod.name}</p>
                                <p className="text-xs text-espresso-400">{prod.category?.name}</p>
                              </div>
                              {price && <span className="text-sm font-bold text-caramel-600">{price}</span>}
                            </Link>
                          );
                        })}
                        <Link
                          to={`/ara?search=${encodeURIComponent(searchQuery)}`}
                          onClick={() => setSearchFocused(false)}
                          className="block text-center text-xs font-semibold text-caramel-600 hover:text-caramel-700 p-3 bg-cream-50 dark:bg-espresso-900 transition-colors"
                        >
                          Tum sonuclari gor
                        </Link>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <ThemeToggle className="text-espresso-700 dark:text-cream-200 hover:text-caramel-600" />

              {/* User / Account */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <div className="hidden sm:flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-cream-100 dark:hover:bg-espresso-700 transition-colors cursor-pointer outline-none">
                        <div className="relative">
                          <User className="w-5 h-5 text-espresso-700 dark:text-cream-200" />
                          {profileHasWarning && (
                            <span
                              title={profileWarningMessage}
                              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-ember-500 ring-2 ring-white"
                            />
                          )}
                        </div>
                        <span className="text-[10px] text-espresso-500 dark:text-cream-300 mt-0.5">Hesabim</span>
                      </div>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium truncate">{user?.profile?.firstName ?? user?.email}</p>
                      <p className="text-xs text-espresso-400 truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    {!isGuest && profileHasWarning && (
                      <>
                        <DropdownMenuItem
                          onClick={() => navigate('/hesabim/profil')}
                          className="text-sm items-start gap-2 bg-red-50 text-red-700 cursor-pointer"
                        >
                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                          <span className="leading-snug">{profileWarningMessage} Tamamlamak icin tiklayin.</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/hesabim/siparisler')} className="text-sm cursor-pointer">
                      Siparislerim
                    </DropdownMenuItem>
                    {!isGuest && (
                      <>
                        <DropdownMenuItem onClick={() => navigate('/hesabim')} className="text-sm cursor-pointer">Hesap Ozeti</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/hesabim/sorularim')} className="text-sm cursor-pointer">Soru &amp; Cevaplarim</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/hesabim/degerlendirmelerim')} className="text-sm cursor-pointer">Degerlendirmelerim</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/hesabim/favoriler')} className="text-sm cursor-pointer">Begendiklerim</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/hesabim/indirimlerim')} className="text-sm cursor-pointer">Indirimlerim</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/hesabim/profil')} className="text-sm cursor-pointer">Profil Bilgileri</DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {isGuest && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/hesabim/aktiflestir')} className="text-sm text-caramel-600 font-medium cursor-pointer">
                          Hesabi Aktiflestir
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive text-sm cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" />
                      Cikis Yap
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  to="/giris"
                  className="hidden sm:flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-cream-100 dark:hover:bg-espresso-700 transition-colors"
                >
                  <User className="w-5 h-5 text-espresso-700 dark:text-cream-200" />
                  <span className="text-[10px] text-espresso-500 dark:text-cream-300 mt-0.5">Hesabim</span>
                </Link>
              )}

              {/* Favorites */}
              <Link
                to="/hesabim/favoriler"
                className="relative hidden sm:flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-cream-100 dark:hover:bg-espresso-700 transition-colors"
              >
                <Heart className="w-5 h-5 text-espresso-700 dark:text-cream-200" />
                <span className="text-[10px] text-espresso-500 dark:text-cream-300 mt-0.5">Favorilerim</span>
              </Link>

              {/* Cart */}
              <Link
                to="/sepet"
                className="relative flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-cream-100 dark:hover:bg-espresso-700 transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-espresso-700 dark:text-cream-200" />
                <span className="hidden sm:block text-[10px] text-espresso-500 dark:text-cream-300 mt-0.5">Sepetim</span>
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 right-1 w-4 h-4 rounded-full bg-caramel-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Category Nav Bar */}
      <nav
        className={`hidden lg:block bg-white dark:bg-espresso-900 border-b border-espresso-100 dark:border-espresso-700 transition-shadow duration-300 ${
          scrolled ? 'shadow-md' : ''
        }`}
      >
        <div className="max-w-8xl mx-auto px-4">
          <ul className="flex items-center gap-1 h-12 justify-center">
            <li>
              <Link
                to="/ara"
                className="flex items-center gap-2 px-4 h-12 text-sm font-medium text-espresso-700 dark:text-cream-200 hover:text-caramel-600 transition-colors"
              >
                Tum Urunler
              </Link>
            </li>
            {categories.slice(0, 8).map((cat) => {
              const children = (cat.children ?? []).filter((c: any) => c.showInMenu !== false);
              const hasChildren = children.length > 0;
              return (
                <li key={cat.id} className="relative group">
                  <Link
                    to={`/kategori/${cat.slug}`}
                    className="flex items-center gap-1.5 px-4 h-12 text-sm font-medium text-espresso-700 dark:text-cream-200 hover:text-caramel-600 transition-colors"
                  >
                    {cat.name}
                    {hasChildren && <ChevronDown className="w-3.5 h-3.5" />}
                  </Link>

                  {hasChildren && (
                    <div className="invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 absolute left-0 top-full pt-1 z-50">
                      <div className="min-w-[220px] bg-white dark:bg-espresso-800 rounded-b-xl shadow-xl border border-espresso-100 dark:border-espresso-600 overflow-hidden">
                        {children.map((child: any) => {
                          const grandChildren = (child.children ?? []).filter((g: any) => g.showInMenu !== false);
                          return (
                            <div key={child.id}>
                              <Link
                                to={`/kategori/${child.slug}`}
                                className={`block px-4 py-2.5 text-sm text-espresso-600 dark:text-cream-200 hover:bg-cream-100 dark:hover:bg-espresso-700 hover:text-caramel-600 transition-colors ${grandChildren.length > 0 ? 'font-semibold' : ''}`}
                              >
                                {child.name}
                              </Link>
                              {grandChildren.map((grand: any) => (
                                <Link
                                  key={grand.id}
                                  to={`/kategori/${grand.slug}`}
                                  className="block pl-8 pr-4 py-1.5 text-xs text-espresso-400 hover:bg-cream-100 dark:hover:bg-espresso-700 hover:text-caramel-600 transition-colors"
                                >
                                  {grand.name}
                                </Link>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
            {navLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target={link.openInNewTab ? '_blank' : undefined}
                  rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-2 px-4 h-12 text-sm font-medium text-espresso-700 dark:text-cream-200 hover:text-caramel-600 transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-cream-50 dark:bg-espresso-900 z-50 lg:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-espresso-100 dark:border-espresso-700">
                <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-9 object-contain" />
                  ) : (
                    <p className="font-bold text-espresso-800 dark:text-cream-50">{storeName}</p>
                  )}
                </Link>
                <button onClick={() => setMobileOpen(false)} className="p-2 text-espresso-600 dark:text-cream-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Auth quick link */}
              {!isAuthenticated && (
                <div className="p-4 border-b border-espresso-100 dark:border-espresso-700">
                  <Link
                    to="/giris"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-caramel-400 text-white text-sm font-semibold"
                  >
                    <User className="w-4 h-4" />
                    Giris Yap / Uye Ol
                  </Link>
                </div>
              )}

              <div className="p-4 space-y-1">
                <Link
                  to="/ara"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-espresso-700 dark:text-cream-200 hover:bg-cream-200 dark:hover:bg-espresso-700"
                >
                  Tum Urunler
                </Link>
                {categories.map((cat) => {
                  const children = (cat.children ?? []).filter((c: any) => c.showInMenu !== false);
                  return (
                    <div key={cat.id} className="py-1">
                      <Link
                        to={`/kategori/${cat.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-espresso-700 dark:text-cream-200 hover:bg-cream-200 dark:hover:bg-espresso-700"
                      >
                        {cat.name}
                      </Link>
                      {children.length > 0 && (
                        <div className="ml-7 mt-0.5 space-y-0.5">
                          {children.map((child: any) => (
                            <Link
                              key={child.id}
                              to={`/kategori/${child.slug}`}
                              onClick={() => setMobileOpen(false)}
                              className="block px-3 py-1.5 text-sm text-espresso-400 dark:text-cream-400 hover:text-caramel-600 transition-colors"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

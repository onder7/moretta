import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Heart, ShoppingCart, User, Menu, X, ChevronDown, LogIn,
  Truck, Tag, Coffee, Wrench, CupSoda, Package, Flame,
} from 'lucide-react';
import { categories, products } from '@/data/products';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/lib/auth';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Coffee, Wrench, CupSoda, Package, Flame,
};

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [megaMenu, setMegaMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  const cartCount = useStore((s) => s.cartCount());
  const cartTotal = useStore((s) => s.cartTotal());
  const favCount = useStore((s) => s.favorites.length);
  const searchRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
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

  const searchResults = searchQuery
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.flavorNotes.some((n) => n.toLowerCase().includes(searchQuery.toLowerCase())) ||
            p.origin.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .slice(0, 5)
    : [];

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement Bar */}
      <div className="bg-espresso-800 text-cream-100 text-xs sm:text-sm overflow-hidden">
        <div className="max-w-8xl mx-auto px-4 flex items-center justify-center gap-6 h-9">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Truck className="w-3.5 h-3.5 text-caramel-400" />
            500 TL Üzeri Ücretsiz Kargo
          </span>
          <span className="hidden sm:flex items-center gap-1.5 whitespace-nowrap">
            <Tag className="w-3.5 h-3.5 text-caramel-400" />
            İlk Siparişe Özel %10 İndirim Kodu: KAHVE10
          </span>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-cream-50 border-b border-espresso-100 shadow-sm">
        <div className="max-w-8xl mx-auto px-4">
          <div className="flex items-center gap-4 h-16 lg:h-20">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 text-espresso-700"
              aria-label="Menüyü aç"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-espresso-700 flex items-center justify-center">
                <Coffee className="w-5 h-5 lg:w-6 lg:h-6 text-caramel-400" />
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-espresso-800 text-lg lg:text-xl leading-none">Aroma</p>
                <p className="text-xs text-caramel-600 font-medium tracking-wider">COFFEE CO.</p>
              </div>
            </Link>

            {/* Search */}
            <div ref={searchRef} className="flex-1 max-w-2xl relative mx-2 lg:mx-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Çekirdek kahve, Espresso, Chemex ara..."
                  className="w-full h-10 lg:h-12 pl-4 pr-12 rounded-full border-2 border-espresso-200 bg-white text-sm text-espresso-800 placeholder:text-espresso-300 focus:outline-none focus:border-caramel-400 transition-colors"
                />
                <button onClick={() => searchQuery && navigate(`/product/${searchResults[0]?.id || ''}`)} className="absolute right-1 top-1 bottom-1 px-4 rounded-full bg-caramel-400 hover:bg-caramel-500 text-white flex items-center justify-center transition-colors">
                  <Search className="w-5 h-5" />
                </button>
              </div>

              {/* Live Search Results */}
              <AnimatePresence>
                {searchFocused && (searchQuery ? searchResults.length > 0 : true) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-espresso-100 overflow-hidden z-50"
                  >
                    {searchQuery ? (
                      searchResults.map((p) => (
                        <Link
                          key={p.id}
                          to={`/product/${p.id}`}
                          onClick={() => setSearchFocused(false)}
                          className="flex items-center gap-3 p-3 hover:bg-cream-100 transition-colors border-b border-espresso-50 last:border-0"
                        >
                          <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-espresso-800 truncate">{p.name}</p>
                            <p className="text-xs text-espresso-400">{p.origin} · {p.roast} Kavrum</p>
                          </div>
                          <span className="text-sm font-bold text-caramel-600">{p.price} TL</span>
                        </Link>
                      ))
                    ) : (
                      <div className="p-4">
                        <p className="text-xs font-semibold text-espresso-400 uppercase mb-2">Popüler Aramalar</p>
                        <div className="flex flex-wrap gap-2">
                          {['Etiyopya', 'Espresso', 'V60', 'French Press', 'Filtre Kahve', 'Chemex'].map((tag) => (
                            <button
                              key={tag}
                              onClick={() => setSearchQuery(tag)}
                              className="px-3 py-1.5 rounded-full bg-cream-100 hover:bg-caramel-100 text-sm text-espresso-600 transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {user ? (
                <Link to="/account" className="hidden sm:flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-cream-100 transition-colors">
                  <User className="w-5 h-5 text-espresso-700" />
                  <span className="text-[10px] text-espresso-500 mt-0.5">Hesabım</span>
                </Link>
              ) : (
                <Link to="/auth" className="hidden sm:flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-cream-100 transition-colors">
                  <LogIn className="w-5 h-5 text-espresso-700" />
                  <span className="text-[10px] text-espresso-500 mt-0.5">Giriş Yap</span>
                </Link>
              )}

              <Link to="/favorites" className="relative flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-cream-100 transition-colors">
                <Heart className="w-5 h-5 text-espresso-700" />
                <span className="hidden sm:block text-[10px] text-espresso-500 mt-0.5">Favorilerim</span>
                {favCount > 0 && (
                  <span className="absolute -top-0.5 right-1 w-4 h-4 rounded-full bg-ember-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {favCount}
                  </span>
                )}
              </Link>

              <Link to="/cart" className="relative flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-cream-100 transition-colors">
                <ShoppingCart className="w-5 h-5 text-espresso-700" />
                <span className="hidden sm:block text-[10px] text-espresso-500 mt-0.5">
                  {cartTotal > 0 ? `${cartTotal} TL` : 'Sepetim'}
                </span>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 right-1 w-4 h-4 rounded-full bg-caramel-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Category Mega Menu */}
      <nav
        className={`bg-white border-b border-espresso-100 transition-shadow duration-300 ${
          scrolled ? 'shadow-md' : ''
        }`}
      >
        <div className="max-w-8xl mx-auto px-4">
          <ul className="hidden lg:flex items-center gap-1 h-12">
            {categories.map((cat) => {
              const Icon = iconMap[cat.icon];
              const isDeals = cat.id === 'firsatlar';
              return (
                <li
                  key={cat.id}
                  onMouseEnter={() => setMegaMenu(cat.id)}
                  onMouseLeave={() => setMegaMenu(null)}
                  className="relative"
                >
                  <Link
                    to={`/category/${cat.id}`}
                    className={`flex items-center gap-2 px-4 h-12 text-sm font-medium transition-colors ${
                      isDeals
                        ? 'text-ember-500 hover:text-ember-600'
                        : 'text-espresso-700 hover:text-caramel-600'
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {cat.label}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Link>

                  <AnimatePresence>
                    {megaMenu === cat.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 min-w-[220px] bg-white rounded-b-xl shadow-xl border border-espresso-100 overflow-hidden"
                      >
                        {cat.subcategories.map((sub) => (
                          <Link
                            key={sub}
                            to={`/category/${cat.id}?sub=${encodeURIComponent(sub)}`}
                            className="block px-4 py-2.5 text-sm text-espresso-600 hover:bg-cream-100 hover:text-caramel-600 transition-colors"
                          >
                            {sub}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
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
              className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-cream-50 z-50 lg:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-espresso-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-espresso-700 flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-caramel-400" />
                  </div>
                  <p className="font-bold text-espresso-800">Aroma Coffee Co.</p>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2 text-espresso-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-1">
                {categories.map((cat) => {
                  const Icon = iconMap[cat.icon];
                  return (
                    <div key={cat.id} className="py-1">
                      <Link
                        to={`/category/${cat.id}`}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          cat.id === 'firsatlar'
                            ? 'text-ember-500 hover:bg-ember-500/10'
                            : 'text-espresso-700 hover:bg-cream-200'
                        }`}
                      >
                        {Icon && <Icon className="w-4 h-4" />}
                        {cat.label}
                      </Link>
                      <div className="ml-7 mt-0.5 space-y-0.5">
                        {cat.subcategories.map((sub) => (
                          <Link
                            key={sub}
                            to={`/category/${cat.id}?sub=${encodeURIComponent(sub)}`}
                            onClick={() => setMobileOpen(false)}
                            className="block px-3 py-1.5 text-sm text-espresso-400 hover:text-caramel-600 transition-colors"
                          >
                            {sub}
                          </Link>
                        ))}
                      </div>
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

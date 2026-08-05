import { Link, useLocation } from 'react-router-dom';
import { Home, Grid2x2, ShoppingCart, User } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function MobileBottomNav() {
  const cartCount = useStore((s) => s.cartCount());
  const location = useLocation();

  const items = [
    { icon: Home, label: 'Ana Sayfa', path: '/' },
    { icon: Grid2x2, label: 'Kategoriler', path: '/category/kahve' },
    { icon: ShoppingCart, label: 'Sepet', path: '/cart', badge: cartCount },
    { icon: User, label: 'Hesabım', path: '/account' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-espresso-100 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`relative flex flex-col items-center gap-1 py-2 px-4 transition-colors ${
                active ? 'text-caramel-600' : 'text-espresso-500 hover:text-caramel-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.badge ? (
                <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-caramel-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

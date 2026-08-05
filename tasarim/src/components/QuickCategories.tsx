import { Link } from 'react-router-dom';
import {
  Coffee, Filter, Pill, Wrench, CupSoda, Package, Gift, Droplets,
} from 'lucide-react';
import { quickCategories } from '@/data/products';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Coffee, Filter, Pill, Wrench, CupSoda, Package, Gift, Droplets,
};

const categoryRouteMap: Record<string, string> = {
  cekirdek: '/category/kahve',
  filtre: '/category/kahve',
  kapsul: '/category/kahve',
  ekipman: '/category/ekipman',
  espresso: '/category/kahve',
  abonelik: '/category/abonelik',
  hediye: '/category/abonelik',
  aksesuar: '/category/aksesuar',
};

export default function QuickCategories() {
  return (
    <section className="max-w-8xl mx-auto px-4 py-8">
      <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-2 lg:justify-center">
        {quickCategories.map((cat) => {
          const Icon = iconMap[cat.icon];
          return (
            <Link
              key={cat.id}
              to={categoryRouteMap[cat.id] || '/category/kahve'}
              className="flex flex-col items-center gap-2 group shrink-0"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-cream-200 group-hover:bg-caramel-200 flex items-center justify-center transition-colors duration-300 group-hover:scale-105">
                {Icon && <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-espresso-700 group-hover:text-espresso-800 transition-colors" />}
              </div>
              <span className="text-xs sm:text-sm font-medium text-espresso-600 group-hover:text-caramel-600 transition-colors text-center max-w-[80px]">
                {cat.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

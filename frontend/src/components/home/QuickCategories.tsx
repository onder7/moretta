import { Link } from 'react-router-dom';
import { Coffee, Filter, Pill, Wrench, CupSoda, Package, Gift, Droplets } from 'lucide-react';

// Tasarımdaki quickCategories ile birebir eşleşiyor
const QUICK_CATEGORIES = [
  { id: 'cekirdek-kahve',   label: 'Çekirdek\nKahve', icon: Coffee },
  { id: 'filtre-kahve',     label: 'Filtre\nKahve',   icon: Filter },
  { id: 'ogutulmus-kahve',  label: 'Kapsül\nKahve',   icon: Pill },
  { id: 'demleme-ekipmanlari', label: 'Ekipman',      icon: Wrench },
  { id: 'espresso',         label: 'Espresso',         icon: CupSoda },
  { id: 'kahve-abonelikleri', label: 'Abonelik',       icon: Package },
  { id: 'hediye-kutusu',    label: 'Hediye\nSeti',     icon: Gift },
  { id: 'aksesuarlar-bardaklar', label: 'Aksesuar',    icon: Droplets },
];

export function QuickCategories() {
  return (
    <section className="max-w-8xl mx-auto px-4 py-8">
      <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-2 lg:justify-center">
        {QUICK_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.id}
              to={`/kategori/${cat.id}`}
              className="flex flex-col items-center gap-2 group shrink-0"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-cream-200 dark:bg-espresso-700 group-hover:bg-caramel-200 dark:group-hover:bg-caramel-800 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-espresso-700 dark:text-cream-200 group-hover:text-espresso-800 transition-colors" />
              </div>
              <span className="font-alatsi text-xs sm:text-sm font-medium text-espresso-600 dark:text-cream-200 group-hover:text-caramel-600 transition-colors text-center max-w-[80px] whitespace-pre-line leading-tight">
                {cat.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

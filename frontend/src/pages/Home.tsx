import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { productApi } from '@/services/productApi';
import { api } from '@/services/api';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Sparkles, ArrowRight, type LucideIcon, Truck, Shield, Headphones, CreditCard, Gift, Clock, Award, Lock, BadgeCheck, Package, Phone, Heart, Star, RotateCcw } from 'lucide-react';
import { SeoHead } from '@/components/seo/SeoHead';
import { organizationSchema, websiteSchema } from '@/lib/schemas';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { Hero } from '@/components/home/Hero';
import { QuickCategories } from '@/components/home/QuickCategories';
import { FlashDeals } from '@/components/home/FlashDeals';
import { ProductFinder } from '@/components/home/ProductFinder';

const FEATURE_ICONS: Record<string, LucideIcon> = {
  truck: Truck, 'rotate-ccw': RotateCcw, headphones: Headphones, 'shield-check': Shield,
  'credit-card': CreditCard, gift: Gift, clock: Clock, award: Award, lock: Lock,
  'badge-check': BadgeCheck, package: Package, phone: Phone, heart: Heart, star: Star,
};

interface FeatureCard {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export function Home() {
  const { name: storeName } = useStoreInfo();

  const { data: featuredData, isLoading: isFeaturedLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productApi.featured(8),
    staleTime: 1000 * 60 * 5,
  });

  const { data: featureCardsData } = useQuery({
    queryKey: ['feature-cards'],
    queryFn: async () => (await api.get<{ success: boolean; data: FeatureCard[] }>('/feature-cards')).data.data,
    staleTime: 1000 * 60 * 10,
  });
  const featureCards = featureCardsData ?? [];
  const featured = featuredData?.data?.data ?? [];

  return (
    <main className="bg-[#F8F9FA] dark:bg-espresso-950 pb-16">
      <SeoHead
        description={`Hizli kargo, kolay iade ve uygun fiyat garantisiyle ${storeName} urunlerini kesfedin.`}
        schema={[organizationSchema(storeName), websiteSchema(storeName)]}
      />

      {/* Hero Carousel — tasarım ile birebir */}
      <Hero />

      {/* Hızlı Kategoriler */}
      <QuickCategories />

      {/* Flaş İndirimler */}
      <FlashDeals />

      {/* Öne Çıkan Ürünler */}
      <section className="max-w-8xl mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-caramel-500" />
              <span className="text-sm font-semibold text-caramel-600 dark:text-caramel-400 uppercase tracking-wide">Öne Çıkanlar</span>
            </div>
            <h2 className="font-alatsi text-2xl sm:text-3xl font-bold text-espresso-800 dark:text-cream-100">En Sevilen Kahveler</h2>
          </div>
          <Link
            to="/ara"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-caramel-600 dark:text-caramel-400 hover:text-caramel-700 transition-colors"
          >
            Tümünü Gör <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <ProductGrid products={featured} loading={isFeaturedLoading} cols={4} />
      </section>

      {/* Feature Cards */}
      {featureCards.length > 0 && (
        <section className="max-w-8xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-espresso-800 rounded-2xl shadow-sm border border-espresso-100 dark:border-espresso-700 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featureCards.map((card) => {
                const Icon = FEATURE_ICONS[card.icon] ?? Truck;
                return (
                  <div key={card.id} className="flex items-center gap-4 px-2">
                    <div className="p-3.5 bg-caramel-100 dark:bg-espresso-700 rounded-xl text-caramel-600 dark:text-caramel-400 shrink-0">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-espresso-800 dark:text-cream-100 text-sm">{card.title}</h4>
                      <p className="text-espresso-400 dark:text-cream-300 text-xs mt-1">{card.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Product Finder Quiz */}
      <ProductFinder />
    </main>
  );
}

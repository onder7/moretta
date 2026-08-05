import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';
import { ProductCard } from './ProductCard';

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const items = useRecentlyViewedStore((s) => s.items);
  const visible = excludeId ? items.filter((p) => p.id !== excludeId) : items;

  if (visible.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-bold text-espresso-900 mb-4">Son Görüntülenen Ürünler</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {visible.slice(0, 5).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

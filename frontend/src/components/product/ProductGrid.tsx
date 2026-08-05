import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from './ProductCard';
import type { Product } from '@/types';

interface Props {
  products: Product[];
  loading?: boolean;
  cols?: 2 | 3 | 4;
}

const colClass = {
  2: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
};

export function ProductGrid({ products, loading = false, cols = 4 }: Props) {
  if (loading) {
    return (
      <div className={`grid ${colClass[cols]} gap-4`}>
        {Array.from({ length: cols * 2 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-espresso-900 rounded-2xl overflow-hidden border border-espresso-100 dark:border-espresso-700">
            <Skeleton className="aspect-square w-full bg-cream-100 dark:bg-espresso-800" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-3 w-1/3 bg-cream-200 dark:bg-espresso-700" />
              <Skeleton className="h-4 w-full bg-cream-200 dark:bg-espresso-700" />
              <Skeleton className="h-4 w-2/3 bg-cream-200 dark:bg-espresso-700" />
              <Skeleton className="h-6 w-1/2 mt-2 bg-cream-200 dark:bg-espresso-700" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="text-center py-16 text-espresso-400 dark:text-espresso-300">
        <p className="text-lg">Bu kategori için hazırlıklarımız devam ediyor</p>
      </div>
    );
  }

  return (
    <div className={`grid ${colClass[cols]} gap-4`}>
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import ProductCard from './ProductCard';
import { products } from '@/data/products';

export default function FeaturedProducts() {
  return (
    <section className="max-w-8xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-caramel-500" />
            <span className="text-sm font-semibold text-caramel-600 uppercase tracking-wide">Öne Çıkanlar</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-espresso-800">En Sevilen Kahveler</h2>
        </div>
        <a href="#" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-caramel-600 hover:text-caramel-700 transition-colors">
          Tümünü Gör <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

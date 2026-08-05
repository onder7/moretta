import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ArrowRight, Trash2, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { products } from '@/data/products';
import ProductCard from '@/components/ProductCard';

export default function FavoritesPage() {
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  const favProducts = products.filter((p) => favorites.includes(p.id));

  if (favProducts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-cream-100 flex items-center justify-center mx-auto mb-6">
          <Heart className="w-12 h-12 text-espresso-300" />
        </div>
        <h1 className="text-2xl font-bold text-espresso-800 mb-2">Favorileriniz Boş</h1>
        <p className="text-espresso-500 mb-8">
          Beğendiğiniz kahveleri kalp ikonuna tıklayarak favorilerinize ekleyebilirsiniz.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm transition-colors"
        >
          Kahveleri Keşfet <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-espresso-400 mb-6">
        <Link to="/" className="hover:text-caramel-600 transition-colors">Ana Sayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-espresso-700 font-medium">Favorilerim</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-espresso-800">
          Favorilerim ({favProducts.length})
        </h1>
        <button
          onClick={() => favProducts.forEach((p) => toggleFavorite(p.id))}
          className="text-sm text-espresso-400 hover:text-ember-500 transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="w-4 h-4" /> Tümünü Temizle
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {favProducts.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

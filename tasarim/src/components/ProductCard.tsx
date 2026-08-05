import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingCart, Minus, Plus, Star, Coffee as CoffeeBean } from 'lucide-react';
import type { Product, GrindOption } from '@/types';
import { useStore } from '@/store/useStore';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const [hovered, setHovered] = useState(false);
  const [selectedGrind, setSelectedGrind] = useState<GrindOption>(product.grindOptions[0]);
  const [qty, setQty] = useState(1);
  const [showGrindMenu, setShowGrindMenu] = useState(false);

  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFavorite = useStore((s) => s.favorites.includes(product.id));
  const addToCart = useStore((s) => s.addToCart);

  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white rounded-2xl overflow-hidden border border-espresso-100 hover:border-caramel-300 hover:shadow-xl transition-all duration-300 flex flex-col"
    >
      {/* Image */}
      <Link
        to={`/product/${product.id}`}
        className="relative aspect-square overflow-hidden bg-cream-100 block"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={hovered ? 'hover' : 'main'}
            src={hovered ? product.hoverImage : product.image}
            alt={product.name}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.badge && (
            <span className="px-2.5 py-1 rounded-full bg-espresso-700 text-cream-100 text-[11px] font-semibold">
              {product.badge}
            </span>
          )}
          {discount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-ember-500 text-white text-[11px] font-bold">
              %{discount} İndirim
            </span>
          )}
        </div>

        {/* Favorite */}
        <button
          onClick={() => toggleFavorite(product.id)}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          aria-label="Favorilere ekle"
        >
          <Heart
            className={`w-4.5 h-4.5 transition-colors ${
              isFavorite ? 'fill-ember-500 text-ember-500' : 'text-espresso-400'
            }`}
          />
        </button>

        {/* Hover overlay: intensity */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-white/90 backdrop-blur px-2.5 py-1.5 rounded-full">
            <span className="text-[10px] font-medium text-espresso-500 mr-1">Sertlik</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <CoffeeBean
                key={n}
                className={`w-3 h-3 ${
                  n <= product.intensity ? 'fill-espresso-700 text-espresso-700' : 'text-espresso-200'
                }`}
              />
            ))}
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Origin & Roast */}
        <div className="flex items-center gap-2 text-[11px] text-espresso-400 font-medium">
          <span>{product.origin}</span>
          <span className="w-1 h-1 rounded-full bg-espresso-200" />
          <span>{product.roast} Kavrum</span>
          <span className="w-1 h-1 rounded-full bg-espresso-200" />
          <span>{product.type}</span>
        </div>

        {/* Name */}
        <Link to={`/product/${product.id}`}>
          <h3 className="font-semibold text-espresso-800 leading-snug line-clamp-2 min-h-[2.5rem] hover:text-caramel-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Flavor Notes */}
        <div className="flex flex-wrap gap-1.5">
          {product.flavorNotes.map((note) => (
            <span
              key={note}
              className="px-2 py-0.5 rounded-md bg-cream-200 text-espresso-600 text-[11px] font-medium"
            >
              {note}
            </span>
          ))}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`w-3.5 h-3.5 ${
                  n <= Math.round(product.rating)
                    ? 'fill-caramel-400 text-caramel-400'
                    : 'text-espresso-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-espresso-400">
            {product.rating} ({product.reviewCount})
          </span>
        </div>

        {/* Grind Selector */}
        <div className="relative">
          <button
            onClick={() => setShowGrindMenu(!showGrindMenu)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-espresso-200 text-sm text-espresso-600 hover:border-caramel-400 transition-colors"
          >
            <span className="text-xs">Öğütme: <strong className="text-espresso-700">{selectedGrind}</strong></span>
            <span className="text-[10px] text-espresso-400">Değiştir</span>
          </button>
          <AnimatePresence>
            {showGrindMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-espresso-100 overflow-hidden z-10"
              >
                {product.grindOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setSelectedGrind(opt);
                      setShowGrindMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      selectedGrind === opt
                        ? 'bg-caramel-100 text-caramel-700 font-semibold'
                        : 'text-espresso-600 hover:bg-cream-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Price + Add */}
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div>
            {product.oldPrice && (
              <p className="text-xs text-espresso-300 line-through leading-none">{product.oldPrice} TL</p>
            )}
            <p className="text-lg font-bold text-espresso-800 leading-tight">{product.price} TL</p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Qty stepper */}
            <div className="flex items-center border border-espresso-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-7 h-8 flex items-center justify-center text-espresso-500 hover:bg-cream-100 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-7 text-center text-sm font-semibold text-espresso-700">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-7 h-8 flex items-center justify-center text-espresso-500 hover:bg-cream-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add to cart */}
            <button
              onClick={() => addToCart(product, selectedGrind, qty)}
              className="h-8 px-3 rounded-lg bg-caramel-400 hover:bg-caramel-500 text-white flex items-center gap-1.5 text-sm font-semibold transition-colors active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Sepete Ekle</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

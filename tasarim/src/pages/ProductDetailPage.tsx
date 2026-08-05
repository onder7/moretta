import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Heart, ShoppingCart, Minus, Plus, ChevronRight, Coffee as CoffeeBean,
  Truck, Shield, RotateCcw, ThumbsUp, MapPin, Mountain, Scale, Award,
} from 'lucide-react';
import { products, productDetails, reviews } from '@/data/products';
import { useStore } from '@/store/useStore';
import type { GrindOption } from '@/types';
import ProductCard from '@/components/ProductCard';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const product = products.find((p) => p.id === id);

  const [activeImage, setActiveImage] = useState(0);
  const [selectedGrind, setSelectedGrind] = useState<GrindOption>(
    product ? product.grindOptions[0] : 'Çekirdek',
  );
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'brewing' | 'reviews'>('description');
  const [activeBrew, setActiveBrew] = useState(0);
  const [added, setAdded] = useState(false);

  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFavorite = useStore((s) => s.favorites.includes(product?.id || ''));
  const addToCart = useStore((s) => s.addToCart);

  if (!product) {
    return (
      <div className="max-w-8xl mx-auto px-4 py-20 text-center">
        <p className="text-lg text-espresso-600">Ürün bulunamadı.</p>
        <Link to="/" className="text-caramel-600 hover:underline mt-2 inline-block">Ana sayfaya dön</Link>
      </div>
    );
  }

  const detail = productDetails[product.id];
  const productReviews = reviews[product.id] || [];
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;
  const related = products.filter((p) => p.id !== product.id).slice(0, 4);
  const images = [product.image, product.hoverImage];

  const handleAddToCart = () => {
    addToCart(product, selectedGrind, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="pb-12">
      {/* Breadcrumb */}
      <div className="max-w-8xl mx-auto px-4 py-4">
        <nav className="flex items-center gap-1.5 text-sm text-espresso-400">
          <Link to="/" className="hover:text-caramel-600 transition-colors">Ana Sayfa</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="hover:text-caramel-600 transition-colors cursor-pointer">Kahve Çeşitleri</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-espresso-700 font-medium truncate">{product.name}</span>
        </nav>
      </div>

      {/* Product Main */}
      <div className="max-w-8xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Gallery */}
          <div className="flex flex-col-reverse sm:flex-row gap-4">
            {/* Thumbnails */}
            <div className="flex sm:flex-col gap-3">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                    activeImage === i ? 'border-caramel-400' : 'border-espresso-100 hover:border-espresso-200'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            {/* Main Image */}
            <div className="flex-1 relative aspect-square rounded-2xl overflow-hidden bg-cream-100">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImage}
                  src={images[activeImage]}
                  alt={product.name}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>
              {product.badge && (
                <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-espresso-700 text-cream-100 text-xs font-semibold">
                  {product.badge}
                </span>
              )}
              {discount > 0 && (
                <span className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-ember-500 text-white text-xs font-bold">
                  %{discount} İndirim
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 text-sm text-espresso-400 font-medium mb-2">
                <span>{product.origin}</span>
                <span className="w-1 h-1 rounded-full bg-espresso-200" />
                <span>{product.roast} Kavrum</span>
                <span className="w-1 h-1 rounded-full bg-espresso-200" />
                <span>{product.type}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-espresso-800 leading-tight mb-3">
                {product.name}
              </h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`w-4 h-4 ${n <= Math.round(product.rating) ? 'fill-caramel-400 text-caramel-400' : 'text-espresso-200'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-espresso-500">{product.rating} · {product.reviewCount} değerlendirme</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 pb-4 border-b border-espresso-100">
              {product.oldPrice && (
                <span className="text-lg text-espresso-300 line-through">{product.oldPrice} TL</span>
              )}
              <span className="text-3xl font-bold text-espresso-800">{product.price} TL</span>
              {discount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-ember-500/10 text-ember-600 text-sm font-semibold">
                  %{discount} indirim
                </span>
              )}
            </div>

            {/* Flavor Notes */}
            <div>
              <p className="text-sm font-semibold text-espresso-700 mb-2">Tadım Notları</p>
              <div className="flex flex-wrap gap-2">
                {product.flavorNotes.map((note) => (
                  <span key={note} className="px-3 py-1.5 rounded-lg bg-cream-200 text-espresso-700 text-sm font-medium">
                    {note}
                  </span>
                ))}
              </div>
            </div>

            {/* Intensity */}
            <div>
              <p className="text-sm font-semibold text-espresso-700 mb-2">Sertlik Derecesi</p>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <CoffeeBean
                    key={n}
                    className={`w-5 h-5 ${n <= product.intensity ? 'fill-espresso-700 text-espresso-700' : 'text-espresso-200'}`}
                  />
                ))}
                <span className="text-sm text-espresso-500 ml-2">{product.intensity}/5</span>
              </div>
            </div>

            {/* Quick Specs */}
            {detail && (
              <div className="grid grid-cols-2 gap-3 py-4 border-y border-espresso-100">
                {[
                  { icon: Mountain, label: 'Rakım', value: detail.altitude },
                  { icon: CoffeeBean, label: 'İşlem', value: detail.process },
                  { icon: Scale, label: 'Ağırlık', value: detail.weight },
                  { icon: Award, label: 'Cupping', value: `${detail.cuppingScore}/100` },
                ].map((spec) => (
                  <div key={spec.label} className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-cream-200 flex items-center justify-center shrink-0">
                      <spec.icon className="w-4 h-4 text-espresso-600" />
                    </div>
                    <div>
                      <p className="text-xs text-espresso-400">{spec.label}</p>
                      <p className="text-sm font-medium text-espresso-700">{spec.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Grind Selector */}
            <div>
              <p className="text-sm font-semibold text-espresso-700 mb-2">Öğütme Tipi</p>
              <div className="flex flex-wrap gap-2">
                {product.grindOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedGrind(opt)}
                    className={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      selectedGrind === opt
                        ? 'border-caramel-400 bg-caramel-100 text-caramel-700'
                        : 'border-espresso-200 text-espresso-600 hover:border-espresso-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity + Add to Cart */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center border-2 border-espresso-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-11 h-12 flex items-center justify-center text-espresso-500 hover:bg-cream-100 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-lg font-semibold text-espresso-700">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-11 h-12 flex items-center justify-center text-espresso-500 hover:bg-cream-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                className="flex-1 h-12 rounded-xl bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
              >
                <ShoppingCart className="w-5 h-5" />
                {added ? 'Sepete Eklendi!' : 'Sepete Ekle'}
              </button>
              <button
                onClick={() => toggleFavorite(product.id)}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-colors ${
                  isFavorite ? 'border-ember-500 bg-ember-500/10' : 'border-espresso-200 hover:border-espresso-300'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-ember-500 text-ember-500' : 'text-espresso-500'}`} />
              </button>
            </div>

            {/* Trust */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              {[
                { icon: Truck, label: 'Ücretsiz Kargo', sub: '500 TL üzeri' },
                { icon: RotateCcw, label: 'İade Hakkı', sub: '14 gün' },
                { icon: Shield, label: 'Güvenli Ödeme', sub: 'SSL şifreli' },
              ].map((t) => (
                <div key={t.label} className="flex flex-col items-center text-center gap-1 p-3 rounded-xl bg-cream-50 border border-espresso-50">
                  <t.icon className="w-5 h-5 text-caramel-500" />
                  <p className="text-xs font-semibold text-espresso-700">{t.label}</p>
                  <p className="text-[10px] text-espresso-400">{t.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-8xl mx-auto px-4 mt-12">
        <div className="flex gap-1 border-b border-espresso-100 overflow-x-auto no-scrollbar">
          {[
            { id: 'description' as const, label: 'Açıklama' },
            { id: 'brewing' as const, label: 'Demleme Rehberi' },
            { id: 'reviews' as const, label: `Değerlendirmeler (${productReviews.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-caramel-400 text-caramel-600'
                  : 'border-transparent text-espresso-400 hover:text-espresso-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="py-8">
          {/* Description */}
          {activeTab === 'description' && detail && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl">
              <p className="text-espresso-600 leading-relaxed text-base">{detail.description}</p>
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                {[
                  { icon: MapPin, label: 'Menşei', value: product.origin },
                  { icon: CoffeeBean, label: 'Kahve Türü', value: product.type },
                  { icon: Mountain, label: 'Rakım', value: detail.altitude },
                  { icon: Award, label: 'Cupping Puanı', value: `${detail.cuppingScore}/100` },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl bg-cream-50 border border-espresso-50">
                    <item.icon className="w-5 h-5 text-caramel-500 shrink-0" />
                    <div>
                      <p className="text-xs text-espresso-400">{item.label}</p>
                      <p className="text-sm font-medium text-espresso-700">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Brewing Guide */}
          {activeTab === 'brewing' && detail && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl">
              <div className="flex flex-wrap gap-2 mb-6">
                {detail.brewingGuide.map((brew, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveBrew(i)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      activeBrew === i ? 'bg-espresso-700 text-cream-100' : 'bg-cream-100 text-espresso-600 hover:bg-cream-200'
                    }`}
                  >
                    {brew.method}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeBrew}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div className="flex gap-4">
                    <div className="flex-1 p-4 rounded-xl bg-cream-50 border border-espresso-50">
                      <p className="text-xs text-espresso-400 mb-1">Oran</p>
                      <p className="text-lg font-bold text-espresso-800">{detail.brewingGuide[activeBrew].ratio}</p>
                    </div>
                    <div className="flex-1 p-4 rounded-xl bg-cream-50 border border-espresso-50">
                      <p className="text-xs text-espresso-400 mb-1">Süre</p>
                      <p className="text-lg font-bold text-espresso-800">{detail.brewingGuide[activeBrew].time}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-espresso-700 mb-3">Adımlar</p>
                    <ol className="space-y-3">
                      {detail.brewingGuide[activeBrew].steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-full bg-caramel-400 text-white text-sm font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <p className="text-espresso-600 text-sm pt-1">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* Reviews */}
          {activeTab === 'reviews' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl">
              {/* Summary */}
              <div className="flex flex-col sm:flex-row gap-6 mb-8 p-6 rounded-2xl bg-cream-50 border border-espresso-50">
                <div className="text-center sm:text-left">
                  <p className="text-4xl font-bold text-espresso-800">{product.rating}</p>
                  <div className="flex items-center gap-0.5 justify-center sm:justify-start mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`w-4 h-4 ${n <= Math.round(product.rating) ? 'fill-caramel-400 text-caramel-400' : 'text-espresso-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-espresso-400 mt-1">{product.reviewCount} değerlendirme</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const pct = star === 5 ? 68 : star === 4 ? 22 : star === 3 ? 7 : star === 2 ? 2 : 1;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs text-espresso-400 w-3">{star}</span>
                        <Star className="w-3 h-3 fill-caramel-400 text-caramel-400" />
                        <div className="flex-1 h-2 rounded-full bg-espresso-100 overflow-hidden">
                          <div className="h-full bg-caramel-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-espresso-400 w-8 text-right">%{pct}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review List */}
              <div className="space-y-5">
                {productReviews.map((review) => (
                  <div key={review.id} className="p-5 rounded-2xl border border-espresso-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-espresso-200 flex items-center justify-center text-espresso-600 font-bold text-sm">
                          {review.author.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-espresso-700">{review.author}</p>
                          <p className="text-xs text-espresso-400">{review.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`w-3.5 h-3.5 ${n <= review.rating ? 'fill-caramel-400 text-caramel-400' : 'text-espresso-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-espresso-600 leading-relaxed mb-3">{review.comment}</p>
                    <button className="flex items-center gap-1.5 text-xs text-espresso-400 hover:text-espresso-600 transition-colors">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Faydalı ({review.helpful})
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Related Products */}
      <div className="max-w-8xl mx-auto px-4 mt-12">
        <h2 className="text-xl sm:text-2xl font-bold text-espresso-800 mb-6">Benzer Kahveler</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

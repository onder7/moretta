import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '@/types';
import { Heart, Star, ShoppingCart, Minus, Plus, Coffee } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlistStore';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { cartApi } from '@/services/cartApi';
import { toast } from 'sonner';
import { useTaxConfig } from '@/hooks/useTaxConfig';

interface Props {
  product: Product;
}

function formatPrice(price: number | string): string {
  return (
    Number(price).toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }) + ' TL'
  );
}

// Badge etiketlerini tag'lerden çıkar
const BADGE_TAGS: Record<string, string> = {
  'yeni-hasat':      'Yeni Hasat',
  'cok-satan':       'Çok Satan',
  'sinirli-uretim':  'Sınırlı Üretim',
  'firsat':          'Fırsat',
  'premium':         'Premium',
  'outlet':          'Outlet',
};

// Flavor note tag'leri (teknik tag'leri filtrele, sadece tat notlarını göster)
const SKIP_TAGS = new Set([
  'arabica','robusta','blend','filtre','espresso','cekirdek',
  'yeni-hasat','cok-satan','sinirli-uretim','firsat','premium',
  'outlet','koyu-kavrum',
  'etiyopya','kolombiya','brezilya','guatemala','kenya','costa-rica',
  'peru','endonezya','hindistan','meksika','vietnam','jamaika',
]);


export function ProductCard({ product }: Props) {
  const images = (product.images ?? [])
    .slice()
    .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));

  const qc = useQueryClient();
  const [imgIdx, setImgIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [qty, setQty] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCycle = () => {
    setHovered(true);
    if (images.length < 2 || intervalRef.current) return;
    intervalRef.current = setInterval(() => setImgIdx((i) => (i + 1) % images.length), 900);
  };
  const stopCycle = () => {
    setHovered(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setImgIdx(0);
  };
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const activeImage = images[imgIdx] ?? images[0];

  const cheapestVariant = product.variants?.reduce(
    (min, v) => Number(v.price) < Number(min.price) ? v : min,
    product.variants[0],
  );
  const inStock = product.variants?.some((v) => v.stockQty > 0);

  const discount =
    cheapestVariant?.compareAt
      ? Math.round(
          ((Number(cheapestVariant.compareAt) - Number(cheapestVariant.price)) /
            Number(cheapestVariant.compareAt)) * 100,
        )
      : 0;

  const ratings = product.reviews?.map((r) => r.rating) ?? [];
  const reviewCount = product._count?.reviews ?? ratings.length;
  const avgRating = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : null;

  const { taxRate } = useTaxConfig();
  const toGross = (v: number) => (product.vatIncluded ? v : v * (1 + taxRate / 100));
  const grossPrice = cheapestVariant ? toGross(Number(cheapestVariant.price)) : 0;
  const grossCompareAt =
    discount > 0 && cheapestVariant?.compareAt
      ? toGross(Number(cheapestVariant.compareAt))
      : 0;

  // Attribute'ları variant'lardan çıkar
  const allAttrValues =
    product.variants?.flatMap(
      (v) => v.attributeValues?.map((av) => av.attributeValue) ?? [],
    ) ?? [];
  const getAttr = (slug: string) =>
    allAttrValues.find((av) => av?.attribute?.slug === slug)?.value;

  const origin   = getAttr('mensei');
  const roast    = getAttr('kavrum-seviyesi');
  const type     = getAttr('kahve-turu');
  const intensity = product.intensity && product.intensity > 0 ? product.intensity : null;

  // Badge tag'i
  const tags = product.tags ?? [];
  const badgeTag = tags.find((t) => {
    const label = typeof t === 'string' ? t : t.tag;
    return label in BADGE_TAGS;
  });
  const badgeLabel = badgeTag
    ? BADGE_TAGS[typeof badgeTag === 'string' ? badgeTag : badgeTag.tag]
    : null;

  // Flavor notes — teknik tag'leri dışla
  const flavorNotes = tags
    .map((t) => (typeof t === 'string' ? t : t.tag))
    .filter((t) => !SKIP_TAGS.has(t))
    .slice(0, 3);

  const { isFavorite, toggleFavorite } = useWishlistStore();
  const { setCart } = useCartStore();
  const fav = isFavorite(product.id);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user?.isGuest || !user) {
      toast.info('Favorilere eklemek için üye olmanız gerekiyor.');
      navigate('/giris');
      return;
    }
    await toggleFavorite(product.id);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cheapestVariant || !inStock) return;
    try {
      const res = await cartApi.addItem(cheapestVariant.id, qty);
      setCart(res.data.data);
      qc.setQueryData(['cart'], res.data.data);
      toast.success('Ürün sepete eklendi!');
      setQty(1);
    } catch {
      toast.error('Sepete eklenemedi.');
    }
  };

  return (
    <Link to={`/urun/${product.slug}`} className="group">
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-espresso-900 rounded-2xl overflow-hidden border border-espresso-100 dark:border-espresso-700 hover:border-caramel-300 hover:shadow-xl transition-all duration-300 flex flex-col h-full"
      >
        {/* ─── Resim ──────────────────────────────────────────────── */}
        <div
          className="relative aspect-square overflow-hidden bg-cream-100 dark:bg-espresso-800"
          onMouseEnter={startCycle}
          onMouseLeave={stopCycle}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={imgIdx}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              {activeImage ? (
                <img
                  src={activeImage.url}
                  alt={activeImage.altText ?? product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-espresso-300 text-xs">
                  Görsel Yok
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Badge + İndirim — sol üst */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {badgeLabel && (
              <span className="px-2.5 py-1 rounded-full bg-espresso-700 text-cream-100 text-[11px] font-semibold">
                {badgeLabel}
              </span>
            )}
            {discount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-ember-500 text-white text-[11px] font-bold">
                %{discount} İndirim
              </span>
            )}
          </div>

          {/* Favori butonu — sağ üst */}
          <button
            onClick={handleFavoriteClick}
            className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            aria-label="Favorilere Ekle"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                fav ? 'fill-ember-500 text-ember-500' : 'text-espresso-400'
              }`}
            />
          </button>

          {/* Stok Yok overlay */}
          {!inStock && (
            <div className="absolute inset-0 bg-espresso-900/40 flex items-center justify-center">
              <span className="text-white text-xs font-bold uppercase tracking-wider bg-espresso-900/70 px-3 py-1 rounded-full">
                Tükendi
              </span>
            </div>
          )}

          {/* Sertlik — sol alt, overlay */}
          {intensity !== null && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur px-2.5 py-1.5 rounded-full">
              <span className="text-[10px] font-medium text-espresso-500 mr-0.5">Sertlik</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <Coffee
                  key={n}
                  className={`w-3 h-3 ${
                    n <= intensity
                      ? 'fill-espresso-700 text-espresso-700'
                      : 'text-espresso-200'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Çoklu resim dots */}
          {images.length > 1 && hovered && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1">
              {images.slice(0, 5).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === imgIdx ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ─── İçerik ─────────────────────────────────────────────── */}
        <div className="p-4 flex flex-col flex-1 gap-2">

          {/* Menşei · Kavrum · Tür */}
          {(origin || roast || type) ? (
            <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0 text-[11px] text-espresso-400 dark:text-espresso-300 font-medium">
              {origin && <span>{origin}</span>}
              {origin && roast && <span>·</span>}
              {roast && <span>{roast} Kavrum</span>}
              {(origin || roast) && type && <span>·</span>}
              {type && <span>{type}</span>}
            </div>
          ) : (product.brand?.name || product.category?.name) ? (
            <div className="flex items-center gap-1.5 text-[11px] text-espresso-400 dark:text-espresso-300 font-medium">
              {product.brand?.name && <span>{product.brand.name}</span>}
              {product.brand?.name && product.category?.name && <span>·</span>}
              {product.category?.name && <span>{product.category.name}</span>}
            </div>
          ) : null}

          {/* Ürün adı */}
          <h3 className="font-alatsi font-semibold text-espresso-800 dark:text-cream-100 leading-snug line-clamp-2 min-h-[2.5rem] text-sm sm:text-base">
            {product.name}
          </h3>

          {/* Flavor notes */}
          {flavorNotes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {flavorNotes.map((note) => (
                <span
                  key={note}
                  className="px-2 py-0.5 rounded-md bg-cream-200 dark:bg-espresso-700 text-espresso-600 dark:text-cream-200 text-[11px] font-medium capitalize"
                >
                  {note}
                </span>
              ))}
            </div>
          )}

          {/* Yıldız değerlendirmesi */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = avgRating !== null
                  ? n <= Math.round(avgRating)
                  : false; // yorum yoksa boş yıldız göster
                return (
                  <Star
                    key={n}
                    className={`w-3.5 h-3.5 ${
                      filled
                        ? 'fill-caramel-400 text-caramel-400'
                        : 'text-espresso-200 dark:text-espresso-600'
                    }`}
                  />
                );
              })}
            </div>
            {avgRating !== null ? (
              <span className="text-xs text-espresso-400 dark:text-espresso-300">
                {avgRating.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                {reviewCount > 0 && ` (${reviewCount})`}
              </span>
            ) : (
              <span className="text-xs text-espresso-300 dark:text-espresso-500">Henüz yorum yok</span>
            )}
          </div>

          {/* Öğütme seçici — sadece attribute varsa göster */}
          {cheapestVariant?.attributeValues && cheapestVariant.attributeValues.length > 0 && (() => {
            const grindAttr = allAttrValues.find((av) => av?.attribute?.slug === 'ogutme-secenegi');
            if (!grindAttr) return null;
            return (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-espresso-200 dark:border-espresso-600 text-xs text-espresso-600 dark:text-cream-300">
                <span>
                  Öğütme:{' '}
                  <strong className="text-espresso-700 dark:text-cream-100">{grindAttr.value}</strong>
                </span>
                <span className="text-espresso-400">Değiştir</span>
              </div>
            );
          })()}

          {/* Fiyat + Sepete ekle */}
          <div className="mt-auto pt-2 flex items-end justify-between gap-2">
            <div>
              {discount > 0 && (
                <p className="text-xs text-espresso-300 line-through leading-none mb-0.5">
                  {formatPrice(grossCompareAt)}
                </p>
              )}
              <p
                className={`text-lg font-bold leading-tight ${
                  discount > 0
                    ? 'text-ember-500'
                    : 'text-espresso-800 dark:text-cream-100'
                }`}
              >
                {cheapestVariant ? formatPrice(grossPrice) : 'Fiyat yok'}
              </p>
            </div>

            {inStock && (
              <div className="flex items-center gap-1.5">
                {/* Adet stepper */}
                <div className="flex items-center border border-espresso-200 dark:border-espresso-600 rounded-lg overflow-hidden">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQty((q) => Math.max(1, q - 1)); }}
                    className="w-7 h-8 flex items-center justify-center text-espresso-500 hover:bg-cream-100 dark:hover:bg-espresso-700 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold text-espresso-700 dark:text-cream-200">
                    {qty}
                  </span>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQty((q) => q + 1); }}
                    className="w-7 h-8 flex items-center justify-center text-espresso-500 hover:bg-cream-100 dark:hover:bg-espresso-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sepete ekle butonu */}
                <button
                  onClick={handleAddToCart}
                  className="h-8 px-3 rounded-lg bg-caramel-400 hover:bg-caramel-500 text-white flex items-center gap-1.5 text-sm font-semibold transition-colors active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Sepete Ekle</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

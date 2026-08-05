import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ShoppingCart, Star, Minus, Plus, Heart, Truck, Shield, RotateCcw, X, Coffee as CoffeeBean, Mountain, Scale, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { productApi } from '@/services/productApi';
import { cartApi } from '@/services/cartApi';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import type { ProductVariant } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { SeoHead, SITE_URL } from '@/components/seo/SeoHead';
import { productSchema, breadcrumbSchema } from '@/lib/schemas';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { ProductReviews } from '@/components/product/ProductReviews';
import { ProductQA } from '@/components/product/ProductQA';
import { ProductCard } from '@/components/product/ProductCard';

function formatPrice(price: number | string): string {
  return Number(price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { name: storeName } = useStoreInfo();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'brewing' | 'reviews' | 'qa'>('description');
  const [added, setAdded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxActiveImage, setLightboxActiveImage] = useState(0);

  const { setCart } = useCartStore();
  const { isFavorite, toggleFavorite } = useWishlistStore();
  const authUser = useAuthStore((s) => s.user);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productApi.get(slug!),
    enabled: !!slug,
    staleTime: 1000 * 30,
  });

  const product = data?.data?.data;
  const variant = selectedVariant ?? product?.variants?.[0] ?? null;
  const fav = product ? isFavorite(product.id) : false;

  useEffect(() => {
    if (product?.images?.length) {
      const idx = product.images.findIndex((img) => img.isPrimary);
      setActiveImage(idx >= 0 ? idx : 0);
      setLightboxActiveImage(idx >= 0 ? idx : 0);
    }
  }, [product?.id]);

  const handleAddToCart = async () => {
    if (!variant) return;
    try {
      const res = await cartApi.addItem(variant.id, qty);
      setCart(res.data.data);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      toast.success('Ürün sepete eklendi!');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Sepete eklenemedi');
    }
  };

  const primaryImage = product?.images?.find((img) => img.isPrimary) ?? product?.images?.[0];
  const avgRating = product?.reviews?.length
    ? (product.reviews as { rating: number }[]).reduce((s, r) => s + r.rating, 0) / product.reviews.length
    : null;
  const hasDiscount = variant?.compareAt && Number(variant.compareAt) > Number(variant.price);
  const discount = hasDiscount
    ? Math.round(((Number(variant.compareAt!) - Number(variant.price)) / Number(variant.compareAt!)) * 100)
    : 0;
  const images = product?.images ?? [];

  if (isLoading)
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </main>
    );

  if (isError || !product)
    return (
      <main className="container mx-auto px-4 py-24 text-center">
        <p className="text-xl text-espresso-600">Ürün bulunamadı.</p>
        <Link to="/" className="text-caramel-600 hover:underline mt-4 inline-block">
          Ana sayfaya dön
        </Link>
      </main>
    );

  // Get unique attributes
  const attributeMap = new Map<string, { id: string; name: string; slug: string; inputType: string; sortOrder: number }>();
  product.variants.forEach((v) =>
    v.attributeValues?.forEach(({ attributeValue: av }) => {
      if (!attributeMap.has(av.attribute.id)) attributeMap.set(av.attribute.id, av.attribute);
    })
  );
  const attributeKeys = [...attributeMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);

  // Extract origin/roast/type from variant attributes
  const allAttrValues = product.variants?.flatMap((v) => v.attributeValues?.map((av) => av.attributeValue) ?? []) ?? [];
  const getAttr = (slug: string) => allAttrValues.find((av) => av?.attribute?.slug === slug)?.value;
  const origin = getAttr('mensei');
  const roast = getAttr('kavrum-seviyesi');
  const coffeeType = getAttr('kahve-turu');

  // Flavor notes from tags (filter out technical/badge tags)
  const SKIP_TAGS = new Set([
    'arabica','robusta','blend','filtre','espresso','cekirdek',
    'yeni-hasat','cok-satan','sinirli-uretim','firsat','premium',
    'outlet','koyu-kavrum',
    'etiyopya','kolombiya','brezilya','guatemala','kenya','costa-rica',
    'peru','endonezya','hindistan','meksika','vietnam','jamaika',
  ]);
  const flavorNotes = (product.tags ?? [])
    .map((t) => (typeof t === 'string' ? t : t.tag))
    .filter((t) => !SKIP_TAGS.has(t));

  // Get related products - safely handle category.products if it doesn't exist
  const relatedProducts = (product.category as any)?.products?.filter((p: any) => p.id !== product.id).slice(0, 4) ?? [];

  return (
    <div className="pb-12">
      <SeoHead
        title={product.name}
        description={
          product.description
            ? product.description.slice(0, 155)
            : `${product.name} — ${product.category.name}`
        }
        image={primaryImage?.url}
        url={`${SITE_URL}/urun/${product.slug}`}
        type="product"
        schema={[
          productSchema(product, storeName),
          breadcrumbSchema([
            { name: 'Ana Sayfa', url: SITE_URL },
            {
              name: product.category.name,
              url: `${SITE_URL}/kategori/${product.category.slug}`,
            },
            { name: product.name, url: `${SITE_URL}/urun/${product.slug}` },
          ]),
        ]}
      />

      {/* Breadcrumb */}
      <div className="max-w-8xl mx-auto px-4 py-4">
        <nav className="flex items-center gap-1.5 text-sm text-espresso-400">
          <Link to="/" className="hover:text-caramel-600 transition-colors">
            Ana Sayfa
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to={`/kategori/${product.category.slug}`} className="hover:text-caramel-600 transition-colors">
            {product.category.name}
          </Link>
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
            {images.length > 1 && (
              <div className="flex sm:flex-col gap-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveImage(i);
                      setLightboxActiveImage(i);
                    }}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                      activeImage === i ? 'border-caramel-400' : 'border-espresso-100 hover:border-espresso-200'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {/* Main Image */}
            <div className="flex-1 relative aspect-square rounded-2xl overflow-hidden bg-cream-100 cursor-zoom-in group/img" onClick={() => setLightboxOpen(true)}>
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImage}
                  src={images[activeImage]?.url}
                  alt={product.name}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>
              {discount > 0 && (
                <span className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-ember-500 text-white text-xs font-bold">
                  %{discount}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-5">
            <div>
              {/* Origin · Roast · Type meta line */}
              {(origin || roast || coffeeType) && (
                <div className="flex items-center gap-2 text-sm text-espresso-400 font-medium mb-2">
                  {origin && <span>{origin}</span>}
                  {origin && roast && <span className="w-1 h-1 rounded-full bg-espresso-200" />}
                  {roast && <span>{roast} Kavrum</span>}
                  {(origin || roast) && coffeeType && <span className="w-1 h-1 rounded-full bg-espresso-200" />}
                  {coffeeType && <span>{coffeeType}</span>}
                </div>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold text-espresso-800 leading-tight mb-3">{product.name}</h1>
              {avgRating !== null && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`w-4 h-4 ${n <= Math.round(avgRating) ? 'fill-caramel-400 text-caramel-400' : 'text-espresso-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-espresso-500">
                    {avgRating.toFixed(1)} · {(product.reviews as { rating: number }[]).length} değerlendirme
                  </span>
                </div>
              )}
            </div>

            {/* Price */}
            {variant && (
              <div className="flex items-baseline gap-3 pb-4 border-b border-espresso-100">
                {hasDiscount && (
                  <span className="text-lg text-espresso-300 line-through">
                    {formatPrice(Number(variant.compareAt!))}
                  </span>
                )}
                <span className="text-3xl font-bold text-espresso-800">
                  {formatPrice(Number(variant.price))}
                </span>
                {discount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-ember-500/10 text-ember-600 text-sm font-semibold">
                    %{discount} indirim
                  </span>
                )}
              </div>
            )}

            {/* Tadım Notları */}
            {flavorNotes.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-espresso-700 mb-2">Tadım Notları</p>
                <div className="flex flex-wrap gap-2">
                  {flavorNotes.map((note) => (
                    <span key={note} className="px-3 py-1.5 rounded-lg bg-cream-200 text-espresso-700 text-sm font-medium">
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sertlik Derecesi */}
            {product.intensity != null && product.intensity > 0 && (
              <div>
                <p className="text-sm font-semibold text-espresso-700 mb-2">Sertlik Derecesi</p>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <CoffeeBean
                      key={n}
                      className={`w-5 h-5 ${n <= product.intensity! ? 'fill-espresso-700 text-espresso-700' : 'text-espresso-200'}`}
                    />
                  ))}
                  <span className="text-sm text-espresso-500 ml-2">{product.intensity}/5</span>
                </div>
              </div>
            )}

            {/* Quick Specs */}
            <div className="grid grid-cols-2 gap-3 py-4 border-y border-espresso-100">
              {origin && (
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-cream-200 flex items-center justify-center shrink-0">
                    <Mountain className="w-4 h-4 text-espresso-600" />
                  </div>
                  <div>
                    <p className="text-xs text-espresso-400">Menşei</p>
                    <p className="text-sm font-medium text-espresso-700">{origin}</p>
                  </div>
                </div>
              )}
              {roast && (
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-cream-200 flex items-center justify-center shrink-0">
                    <CoffeeBean className="w-4 h-4 text-espresso-600" />
                  </div>
                  <div>
                    <p className="text-xs text-espresso-400">Kavrum</p>
                    <p className="text-sm font-medium text-espresso-700">{roast}</p>
                  </div>
                </div>
              )}
              {coffeeType && (
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-cream-200 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4 text-espresso-600" />
                  </div>
                  <div>
                    <p className="text-xs text-espresso-400">Kahve Türü</p>
                    <p className="text-sm font-medium text-espresso-700">{coffeeType}</p>
                  </div>
                </div>
              )}
              {variant && (
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-cream-200 flex items-center justify-center shrink-0">
                    <Scale className="w-4 h-4 text-espresso-600" />
                  </div>
                  <div>
                    <p className="text-xs text-espresso-400">Desi</p>
                    <p className="text-sm font-medium text-espresso-700">{variant.desi ? `${variant.desi} desi` : '—'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Variant Attributes */}
            {attributeKeys.length > 0 && (
              <div className="flex flex-col gap-4">
                {attributeKeys.filter((attr) => {
                  if (!['mensei', 'kavrum-seviyesi', 'kahve-turu'].includes(attr.slug)) return true;
                  const uniqueCount = new Set(
                    product.variants
                      .flatMap((v) => v.attributeValues ?? [])
                      .filter(({ attributeValue: av }) => av.attribute.id === attr.id)
                      .map(({ attributeValue: av }) => av.id)
                  ).size;
                  return uniqueCount > 1;
                }).map((attr) => {
                  const uniqueValues = [
                    ...new Map(
                      product.variants
                        .flatMap((v) => v.attributeValues ?? [])
                        .filter(({ attributeValue: av }) => av.attribute.id === attr.id)
                        .map(({ attributeValue: av }) => [av.id, av])
                    ).values(),
                  ].sort((a, b) => a.sortOrder - b.sortOrder);

                  return (
                    <div key={attr.id}>
                      <p className="text-sm font-semibold text-espresso-700 mb-2">{attr.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {uniqueValues.map((av) => {
                          const matchVariant = product.variants.find((pv) => {
                            if (!pv.attributeValues?.some((x) => x.attributeValue.id === av.id)) return false;
                            for (const { attributeValue: curAv } of variant?.attributeValues ?? []) {
                              if (curAv.attribute.id === attr.id) continue;
                              if (!pv.attributeValues?.some((x) => x.attributeValue.id === curAv.id)) return false;
                            }
                            return true;
                          });
                          const isSelected = variant?.attributeValues?.some((x) => x.attributeValue.id === av.id);
                          return (
                            <button
                              key={av.id}
                              onClick={() => matchVariant && setSelectedVariant(matchVariant)}
                              className={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                                isSelected
                                  ? 'border-caramel-400 bg-caramel-100 text-caramel-700'
                                  : 'border-espresso-200 text-espresso-600 hover:border-espresso-300'
                              } ${matchVariant?.stockQty === 0 ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                              disabled={matchVariant?.stockQty === 0}
                            >
                              {av.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quantity + Add to Cart + Favorite */}
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
                onClick={() => {
                  if (authUser?.isGuest || !authUser) {
                    toast.info('Favorilere eklemek için üye olmanız gerekiyor.');
                    return;
                  }
                  toggleFavorite(product.id);
                }}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-colors ${
                  fav ? 'border-ember-500 bg-ember-500/10' : 'border-espresso-200 hover:border-espresso-300'
                }`}
              >
                <Heart className={`w-5 h-5 ${fav ? 'fill-ember-500 text-ember-500' : 'text-espresso-500'}`} />
              </button>
            </div>

            {/* Trust Badges */}
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
            { id: 'brewing' as const, label: 'Brewing' },
            { id: 'reviews' as const, label: 'Değerlendirmeler' },
            { id: 'qa' as const, label: 'Soru & Cevap' },
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
          {activeTab === 'description' && product.description && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl">
              <div
                className="text-espresso-600 leading-relaxed text-base product-description"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </motion.div>
          )}

          {activeTab === 'brewing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl">
              <p className="text-espresso-600">Brewing rehberi yakında eklenecek.</p>
            </motion.div>
          )}

          {activeTab === 'reviews' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ProductReviews productId={product.id} />
            </motion.div>
          )}

          {activeTab === 'qa' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ProductQA productId={product.id} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Benzer Ürünler - Related Products */}
      <div className="max-w-8xl mx-auto px-4 mt-12">
        <h2 className="text-xl sm:text-2xl font-bold text-espresso-800 mb-6">Benzer Ürünler</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="aspect-square rounded-xl mb-3" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </>
          ) : relatedProducts.length > 0 ? (
            relatedProducts.map((relProduct: any) => (
              <ProductCard key={relProduct.id} product={relProduct} />
            ))
          ) : (
            <p className="text-espresso-500 col-span-full text-center py-8">Benzer ürün bulunamadı.</p>
          )}
        </div>
      </div>

      {/* Lightbox - Full Screen Image View */}
      <AnimatePresence>
        {lightboxOpen && images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(false);
              }}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 p-2"
              aria-label="Kapat"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Main Image */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-full h-full px-4"
            >
              <img
                src={images[lightboxActiveImage]?.url}
                alt={product.name}
                className="max-w-4xl max-h-[90vh] object-contain"
              />
            </motion.div>

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxActiveImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2 z-10"
                  aria-label="Önceki resim"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxActiveImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2 z-10"
                  aria-label="Sonraki resim"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium">
                  {lightboxActiveImage + 1} / {images.length}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

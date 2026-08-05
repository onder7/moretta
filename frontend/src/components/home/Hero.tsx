import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

// Slide başlık/alt/CTA/badge meta — seed'deki slide img sırasıyla eşleşiyor
const SLIDE_META = [
  {
    badge: 'Yeni Hasat',
    title: 'Etiyopya Yirgacheffe',
    subtitle: 'Narenciye ve bergamot notalarıyla dengeli, çiçeksi bir aroma',
    cta: 'Keşfet',
    link: '/kategori/cekirdek-kahve',
  },
  {
    badge: 'Fırsat',
    title: 'Demleme Ekipmanlarında %20 İndirim',
    subtitle: 'V60, Chemex ve French Press modellerinde sınırlı süre fırsatı',
    cta: 'Ekipmanları İncele',
    link: '/kategori/demleme-ekipmanlari',
  },
  {
    badge: 'Yeni',
    title: 'Espresso Severler için Özel Seçki',
    subtitle: 'Koyu kavrum, yoğun gövde — tam otomatik makinelerle uyumlu',
    cta: 'Espresso Kahveleri',
    link: '/kategori/espresso',
  },
];

const SIDE_BANNERS = [
  {
    img: 'https://images.pexels.com/photos/32536993/pexels-photo-32536993.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    title: 'Demleme Ekipmanlarında %20',
    subtitle: 'V60 & Chemex serisinde',
    cta: 'Hemen İncele',
    link: '/kategori/demleme-ekipmanlari',
  },
  {
    img: 'https://images.pexels.com/photos/19252265/pexels-photo-19252265.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    title: 'İlk Siparişe %10 İndirim',
    subtitle: 'KAHVE10 koduyla',
    cta: 'Sepete Ekle',
    link: '/kategori/kahve-cesitleri',
  },
];

export function Hero() {
  const [current, setCurrent] = useState(0);

  const { data: slidesData } = useQuery({
    queryKey: ['homepage-slides'],
    queryFn: () => api.get<{ success: boolean; data: { img: string; link: string }[] }>('/slides'),
    staleTime: 10 * 60 * 1000,
  });
  const slides = slidesData?.data?.data ?? [];

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const next = () => slides.length > 0 && setCurrent((c) => (c + 1) % slides.length);
  const prev = () => slides.length > 0 && setCurrent((c) => (c - 1 + slides.length) % slides.length);

  const meta = SLIDE_META[current] ?? SLIDE_META[0];

  return (
    <section className="max-w-8xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-auto lg:h-[420px]">
        {/* Ana Slider */}
        <div className="lg:col-span-2 relative rounded-2xl overflow-hidden h-[300px] sm:h-[360px] lg:h-full bg-espresso-800">
          {slides.length > 0 && (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <img
                    src={slides[current].img}
                    alt={meta.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-espresso-900/85 via-espresso-800/50 to-transparent" />
                </motion.div>
              </AnimatePresence>

              {/* Metin katmanı */}
              <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 lg:p-14 z-10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="max-w-md"
                  >
                    <span className="inline-block px-3 py-1 rounded-full bg-caramel-400 text-white text-xs font-semibold mb-3">
                      {meta.badge}
                    </span>
                    <h2 className="font-alatsi text-2xl sm:text-3xl lg:text-4xl font-bold text-cream-50 leading-tight mb-2">
                      {meta.title}
                    </h2>
                    <p className="text-sm sm:text-base text-cream-200 mb-5 max-w-sm">
                      {meta.subtitle}
                    </p>
                    <Link
                      to={meta.link}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm transition-colors"
                    >
                      {meta.cta}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Ok butonları */}
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur hover:bg-white/40 text-white flex items-center justify-center transition-colors"
                aria-label="Önceki"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur hover:bg-white/40 text-white flex items-center justify-center transition-colors"
                aria-label="Sonraki"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Nokta indikatörleri */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {slides.map((_: unknown, i: number) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-caramel-400' : 'w-2 bg-white/50'}`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Yan Bannerlar */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          {SIDE_BANNERS.map((banner, i) => (
            <Link
              key={i}
              to={banner.link}
              className="relative rounded-2xl overflow-hidden h-[140px] sm:h-[170px] lg:h-[202px] group cursor-pointer block"
            >
              <img
                src={banner.img}
                alt={banner.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-espresso-900/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-sm lg:text-base font-bold text-cream-50 leading-tight">{banner.title}</p>
                <p className="text-xs text-cream-200 mb-2">{banner.subtitle}</p>
                <span className="inline-flex items-center gap-1 text-xs text-caramel-300 font-semibold">
                  {banner.cta} <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

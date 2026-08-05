import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { heroSlides, sideBanners } from '@/data/products';

export default function Hero() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrent((c) => (c + 1) % heroSlides.length);
  const prev = () => setCurrent((c) => (c - 1 + heroSlides.length) % heroSlides.length);

  return (
    <section className="max-w-8xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-auto lg:h-[420px]">
        {/* Main Slider */}
        <div className="lg:col-span-2 relative rounded-2xl overflow-hidden h-[300px] sm:h-[360px] lg:h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <img src={heroSlides[current].image} alt={heroSlides[current].title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-espresso-900/85 via-espresso-800/50 to-transparent" />
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 lg:p-14">
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
                  {heroSlides[current].badge}
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cream-50 leading-tight mb-2 text-balance">
                  {heroSlides[current].title}
                </h2>
                <p className="text-sm sm:text-base text-cream-200 mb-5 max-w-sm">
                  {heroSlides[current].subtitle}
                </p>
                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm transition-colors">
                  {heroSlides[current].cta}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Arrows */}
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur hover:bg-white/40 text-white flex items-center justify-center transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur hover:bg-white/40 text-white flex items-center justify-center transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-caramel-400' : 'w-2 bg-white/50'}`}
              />
            ))}
          </div>
        </div>

        {/* Side Banners */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          {sideBanners.map((banner) => (
            <div
              key={banner.id}
              className="relative rounded-2xl overflow-hidden h-[140px] sm:h-[170px] lg:h-[202px] group cursor-pointer"
            >
              <img
                src={banner.image}
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

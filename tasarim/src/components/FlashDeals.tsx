import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Clock } from 'lucide-react';
import ProductCard from './ProductCard';
import { products } from '@/data/products';

function getTimeLeft(target: number) {
  const diff = target - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function FlashDeals() {
  const [target] = useState(() => Date.now() + 1000 * 60 * 60 * 8);
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(target));

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000);
    return () => clearInterval(timer);
  }, [target]);

  const deals = products.filter((p) => p.oldPrice).slice(0, 4);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <section className="max-w-8xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-espresso-800 to-espresso-700 rounded-2xl p-5 sm:p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-ember-500 flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-cream-50">Flaş İndirimler</h2>
              <p className="text-sm text-cream-300">Günün en iyi kahve fırsatları</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-caramel-400" />
            <div className="flex gap-1.5">
              {[
                { label: 'Saat', val: timeLeft.hours },
                { label: 'Dak', val: timeLeft.minutes },
                { label: 'San', val: timeLeft.seconds },
              ].map((t, i) => (
                <div key={t.label} className="flex items-center gap-1.5">
                  <div className="bg-espresso-900/60 rounded-lg px-2.5 py-1.5 text-center min-w-[44px]">
                    <p className="text-lg font-bold text-caramel-400 tabular-nums leading-none">{pad(t.val)}</p>
                    <p className="text-[9px] text-cream-300 mt-0.5">{t.label}</p>
                  </div>
                  {i < 2 && <span className="text-caramel-400 font-bold">:</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {deals.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

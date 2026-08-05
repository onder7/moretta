import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame, Clock } from 'lucide-react';
import { productApi } from '@/services/productApi';
import { api } from '@/services/api';
import { ProductGrid } from '@/components/product/ProductGrid';

interface Campaign {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

function getTimeLeft(target: number) {
  const diff = target - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function FlashDeals() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignLoaded, setCampaignLoaded] = useState(false);

  // Kampanya verilerini getir
  const { data: campaignData, isLoading: isCampaignLoading } = useQuery({
    queryKey: ['campaign'],
    queryFn: () => api.get<{ success: boolean; data: Campaign }>('/campaign'),
    staleTime: 1000 * 60 * 5,
  });

  // Kampanya değiştiğinde timer'ı ayarla
  useEffect(() => {
    if (!isCampaignLoading) {
      setCampaignLoaded(true);
      if (campaignData?.data?.data) {
        const camp = campaignData.data.data;
        setCampaign(camp);
        const target = new Date(camp.endDate).getTime();
        setTimeLeft(getTimeLeft(target));
      } else {
        // Default kampanya yok, ama FlashDeals'ı göster
        setCampaign({
          id: 'default',
          name: 'Flas Indirimler',
          description: 'Gunun en iyi firsatlari',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
          isActive: true,
        });
        const target = Date.now() + 1000 * 60 * 60 * 8;
        setTimeLeft(getTimeLeft(target));
      }
    }
  }, [campaignData, isCampaignLoading]);

  // Timer'ı her saniye güncelle
  useEffect(() => {
    if (!campaign) return;
    const target = new Date(campaign.endDate).getTime();
    const timer = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000);
    return () => clearInterval(timer);
  }, [campaign]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'flash-deals'],
    queryFn: () => productApi.list({ sort: 'popular', limit: 8, onSale: true }),
    staleTime: 1000 * 60 * 5,
  });

  const products = data?.data?.items ?? [];

  // Scroll durumunu başlat
  useEffect(() => {
    // ProductGrid kullanıyor, scroll logic yok
  }, [products]);

  // Kampanya yüklenmedi, hiçbir şey gösterme
  if (!campaignLoaded) return null;
  
  // Ürün yüklendi ama ürün yok, gösterme
  if (!isLoading && products.length === 0) return null;

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
              <h2 className="font-alatsi text-xl sm:text-2xl font-bold text-cream-50">{campaign?.name || 'Flas Indirimler'}</h2>
              <p className="text-sm text-cream-300">{campaign?.description || 'Gunun en iyi firsatlari'}</p>
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

      <ProductGrid products={products} loading={isLoading} cols={4} />
    </section>
  );
}

import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  discountText: string;
  displayType: string;
  color: string;
  ctaText?: string;
  ctaLink?: string;
  endDate: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

const COLOR_STYLES: Record<string, string> = {
  primary: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
  success: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
  danger: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
  warning: 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)',
};

export function CampaignCarousel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const autoPlayRef = useRef<any>(null);

  useEffect(() => {
    // showOnHome kampanyalarını yükle
    fetch(`${API_BASE}/campaigns?isActive=true&showOnHome=true`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success || !Array.isArray(json.data)) return;

        // Süresi dolmayan kampanyaları filtre et
        const activeCampaigns = json.data.filter((c: Campaign) => {
          const now = new Date();
          const endDate = new Date(c.endDate);
          return endDate > now;
        });

        setCampaigns(activeCampaigns);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Auto-play carousel
  useEffect(() => {
    if (campaigns.length === 0) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % campaigns.length);
    }, 6000);

    return () => {
      if (autoPlayRef.current !== undefined) clearInterval(autoPlayRef.current);
    };
  }, [campaigns.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + campaigns.length) % campaigns.length);
    if (autoPlayRef.current !== undefined) clearInterval(autoPlayRef.current);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % campaigns.length);
    if (autoPlayRef.current !== undefined) clearInterval(autoPlayRef.current);
  };

  if (isLoading || campaigns.length === 0) return null;

  const campaign = campaigns[currentIndex];
  const gradient = COLOR_STYLES[campaign.color] || COLOR_STYLES.primary;

  return (
    <section className="w-full py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Başlık */}
        <div className="flex items-center gap-2 mb-8">
          <Zap className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold text-black dark:text-white">
            Aktif Kampanyalar
          </h2>
        </div>

        {/* Carousel Container */}
        <div className="relative group">
          {/* Carousel Slide */}
          <div
            style={{ background: gradient }}
            className="rounded-2xl overflow-hidden shadow-2xl text-white"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 sm:p-12">
              {/* Sol: Kampanya Bilgisi */}
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={20} className="opacity-80" />
                  <span className="text-sm font-semibold uppercase tracking-widest opacity-90">
                    {campaign.name}
                  </span>
                </div>

                <h3 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
                  {campaign.discountText}
                </h3>

                {campaign.description && (
                  <p className="text-lg opacity-90 mb-6 max-w-md">
                    {campaign.description}
                  </p>
                )}

                {/* CTA Button */}
                {campaign.ctaText && campaign.ctaLink ? (
                  <Link
                    to={campaign.ctaLink}
                    className="inline-block px-8 py-3 bg-white/20 hover:bg-white/30 border border-white/40 rounded-lg font-semibold text-base transition-colors backdrop-blur-sm w-fit"
                  >
                    {campaign.ctaText}
                  </Link>
                ) : null}
              </div>

              {/* Sağ: Zaman Bilgisi */}
              <div className="flex flex-col justify-center">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
                    <div className="text-4xl font-extrabold mb-2">
                      {Math.max(
                        0,
                        Math.ceil(
                          (new Date(campaign.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                        )
                      )}
                    </div>
                    <div className="text-sm uppercase tracking-widest opacity-80">Gün Kaldı</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
                    <div className="text-lg font-bold opacity-80 mb-2">
                      {campaigns.length > 1 ? `${currentIndex + 1} / ${campaigns.length}` : '1 / 1'}
                    </div>
                    <div className="text-sm uppercase tracking-widest opacity-80">Kampanya</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          {campaigns.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 md:-translate-x-12 p-2 rounded-full bg-white dark:bg-espresso-800 shadow-lg text-black dark:text-white hover:scale-110 transition-transform opacity-0 group-hover:opacity-100 z-10"
                aria-label="Önceki"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={handleNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 md:translate-x-12 p-2 rounded-full bg-white dark:bg-espresso-800 shadow-lg text-black dark:text-white hover:scale-110 transition-transform opacity-0 group-hover:opacity-100 z-10"
                aria-label="Sonraki"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Indicators */}
          {campaigns.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {campaigns.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-primary w-8'
                      : 'bg-espresso-200 dark:bg-espresso-600 w-2 hover:bg-espresso-300'
                  }`}
                  aria-label={`Kampanya ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

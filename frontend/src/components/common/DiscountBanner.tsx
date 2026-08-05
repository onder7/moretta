import { useState, useEffect, useCallback } from 'react';
import { X, Zap } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

interface Campaign {
  id: string;
  name: string;
  discountText: string;
  endDate: string;
  showOnHome: boolean;
  color: string;
  displayType: string;
  ctaText: string | null;
  ctaLink: string | null;
}

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number } | null;

const GRADIENTS: Record<string, string> = {
  primary: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
  red:     'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
  orange:  'linear-gradient(135deg, #F97316 0%, #C2410C 100%)',
  purple:  'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
  green:   'linear-gradient(135deg, #10B981 0%, #047857 100%)',
  navy:    'linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)',
};

function getTimeLeft(endDate: Date): TimeLeft {
  const diff = endDate.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days:    Math.floor(diff / 86_400_000),
    hours:   Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}

function pad(n: number) { return String(n).padStart(2, '0'); }

// ─── Sticky Bar ───────────────────────────────────────────────────────────────

function StickyBar({ campaign, timeLeft, gradient, onClose }: {
  campaign: Campaign; timeLeft: NonNullable<TimeLeft>; gradient: string; onClose: () => void;
}) {
  return (
    <div style={{ background: gradient }} className="w-full text-white text-sm z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-3 sm:gap-5 flex-wrap justify-between min-h-[44px]">

        {/* Sol: İsim + metin */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Zap size={15} className="shrink-0 opacity-80" />
          <span className="font-bold whitespace-nowrap truncate">{campaign.name}</span>
          <span className="hidden sm:block w-px h-3.5 bg-white/30 shrink-0" />
          <span className="hidden sm:block opacity-90 truncate">{campaign.discountText}</span>
        </div>

        {/* Orta: Geri sayım */}
        <div className="flex items-center gap-1.5 font-mono font-bold tabular-nums text-sm shrink-0">
          {campaign.discountText && (
            <span className="sm:hidden opacity-80 text-xs mr-1 truncate max-w-[90px]">{campaign.discountText}</span>
          )}
          {timeLeft.days > 0 && (
            <>
              <span className="flex flex-col items-center">
                <span className="text-base leading-none">{pad(timeLeft.days)}</span>
                <span className="text-[8px] uppercase tracking-widest opacity-60 leading-none mt-0.5">gün</span>
              </span>
              <span className="opacity-50 mb-2">:</span>
            </>
          )}
          <span className="flex flex-col items-center">
            <span className="text-base leading-none">{pad(timeLeft.hours)}</span>
            <span className="text-[8px] uppercase tracking-widest opacity-60 leading-none mt-0.5">saat</span>
          </span>
          <span className="opacity-50 mb-2">:</span>
          <span className="flex flex-col items-center">
            <span className="text-base leading-none">{pad(timeLeft.minutes)}</span>
            <span className="text-[8px] uppercase tracking-widest opacity-60 leading-none mt-0.5">dk</span>
          </span>
          <span className="opacity-50 mb-2">:</span>
          <span className="flex flex-col items-center">
            <span className="text-base leading-none">{pad(timeLeft.seconds)}</span>
            <span className="text-[8px] uppercase tracking-widest opacity-60 leading-none mt-0.5">sn</span>
          </span>
        </div>

        {/* Sağ: CTA + Kapat */}
        <div className="flex items-center gap-2 shrink-0">
          {campaign.ctaText && (
            <a
              href={campaign.ctaLink || '#'}
              className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              {campaign.ctaText}
            </a>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Kapat"
          >
            <X size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Popup ────────────────────────────────────────────────────────────────────

function CampaignPopup({ campaign, timeLeft, gradient, onClose, visible }: {
  campaign: Campaign; timeLeft: NonNullable<TimeLeft>; gradient: string;
  onClose: () => void; visible: boolean;
}) {
  return (
    <div
      className={`fixed inset-0 z-[9991] flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: visible ? 'rgba(0,0,0,0.60)' : 'transparent' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`relative bg-white dark:bg-espresso-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transition-all duration-300 ${
        visible ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
      }`}>

        {/* Kapat */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          aria-label="Kapat"
        >
          <X size={15} />
        </button>

        {/* Gradient header */}
        <div style={{ background: gradient }} className="px-6 pt-7 pb-6 text-white text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap size={16} className="opacity-80" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] opacity-80">{campaign.name}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">{campaign.discountText}</h2>
        </div>

        {/* Geri sayım */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-center text-[10px] text-espresso-300 dark:text-espresso-400 uppercase tracking-widest mb-4">
            Kampanya Bitimine Kalan Süre
          </p>
          <div className="flex items-start justify-center gap-2">
            {timeLeft.days > 0 && (
              <>
                <CountdownCard value={timeLeft.days} label="Gün" gradient={gradient} />
                <span className="text-2xl font-bold text-espresso-200 dark:text-espresso-500 mt-2">:</span>
              </>
            )}
            <CountdownCard value={timeLeft.hours} label="Saat" gradient={gradient} />
            <span className="text-2xl font-bold text-espresso-200 dark:text-espresso-500 mt-2">:</span>
            <CountdownCard value={timeLeft.minutes} label="Dakika" gradient={gradient} />
            <span className="text-2xl font-bold text-espresso-200 dark:text-espresso-500 mt-2">:</span>
            <CountdownCard value={timeLeft.seconds} label="Saniye" gradient={gradient} />
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 pt-4">
          {campaign.ctaText ? (
            <a
              href={campaign.ctaLink || '#'}
              onClick={onClose}
              style={{ background: gradient }}
              className="block w-full text-center py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              {campaign.ctaText}
            </a>
          ) : null}
          <button
            onClick={onClose}
            className="block w-full text-center mt-2 py-2 text-xs text-espresso-300 hover:text-espresso-500 dark:hover:text-cream-300 transition-colors"
          >
            Şimdi Değil
          </button>
        </div>

      </div>
    </div>
  );
}

function CountdownCard({ value, label, gradient }: { value: number; label: string; gradient: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        style={{ background: gradient }}
        className="w-14 h-14 rounded-xl flex items-center justify-center text-white"
      >
        <span className="text-xl font-extrabold tabular-nums leading-none">{pad(value)}</span>
      </div>
      <span className="text-[9px] text-espresso-300 mt-1.5 uppercase tracking-widest">{label}</span>
    </div>
  );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export function DiscountBanner() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/campaign`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success || !json.data) return;
        const c: Campaign = json.data;
        const left = getTimeLeft(new Date(c.endDate));
        if (!left) return;
        setCampaign(c);
        setTimeLeft(left);
        setVisible(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!campaign) return;
    const end = new Date(campaign.endDate);
    const timer = setInterval(() => {
      const left = getTimeLeft(end);
      if (!left) {
        setVisible(false);
        setTimeout(() => setCampaign(null), 300);
        clearInterval(timer);
        return;
      }
      setTimeLeft(left);
    }, 1000);
    return () => clearInterval(timer);
  }, [campaign]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setCampaign(null), 300);
  }, []);

  if (!campaign || !timeLeft) return null;

  const gradient = GRADIENTS[campaign.color] ?? GRADIENTS.primary;

  if (campaign.displayType === 'popup') {
    return (
      <CampaignPopup
        campaign={campaign}
        timeLeft={timeLeft}
        gradient={gradient}
        onClose={dismiss}
        visible={visible}
      />
    );
  }

  return visible ? (
    <StickyBar
      campaign={campaign}
      timeLeft={timeLeft}
      gradient={gradient}
      onClose={dismiss}
    />
  ) : null;
}

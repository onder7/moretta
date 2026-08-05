import { useState, useEffect, useCallback } from 'react';
import { X, Zap } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  discountText: string;
  discountAmount?: number;
  discountType?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  color: string;
  displayType: 'sticky' | 'banner' | 'badge';
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

const COLOR_STYLES: Record<string, { bg: string; gradient: string }> = {
  primary: {
    bg: 'bg-indigo-600',
    gradient: 'from-indigo-600 to-indigo-700',
  },
  red: {
    bg: 'bg-red-600',
    gradient: 'from-red-600 to-red-700',
  },
  orange: {
    bg: 'bg-orange-500',
    gradient: 'from-orange-500 to-orange-600',
  },
  purple: {
    bg: 'bg-violet-600',
    gradient: 'from-violet-600 to-violet-700',
  },
  green: {
    bg: 'bg-green-600',
    gradient: 'from-green-600 to-green-700',
  },
  navy: {
    bg: 'bg-blue-800',
    gradient: 'from-blue-800 to-blue-900',
  },
};

// ─── STICKY BAR ───────────────────────────────────────────────
function StickyBar({
  campaign,
  onClose,
}: {
  campaign: Campaign;
  onClose: () => void;
}) {
  const { formatted } = useCountdown(campaign.endDate);
  const colors = COLOR_STYLES[campaign.color] || COLOR_STYLES.primary;

  return (
    <div className={`${colors.bg} text-white sticky top-0 z-50 py-2 px-4 shadow-lg`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1">
          <Zap size={16} className="shrink-0" />
          <span className="font-bold text-sm truncate">{campaign.name}</span>
          <span className="hidden sm:block text-xs opacity-80">|</span>
          <span className="hidden sm:block text-sm opacity-90">{campaign.discountText}</span>
        </div>
        <div className="font-mono font-bold text-sm">{formatted}</div>
        <div className="flex items-center gap-2">
          {campaign.ctaText && (
            <a
              href={campaign.ctaLink || '#'}
              className="text-xs px-2 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
            >
              {campaign.ctaText}
            </a>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BANNER ───────────────────────────────────────────────────
export function CampaignBanner({
  campaign,
  onClose,
}: {
  campaign: Campaign;
  onClose?: () => void;
}) {
  const { formatted } = useCountdown(campaign.endDate);
  const colors = COLOR_STYLES[campaign.color] || COLOR_STYLES.primary;

  const bgStyle = campaign.imageUrl
    ? { backgroundImage: `url(${campaign.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div
      className={`bg-gradient-to-r ${colors.gradient} text-white p-8 sm:p-12 rounded-lg my-6 relative overflow-hidden`}
      style={bgStyle}
    >
      {/* Overlay for image readability */}
      {campaign.imageUrl && (
        <div className="absolute inset-0 bg-black/40" />
      )}

      {/* Decorative shapes */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white rounded-full" />
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {/* Left: Campaign Info */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={20} className="opacity-80" />
            <span className="text-xs font-bold uppercase tracking-widest opacity-90">{campaign.name}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-2 uppercase">{campaign.discountText}</h2>
          {campaign.description && (
            <p className="opacity-90 text-sm sm:text-base mb-4">{campaign.description}</p>
          )}
          {campaign.ctaText && (
            <a
              href={campaign.ctaLink || '#'}
              className="inline-block px-6 py-2 bg-white/20 hover:bg-white/30 border border-white/40 rounded text-sm font-bold transition-colors"
            >
              {campaign.ctaText}
            </a>
          )}
        </div>

        {/* Right: Countdown */}
        <div className="md:text-center bg-black/20 p-4 rounded-xl backdrop-blur-sm">
          <p className="text-xs uppercase tracking-widest mb-2 opacity-90">Bitişine</p>
          <div className="text-3xl sm:text-4xl font-mono font-bold">{formatted}</div>
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────
function CampaignBadge({ campaign }: { campaign: Campaign }) {
  const { formatted, isExpired } = useCountdown(campaign.endDate);
  const colors = COLOR_STYLES[campaign.color] || COLOR_STYLES.primary;

  if (isExpired) return null;

  return (
    <div className={`${colors.bg} text-white text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1 shadow-md`}>
      <Zap size={12} />
      <span>{campaign.discountText}</span>
      {new Date(campaign.endDate).getTime() - Date.now() < 24 * 60 * 60 * 1000 && (
        <>
          <span className="opacity-60">|</span>
          <span className="font-mono text-[10px]">{formatted}</span>
        </>
      )}
    </div>
  );
}

// ─── MAIN DISPLAY COMPONENT ───────────────────────────────────
export function CampaignDisplay() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch new campaigns system
    fetch(`${API_BASE}/campaigns?isActive=true`)
      .then((r) => r.json())
      .then((json) => {
        const newCampaigns: Campaign[] = [];

        // Add new campaigns
        if (json.success && Array.isArray(json.data)) {
          newCampaigns.push(...json.data.filter((c: Campaign) => {
            return new Date(c.endDate).getTime() > Date.now();
          }));
        }

        // Also fetch old single campaign (from Settings)
        return fetch(`${API_BASE}/campaign`)
          .then((r) => r.json())
          .then((json) => {
            if (json.success && json.data) {
              const oldCampaign = json.data as Campaign;
              if (new Date(oldCampaign.endDate).getTime() > Date.now()) {
                newCampaigns.push(oldCampaign);
              }
            }
            return newCampaigns;
          });
      })
      .then((allCampaigns) => {
        setCampaigns(allCampaigns);

        const visible = new Set<string>();
        allCampaigns.forEach((c: Campaign) => {
          if (c.displayType === 'sticky' || c.displayType === 'banner') {
            visible.add(c.id);
          }
        });
        setVisibleIds(visible);
      })
      .catch(() => {});
  }, []);

  const handleClose = useCallback((campaignId: string) => {
    const newVisible = new Set(visibleIds);
    newVisible.delete(campaignId);
    setVisibleIds(newVisible);
  }, [visibleIds]);

  const displayedCampaigns = campaigns.filter(
    (c) => c.displayType === 'sticky' && visibleIds.has(c.id)
  );

  const badgeCampaigns = campaigns.filter((c) => c.displayType === 'badge');

  return (
    <>
      {/* Sticky Bar */}
      {displayedCampaigns.map((campaign) => (
        <StickyBar key={campaign.id} campaign={campaign} onClose={() => handleClose(campaign.id)} />
      ))}

      {/* Badge Registry for Product Cards */}
      {badgeCampaigns.length > 0 && (
        <div className="badge-campaigns-registry" data-badge-campaigns={JSON.stringify(badgeCampaigns)} />
      )}
    </>
  );
}

// ─── BADGE EXPOSED COMPONENT FOR PRODUCT CARDS ─────────────────
export function CampaignBadges() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    const registryEl = document.querySelector('[data-badge-campaigns]');
    if (registryEl) {
      try {
        const badgeCampaigns = JSON.parse(registryEl.getAttribute('data-badge-campaigns') || '[]');
        setCampaigns(badgeCampaigns.filter((c: Campaign) => {
          return new Date(c.endDate).getTime() > Date.now();
        }));
      } catch (e) {
        console.error('Failed to parse badge campaigns:', e);
      }
    }
  }, []);

  if (campaigns.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {campaigns.map((campaign) => (
        <CampaignBadge key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}

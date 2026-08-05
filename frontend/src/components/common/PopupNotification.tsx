import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

interface PopupData {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  isActive: boolean;
  displayFreq: string;
}

export function PopupNotification() {
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/popup`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success || !json.data) return;
        const p: PopupData = json.data;

        if (p.displayFreq === 'session') {
          if (sessionStorage.getItem(`popup_seen_${p.id}`)) return;
        } else if (p.displayFreq === 'once_24h') {
          const ts = localStorage.getItem(`popup_seen_${p.id}`);
          if (ts && Date.now() - Number(ts) < 86_400_000) return;
        }

        setPopup(p);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!popup) return;
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, [popup]);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (popup) {
      if (popup.displayFreq === 'session') {
        sessionStorage.setItem(`popup_seen_${popup.id}`, '1');
      } else if (popup.displayFreq === 'once_24h') {
        localStorage.setItem(`popup_seen_${popup.id}`, String(Date.now()));
      }
    }
    setTimeout(() => setPopup(null), 300);
  }, [popup]);

  if (!popup) return null;

  return (
    <div
      className={`fixed inset-0 z-[9990] flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: visible ? 'rgba(0,0,0,0.55)' : 'transparent' }}
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div
        className={`relative bg-white dark:bg-espresso-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* Kapat butonu */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 text-espresso-600 dark:text-cream-200 transition-colors"
          aria-label="Kapat"
        >
          <X size={16} />
        </button>

        {/* Resim */}
        {popup.imageUrl && (
          <div className="w-full aspect-video overflow-hidden bg-cream-100 dark:bg-espresso-800">
            <img
              src={popup.imageUrl}
              alt={popup.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* İçerik */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-espresso-900 dark:text-white mb-3 pr-6">
            {popup.title}
          </h2>

          <div
            className="text-sm text-espresso-500 dark:text-cream-300 leading-relaxed mb-5"
            dangerouslySetInnerHTML={{ __html: popup.content }}
          />

          {popup.buttonText && (
            <div className="flex gap-3">
              <a
                href={popup.buttonLink || '#'}
                onClick={dismiss}
                className="flex-1 text-center px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                {popup.buttonText}
              </a>
              <button
                onClick={dismiss}
                className="px-4 py-2.5 rounded-xl border border-espresso-100 dark:border-espresso-700 text-sm text-espresso-400 dark:text-cream-400 hover:bg-cream-50 dark:hover:bg-espresso-800 transition-colors"
              >
                Şimdi Değil
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

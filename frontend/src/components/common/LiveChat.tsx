import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, ChevronDown } from 'lucide-react';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { useSocialLinks } from '@/hooks/useSocialLinks';

// ─── Tip tanımları ────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  ts: number;
  quickReplies?: string[];
}

// ─── Bilgi tabanı ─────────────────────────────────────────────────────────────

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '905551234567';
const API_BASE  = import.meta.env.VITE_API_URL ?? '/api';

interface KnowledgeRule {
  keywords: string[];
  response: string;
  quickReplies?: string[];
}

// Fallback (API erişilemezse kullanılır)
const KNOWLEDGE_FALLBACK: KnowledgeRule[] = [
  {
    keywords: ['merhaba', 'selam', 'hi', 'hey', 'iyi günler', 'iyi akşamlar', 'nasılsın'],
    response:
      'Merhaba! 👋 Mağazamıza hoş geldiniz. Size nasıl yardımcı olabilirim?\n\nAşağıdaki konularda bilgi alabilirim:',
    quickReplies: ['Kargo & Teslimat', 'İade & İptal', 'Ürün & Stok', 'Ödeme Seçenekleri'],
  },
  {
    keywords: ['kargo', 'teslimat', 'gönderim', 'kaç günde', 'ne zaman gelir', 'takip'],
    response:
      '🚚 **Kargo & Teslimat Bilgileri**\n\n• Siparişler 1–3 iş günü içinde kargoya verilir\n• Standart teslimat 2–4 iş günü sürer\n• 500₺ üzeri alışverişlerde kargo **ücretsiz!**\n• Kargo takibinizi Siparişlerim sayfasından yapabilirsiniz\n\nBaşka bir sorunuz var mı?',
    quickReplies: ['Siparişlerimi Göster', 'İade & İptal', 'Ana Sayfaya Dön'],
  },
  {
    keywords: ['iade', 'iptal', 'geri', 'para iadesi', 'değişim', 'bozuk', 'hasarlı', 'hatalı'],
    response:
      '↩️ **İade & İptal Politikası**\n\n• Ürün tesliminden itibaren **14 gün** iade hakkınız var\n• Kullanılmamış ve orijinal ambalajında olması şarttır\n• İade talebinizi Siparişlerim sayfasından oluşturabilirsiniz\n• İadeler onaylandıktan sonra 5–7 iş günü içinde ödeme iade edilir\n\nDetaylı yardım için bize WhatsApp\'tan ulaşabilirsiniz.',
    quickReplies: ['WhatsApp\'a Bağlan', 'Siparişlerimi Göster', 'Diğer Konular'],
  },
  {
    keywords: ['ödeme', 'kredi kartı', 'havale', 'taksit', 'kapıda', 'eft', 'banka'],
    response:
      '💳 **Ödeme Seçenekleri**\n\n• Tüm kredi ve banka kartları kabul edilir\n• 9 taksit imkânı (belirlı kartlar)\n• Havale / EFT ile ödeme\n• Kapıda ödeme (nakit veya kart)\n\nGüvenli ödeme altyapısı için SSL koruması kullanılmaktadır. 🔒',
    quickReplies: ['Kargo Bilgileri', 'İade & İptal', 'Ürün Soruları'],
  },
  {
    keywords: ['ürün', 'stok', 'var mı', 'mevcut', 'renk', 'beden', 'numara', 'model'],
    response:
      '📦 **Ürün & Stok Bilgisi**\n\nBelirli bir ürün hakkında bilgi almak için:\n• Arama çubuğunu kullanabilirsiniz\n• Kategoriler üzerinden göz atabilirsiniz\n• Stok durumu ürün sayfasında görünmektedir\n\nBelirli bir ürünü mü arıyorsunuz? Ürün adını yazabilirsiniz! 🔍',
    quickReplies: ['Ürünleri Ara', 'WhatsApp\'a Bağlan'],
  },
  {
    keywords: ['sipariş', 'siparişim', 'nerelde', 'durum', 'takip et'],
    response:
      '📋 **Sipariş Sorgulama**\n\nSipariş durumunuzu görmek için:\n• Hesabınıza giriş yapın\n• "Siparişlerim" sayfasını ziyaret edin\n• Her sipariş için kargo takip numarası mevcuttur\n\nGiriş yapmadan sipariş sorgulayamazsınız.',
    quickReplies: ['Siparişlerime Git', 'Kargo & Teslimat', 'Destek Al'],
  },
  {
    keywords: ['hesap', 'kayıt', 'üye', 'giriş', 'şifre', 'unuttum', 'profil'],
    response:
      '👤 **Hesap İşlemleri**\n\n• **Kayıt olmak** için sağ üstteki "Hesabım" butonuna tıklayın\n• **Şifrenizi** mi unuttunuz? Giriş sayfasındaki "Şifremi Unuttum" linkini kullanın\n• Profil bilgilerinizi "Hesabım → Profil" sayfasından güncelleyebilirsiniz',
    quickReplies: ['Giriş Yap', 'Kayıt Ol', 'Diğer Konular'],
  },
  {
    keywords: ['indirim', 'kampanya', 'kupon', 'fırsat', 'promosyon', 'kod'],
    response:
      '🎁 **İndirim & Kampanyalar**\n\n• Aktif kampanyaları ana sayfada görebilirsiniz\n• 500₺ üzeri siparişlerde ücretsiz kargo!\n• Yeni üyelere özel fırsatlar için bültenimize kayıt olun\n\nKupon kodunuzu sepet sayfasında uygulayabilirsiniz.',
    quickReplies: ['Kampanyaları Gör', 'Ürünleri İncele'],
  },
  {
    keywords: ['iletişim', 'telefon', 'email', 'mail', 'ulaş', 'yardım', 'destek', 'çözemedim', 'anlamadım'],
    response:
      '📞 **Bize Ulaşın**\n\nSorunuz çözülmediyse bize doğrudan ulaşabilirsiniz:\n\n• 💬 **WhatsApp**: En hızlı yanıt\n• Hafta içi 09:00–18:00 aktif destek\n\nWhatsApp üzerinden devam edelim mi?',
    quickReplies: ['WhatsApp\'a Bağlan', 'Sorunum Çözüldü ✓'],
  },
  {
    keywords: ['teşekkür', 'sağol', 'tamam', 'oldu', 'anladım', 'çözüldü'],
    response:
      'Rica ederim! 😊 Başka bir sorunuz olursa buradayım.\n\nAlışverişlerinizde kolaylıklar dilerim! 🛍️',
    quickReplies: ['Ürünlere Göz At', 'Görüşürüz 👋'],
  },
];

const NAVIGATION_ACTIONS: Record<string, string> = {
  'Siparişlerimi Göster': '/hesabim/siparisler',
  'Siparişlerime Git': '/hesabim/siparisler',
  'Giriş Yap': '/giris',
  'Kayıt Ol': '/kayit',
  'Ürünleri Ara': '/ara',
  'Kampanyaları Gör': '/',
  'Ürünlere Göz At': '/ara',
  'Ürünleri İncele': '/ara',
  'Ana Sayfaya Dön': '/',
};

const DEFAULT_RESPONSE: KnowledgeRule = {
  keywords: [],
  response:
    'Üzgünüm, bu konuda bilgim sınırlı. Size daha iyi yardımcı olabilmek için WhatsApp üzerinden bağlanmamı ister misiniz?',
  quickReplies: ['WhatsApp\'a Bağlan', 'Kargo & Teslimat', 'İade & İptal', 'Ödeme Seçenekleri'],
};

// ─── Yanıt motoru ─────────────────────────────────────────────────────────────

function buildMatcher(rules: KnowledgeRule[]) {
  // Boş anahtar kelimeye sahip ilk kuralı varsayılan (fallback) olarak belirle
  const fallbackRule = rules.find(r => !r.keywords || r.keywords.length === 0) ?? DEFAULT_RESPONSE;

  return function getResponse(userText: string): KnowledgeRule {
    const lower = userText.toLowerCase().trim();
    let best: KnowledgeRule | null = null;
    let bestScore = 0;
    
    for (const rule of rules) {
      if (!rule.keywords || rule.keywords.length === 0) continue;
      for (const kw of rule.keywords) {
        if (lower.includes(kw)) {
          const score = kw.length;
          if (score > bestScore) { bestScore = score; best = rule; }
        }
      }
    }
    return best ?? fallbackRule;
  };
}

// ─── Küçük yardımcılar ───────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Markdown **bold** → <strong>
function renderText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Bileşen ─────────────────────────────────────────────────────────────────

const GREETING: Message = {
  id: 'greeting',
  role: 'assistant',
  text: 'Merhaba! 👋 Canlı Asistanımıza hoş geldiniz.\n\nSize nasıl yardımcı olabilirim?',
  ts: Date.now(),
  quickReplies: ['Kargo & Teslimat', 'İade & İptal', 'Ürün & Stok', 'Ödeme Seçenekleri'],
};

export function LiveChat() {
  const { name: storeName } = useStoreInfo();
  // WhatsApp numarası sistem ayarlarından (Sosyal Medya); yoksa env fallback
  const { data: socialLinks } = useSocialLinks();
  const waNumber = socialLinks?.whatsapp ? socialLinks.whatsapp.replace(/\D/g, '') : WA_NUMBER;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const getResponseRef = useRef(buildMatcher(KNOWLEDGE_FALLBACK));

  // Chat açıkken kuralları çek; açılışta ve her 30s'de yenile
  const fetchRules = useCallback(() => {
    fetch(`${API_BASE}/chatbot/rules`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          getResponseRef.current = buildMatcher(json.data);
        }
      })
      .catch(() => { /* fallback kalır */ });
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchRules();
    const timer = setInterval(fetchRules, 30_000);
    return () => clearInterval(timer);
  }, [open, fetchRules]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typing, open, minimized]);

  // Focus input on open
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, minimized]);

  const pushMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
    if (!open) setUnread((n) => n + 1);
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
    setMinimized(false);
    setUnread(0);
  };

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setInput('');

      // WhatsApp yönlendirme
      if (trimmed === "WhatsApp'a Bağlan") {
        pushMessage({ id: uid(), role: 'user', text: trimmed, ts: Date.now() });
        setTyping(true);
        await new Promise((r) => setTimeout(r, 800));
        setTyping(false);
        pushMessage({
          id: uid(),
          role: 'assistant',
          text: 'Sizi WhatsApp destek hattımıza yönlendiriyorum... 💬',
          ts: Date.now(),
        });
        setTimeout(() => {
          window.open(`https://wa.me/${waNumber}?text=Merhaba, web sitesi üzerinden yardım almak istiyorum.`, '_blank');
        }, 800);
        return;
      }

      // Navigasyon aksiyonları
      if (trimmed in NAVIGATION_ACTIONS) {
        pushMessage({ id: uid(), role: 'user', text: trimmed, ts: Date.now() });
        setTyping(true);
        await new Promise((r) => setTimeout(r, 600));
        setTyping(false);
        pushMessage({
          id: uid(),
          role: 'assistant',
          text: `Sizi ilgili sayfaya yönlendiriyorum... 🔗`,
          ts: Date.now(),
        });
        setTimeout(() => {
          window.location.href = NAVIGATION_ACTIONS[trimmed];
        }, 700);
        return;
      }

      if (trimmed === 'Sorunum Çözüldü ✓' || trimmed === 'Görüşürüz 👋') {
        pushMessage({ id: uid(), role: 'user', text: trimmed, ts: Date.now() });
        setTyping(true);
        await new Promise((r) => setTimeout(r, 600));
        setTyping(false);
        pushMessage({
          id: uid(),
          role: 'assistant',
          text: 'Harika! 🎉 Başka bir sorunuz olursa her zaman buradayım. İyi alışverişler! 🛍️',
          ts: Date.now(),
        });
        return;
      }

      // Kullanıcı mesajı
      pushMessage({ id: uid(), role: 'user', text: trimmed, ts: Date.now() });

      // Bot yazıyor animasyonu
      setTyping(true);
      const delay = 700 + Math.min(trimmed.length * 15, 1200);
      await new Promise((r) => setTimeout(r, delay));
      setTyping(false);

      const rule = getResponseRef.current(trimmed);
      pushMessage({
        id: uid(),
        role: 'assistant',
        text: rule.response,
        ts: Date.now(),
        quickReplies: rule.quickReplies,
      });
    },
    [pushMessage, waNumber]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <>
      {/* Açık chat penceresi */}
      {open && (
        <div
          className={`fixed bottom-28 lg:bottom-6 right-4 sm:right-6 z-[70] flex flex-col rounded-2xl shadow-2xl border border-border bg-background overflow-hidden transition-all duration-300 ${
            minimized ? 'h-14 w-72' : 'w-[340px] sm:w-[380px] h-[520px]'
          }`}
          style={{ animation: 'chatSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground shrink-0">
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-none">{storeName} Asistan</p>
              <p className="text-xs text-primary-foreground/70 mt-0.5 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
                Çevrimiçi · Genellikle anında yanıt verir
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized((m) => !m)}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                title={minimized ? 'Büyüt' : 'Küçült'}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${minimized ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                title="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Mesaj alanı */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      msg.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    }`}>
                      {msg.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>

                    <div className={`flex flex-col gap-1 max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {/* Baloncuk */}
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                          msg.role === 'assistant'
                            ? 'bg-muted text-foreground rounded-tl-sm'
                            : 'bg-primary text-primary-foreground rounded-tr-sm'
                        }`}
                      >
                        {renderText(msg.text)}
                      </div>

                      {/* Zaman */}
                      <span className="text-[10px] text-muted-foreground px-1">{formatTime(msg.ts)}</span>

                      {/* Hızlı cevaplar */}
                      {msg.role === 'assistant' && msg.quickReplies && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {msg.quickReplies.map((qr) => (
                            <button
                              key={qr}
                              onClick={() => handleSend(qr)}
                              className="text-xs border border-primary/40 text-primary rounded-full px-3 py-1 hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
                            >
                              {qr}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {typing && (
                  <div className="flex gap-2 items-end">
                    <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input alanı */}
              <div className="px-3 pb-3 pt-2 border-t shrink-0">
                <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Mesajınızı yazın..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
                    maxLength={300}
                  />
                  <button
                    onClick={() => handleSend(input)}
                    disabled={!input.trim()}
                    className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-center text-[10px] text-muted-foreground mt-1.5">
                  {storeName} Canlı Destek · Gizliliğiniz güvendedir 🔒
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB tetikleyici buton */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-[70] h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group"
        style={{ background: 'oklch(0.55 0.2 250)' }}
        title="Canlı Destek"
        aria-label="Canlı Destek Chatbotunu Aç"
      >
        {open ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6 text-white" />
            {/* Okunmamış rozet */}
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
            {/* Pulse animasyonu */}
            <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: 'oklch(0.55 0.2 250)' }} />
          </>
        )}
      </button>

      {/* CSS animasyonu */}
      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </>
  );
}

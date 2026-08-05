import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronDown, Search, RotateCcw, CreditCard,
  Package, Shield, Mail, Phone, MapPin, MessageCircle, Clock,
} from 'lucide-react';
import { api } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

const FAQ_CATEGORIES = [
  {
    title: 'Sipariş & Teslimat',
    icon: Package,
    questions: [
      {
        q: 'Siparişim ne zaman gelir?',
        a: 'Siparişleriniz 24 saat içinde kargoya verilir. İstanbul içi 1-2 iş günü, Türkiye geneli 2-4 iş günü içinde teslim edilir. Kargo takip numarası e-posta ve SMS ile gönderilir.',
      },
      {
        q: 'Ücretsiz kargo hangi tutardan itibaren geçerli?',
        a: 'Sepet tutarınız belirli bir eşiği aştığında kargo ücreti otomatik olarak ücretsiz olur. Güncel eşik değerini sepet sayfasından görebilirsiniz.',
      },
      {
        q: 'Siparişimi nasıl takip edebilirim?',
        a: 'Hesabım > Siparişlerim bölümünden sipariş durumunuzu görebilir, kargo takip numarası ile anlık konum bilgisine ulaşabilirsiniz.',
      },
      {
        q: 'Kargom hasarlı geldi, ne yapmalıyım?',
        a: 'Hasarlı ürün teslim aldıysanız, teslimattan itibaren 48 saat içinde fotoğrafla birlikte müşteri hizmetlerine bildirin. Ücretsiz değişim sağlanır.',
      },
    ],
  },
  {
    title: 'İade & Değişim',
    icon: RotateCcw,
    questions: [
      {
        q: 'İade süresi ne kadar?',
        a: 'Ürünleri teslim tarihinden itibaren 14 gün içinde iade edebilirsiniz. Kahve ürünlerinin hijyenik doğası gereği, açılmamış paketler iade kabul edilir.',
      },
      {
        q: 'İade ücretini kim öder?',
        a: 'Hatalı veya hasarlı ürün gönderimlerinde iade kargo ücretini biz karşılıyoruz. Vazgeçme nedeniyle yapılan iadelerde kargo ücreti alıcıya aittir.',
      },
      {
        q: 'Para iadesi ne zaman yapılır?',
        a: 'İade ürünü depomuza ulaştıktan sonra 3-5 iş günü içinde ödeme yönteminize geri iade edilir. Kredi kartı iadeleri bankanıza göre 1-3 hafta sürebilir.',
      },
    ],
  },
  {
    title: 'Ödeme & Güvenlik',
    icon: CreditCard,
    questions: [
      {
        q: 'Hangi ödeme yöntemleri kabul ediliyor?',
        a: 'Kredi kartı (Visa, Mastercard, Troy), banka kartı ve IYZICO ile taksitli ödeme kabul edilmektedir. Tüm ödemeler 256-bit SSL şifreleme ile korunur.',
      },
      {
        q: 'Taksit seçenekleri neler?',
        a: 'IYZICO üzerinden Visa ve Mastercard ile 3, 6, 9 ve 12 taksit seçenekleri sunulmaktadır.',
      },
      {
        q: 'İndirim kodu nasıl kullanılır?',
        a: 'Sepet ödeme sayfasında "İndirim Kodu" alanına kodunuzu yazıp "Uygula" butonuna tıklayın. İndirim otomatik hesaplanır.',
      },
    ],
  },
  {
    title: 'Kahve & Saklama',
    icon: Shield,
    questions: [
      {
        q: 'Kahve çekirdeklerini nasıl saklamalıyım?',
        a: 'Kahveyi hava, ışık ve nemden uzak, oda sıcaklığında saklayın. Açıldıktan sonra 30 gün içinde tüketilmesi önerilir. Uzun süreli saklama için dondurucu kullanabilirsiniz.',
      },
      {
        q: 'Öğütülmüş kahve ne kadar dayanır?',
        a: 'Öğütülmüş kahve aromasını hızlı kaybettiği için çekirdek olarak alıp taze öğütmeniz önerilir. Öğütülmüş kahve açıldıktan sonra 15 gün içinde tüketilmelidir.',
      },
      {
        q: 'Kavrum seviyesi neyi ifade eder?',
        a: 'Açık kavrum meyvemsi ve asidik profilleri, orta kavrum dengeli tat ve gövdeyi, koyu kavrum ise yoğun ve bitter profilleri ön plana çıkarır.',
      },
    ],
  },
];

export function CustomerServicePage() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: companyInfoData } = useQuery({
    queryKey: ['company-info'],
    queryFn: () => fetch('/api/company-info').then((r) => r.ok ? r.json() : null),
    staleTime: 10 * 60 * 1000,
  });
  const companyInfo = companyInfoData?.data;

  const filteredFaqs = FAQ_CATEGORIES[activeCategory].questions.filter(
    (item) =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const contactItems = [
    {
      icon: Phone,
      title: 'Telefon',
      value: companyInfo?.phone ?? '0850 123 45 67',
      sub: 'Hafta içi 09:00 - 18:00',
    },
    {
      icon: Mail,
      title: 'E-posta',
      value: companyInfo?.email ?? 'destek@kahve.com',
      sub: '24 saat içinde yanıt',
    },
    {
      icon: MessageCircle,
      title: 'Canlı Destek',
      value: 'Online Sohbet',
      sub: 'Anında yardım alın',
    },
    {
      icon: MapPin,
      title: 'Mağaza',
      value: companyInfo?.city ? `${companyInfo.city}` : 'İstanbul',
      sub: 'Hafta içi 09:00 - 21:00',
    },
  ];

  return (
    <div className="max-w-8xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-espresso-400 mb-6">
        <Link to="/" className="hover:text-caramel-600 transition-colors">Ana Sayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-espresso-700 dark:text-cream-200 font-medium">Müşteri Hizmetleri</span>
      </nav>

      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-espresso-700 to-espresso-900 p-6 sm:p-10 mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-caramel-400/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cream-50 mb-3">
            Müşteri Hizmetleri
          </h1>
          <p className="text-cream-300 max-w-lg mb-6">
            Sorularınız mı var? Size yardımcı olmaktan mutluluk duyarız. Aşağıdaki sıkça sorulan soruları inceleyebilir veya bize ulaşabilirsiniz.
          </p>

          {/* Arama */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-espresso-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sorununuzu arayın..."
              className="w-full h-12 pl-11 pr-4 rounded-full bg-white text-sm text-espresso-700 placeholder:text-espresso-300 focus:outline-none focus:ring-2 focus:ring-caramel-400"
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Kategori Sekmesi — Sol */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-espresso-900 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-3 sticky top-40">
            <p className="text-sm font-bold text-espresso-800 dark:text-cream-50 px-2 py-2 mb-1">Kategoriler</p>
            {FAQ_CATEGORIES.map((cat, i) => (
              <button
                key={cat.title}
                onClick={() => {
                  setActiveCategory(i);
                  setOpenQuestion(null);
                  setSearchQuery('');
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left ${
                  activeCategory === i
                    ? 'bg-caramel-100 dark:bg-caramel-900/30 text-caramel-700 dark:text-caramel-300'
                    : 'text-espresso-600 dark:text-cream-300 hover:bg-cream-50 dark:hover:bg-espresso-800'
                }`}
              >
                <cat.icon className="w-5 h-5 shrink-0" />
                {cat.title}
              </button>
            ))}
          </div>
        </div>

        {/* İçerik — Sağ */}
        <div className="lg:col-span-2">
          {/* SSS Kartları */}
          <div className="bg-white dark:bg-espresso-900 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-5 sm:p-6 mb-6">
            <h2 className="text-xl font-bold text-espresso-800 dark:text-cream-50 mb-5 flex items-center gap-2">
              {(() => {
                const Icon = FAQ_CATEGORIES[activeCategory].icon;
                return <Icon className="w-5 h-5 text-caramel-500" />;
              })()}
              {FAQ_CATEGORIES[activeCategory].title}
            </h2>

            <div className="space-y-2">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((item, i) => {
                  const key = `${activeCategory}-${i}`;
                  const open = openQuestion === key;
                  return (
                    <div key={key} className="border border-espresso-50 dark:border-espresso-700 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenQuestion(open ? null : key)}
                        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-cream-50 dark:hover:bg-espresso-800 transition-colors"
                      >
                        <span className="text-sm font-medium text-espresso-700 dark:text-cream-200">{item.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-espresso-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <AnimatePresence>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="px-4 pb-4 text-sm text-espresso-500 dark:text-espresso-300 leading-relaxed">
                              {item.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-espresso-400 text-center py-8">Aramanıza uygun soru bulunamadı.</p>
              )}
            </div>
          </div>

          {/* İletişim Kartları */}
          <div className="grid sm:grid-cols-2 gap-4">
            {contactItems.map((contact) => (
              <div
                key={contact.title}
                className="bg-white dark:bg-espresso-900 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-cream-200 dark:bg-espresso-800 flex items-center justify-center shrink-0">
                    <contact.icon className="w-5 h-5 text-espresso-600 dark:text-caramel-400" />
                  </div>
                  <div>
                    <p className="text-xs text-espresso-400 dark:text-espresso-400">{contact.title}</p>
                    <p className="text-sm font-semibold text-espresso-700 dark:text-cream-100 mt-0.5">
                      {contact.value}
                    </p>
                    <p className="text-xs text-espresso-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {contact.sub}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* İletişim Formu */}
          <ContactForm companyInfo={companyInfo} />
        </div>
      </div>
    </div>
  );
}

// ─── İletişim Formu ─────────────────────────────────────────────────────────────
function ContactForm({ companyInfo }: { companyInfo: Record<string, string> | undefined }) {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', body: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.body) {
      setSubmitError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await api.post<{ success: boolean }>('/contact', formData);
      if (res.data?.success) {
        setSubmitSuccess(true);
        setFormData({ name: '', email: '', subject: '', body: '' });
      } else {
        setSubmitError('Mesajınız gönderilemedi. Lütfen daha sonra tekrar deneyin.');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setSubmitError(e.response?.data?.error || 'Bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6 bg-white dark:bg-espresso-900 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-5 sm:p-6">
      <h3 className="text-lg font-bold text-espresso-800 dark:text-cream-50 mb-4">Bize Yazın</h3>

      {submitSuccess && (
        <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
          Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.
        </div>
      )}
      {submitError && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-espresso-500 dark:text-cream-300 uppercase tracking-wider mb-1.5">
              Ad Soyad *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl border border-espresso-200 dark:border-espresso-700 dark:text-cream-100 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-caramel-400"
              placeholder="Adınız Soyadınız"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-espresso-500 dark:text-cream-300 uppercase tracking-wider mb-1.5">
              E-posta *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              className="w-full rounded-xl border border-espresso-200 dark:border-espresso-700 dark:text-cream-100 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-caramel-400"
              placeholder="ornek@email.com"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-espresso-500 dark:text-cream-300 uppercase tracking-wider mb-1.5">
            Konu
          </label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
            className="w-full rounded-xl border border-espresso-200 dark:border-espresso-700 dark:text-cream-100 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-caramel-400"
            placeholder="Mesaj konusu"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-espresso-500 dark:text-cream-300 uppercase tracking-wider mb-1.5">
            Mesajınız *
          </label>
          <textarea
            required
            rows={4}
            value={formData.body}
            onChange={(e) => setFormData((p) => ({ ...p, body: e.target.value }))}
            className="w-full rounded-xl border border-espresso-200 dark:border-espresso-700 dark:text-cream-100 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-caramel-400 resize-none"
            placeholder="Sorunuzu veya mesajınızı buraya yazın..."
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-xl bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm disabled:opacity-60 transition flex items-center justify-center gap-2"
        >
          {submitting ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Mesajı Gönder'
          )}
        </button>
      </form>

      {/* Şirket Bilgileri */}
      {companyInfo && (
        <div className="mt-6 pt-6 border-t border-espresso-100 dark:border-espresso-700 grid sm:grid-cols-3 gap-4">
          {companyInfo.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-caramel-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-espresso-400 uppercase">Adres</p>
                <p className="text-sm text-espresso-700 dark:text-cream-200">{companyInfo.address}</p>
              </div>
            </div>
          )}
          {companyInfo.email && (
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-caramel-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-espresso-400 uppercase">E-posta</p>
                <a href={`mailto:${companyInfo.email}`} className="text-sm text-caramel-600 hover:underline">
                  {companyInfo.email}
                </a>
              </div>
            </div>
          )}
          {companyInfo.phone && (
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-caramel-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-espresso-400 uppercase">Telefon</p>
                <a href={`tel:${companyInfo.phone}`} className="text-sm text-caramel-600 hover:underline">
                  {companyInfo.phone}
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

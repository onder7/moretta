import { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Mail, RefreshCw, HelpCircle, FileText, Info, Lock, ArrowLeft, Loader2, MapPin, Phone } from 'lucide-react';

// Sistem sayfaları için ikon eşlemesi (özel sayfalar genel FileText kullanır)
const SYSTEM_ICONS: Record<string, typeof Mail> = {
  iletisim: Mail,
  iade: RefreshCw,
  sss: HelpCircle,
  sozlesmeler: FileText,
  hakkimizda: Info,
  kvkk: Lock,
  uyelik: FileText,
};

interface MenuPage { slug: string; title: string; isSystem: boolean }

export function SupportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { isAuthenticated, user } = useAuthStore();

  const getSlugFromPath = (path: string) => {
    if (path.startsWith('/sayfa/')) return params.slug || '';
    if (path.startsWith('/iade')) return 'iade';
    if (path.startsWith('/sss')) return 'sss';
    if (path.startsWith('/sozlesmeler')) return 'sozlesmeler';
    if (path.startsWith('/hakkimizda')) return 'hakkimizda';
    if (path.startsWith('/kvkk')) return 'kvkk';
    if (path.startsWith('/uyelik')) return 'uyelik';
    return 'iletisim';
  };
  const currentSlug = getSlugFromPath(location.pathname);

  const [menuPages, setMenuPages] = useState<MenuPage[]>([]);
  const [pageTitle, setPageTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    mapEmbed: string;
  } | null>(null);

  // Contact Form State
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', body: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        name: user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName ?? ''}`.trim() : '',
        email: user.email || '',
      }));
    }
  }, [isAuthenticated, user]);

  // Menüde gösterilecek sayfalar (kenar çubuğu)
  useEffect(() => {
    api.get<{ success: boolean; data: MenuPage[] }>('/pages')
      .then((res) => { if (res.data?.success) setMenuPages(res.data.data); })
      .catch((err) => console.error('Failed to load menu pages:', err));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    setSubmitSuccess(false);
    setSubmitError('');
    api.get<{ success: boolean; data: { slug: string; title: string; content: string } }>(`/pages/${currentSlug}`)
      .then((res) => {
        if (res.data?.success) {
          setContent(res.data.data.content);
          setPageTitle(res.data.data.title);
        } else {
          setError('Sayfa içeriği yüklenemedi.');
        }
      })
      .catch((err) => {
        console.error('Failed to load page content:', err);
        setError('Sayfa bulunamadı veya yüklenirken bir hata oluştu.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentSlug]);

  // Fetch company info for contact page
  useEffect(() => {
    if (currentSlug === 'iletisim') {
      fetch('/api/company-info')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.data) {
            setCompanyInfo(data.data);
          }
        })
        .catch(err => {
          console.error('Failed to load company info:', err);
        });
    }
  }, [currentSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.body) {
      setSubmitError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);
    try {
      const res = await api.post<{ success: boolean }>('/contact', formData);
      if (res.data?.success) {
        setSubmitSuccess(true);
        setFormData(prev => ({ ...prev, subject: '', body: '' })); // clear message inputs, keep name/email
      } else {
        setSubmitError('Mesajınız gönderilemedi. Lütfen daha sonra tekrar deneyin.');
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeLabel = pageTitle || menuPages.find(p => p.slug === currentSlug)?.title || 'Müşteri Hizmetleri';

  return (
    <main className="bg-cream-50/50 dark:bg-espresso-950 min-h-[calc(100vh-160px)] pb-16 pt-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb / Back button */}
        <div className="mb-6 flex items-center gap-2 text-sm text-espresso-400">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
            <span>Ana Sayfa</span>
          </button>
          <span>/</span>
          <span className="text-espresso-700 dark:text-cream-200 font-medium">{activeLabel}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Nav */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-white dark:bg-espresso-900 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-4 shadow-xs sticky top-24">
              <h2 className="text-xs font-bold text-espresso-300 dark:text-espresso-400 uppercase tracking-widest px-3 mb-4">
                Müşteri Hizmetleri
              </h2>
              <nav className="space-y-1">
                {menuPages.map((item) => {
                  const Icon = item.isSystem ? (SYSTEM_ICONS[item.slug] ?? FileText) : FileText;
                  const isActive = item.slug === currentSlug;
                  const to = item.isSystem ? `/${item.slug}` : `/sayfa/${item.slug}`;
                  return (
                    <Link
                      key={item.slug}
                      to={to}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition ${
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-espresso-500 dark:text-cream-300 hover:bg-cream-50 dark:hover:bg-espresso-800 hover:text-espresso-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-espresso-300 dark:text-espresso-400'}`} />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Page Content Card */}
          <section className="flex-1 min-w-0">
            <div className="bg-white dark:bg-espresso-900 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-6 md:p-10 shadow-xs">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-espresso-300 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Yükleniyor...</p>
                </div>
              ) : error ? (
                <div className="py-16 text-center">
                  <p className="text-red-500 font-medium">{error}</p>
                  <button
                    onClick={() => setContent('')} // triggers reload via effect dependency if changed
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-opacity-90 transition"
                  >
                    Tekrar Dene
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Rich HTML Content from Database */}
                  <div
                    className="page-content max-w-none text-espresso-600 dark:text-cream-300 font-sans"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />

                  {/* Interactive form only on iletisim page */}
                  {currentSlug === 'iletisim' && (
                    <div className="mt-8 border-t border-espresso-100 dark:border-espresso-700 pt-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Form */}
                        <div>
                          <h3 className="text-lg font-bold text-espresso-700 dark:text-cream-100 mb-4">Bizimle İletişime Geçin</h3>
                          <form onSubmit={handleSubmit} className="space-y-4">
                            {submitSuccess && (
                              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                                Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.
                              </div>
                            )}
                            {submitError && (
                              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                                {submitError}
                              </div>
                            )}
                            <div>
                              <label className="block text-xs font-semibold text-espresso-400 dark:text-cream-300 uppercase tracking-wider mb-1.5">
                                Ad Soyad *
                              </label>
                              <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full rounded-xl border border-espresso-200 dark:border-espresso-700 dark:text-cream-100 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                                placeholder="Adınız Soyadınız"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-espresso-400 dark:text-cream-300 uppercase tracking-wider mb-1.5">
                                E-posta *
                              </label>
                              <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full rounded-xl border border-espresso-200 dark:border-espresso-700 dark:text-cream-100 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                                placeholder="ornek@mail.com"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-espresso-400 dark:text-cream-300 uppercase tracking-wider mb-1.5">
                                Konu
                              </label>
                              <input
                                type="text"
                                value={formData.subject}
                                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                className="w-full rounded-xl border border-espresso-200 dark:border-espresso-700 dark:text-cream-100 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                                placeholder="Mesaj konusu"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-espresso-400 dark:text-cream-300 uppercase tracking-wider mb-1.5">
                                Mesajınız *
                              </label>
                              <textarea
                                required
                                rows={4}
                                value={formData.body}
                                onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                                className="w-full rounded-xl border border-espresso-200 dark:border-espresso-700 dark:text-cream-100 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                                placeholder="Sorunuzu veya mesajınızı buraya yazın..."
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={submitting}
                              className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-opacity-95 disabled:opacity-50 transition cursor-pointer text-sm shadow-xs flex items-center justify-center gap-2"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Gönderiliyor...</span>
                                </>
                              ) : (
                                <span>Mesajı Gönder</span>
                              )}
                            </button>
                          </form>
                        </div>

                        {/* Company Info Card */}
                        <div>
                          <h3 className="text-lg font-bold text-espresso-700 dark:text-cream-100 mb-4">Merkez Ofisimiz</h3>
                          <div className="space-y-4">
                            <p className="text-sm text-espresso-500 dark:text-cream-300 font-sans leading-relaxed">
                              {companyInfo ? `Ziyaret etmek veya soru sormak isterseniz, merkez ofisimiz ${companyInfo.city} şehir merkezinde yer almaktadır.` : 'Ziyaret etmek veya soru sormak isterseniz, merkez ofisimiz Ankara şehir merkezinde yer almaktadır.'}
                            </p>
                            {companyInfo && (
                              <div className="space-y-3 pt-4 border-t border-espresso-200 dark:border-espresso-700">
                                <div className="flex items-start gap-3">
                                  <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs font-semibold text-espresso-400 dark:text-cream-300 uppercase">Adres</p>
                                    <p className="text-sm text-espresso-700 dark:text-cream-200 font-medium">{companyInfo.address}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs font-semibold text-espresso-400 dark:text-cream-300 uppercase">E-posta</p>
                                    <a href={`mailto:${companyInfo.email}`} className="text-sm text-primary hover:underline font-medium">
                                      {companyInfo.email}
                                    </a>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs font-semibold text-espresso-400 dark:text-cream-300 uppercase">Telefon</p>
                                    <a href={`tel:${companyInfo.phone}`} className="text-sm text-primary hover:underline font-medium">
                                      {companyInfo.phone}
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Map Section */}
                      {companyInfo && (
                        <div className="mt-8 pt-8 border-t border-espresso-100 dark:border-espresso-700">
                          <h3 className="text-lg font-bold text-espresso-700 dark:text-cream-100 mb-4">Konumumuz</h3>
                          <div className="h-[400px] rounded-2xl overflow-hidden border border-espresso-100 dark:border-espresso-700 shadow-xs">
                            <iframe
                              src={companyInfo.mapEmbed}
                              width="100%"
                              height="100%"
                              style={{ border: 0 }}
                              allowFullScreen
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}


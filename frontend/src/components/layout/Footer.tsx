import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/services/productApi';
import { api } from '@/services/api';
import { Mail, Truck, Shield, Headphones, CreditCard, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { useSocialLinks } from '@/hooks/useSocialLinks';
import { useStoreInfo } from '@/hooks/useStoreInfo';

export function Footer() {
  const { name: storeName, slogan: storeSlogan } = useStoreInfo();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.categories(),
  });
  const categories = categoriesData?.data?.data?.slice(0, 5) ?? [];

  const { data: menuPagesData } = useQuery({
    queryKey: ['menu-pages'],
    queryFn: () => api.get<{ success: boolean; data: Array<{ slug: string; title: string; isSystem: boolean; showInHeader: boolean; showInFooter: boolean }> }>('/pages'),
    staleTime: 5 * 60 * 1000,
  });
  const menuPages = (menuPagesData?.data?.data ?? []).filter((p) => p.showInFooter);

  const { data: socialLinks } = useSocialLinks();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/newsletter/subscribe', { email });
      if (res.data.success) {
        toast.success(res.data.message || 'Bultenimize basariyla abone oldunuz!');
        setEmail('');
      } else {
        toast.error(res.data.message || 'Abonelik sirasinda bir hata olustu.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bir hata olustu, lutfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasSocialLinks = socialLinks && Object.values(socialLinks).some((v) => v && v.trim() !== '');

  return (
    <footer className="bg-espresso-900 text-cream-200 mt-auto pb-20 lg:pb-0">
      {/* Trust Badges */}
      <div className="border-b border-espresso-700">
        <div className="max-w-8xl mx-auto px-4 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Truck, title: 'Hizli Kargo', desc: 'Ucretsiz kargo secenegi' },
            { icon: Shield, title: 'Guvenli Odeme', desc: '256-bit SSL sifreleme' },
            { icon: Headphones, title: '7/24 Destek', desc: 'Uzman musteri hizmetleri' },
            { icon: CreditCard, title: 'Esnek Odeme', desc: 'Kredi karti, havale, kapida' },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-espresso-700 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-caramel-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-cream-50">{item.title}</p>
                <p className="text-xs text-cream-300">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Newsletter */}
      <div className="border-b border-espresso-700">
        <div className="max-w-8xl mx-auto px-4 py-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="text-center lg:text-left">
            <h3 className="text-xl sm:text-2xl font-bold text-cream-50 mb-1">Ozel Firsatlardan Haberdar Olun</h3>
            <p className="text-sm text-cream-300">Yeni urunler, kampanyalar ve size ozel indirimler icin abone olun.</p>
          </div>
          <form onSubmit={handleSubscribe} className="flex w-full max-w-md gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-espresso-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta adresiniz"
                disabled={submitting}
                className="w-full h-12 pl-11 pr-4 rounded-full bg-espresso-800 border border-espresso-600 text-cream-100 placeholder:text-espresso-400 text-sm focus:outline-none focus:border-caramel-400 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="h-12 px-6 rounded-full bg-caramel-400 hover:bg-caramel-500 disabled:opacity-50 text-white font-semibold text-sm whitespace-nowrap transition-colors"
            >
              {submitting ? 'Gonderiliyor...' : 'Abone Ol'}
            </button>
          </form>
        </div>
      </div>

      {/* Links */}
      <div className="max-w-8xl mx-auto px-4 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="col-span-2 lg:col-span-1">
          <p className="font-bold text-cream-50 text-lg mb-4">{storeName}</p>
          <div
            className="text-sm text-cream-300 leading-relaxed max-w-xs [&_a]:underline [&_a]:text-cream-200 hover:[&_a]:text-white [&_p]:mb-2 [&_strong]:text-white"
            dangerouslySetInnerHTML={{ __html: storeSlogan || 'Guvenli odeme ve hizli kargo secenekleriyle binlerce urunu kesfedin.' }}
          />
          {hasSocialLinks && (
            <div className="flex items-center flex-wrap gap-3 mt-4">
              {socialLinks.instagram && (
                <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="p-2 bg-espresso-700 hover:bg-caramel-500 rounded-full transition-colors text-cream-300 hover:text-white">
                  <svg className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                </a>
              )}
              {socialLinks.facebook && (
                <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="p-2 bg-espresso-700 hover:bg-caramel-500 rounded-full transition-colors text-cream-300 hover:text-white">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /></svg>
                </a>
              )}
              {socialLinks.whatsapp && (
                <a href={`https://wa.me/${socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-2 bg-espresso-700 hover:bg-caramel-500 rounded-full transition-colors text-cream-300 hover:text-white">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 32 32"><path d="M16.003 3C9.375 3 4 8.373 4 15.001c0 2.118.553 4.107 1.518 5.837L4 29l8.38-1.495A12.94 12.94 0 0016.003 28c6.628 0 12.003-5.373 12.003-12.001S22.631 3 16.003 3z" /></svg>
                </a>
              )}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-cream-50 mb-3">Kategoriler</h4>
          <ul className="space-y-2">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link to={`/kategori/${cat.slug}`} className="text-sm text-cream-300 hover:text-caramel-400 transition-colors flex items-center gap-1 group">
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-cream-50 mb-3">Hesabim</h4>
          <ul className="space-y-2">
            {[
              { to: '/hesabim/siparisler', label: 'Siparislerim' },
              { to: '/hesabim/profil', label: 'Profil Bilgilerim' },
              { to: '/sepet', label: 'Sepetim' },
              { to: '/hesabim/favoriler', label: 'Favori Urunlerim' },
            ].map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-cream-300 hover:text-caramel-400 transition-colors flex items-center gap-1 group">
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {menuPages.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-cream-50 mb-3">Musteri Hizmetleri</h4>
            <ul className="space-y-2">
              {menuPages.map((p) => (
                <li key={p.slug}>
                  <Link
                    to={p.isSystem ? `/${p.slug}` : `/sayfa/${p.slug}`}
                    className="text-sm text-cream-300 hover:text-caramel-400 transition-colors flex items-center gap-1 group"
                  >
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-espresso-700">
        <div className="max-w-8xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-xs text-cream-400">&copy; {new Date().getFullYear()} {storeName}. Tum haklari saklidir.</p>
            <p className="text-xs text-cream-500 mt-1">
              Yazilim &amp; Gelistirme:{' '}
              <a href="https://nefesol.net/" target="_blank" rel="noopener noreferrer" className="hover:text-caramel-400 transition-colors">nefesol.net</a>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-cream-400 mr-1">Guvenli Odeme:</span>
            {['VISA', 'Mastercard', 'iyzico'].map((p) => (
              <div key={p} className="px-3 py-1.5 rounded-md bg-espresso-800 border border-espresso-600 text-xs font-bold text-cream-300">
                {p}
              </div>
            ))}
            <CreditCard className="w-6 h-6 text-cream-400" />
          </div>
        </div>
      </div>
    </footer>
  );
}

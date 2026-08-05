import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Coffee, Mail, Truck, Shield, Headphones, CreditCard, ChevronRight } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="bg-espresso-900 text-cream-200 mt-12">
      {/* Trust Badges */}
      <div className="border-b border-espresso-700">
        <div className="max-w-8xl mx-auto px-4 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Truck, title: 'Hızlı Kargo', desc: '500 TL üzeri ücretsiz' },
            { icon: Shield, title: 'Güvenli Ödeme', desc: '256-bit SSL şifreleme' },
            { icon: Headphones, title: '7/24 Destek', desc: 'Uzman kahve danışmanlığı' },
            { icon: Coffee, title: 'Taze Kavrum', desc: 'Sipariş sonrası kavrulur' },
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
            <h3 className="text-xl sm:text-2xl font-bold text-cream-50 mb-1">Kahve Kulübümüze Katılın</h3>
            <p className="text-sm text-cream-300">Yeni hasatlar, özel fırsatlar ve %10 ilk sipariş indirimi için abone olun.</p>
          </div>
          <form onSubmit={subscribe} className="flex w-full max-w-md gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-espresso-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta adresiniz"
                className="w-full h-12 pl-11 pr-4 rounded-full bg-espresso-800 border border-espresso-600 text-cream-100 placeholder:text-espresso-400 text-sm focus:outline-none focus:border-caramel-400 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="h-12 px-6 rounded-full bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm whitespace-nowrap transition-colors"
            >
              {subscribed ? 'Abone Olundu!' : 'Abone Ol'}
            </button>
          </form>
        </div>
      </div>

      {/* Links */}
      <div className="max-w-8xl mx-auto px-4 py-10 grid grid-cols-2 lg:grid-cols-5 gap-8">
        <div className="col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-caramel-400 flex items-center justify-center">
              <Coffee className="w-5 h-5 text-espresso-900" />
            </div>
            <div>
              <p className="font-bold text-cream-50 text-lg leading-none">Aroma</p>
              <p className="text-xs text-caramel-400 font-medium tracking-wider">COFFEE CO.</p>
            </div>
          </div>
          <p className="text-sm text-cream-300 leading-relaxed max-w-xs">
            2018'den beri taze kavrulmuş özel nitelikli kahve çekirdekleri ve demleme ekipmanları sunuyoruz.
          </p>
        </div>

        {[
          { title: 'Müşteri Hizmetleri', links: [{ label: 'Sipariş Takibi', to: '/account' }, { label: 'İade & Değişim', to: '/customer-service' }, { label: 'Kargo Bilgileri', to: '/customer-service' }, { label: 'SSS', to: '/customer-service' }, { label: 'İletişim', to: '/customer-service' }] },
          { title: 'Kahve Dünyası', links: [{ label: 'Çekirdek Kahve', to: '/category/kahve' }, { label: 'Demleme Ekipmanları', to: '/category/ekipman' }, { label: 'Aksesuarlar', to: '/category/aksesuar' }, { label: 'Abonelikler', to: '/category/abonelik' }, { label: 'Fırsatlar', to: '/category/firsatlar' }] },
          { title: 'Kurumsal', links: [{ label: 'Hakkımızda', to: '/about' }, { label: 'Mağazalarımız', to: '/about' }, { label: 'Kariyer', to: '/about' }, { label: 'Toptan Satış', to: '/about' }, { label: 'Gizlilik Politikası', to: '/about' }] },
          { title: 'Hesabım', links: [{ label: 'Üye Girişi', to: '/auth' }, { label: 'Siparişlerim', to: '/account' }, { label: 'Favorilerim', to: '/favorites' }, { label: 'Sepetim', to: '/cart' }, { label: 'Müşteri Hizmetleri', to: '/customer-service' }] },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold text-cream-50 mb-3">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-cream-300 hover:text-caramel-400 transition-colors flex items-center gap-1 group">
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Payment */}
      <div className="border-t border-espresso-700">
        <div className="max-w-8xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-cream-400">© 2026 Aroma Coffee Co. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-cream-400 mr-1">Güvenli Ödeme:</span>
            {['IYZICO', 'VISA', 'Mastercard', 'iyzico'].map((p) => (
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

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronDown, Search, Truck, RotateCcw, CreditCard,
  Package, Shield, Mail, Phone, MapPin, MessageCircle, Clock,
} from 'lucide-react';

const faqCategories = [
  {
    title: 'Sipariş & Teslimat',
    icon: Package,
    questions: [
      { q: 'Siparişim ne zaman gelir?', a: 'Siparişleriniz 24 saat içinde kargoya verilir. İstanbul içi 1-2 iş günü, Türkiye geneli 2-4 iş günü içinde teslim edilir. Kargo takip numarası e-posta ve SMS ile gönderilir.' },
      { q: '500 TL üzeri ücretsiz kargo nasıl işliyor?', a: 'Sepet tutarınız 500 TL ve üzeri olduğunda kargo ücreti otomatik olarak ücretsiz olur. 500 TL altındaki siparişlerde 49 TL kargo ücreti uygulanır.' },
      { q: 'Siparişimi nasıl takip edebilirim?', a: 'Hesabım > Siparişlerim bölümünden sipariş durumunuzu görebilir, kargo takip numarası ile anlık konum bilgisine ulaşabilirsiniz.' },
      { q: 'Kargom hasarlı geldi, ne yapmalıyım?', a: 'Hasarlı ürün teslim aldıysanız, teslimattan itibaren 48 saat içinde fotoğrafla birlikte müşteri hizmetlerine bildirin. Ücretsiz değişim sağlanır.' },
    ],
  },
  {
    title: 'İade & Değişim',
    icon: RotateCcw,
    questions: [
      { q: 'İade süresi ne kadar?', a: 'Ürünleri teslim tarihinden itibaren 14 gün içinde iade edebilirsiniz. Kahve ürünlerinin hijyenik doğası gereği, açılmamış paketler iade kabul edilir.' },
      { q: 'İade ücretini kim öder?', a: 'Hatalı veya hasarlı ürün gönderimlerinde iade kargo ücretini biz karşılıyoruz. Vazgeçme nedeniyle yapılan iadelerde kargo ücreti alıcıya aittir.' },
      { q: 'Para iadesi ne zaman yapılır?', a: 'İade ürünü depomuza ulaştıktan sonra 3-5 iş günü içinde ödeme yönteminize geri iade edilir. Kredi kartı iadeleri bankanıza göre 1-3 hafta sürebilir.' },
    ],
  },
  {
    title: 'Ödeme & Güvenlik',
    icon: CreditCard,
    questions: [
      { q: 'Hangi ödeme yöntemleri kabul ediliyor?', a: 'Kredi kartı (Visa, Mastercard, Troy), banka kartı ve IYZICO ile taksitli ödeme kabul edilmektedir. Tüm ödemeler 256-bit SSL şifreleme ile korunur.' },
      { q: 'Taksit seçenekleri neler?', a: 'IYZICO üzerinden Visa ve Mastercard ile 3, 6, 9 ve 12 taksit seçenekleri sunulmaktadır. Peşin ödemelerde ek taksit ücreti uygulanmaz.' },
      { q: 'KAHVE10 indirim kodu nasıl kullanılır?', a: 'Sepet ödeme sayfasında "İndirim Kodu" alanına KAHVE10 yazıp "Uygula" butonuna tıklayın. %10 indirim otomatik hesaplanır. Sadece ilk siparişinizde geçerlidir.' },
    ],
  },
  {
    title: 'Kahve & Saklama',
    icon: Shield,
    questions: [
      { q: 'Kahve çekirdeklerini nasıl saklamalıyım?', a: 'Kahveyi hava, ışık ve nemden uzak, oda sıcaklığında saklayın. Açıldıktan sonra 30 gün içinde tüketilmesi önerilir. Uzun süreli saklama için dondurucu kullanabilirsiniz.' },
      { q: 'Öğütülmüş kahve ne kadar dayanır?', a: 'Öğütülmüş kahve aromasını hızlı kaybettiği için çekirdek olarak alıp taze öğütmeniz önerilir. Öğütülmüş kahve açıldıktan sonra 15 gün içinde tüketilmelidir.' },
      { q: 'Kavrum seviyesi neyi ifade eder?', a: 'Açık kavrum meyvemsi ve asidik profilleri, orta kavrum dengeli tat ve gövdeyi, koyu kavrum ise yoğun ve bitter profilleri ön plana çıkarır.' },
    ],
  },
];

export default function CustomerServicePage() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = faqCategories
    .filter((cat) => cat.title === faqCategories[activeCategory].title)[0]
    .questions.filter(
      (item) =>
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  return (
    <div className="max-w-8xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-espresso-400 mb-6">
        <Link to="/" className="hover:text-caramel-600 transition-colors">Ana Sayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-espresso-700 font-medium">Müşteri Hizmetleri</span>
      </nav>

      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-espresso-700 to-espresso-900 p-6 sm:p-10 mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-caramel-400/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cream-50 mb-3">Müşteri Hizmetleri</h1>
          <p className="text-cream-300 max-w-lg mb-6">
            Sorularınız mı var? Size yardımcı olmaktan mutluluk duyarız. Aşağıdaki sıkça sorulan soruları inceleyebilir veya bize ulaşabilirsiniz.
          </p>

          {/* Search */}
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
        {/* FAQ Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-espresso-100 p-3 sticky top-40">
            <p className="text-sm font-bold text-espresso-800 px-2 py-2 mb-1">Kategoriler</p>
            {faqCategories.map((cat, i) => (
              <button
                key={cat.title}
                onClick={() => { setActiveCategory(i); setOpenQuestion(null); setSearchQuery(''); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left ${
                  activeCategory === i
                    ? 'bg-caramel-100 text-caramel-700'
                    : 'text-espresso-600 hover:bg-cream-50'
                }`}
              >
                <cat.icon className="w-5 h-5 shrink-0" />
                {cat.title}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-espresso-100 p-5 sm:p-6 mb-6">
            <h2 className="text-xl font-bold text-espresso-800 mb-5 flex items-center gap-2">
              {(() => {
                const Icon = faqCategories[activeCategory].icon;
                return <Icon className="w-5 h-5 text-caramel-500" />;
              })()}
              {faqCategories[activeCategory].title}
            </h2>

            <div className="space-y-2">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((item, i) => {
                  const key = `${activeCategory}-${i}`;
                  const open = openQuestion === key;
                  return (
                    <div key={key} className="border border-espresso-50 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenQuestion(open ? null : key)}
                        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-cream-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-espresso-700">{item.q}</span>
                        <ChevronDown className={`w-4 h-4 text-espresso-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="px-4 pb-4 text-sm text-espresso-500 leading-relaxed">{item.a}</p>
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

          {/* Contact Cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Phone, title: 'Telefon', value: '0850 123 45 67', sub: 'Hafta içi 09:00 - 18:00' },
              { icon: Mail, title: 'E-posta', value: 'destek@aromacoffee.co', sub: '24 saat içinde yanıt' },
              { icon: MessageCircle, title: 'Canlı Destek', value: 'Online Sohbet', sub: 'Anında yardım alın' },
              { icon: MapPin, title: 'Mağaza', value: 'Kadıköy, İstanbul', sub: 'Hafta içi 09:00 - 21:00' },
            ].map((contact) => (
              <div key={contact.title} className="bg-white rounded-2xl border border-espresso-100 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-cream-200 flex items-center justify-center shrink-0">
                    <contact.icon className="w-5 h-5 text-espresso-600" />
                  </div>
                  <div>
                    <p className="text-xs text-espresso-400">{contact.title}</p>
                    <p className="text-sm font-semibold text-espresso-700 mt-0.5">{contact.value}</p>
                    <p className="text-xs text-espresso-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {contact.sub}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

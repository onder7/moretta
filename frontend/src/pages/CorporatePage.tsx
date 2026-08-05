import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight, Coffee, Heart, Leaf, Award, Truck, Users,
  MapPin, Phone, Mail, Target, Sparkles,
} from 'lucide-react';
import { useStoreInfo } from '@/hooks/useStoreInfo';

const STATS = [
  { value: '8', label: 'Yıllık Tecrübe', suffix: '+ Yıl' },
  { value: '120', label: 'Kahve Çeşidi', suffix: '+' },
  { value: '50K', label: 'Mutlu Müşteri', suffix: '+' },
  { value: '32', label: 'Köy ile İşbirliği', suffix: '' },
];

const VALUES = [
  {
    icon: Leaf,
    title: 'Sürdürülebilirlik',
    desc: 'Doğrudan ticaret ile çiftçilere adil fiyat ödüyoruz. Her paket kahve, tarladan fincana kadar izlenebilir.',
  },
  {
    icon: Heart,
    title: 'Tazelik Garantisi',
    desc: 'Kahvelerimiz sipariş sonrası kavrulur. 7 gün içinde kapınızda, en taze haliyle.',
  },
  {
    icon: Award,
    title: 'Özel Nitelik',
    desc: 'SCA 80+ puanlı özel nitelikli (specialty) kahve çekirdekleri. Filtre kahve yarışmalarında ödüllü.',
  },
  {
    icon: Users,
    title: 'Kahve Topluluğu',
    desc: 'Kahve atölyeleri, tadım etkinlikleri ve Kahve Kulübü aboneliği ile binlerce kahve tutkusuyla buluşuyor.',
  },
];

const TIMELINE = [
  { year: '2018', title: 'İlk Kavrum', desc: 'Küçük bir dükkanda ilk kavrum makinesini çalıştırdık.' },
  { year: '2020', title: 'Online Satış', desc: 'Online mağazamızı açtık, tüm Türkiye\'ye kahve göndermeye başladık.' },
  { year: '2022', title: 'Köy İşbirlikleri', desc: 'Etiyopya, Kolombiya ve Brezilya\'da doğrudan çiftçi anlaşmaları yaptık.' },
  { year: '2024', title: 'Kahve Atölyesi', desc: 'Kahve tadım ve demleme atölyelerine başladık.' },
  { year: '2026', title: '50.000 Müşteri', desc: 'Bugün 50.000\'i aşkın mutlu müşteriyle kahve yolculuğumuz devam ediyor.' },
];

const STORES = [
  { name: 'Kadıköy Mağazası', address: 'Bağdat Caddesi No:123, Kadıköy', phone: '0216 123 45 67', hours: '09:00 - 21:00' },
  { name: 'Beşiktaş Mağazası', address: 'Barbaros Bulvarı No:45, Beşiktaş', phone: '0212 234 56 78', hours: '09:00 - 21:00' },
  { name: 'İzmir Alsancak', address: 'Kıbrıs Şehitleri Cad. No:78, Alsancak', phone: '0232 345 67 89', hours: '10:00 - 22:00' },
  { name: 'Ankara Tunalı', address: 'Tunalı Hilmi Cad. No:12, Çankaya', phone: '0312 456 78 90', hours: '09:00 - 21:00' },
  { name: 'Bursa Nilüfer', address: 'İhsan Dikmen Cad. No:34, Nilüfer', phone: '0224 567 89 01', hours: '10:00 - 22:00' },
  { name: 'Antalya Lara', address: 'Lara Yolu No:56, Muratpaşa', phone: '0242 678 90 12', hours: '09:00 - 22:00' },
];

const JOBS = [
  { title: 'Baş Barista', location: 'İstanbul, Kadıköy', type: 'Tam Zamanlı', dept: 'Mağaza' },
  { title: 'Kavrum Uzmanı', location: 'İstanbul, Depo', type: 'Tam Zamanlı', dept: 'Üretim' },
  { title: 'E-Ticaret Uzmanı', location: 'Remote', type: 'Tam Zamanlı', dept: 'Pazarlama' },
  { title: 'Müşteri Hizmetleri Temsilcisi', location: 'İstanbul', type: 'Yarı Zamanlı', dept: 'Destek' },
];

type Tab = 'about' | 'stores' | 'careers' | 'wholesale';

export function CorporatePage() {
  const { name: storeName } = useStoreInfo();
  const [activeTab, setActiveTab] = useState<Tab>('about');
  const [wholesaleForm, setWholesaleForm] = useState({
    company: '', contact: '', email: '', phone: '', notes: '',
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: 'about', label: 'Hakkımızda' },
    { id: 'stores', label: 'Mağazalarımız' },
    { id: 'careers', label: 'Kariyer' },
    { id: 'wholesale', label: 'Toptan Satış' },
  ];

  return (
    <div className="max-w-8xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-espresso-400 mb-6">
        <Link to="/" className="hover:text-caramel-600 transition-colors">Ana Sayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-espresso-700 dark:text-cream-200 font-medium">Kurumsal</span>
      </nav>

      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden mb-8">
        <div className="w-full h-[280px] sm:h-[360px] bg-gradient-to-br from-espresso-700 to-espresso-900" />
        <div className="absolute inset-0 bg-gradient-to-t from-espresso-900/90 via-espresso-800/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-caramel-400 text-white text-xs font-semibold mb-3">
              <Coffee className="w-3.5 h-3.5" />
              2018'den Beri
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cream-50 leading-tight mb-2">
              Her fincanda bir hikaye var
            </h1>
            <p className="text-cream-200 text-sm sm:text-base max-w-lg">
              Taze kavrulmuş kahve çekirdekleri, doğrudan ticaret ve kahve tutkusu. İşte bizim hikayemiz.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 border-b border-espresso-100 dark:border-espresso-700 mb-8 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-caramel-400 text-caramel-600'
                : 'border-transparent text-espresso-400 hover:text-espresso-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hakkımızda */}
      {activeTab === 'about' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
          {/* Hikaye */}
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-caramel-500" />
                <span className="text-sm font-semibold text-caramel-600 uppercase tracking-wide">Misyonumuz</span>
              </div>
              <h2 className="text-2xl font-bold text-espresso-800 dark:text-cream-50 mb-4">
                Taze kahveyi herkese ulaştırmak
              </h2>
              <p className="text-espresso-600 dark:text-espresso-300 leading-relaxed mb-4">
                {storeName}, taze kavrulmuş, özel nitelikli kahveyi Türkiye'nin her köşesine ulaştırmak için kuruldu. Dünyanın farklı bölgelerinden doğrudan çiftçilerle çalışarak adil ticaret ilkeleriyle en kaliteli çekirdekleri getiriyoruz.
              </p>
              <p className="text-espresso-600 dark:text-espresso-300 leading-relaxed">
                Her sipariş sonrası kavrum felsefemizle, kahvenin en taze halini deneyimlemenizi sağlıyoruz. Doğrudan ticaret modelimizle hem çiftçilere adil ücret ödiyor hem de sizi üstün kaliteyle buluşturuyoruz.
              </p>
            </div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-espresso-100 dark:bg-espresso-800 flex items-center justify-center">
              <Coffee className="w-24 h-24 text-espresso-300 dark:text-espresso-600" />
            </div>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-white dark:bg-espresso-900 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-6 text-center"
              >
                <p className="text-3xl font-bold text-caramel-500">
                  {stat.value}{stat.suffix}
                </p>
                <p className="text-sm text-espresso-500 dark:text-espresso-300 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Değerler */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-caramel-500" />
              <span className="text-sm font-semibold text-caramel-600 uppercase tracking-wide">Değerlerimiz</span>
            </div>
            <h2 className="text-2xl font-bold text-espresso-800 dark:text-cream-50 mb-6">Bizi biz yapan şeyler</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {VALUES.map((v) => (
                <div
                  key={v.title}
                  className="bg-white dark:bg-espresso-900 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-5"
                >
                  <div className="w-12 h-12 rounded-xl bg-cream-200 dark:bg-espresso-800 flex items-center justify-center mb-4">
                    <v.icon className="w-6 h-6 text-espresso-600 dark:text-caramel-400" />
                  </div>
                  <h3 className="font-semibold text-espresso-800 dark:text-cream-100 mb-2">{v.title}</h3>
                  <p className="text-sm text-espresso-500 dark:text-espresso-300 leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Zaman Tüneli */}
          <div>
            <h2 className="text-2xl font-bold text-espresso-800 dark:text-cream-50 mb-6">Yolculuğumuz</h2>
            <div className="relative">
              <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-espresso-100 dark:bg-espresso-700 sm:-translate-x-1/2" />
              {TIMELINE.map((item, i) => (
                <div
                  key={item.year}
                  className={`relative flex gap-4 sm:gap-0 mb-8 ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}
                >
                  <div className="hidden sm:block flex-1" />
                  <div className="absolute left-4 sm:left-1/2 w-3 h-3 rounded-full bg-caramel-400 ring-4 ring-cream-50 dark:ring-espresso-950 sm:-translate-x-1/2 mt-1" />
                  <div className="flex-1 sm:px-8">
                    <div className="bg-white dark:bg-espresso-900 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-5 ml-8 sm:ml-0">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-caramel-100 dark:bg-caramel-900/30 text-caramel-700 dark:text-caramel-300 text-xs font-bold mb-2">
                        {item.year}
                      </span>
                      <h3 className="font-semibold text-espresso-800 dark:text-cream-100 mb-1">{item.title}</h3>
                      <p className="text-sm text-espresso-500 dark:text-espresso-300">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Mağazalarımız */}
      {activeTab === 'stores' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h2 className="text-2xl font-bold text-espresso-800 dark:text-cream-50 mb-4">Mağazalarımız</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STORES.map((store) => (
              <div
                key={store.name}
                className="bg-white dark:bg-espresso-900 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-5"
              >
                <h3 className="font-semibold text-espresso-800 dark:text-cream-100 mb-3">{store.name}</h3>
                <div className="space-y-2">
                  <p className="flex items-start gap-2 text-sm text-espresso-500 dark:text-espresso-300">
                    <MapPin className="w-4 h-4 text-caramel-500 shrink-0 mt-0.5" />
                    {store.address}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-espresso-500 dark:text-espresso-300">
                    <Phone className="w-4 h-4 text-caramel-500 shrink-0" />
                    {store.phone}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-espresso-500 dark:text-espresso-300">
                    <Truck className="w-4 h-4 text-caramel-500 shrink-0" />
                    {store.hours}
                  </p>
                </div>
                <button className="w-full mt-4 py-2 rounded-xl bg-cream-100 dark:bg-espresso-800 hover:bg-cream-200 dark:hover:bg-espresso-700 text-espresso-700 dark:text-cream-200 text-sm font-medium transition-colors">
                  Yol Tarifi Al
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Kariyer */}
      {activeTab === 'careers' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-white dark:bg-espresso-900 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-6">
            <h2 className="text-2xl font-bold text-espresso-800 dark:text-cream-50 mb-3">Ailemize Katıl</h2>
            <p className="text-espresso-600 dark:text-espresso-300 leading-relaxed">
              Kahve tutkusuyla yanıyor musunuz? Ekibimiz, kahveyi seven ve müşteri deneyimini önemseven insanlarla büyüyor. Aşağıdaki açık pozisyonlardan birine başvurabilir veya genel başvuruda bulunabilirsiniz.
            </p>
          </div>

          <div className="space-y-3">
            {JOBS.map((job) => (
              <div
                key={job.title}
                className="bg-white dark:bg-espresso-900 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-semibold text-espresso-800 dark:text-cream-100">{job.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-espresso-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {job.location}
                    </span>
                    <span className="text-xs text-espresso-400">·</span>
                    <span className="text-xs text-espresso-400">{job.type}</span>
                    <span className="text-xs text-espresso-400">·</span>
                    <span className="px-2 py-0.5 rounded-full bg-cream-100 dark:bg-espresso-800 text-espresso-500 dark:text-espresso-300 text-xs">
                      {job.dept}
                    </span>
                  </div>
                </div>
                <button className="px-5 py-2.5 rounded-xl bg-caramel-400 hover:bg-caramel-500 text-white text-sm font-semibold transition-colors shrink-0">
                  Başvur
                </button>
              </div>
            ))}
          </div>

          <div className="bg-cream-50 dark:bg-espresso-800 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-6 text-center">
            <p className="text-espresso-600 dark:text-espresso-300 mb-3">Uygun pozisyon bulamadınız mı?</p>
            <button className="px-6 py-2.5 rounded-xl bg-espresso-700 hover:bg-espresso-800 text-white text-sm font-semibold transition-colors">
              Genel Başvuru
            </button>
          </div>
        </motion.div>
      )}

      {/* Toptan Satış */}
      {activeTab === 'wholesale' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-2xl font-bold text-espresso-800 dark:text-cream-50 mb-4">Toptan & İşbirliği</h2>
              <p className="text-espresso-600 dark:text-espresso-300 leading-relaxed mb-4">
                Kafe, restoran, otel veya market misiniz? İşletmeniz için taze kavrulmuş kahve tedarik ediyoruz. Özel kavrum profilleri, eğitimler ve rekabetçi fiyatlarla yanınızdayız.
              </p>
              <ul className="space-y-2.5">
                {[
                  'Minimum sipariş 5 kg çekirdek kahve',
                  'İşletmenize özel kavrum profili',
                  'Haftalık taze teslimat',
                  'Barista eğitimi ve ekipman desteği',
                  'Özel etiketleme seçeneği',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-espresso-600 dark:text-espresso-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-caramel-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Teklif Formu */}
            <div className="bg-white dark:bg-espresso-900 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-6">
              <h3 className="font-semibold text-espresso-800 dark:text-cream-50 mb-4">Teklif İsteyin</h3>
              <form
                className="space-y-3"
                onSubmit={(e) => { e.preventDefault(); alert('Talebiniz alındı, en kısa sürede sizinle iletişime geçeceğiz.'); }}
              >
                <input
                  type="text"
                  required
                  placeholder="İşletme Adı"
                  value={wholesaleForm.company}
                  onChange={(e) => setWholesaleForm((f) => ({ ...f, company: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-espresso-200 dark:border-espresso-700 dark:bg-espresso-800 dark:text-cream-100 text-sm focus:outline-none focus:border-caramel-400"
                />
                <input
                  type="text"
                  required
                  placeholder="Yetkili Ad Soyad"
                  value={wholesaleForm.contact}
                  onChange={(e) => setWholesaleForm((f) => ({ ...f, contact: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-espresso-200 dark:border-espresso-700 dark:bg-espresso-800 dark:text-cream-100 text-sm focus:outline-none focus:border-caramel-400"
                />
                <input
                  type="email"
                  required
                  placeholder="E-posta"
                  value={wholesaleForm.email}
                  onChange={(e) => setWholesaleForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-espresso-200 dark:border-espresso-700 dark:bg-espresso-800 dark:text-cream-100 text-sm focus:outline-none focus:border-caramel-400"
                />
                <input
                  type="tel"
                  placeholder="Telefon"
                  value={wholesaleForm.phone}
                  onChange={(e) => setWholesaleForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-espresso-200 dark:border-espresso-700 dark:bg-espresso-800 dark:text-cream-100 text-sm focus:outline-none focus:border-caramel-400"
                />
                <textarea
                  placeholder="Aylık kahve ihtiyacınız (kg)"
                  rows={3}
                  value={wholesaleForm.notes}
                  onChange={(e) => setWholesaleForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-espresso-200 dark:border-espresso-700 dark:bg-espresso-800 dark:text-cream-100 text-sm focus:outline-none focus:border-caramel-400 resize-none"
                />
                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm transition-colors"
                >
                  Teklif Talebi Gönder
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      )}

      {/* Alt CTA Bandı */}
      <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-espresso-800 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-cream-50 mb-2">Bizimle iletişime geçin</h2>
        <p className="text-cream-300 mb-5">
          Sorularınız için müşteri hizmetleri ekibimiz size yardımcı olmaktan mutluluk duyar.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/musteri-hizmetleri"
            className="px-6 py-3 rounded-full bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm transition-colors"
          >
            Müşteri Hizmetleri
          </Link>
          <a href="mailto:destek@kahve.com" className="flex items-center gap-2 text-cream-200 hover:text-caramel-400 transition-colors text-sm">
            <Mail className="w-4 h-4" /> destek@kahve.com
          </a>
        </div>
      </div>
    </div>
  );
}

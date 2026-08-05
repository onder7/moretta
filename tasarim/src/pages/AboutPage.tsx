import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight, Coffee, Heart, Leaf, Award, Truck, Users,
  MapPin, Phone, Mail, Target, Sparkles,
} from 'lucide-react';

const stats = [
  { value: '8', label: 'Yıllık Tecrübe', suffix: '+ Yıl' },
  { value: '120', label: 'Kahve Çeşidi', suffix: '+' },
  { value: '50K', label: 'Mutlu Müşteri', suffix: '+' },
  { value: '32', label: 'Köy ile İşbirliği', suffix: '' },
];

const values = [
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
    desc: 'SCA 80+ puanlı özel nitelikli (specialty) kahve çekirdekleri sadece. Filtre kahve yarışmalarında ödüllü.',
  },
  {
    icon: Users,
    title: 'Kahve Topluluğu',
    desc: 'Kahve atölyeleri, tadım etkinlikleri ve Kahve Kulübü aboneliği ile binlerce kahve tutkusuyla buluşuyor.',
  },
];

const timeline = [
  { year: '2018', title: 'İlk Kavrum', desc: 'Kadıköy\'de küçük bir dükkanda ilk kavrum makinesini çalıştırdık.' },
  { year: '2020', title: 'Online Satış', desc: 'Pandemi sürecinde online mağazamızı açtık, tüm Türkiye\'ye kahve göndermeye başladık.' },
  { year: '2022', title: 'Köy İşbirlikleri', desc: 'Etiyopya, Kolombiya ve Brezilya\'da doğrudan çiftçi anlaşmaları yaptık.' },
  { year: '2024', title: 'Kahve Atölyesi', desc: 'İstanbul\'da kahve tadım ve demleme atölyelerine başladık.' },
  { year: '2026', title: '50.000 Müşteri', desc: 'Bugün 50.000\'i aşkın mutlu müşteriyle kahve yolculuğumuz devam ediyor.' },
];

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState<'about' | 'stores' | 'careers' | 'wholesale'>('about');

  const tabs = [
    { id: 'about' as const, label: 'Hakkımızda' },
    { id: 'stores' as const, label: 'Mağazalarımız' },
    { id: 'careers' as const, label: 'Kariyer' },
    { id: 'wholesale' as const, label: 'Toptan Satış' },
  ];

  return (
    <div className="max-w-8xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-espresso-400 mb-6">
        <Link to="/" className="hover:text-caramel-600 transition-colors">Ana Sayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-espresso-700 font-medium">Kurumsal</span>
      </nav>

      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden mb-8">
        <img
          src="https://images.pexels.com/photos/26711777/pexels-photo-26711777.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
          alt="Aroma Coffee Co."
          className="w-full h-[280px] sm:h-[360px] object-cover"
        />
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
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cream-50 leading-tight mb-2 text-balance">
              Her fincanda bir hikaye var
            </h1>
            <p className="text-cream-200 text-sm sm:text-base max-w-lg">
              Taze kavrulmuş kahve çekirdekleri, doğrudan ticaret ve kahve tutkusu. İşte bizim hikayemiz.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-espresso-100 mb-8 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
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

      {/* About Tab */}
      {activeTab === 'about' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
          {/* Story */}
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-caramel-500" />
                <span className="text-sm font-semibold text-caramel-600 uppercase tracking-wide">Misyonumuz</span>
              </div>
              <h2 className="text-2xl font-bold text-espresso-800 mb-4">Taze kahveyi herkese ulaştırmak</h2>
              <p className="text-espresso-600 leading-relaxed mb-4">
                Aroma Coffee Co., 2018 yılında küçük bir Kadıköy dükkasında başladı. Amacımız basitti: Türkiye'nin her köşesine, taze kavrulmuş, özel nitelikli kahve ulaştırmak.
              </p>
              <p className="text-espresso-600 leading-relaxed">
                Bugün, dünyanın farklı bölgelerinden doğrudan çiftçilerle çalışarak, adil ticaret ilkeleriyle en kaliteli çekirdekleri getiriyoruz. Her sipariş sonrası kavrum felsefemizle, kahvenin en taze halini deneyimlemenizi sağlıyoruz.
              </p>
            </div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden">
              <img
                src="https://images.pexels.com/photos/15548856/pexels-photo-15548856.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
                alt="Kavrum"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-espresso-100 p-6 text-center">
                <p className="text-3xl font-bold text-caramel-500">{stat.value}{stat.suffix}</p>
                <p className="text-sm text-espresso-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Values */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-caramel-500" />
              <span className="text-sm font-semibold text-caramel-600 uppercase tracking-wide">Değerlerimiz</span>
            </div>
            <h2 className="text-2xl font-bold text-espresso-800 mb-6">Bizi biz yapan şeyler</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {values.map((v) => (
                <div key={v.title} className="bg-white rounded-2xl border border-espresso-100 p-5">
                  <div className="w-12 h-12 rounded-xl bg-cream-200 flex items-center justify-center mb-4">
                    <v.icon className="w-6 h-6 text-espresso-600" />
                  </div>
                  <h3 className="font-semibold text-espresso-800 mb-2">{v.title}</h3>
                  <p className="text-sm text-espresso-500 leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h2 className="text-2xl font-bold text-espresso-800 mb-6">Yolculuğumuz</h2>
            <div className="relative">
              <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-espresso-100 sm:-translate-x-1/2" />
              {timeline.map((item, i) => (
                <div key={item.year} className={`relative flex gap-4 sm:gap-0 mb-8 ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}>
                  <div className="hidden sm:block flex-1" />
                  <div className="absolute left-4 sm:left-1/2 w-3 h-3 rounded-full bg-caramel-400 ring-4 ring-cream-50 sm:-translate-x-1/2 mt-1" />
                  <div className="flex-1 sm:px-8">
                    <div className="bg-white rounded-2xl border border-espresso-100 p-5 ml-8 sm:ml-0">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-caramel-100 text-caramel-700 text-xs font-bold mb-2">
                        {item.year}
                      </span>
                      <h3 className="font-semibold text-espresso-800 mb-1">{item.title}</h3>
                      <p className="text-sm text-espresso-500">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Stores Tab */}
      {activeTab === 'stores' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h2 className="text-2xl font-bold text-espresso-800 mb-4">Mağazalarımız</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Kadıköy Mağazası', address: 'Bağdat Caddesi No:123, Kadıköy', phone: '0216 123 45 67', hours: '09:00 - 21:00' },
              { name: 'Beşiktaş Mağazası', address: 'Barbaros Bulvarı No:45, Beşiktaş', phone: '0212 234 56 78', hours: '09:00 - 21:00' },
              { name: 'İzmir Alsancak', address: 'Kıbrıs Şehitleri Cad. No:78, Alsancak', phone: '0232 345 67 89', hours: '10:00 - 22:00' },
              { name: 'Ankara Tunalı', address: 'Tunalı Hilmi Cad. No:12, Çankaya', phone: '0312 456 78 90', hours: '09:00 - 21:00' },
              { name: 'Bursa Nilüfer', address: 'İhsan Dikmen Cad. No:34, Nilüfer', phone: '0224 567 89 01', hours: '10:00 - 22:00' },
              { name: 'Antalya Lara', address: 'Lara Yolu No:56, Muratpaşa', phone: '0242 678 90 12', hours: '09:00 - 22:00' },
            ].map((store) => (
              <div key={store.name} className="bg-white rounded-2xl border border-espresso-100 p-5">
                <h3 className="font-semibold text-espresso-800 mb-3">{store.name}</h3>
                <div className="space-y-2">
                  <p className="flex items-start gap-2 text-sm text-espresso-500">
                    <MapPin className="w-4 h-4 text-caramel-500 shrink-0 mt-0.5" />
                    {store.address}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-espresso-500">
                    <Phone className="w-4 h-4 text-caramel-500 shrink-0" />
                    {store.phone}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-espresso-500">
                    <Truck className="w-4 h-4 text-caramel-500 shrink-0" />
                    {store.hours}
                  </p>
                </div>
                <button className="w-full mt-4 py-2 rounded-xl bg-cream-100 hover:bg-cream-200 text-espresso-700 text-sm font-medium transition-colors">
                  Yol Tarifi Al
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Careers Tab */}
      {activeTab === 'careers' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-white rounded-2xl border border-espresso-100 p-6">
            <h2 className="text-2xl font-bold text-espresso-800 mb-3">Aroma Ailesine Katıl</h2>
            <p className="text-espresso-600 leading-relaxed mb-4">
              Kahve tutkusuyla yanıyor musunuz? Ekibimiz, kahveyi seven ve müşteri deneyimini önemseden insanlarla büyüyor. Aşağıdaki açık pozisyonlardan birine başvurabilir veya genel başvuruda bulunabilirsiniz.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { title: 'Baş Barista', location: 'İstanbul, Kadıköy', type: 'Tam Zamanlı', dept: 'Mağaza' },
              { title: 'Kavrum Uzmanı', location: 'İstanbul, Depo', type: 'Tam Zamanlı', dept: 'Üretim' },
              { title: 'E-Ticaret Uzmanı', location: 'Remote', type: 'Tam Zamanlı', dept: 'Pazarlama' },
              { title: 'Müşteri Hizmetleri Temsilcisi', location: 'İstanbul', type: 'Yarı Zamanlı', dept: 'Destek' },
            ].map((job) => (
              <div key={job.title} className="bg-white rounded-2xl border border-espresso-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-espresso-800">{job.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-espresso-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {job.location}
                    </span>
                    <span className="text-xs text-espresso-400">·</span>
                    <span className="text-xs text-espresso-400">{job.type}</span>
                    <span className="text-xs text-espresso-400">·</span>
                    <span className="px-2 py-0.5 rounded-full bg-cream-100 text-espresso-500 text-xs">{job.dept}</span>
                  </div>
                </div>
                <button className="px-5 py-2.5 rounded-xl bg-caramel-400 hover:bg-caramel-500 text-white text-sm font-semibold transition-colors shrink-0">
                  Başvur
                </button>
              </div>
            ))}
          </div>

          <div className="bg-cream-50 rounded-2xl border border-espresso-50 p-6 text-center">
            <p className="text-espresso-600 mb-3">Uygun pozisyon bulamadınız mı?</p>
            <button className="px-6 py-2.5 rounded-xl bg-espresso-700 hover:bg-espresso-800 text-white text-sm font-semibold transition-colors">
              Genel Başvuru
            </button>
          </div>
        </motion.div>
      )}

      {/* Wholesale Tab */}
      {activeTab === 'wholesale' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold text-espresso-800 mb-4">Toptan & İşbirliği</h2>
              <p className="text-espresso-600 leading-relaxed mb-4">
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
                  <li key={item} className="flex items-center gap-2 text-sm text-espresso-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-caramel-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl border border-espresso-100 p-6">
              <h3 className="font-semibold text-espresso-800 mb-4">Teklif İsteyin</h3>
              <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="text"
                  required
                  placeholder="İşletme Adı"
                  className="w-full h-11 px-4 rounded-xl border border-espresso-200 text-sm text-espresso-700 placeholder:text-espresso-300 focus:outline-none focus:border-caramel-400"
                />
                <input
                  type="text"
                  required
                  placeholder="Yetkili Ad Soyad"
                  className="w-full h-11 px-4 rounded-xl border border-espresso-200 text-sm text-espresso-700 placeholder:text-espresso-300 focus:outline-none focus:border-caramel-400"
                />
                <input
                  type="email"
                  required
                  placeholder="E-posta"
                  className="w-full h-11 px-4 rounded-xl border border-espresso-200 text-sm text-espresso-700 placeholder:text-espresso-300 focus:outline-none focus:border-caramel-400"
                />
                <input
                  type="tel"
                  placeholder="Telefon"
                  className="w-full h-11 px-4 rounded-xl border border-espresso-200 text-sm text-espresso-700 placeholder:text-espresso-300 focus:outline-none focus:border-caramel-400"
                />
                <textarea
                  placeholder="Aylık kahve ihtiyacınız (kg)"
                  rows={3}
                  className="w-full p-3 rounded-xl border border-espresso-200 text-sm text-espresso-700 placeholder:text-espresso-300 focus:outline-none focus:border-caramel-400 resize-none"
                />
                <button className="w-full h-11 rounded-xl bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm transition-colors">
                  Teklif Talebi Gönder
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      )}

      {/* Contact strip */}
      <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-espresso-800 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-cream-50 mb-2">Bizimle iletişime geçin</h2>
        <p className="text-cream-300 mb-5">Sorularınız için müşteri hizmetleri ekibimiz size yardımcı olmaktan mutluluk duyar.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/customer-service" className="px-6 py-3 rounded-full bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm transition-colors">
            Müşteri Hizmetleri
          </Link>
          <a href="mailto:destek@aromacoffee.co" className="flex items-center gap-2 text-cream-200 hover:text-caramel-400 transition-colors text-sm">
            <Mail className="w-4 h-4" /> destek@aromacoffee.co
          </a>
        </div>
      </div>
    </div>
  );
}

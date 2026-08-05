import type { Product, Category } from '@/types';

export const categories: Category[] = [
  {
    id: 'kahve',
    label: 'Kahve Çeşitleri',
    icon: 'Coffee',
    subcategories: ['Çekirdek Kahve', 'Öğütülmüş Kahve', 'Filtre Kahve', 'Espresso', 'Yöresel Kahveler'],
  },
  {
    id: 'ekipman',
    label: 'Demleme Ekipmanları',
    icon: 'Wrench',
    subcategories: ['V60', 'French Press', 'Chemex', 'Espresso Makineleri', 'El Değirmenleri'],
  },
  {
    id: 'aksesuar',
    label: 'Aksesuarlar & Bardaklar',
    icon: 'CupSoda',
    subcategories: ['Termoslar', 'Bardaklar', 'Ölçekler', 'Filtreler'],
  },
  {
    id: 'abonelik',
    label: 'Kahve Abonelikleri',
    icon: 'Package',
    subcategories: ['Aylık Abonelik', 'Hediye Kutusu', 'Tadım Setleri'],
  },
  {
    id: 'firsatlar',
    label: 'Fırsatlar',
    icon: 'Flame',
    subcategories: ['İndirimli Ürünler', 'Sezonluk Ürünler', 'Outlet'],
  },
];

export const quickCategories = [
  { id: 'cekirdek', label: 'Çekirdek Kahve', icon: 'Coffee' },
  { id: 'filtre', label: 'Filtre Kahve', icon: 'Filter' },
  { id: 'kapsul', label: 'Kapsül Kahve', icon: 'Capsule' },
  { id: 'ekipman', label: 'Ekipman', icon: 'Wrench' },
  { id: 'espresso', label: 'Espresso', icon: 'MugHot' },
  { id: 'abonelik', label: 'Abonelik', icon: 'Package' },
  { id: 'hediye', label: 'Hediye Seti', icon: 'Gift' },
  { id: 'aksesuar', label: 'Aksesuar', icon: 'Droplets' },
];

export const products: Product[] = [
  {
    id: 'p1',
    name: 'Etiyopya Yirgacheffe',
    slug: 'etiyopya-yirgacheffe',
    price: 389,
    oldPrice: 459,
    image: 'https://images.pexels.com/photos/5926957/pexels-photo-5926957.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    hoverImage: 'https://images.pexels.com/photos/31945549/pexels-photo-31945549.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    category: 'kahve',
    type: 'Arabica',
    roast: 'Açık',
    origin: 'Etiyopya',
    flavorNotes: ['Narenciye', 'Çiçeksi', 'Bergamot'],
    intensity: 3,
    grindOptions: ['Çekirdek', 'V60', 'French Press'],
    rating: 4.8,
    reviewCount: 214,
    inStock: true,
    badge: 'Yeni Hasat',
  },
  {
    id: 'p2',
    name: 'Kolombiya Supremo',
    slug: 'kolombiya-supremo',
    price: 329,
    oldPrice: 399,
    image: 'https://images.pexels.com/photos/17077385/pexels-photo-17077385.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    hoverImage: 'https://images.pexels.com/photos/25547393/pexels-photo-25547393.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    category: 'kahve',
    type: 'Arabica',
    roast: 'Orta',
    origin: 'Kolombiya',
    flavorNotes: ['Çikolata', 'Karamel', 'Fındık'],
    intensity: 4,
    grindOptions: ['Çekirdek', 'Espresso', 'Moka Pot'],
    rating: 4.7,
    reviewCount: 168,
    inStock: true,
    badge: 'Çok Satan',
  },
  {
    id: 'p3',
    name: 'Brezilya Santos Espresso',
    slug: 'brezilya-santos-espresso',
    price: 299,
    image: 'https://images.pexels.com/photos/13741278/pexels-photo-13741278.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    hoverImage: 'https://images.pexels.com/photos/6936981/pexels-photo-6936981.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    category: 'kahve',
    type: 'Blend',
    roast: 'Koyu',
    origin: 'Brezilya',
    flavorNotes: ['Bitter Çikolata', 'Fındık', 'Tütün'],
    intensity: 5,
    grindOptions: ['Çekirdek', 'Espresso', 'Moka Pot'],
    rating: 4.6,
    reviewCount: 132,
    inStock: true,
  },
  {
    id: 'p4',
    name: 'Guatemala Antigua',
    slug: 'guatemala-antigua',
    price: 419,
    oldPrice: 489,
    image: 'https://images.pexels.com/photos/20736684/pexels-photo-20736684.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    hoverImage: 'https://images.pexels.com/photos/15548856/pexels-photo-15548856.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    category: 'kahve',
    type: 'Arabica',
    roast: 'Orta-Koyu',
    origin: 'Guatemala',
    flavorNotes: ['Kakao', 'Baharatlı', 'Meyvemsi'],
    intensity: 4,
    grindOptions: ['Çekirdek', 'V60', 'Espresso', 'French Press'],
    rating: 4.9,
    reviewCount: 97,
    inStock: true,
    badge: 'Sınırlı Üretim',
  },
  {
    id: 'p5',
    name: 'Kenya AA Nyeri',
    slug: 'kenya-aa-nyeri',
    price: 459,
    image: 'https://images.pexels.com/photos/19569364/pexels-photo-19569364.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    hoverImage: 'https://images.pexels.com/photos/25547394/pexels-photo-25547394.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    category: 'kahve',
    type: 'Arabica',
    roast: 'Açık-Orta',
    origin: 'Kenya',
    flavorNotes: ['Siyah Üzüm', 'Bergamot', 'Şarap'],
    intensity: 3,
    grindOptions: ['Çekirdek', 'V60', 'French Press'],
    rating: 4.8,
    reviewCount: 78,
    inStock: true,
  },
  {
    id: 'p6',
    name: 'Costa Rica Tarrazu',
    slug: 'costa-rica-tarrazu',
    price: 369,
    oldPrice: 429,
    image: 'https://images.pexels.com/photos/3914189/pexels-photo-3914189.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    hoverImage: 'https://images.pexels.com/photos/5926957/pexels-photo-5926957.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    category: 'kahve',
    type: 'Arabica',
    roast: 'Orta',
    origin: 'Costa Rica',
    flavorNotes: ['Bal', 'Narenciye', 'Badem'],
    intensity: 3,
    grindOptions: ['Çekirdek', 'V60', 'Espresso'],
    rating: 4.7,
    reviewCount: 145,
    inStock: true,
    badge: 'Fırsat',
  },
];

export const heroSlides = [
  {
    id: 's1',
    title: 'Yeni Hasat Etiyopya Yirgacheffe',
    subtitle: 'Narenciye ve bergamot notalarıyla dengeli, çiçeksi bir aroma',
    cta: 'Keşfet',
    image: 'https://images.pexels.com/photos/26711777/pexels-photo-26711777.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    badge: '2026 Hasatı',
  },
  {
    id: 's2',
    title: 'Demleme Ekipmanlarında %20 İndirim',
    subtitle: 'V60, Chemex ve French Press modellerinde sınırlı süre fırsatı',
    cta: 'Ekipmanları İncele',
    image: 'https://images.pexels.com/photos/29619143/pexels-photo-29619143.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    badge: 'Fırsat',
  },
  {
    id: 's3',
    title: 'Espresso Severler için Özel Seçki',
    subtitle: 'Koyu kavrum, yoğun gövde — tam otomatik makinelerle uyumlu',
    cta: 'Espresso Kahveleri',
    image: 'https://images.pexels.com/photos/1551346/pexels-photo-1551346.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    badge: 'Yeni',
  },
];

export const sideBanners = [
  {
    id: 'b1',
    title: 'Demleme Ekipmanlarında %20',
    subtitle: 'V60 & Chemex serisinde',
    cta: 'Hemen İncele',
    image: 'https://images.pexels.com/photos/32536993/pexels-photo-32536993.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'b2',
    title: 'İlk Siparişe %10 İndirim',
    subtitle: 'KAHVE10 koduyla',
    cta: 'Sepete Ekle',
    image: 'https://images.pexels.com/photos/19252265/pexels-photo-19252265.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
];

export interface ProductDetail {
  description: string;
  brewingGuide: { method: string; ratio: string; time: string; steps: string[] }[];
  cuppingScore: number;
  altitude: string;
  process: string;
  weight: string;
}

export const productDetails: Record<string, ProductDetail> = {
  p1: {
    description: 'Etiyopya Yirgacheffe bölgesinin yüksek rakımlarında yetişen bu özel Arabica çekirdek, çiçeksi aromaları ve parlak asiditesi ile dünya çapında tanınır. Narenciye ve bergamot notaları, dengeli gövdesi ile birleşerek filtre kahve severler için eşsiz bir deneyim sunar.',
    brewingGuide: [
      {
        method: 'V60 / Pour Over',
        ratio: '1:16',
        time: '3:00',
        steps: ['30g ince öğütülmüş kahve', '500g 92°C sıcak su', '50g blooming 30sn', 'Spiral döküşlerle 500g\'e tamamla', '3 dakikada süzülmesini bekle'],
      },
      {
        method: 'French Press',
        ratio: '1:15',
        time: '4:00',
        steps: ['30g orta öğütülmüş kahve', '450g 94°C sıcak su', '4 dakika demle', 'Yavaşça bastır ve hemen servis et'],
      },
    ],
    cuppingScore: 87.5,
    altitude: '1850-2200m',
    process: 'Yıkanmış (Washed)',
    weight: '250g',
  },
  p2: {
    description: 'Kolombiya Supremo, dengeli gövdesi ve yumuşak asiditesi ile günlük tüketim için idealdir. Çikolata ve karamel notaları, fındık tatlarıyla birleşerek klasik bir kahve deneyimi sunar. Espresso bazlı içeceklerde mükemmel krema verir.',
    brewingGuide: [
      {
        method: 'Espresso',
        ratio: '1:2',
        time: '0:28',
        steps: ['18g ince öğütülmüş kahve', '36g ekstrakt', '28 saniyede çekim', '25-30 bar basınç'],
      },
      {
        method: 'Moka Pot',
        ratio: '1:10',
        time: '5:00',
        steps: ['18g ince öğütülmüş kahve', '180g su', 'Orta ateşte demle', 'Köpürmeye başlayınca alt et'],
      },
    ],
    cuppingScore: 85,
    altitude: '1200-1800m',
    process: 'Yıkanmış (Washed)',
    weight: '250g',
  },
  p3: {
    description: 'Brezilya Santos çekirdeklerinden oluşturulan bu espresso blend, yoğun bitter çikolata notaları ve kalın krema tabakası ile espresso severler için tasarlanmıştır. İtalyan tarzı koyu kavrum ile yoğun gövde ve düşük asidite sağlar.',
    brewingGuide: [
      {
        method: 'Espresso',
        ratio: '1:2',
        time: '0:25',
        steps: ['18g ince öğütülmüş kahve', '36g ekstrakt', '25 saniyede çekim', 'Koyu krema hedefle'],
      },
    ],
    cuppingScore: 83,
    altitude: '1000-1200m',
    process: 'Doğal (Natural)',
    weight: '250g',
  },
  p4: {
    description: 'Guatemala Antigua vadisinin volkanik topraklarında yetişen bu nadir Arabica, kakao ve baharat notalarıyla tanınır. Dengeli gövdesi ve karmaşık tat profili, kahve tutkunları için keşfedilmemiş bir hazine gibidir.',
    brewingGuide: [
      {
        method: 'V60 / Pour Over',
        ratio: '1:16',
        time: '3:30',
        steps: ['30g ince öğütülmüş kahve', '500g 92°C sıcak su', '50g blooming 30sn', 'Spiral döküşlerle tamamla'],
      },
      {
        method: 'French Press',
        ratio: '1:15',
        time: '4:00',
        steps: ['30g orta öğütülmüş kahve', '450g 94°C sıcak su', '4 dakika demle', 'Bastır ve servis et'],
      },
    ],
    cuppingScore: 88,
    altitude: '1500-1700m',
    process: 'Yıkanmış (Washed)',
    weight: '250g',
  },
  p5: {
    description: 'Kenya AA Nyeri, yüksek rakımlı yıkanmış işlemiyle siyah üzüm ve şarap notalarıyla bilinen premium bir Arabica çekirdektir. Parlak asiditesi ve uzun bitişi, filtre kahve yarışmalarında sıkça tercih edilir.',
    brewingGuide: [
      {
        method: 'V60 / Pour Over',
        ratio: '1:16',
        time: '3:00',
        steps: ['30g ince öğütülmüş kahve', '500g 93°C sıcak su', '50g blooming 45sn', 'Spiral döküşlerle tamamla'],
      },
    ],
    cuppingScore: 89,
    altitude: '1700-2000m',
    process: 'Yıkanmış (Washed)',
    weight: '250g',
  },
  p6: {
    description: 'Costa Rica Tarrazu bölgesinin bal tatlılığı ve narenciye asiditesi ile bilinen bu Arabica çekirdeği, dengeli gövdesiyle günlük tüketim için mükemmel bir seçimdir. Badem notalarıyla zenginleştirilmiş tat profili sunar.',
    brewingGuide: [
      {
        method: 'V60 / Pour Over',
        ratio: '1:16',
        time: '3:00',
        steps: ['30g ince öğütülmüş kahve', '500g 92°C sıcak su', '50g blooming 30sn', 'Spiral döküşlerle tamamla'],
      },
      {
        method: 'Espresso',
        ratio: '1:2',
        time: '0:27',
        steps: ['18g ince öğütülmüş kahve', '36g ekstrakt', '27 saniyede çekim'],
      },
    ],
    cuppingScore: 86,
    altitude: '1200-1900m',
    process: 'Yıkanmış (Washed)',
    weight: '250g',
  },
};

export const reviews: Record<string, { id: string; author: string; rating: number; date: string; comment: string; helpful: number }[]> = {
  p1: [
    { id: 'r1', author: 'Mehmet K.', rating: 5, date: '12 Temmuz 2026', comment: 'Hayatımda içtiğim en iyi filtre kahve. Bergamot notaları gerçekten hissediliyor. V60 ile mükemmel.', helpful: 24 },
    { id: 'r2', author: 'Ayşe T.', rating: 4, date: '3 Temmuz 2026', comment: 'Çok güzel kahve ama biraz daha uygun fiyat olabilirdi. Yine de tavsiye ediyorum.', helpful: 8 },
    { id: 'r3', author: 'Can D.', rating: 5, date: '28 Haziran 2026', comment: 'Çiçeksi aromalar harika. Sabah ritüelimin vazgeçilmezi oldu.', helpful: 15 },
  ],
  p2: [
    { id: 'r4', author: 'Zeynep A.', rating: 5, date: '10 Temmuz 2026', comment: 'Espresso olarak kreması muhteşem. Karamel notası çok baskın ama güzel.', helpful: 18 },
    { id: 'r5', author: 'Burak Y.', rating: 4, date: '5 Temmuz 2026', comment: 'Günlük içim için ideal. Fiyat/performans iyi.', helpful: 6 },
  ],
  p3: [
    { id: 'r6', author: 'Selin M.', rating: 5, date: '15 Temmuz 2026', comment: 'Espresso makinesiyle çektiğimde krema kalın ve yoğun. Bitter çikolata notası harika.', helpful: 31 },
  ],
  p4: [
    { id: 'r7', author: 'Deniz K.', rating: 5, date: '8 Temmuz 2026', comment: 'Sınırlı üretim dedikleri doğru. Kakao ve baharat notaları çok özel.', helpful: 12 },
    { id: 'r8', author: 'Ece B.', rating: 5, date: '1 Temmuz 2026', comment: 'Volkanik toprağın etkisi belli. Kesinlikle tekrar alacağım.', helpful: 9 },
  ],
  p5: [
    { id: 'r9', author: 'Onur S.', rating: 5, date: '18 Temmuz 2026', comment: 'Şarap tadında bir kahve. Siyah üzüm notaları inanılmaz.', helpful: 21 },
  ],
  p6: [
    { id: 'r10', author: 'Elif D.', rating: 4, date: '12 Temmuz 2026', comment: 'Bal tatlılığı çok hoş. Günlük tüketim için harika.', helpful: 7 },
    { id: 'r11', author: 'Kaan T.', rating: 5, date: '6 Temmuz 2026', comment: 'Badem ve narenciye dengesi çok iyi. Fiyatı da makul.', helpful: 11 },
  ],
};

export const sampleOrders = [
  {
    id: 'ORD-2026-0042',
    date: '28 Temmuz 2026',
    status: 'Teslim Edildi' as const,
    total: 718,
    itemCount: 2,
    items: [
      { name: 'Etiyopya Yirgacheffe', quantity: 1, grind: 'Çekirdek', price: 389 },
      { name: 'Kolombiya Supremo', quantity: 1, grind: 'Espresso', price: 329 },
    ],
  },
  {
    id: 'ORD-2026-0051',
    date: '2 Ağustos 2026',
    status: 'Kargoda' as const,
    total: 459,
    itemCount: 1,
    items: [
      { name: 'Kenya AA Nyeri', quantity: 1, grind: 'Çekirdek', price: 459 },
    ],
  },
  {
    id: 'ORD-2026-0055',
    date: '4 Ağustos 2026',
    status: 'Hazırlanıyor' as const,
    total: 788,
    itemCount: 2,
    items: [
      { name: 'Guatemala Antigua', quantity: 1, grind: 'V60', price: 419 },
      { name: 'Costa Rica Tarrazu', quantity: 1, grind: 'Çekirdek', price: 369 },
    ],
  },
];

export const sampleAddresses = [
  {
    id: 'addr1',
    title: 'Ev',
    fullName: 'Ahmet Yılmaz',
    phone: '0532 123 45 67',
    city: 'İstanbul',
    district: 'Kadıköy',
    detail: 'Bağdat Caddesi No:123 Daire:4',
    isDefault: true,
  },
  {
    id: 'addr2',
    title: 'İş',
    fullName: 'Ahmet Yılmaz',
    phone: '0532 123 45 67',
    city: 'İstanbul',
    district: 'Şişli',
    detail: 'Levent Mah. İş Kuleleri No:2 Kat:8',
  },
];

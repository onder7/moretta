import { prisma } from '../config/database';

export interface ChatbotRuleDto {
  id:           string;
  title:        string;
  keywords:     string[];
  response:     string;
  quickReplies: string[];
  sortOrder:    number;
  isActive:     boolean;
}

// Varsayılan asistan kuralları — yeni (sıfır) mağazada DB'ye seed edilir,
// admin panelinden (Asistan Yönetimi) düzenlenebilir.
export const DEFAULT_CHATBOT_RULES: Omit<ChatbotRuleDto, 'id'>[] = [
  {
    title: 'Karşılama',
    keywords: ['merhaba', 'selam', 'hi', 'hey', 'iyi günler', 'iyi akşamlar', 'nasılsın'],
    response: 'Merhaba! 👋 Mağazamıza hoş geldiniz. Size nasıl yardımcı olabilirim?\n\nAşağıdaki konularda bilgi alabilirim:',
    quickReplies: ['Kargo & Teslimat', 'İade & İptal', 'Ürün & Stok', 'Ödeme Seçenekleri'],
    sortOrder: 1,
    isActive: true,
  },
  {
    title: 'Kargo & Teslimat',
    keywords: ['kargo', 'teslimat', 'gönderim', 'kaç günde', 'ne zaman gelir', 'takip'],
    response: '🚚 **Kargo & Teslimat Bilgileri**\n\n• Siparişler 1–3 iş günü içinde kargoya verilir\n• Standart teslimat 2–4 iş günü sürer\n• 500₺ üzeri alışverişlerde kargo **ücretsiz!**\n• Kargo takibinizi Siparişlerim sayfasından yapabilirsiniz\n\nBaşka bir sorunuz var mı?',
    quickReplies: ['Siparişlerimi Göster', 'İade & İptal', 'Ana Sayfaya Dön'],
    sortOrder: 2,
    isActive: true,
  },
  {
    title: 'İade & İptal',
    keywords: ['iade', 'iptal', 'geri', 'para iadesi', 'değişim', 'bozuk', 'hasarlı', 'hatalı'],
    response: '↩️ **İade & İptal Politikası**\n\n• Ürün tesliminden itibaren **14 gün** iade hakkınız var\n• Kullanılmamış ve orijinal ambalajında olması şarttır\n• İade talebinizi Siparişlerim sayfasından oluşturabilirsiniz\n• İadeler onaylandıktan sonra 5–7 iş günü içinde ödeme iade edilir\n\nDetaylı yardım için bize WhatsApp\'tan ulaşabilirsiniz.',
    quickReplies: ['WhatsApp\'a Bağlan', 'Siparişlerimi Göster', 'Diğer Konular'],
    sortOrder: 3,
    isActive: true,
  },
  {
    title: 'Ödeme Seçenekleri',
    keywords: ['ödeme', 'kredi kartı', 'havale', 'taksit', 'kapıda', 'eft', 'banka'],
    response: '💳 **Ödeme Seçenekleri**\n\n• Tüm kredi ve banka kartları kabul edilir\n• 9 taksit imkânı (belirli kartlar)\n• Havale / EFT ile ödeme\n• Kapıda ödeme (nakit veya kart)\n\nGüvenli ödeme altyapısı için SSL koruması kullanılmaktadır. 🔒',
    quickReplies: ['Kargo Bilgileri', 'İade & İptal', 'Ürün Soruları'],
    sortOrder: 4,
    isActive: true,
  },
  {
    title: 'Ürün & Stok',
    keywords: ['ürün', 'stok', 'var mı', 'mevcut', 'renk', 'beden', 'numara', 'model'],
    response: '📦 **Ürün & Stok Bilgisi**\n\nBelirli bir ürün hakkında bilgi almak için:\n• Arama çubuğunu kullanabilirsiniz\n• Kategoriler üzerinden göz atabilirsiniz\n• Stok durumu ürün sayfasında görünmektedir\n\nBelirli bir ürünü mü arıyorsunuz? Ürün adını yazabilirsiniz! 🔍',
    quickReplies: ['Ürünleri Ara', 'WhatsApp\'a Bağlan'],
    sortOrder: 5,
    isActive: true,
  },
  {
    title: 'Sipariş Sorgulama',
    keywords: ['sipariş', 'siparişim', 'nerede', 'durum', 'takip et'],
    response: '📋 **Sipariş Sorgulama**\n\nSipariş durumunuzu görmek için:\n• Hesabınıza giriş yapın\n• \'Siparişlerim\' sayfasını ziyaret edin\n• Her sipariş için kargo takip numarası mevcuttur\n\nGiriş yapmadan sipariş sorgulayamazsınız.',
    quickReplies: ['Siparişlerime Git', 'Kargo & Teslimat', 'Destek Al'],
    sortOrder: 6,
    isActive: true,
  },
  {
    title: 'Hesap İşlemleri',
    keywords: ['hesap', 'kayıt', 'üye', 'giriş', 'şifre', 'unuttum', 'profil'],
    response: '👤 **Hesap İşlemleri**\n\n• **Kayıt olmak** için sağ üstteki \'Hesabım\' butonuna tıklayın\n• **Şifrenizi** mi unuttunuz? Giriş sayfasındaki \'Şifremi Unuttum\' linkini kullanın\n• Profil bilgilerinizi \'Hesabım → Profil\' sayfasından güncelleyebilirsiniz',
    quickReplies: ['Giriş Yap', 'Kayıt Ol', 'Diğer Konular'],
    sortOrder: 7,
    isActive: true,
  },
  {
    title: 'İndirim & Kampanyalar',
    keywords: ['indirim', 'kampanya', 'kupon', 'fırsat', 'promosyon', 'kod'],
    response: '🎁 **İndirim & Kampanyalar**\n\n• Aktif kampanyaları ana sayfada görebilirsiniz\n• 500₺ üzeri siparişlerde ücretsiz kargo!\n• Yeni üyelere özel fırsatlar için bültenimize kayıt olun\n\nKupon kodunuzu sepet sayfasında uygulayabilirsiniz.',
    quickReplies: ['Kampanyaları Gör', 'Ürünleri İncele'],
    sortOrder: 8,
    isActive: true,
  },
  {
    title: 'İletişim & Destek',
    keywords: ['iletişim', 'telefon', 'email', 'mail', 'ulaş', 'yardım', 'destek', 'çözemedim', 'anlamadım'],
    response: '📞 **Bize Ulaşın**\n\nSorunuz çözülmediyse bize doğrudan ulaşabilirsiniz:\n\n• 💬 **WhatsApp**: En hızlı yanıt\n• Hafta içi 09:00–18:00 aktif destek\n\nWhatsApp üzerinden devam edelim mi?',
    quickReplies: ['WhatsApp\'a Bağlan', 'Sorunum Çözüldü ✓'],
    sortOrder: 9,
    isActive: true,
  },
  {
    title: 'Teşekkür',
    keywords: ['teşekkür', 'sağol', 'tamam', 'oldu', 'anladım', 'çözüldü'],
    response: 'Rica ederim! 😊 Başka bir sorunuz olursa buradayım.\n\nAlışverişlerinizde kolaylıklar dilerim! 🛍️',
    quickReplies: ['Ürünlere Göz At', 'Görüşürüz 👋'],
    sortOrder: 10,
    isActive: true,
  },
  {
    title: 'Varsayılan Yanıt (Fallback)',
    keywords: [],
    response: 'Üzgünüm, bu konuda bilgim sınırlı. Size daha iyi yardımcı olabilmek için WhatsApp üzerinden bağlanmamı ister misiniz?',
    quickReplies: ['WhatsApp\'a Bağlan', 'Kargo & Teslimat', 'İade & İptal', 'Ödeme Seçenekleri'],
    sortOrder: 99,
    isActive: true,
  },
];

// Tablo boşsa varsayılan kuralları ekler (idempotent). Eklenen kayıt sayısını döndürür.
export async function seedDefaultRulesIfEmpty(): Promise<number> {
  const count = await prisma.chatbotRule.count();
  if (count > 0) return 0;
  await prisma.chatbotRule.createMany({ data: DEFAULT_CHATBOT_RULES });
  return DEFAULT_CHATBOT_RULES.length;
}

export async function listRules(): Promise<ChatbotRuleDto[]> {
  return prisma.chatbotRule.findMany({ orderBy: { sortOrder: 'asc' } });
}

export async function listActiveRules(): Promise<ChatbotRuleDto[]> {
  return prisma.chatbotRule.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function createRule(data: Omit<ChatbotRuleDto, 'id'>): Promise<ChatbotRuleDto> {
  return prisma.chatbotRule.create({ data });
}

export async function updateRule(id: string, data: Partial<Omit<ChatbotRuleDto, 'id'>>): Promise<ChatbotRuleDto> {
  return prisma.chatbotRule.update({ where: { id }, data });
}

export async function deleteRule(id: string): Promise<void> {
  await prisma.chatbotRule.delete({ where: { id } });
}

export async function reorderRules(ids: string[]): Promise<void> {
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.chatbotRule.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
}

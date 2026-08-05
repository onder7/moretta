import { prisma } from '../config/database';
import { getStoreIdentity } from './settingsService';
import { AppError } from '../types';

export interface PageDto {
  id: string;
  slug: string;
  title: string;
  content: string;
  showInMenu: boolean;
  showInHeader: boolean;
  showInFooter: boolean;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
}

// ─── Sistem (sabit) sayfaların varsayılan içerikleri ──────────────────────────
// Marka adı/e-posta seed anında enjekte edilir; admin sonradan düzenleyebilir.
function buildDefaultPages(store: { name: string; email: string }): Array<{
  slug: string; title: string; content: string; sortOrder: number;
}> {
  return [
    {
      slug: 'iletisim',
      title: 'İletişim & Destek',
      sortOrder: 1,
      content: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">İletişim & Destek</h1>
          <p class="text-slate-400">Bizimle iletişime geçmek için aşağıdaki kanalları kullanabilirsiniz. Destek ekibimiz en kısa sürede size dönüş yapacaktır.</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div class="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
              <h3 class="text-lg font-semibold text-white mb-2">E-posta</h3>
              <p class="text-primary font-medium">${store.email}</p>
              <p class="text-xs text-slate-500 mt-1">7/24 e-posta gönderebilirsiniz.</p>
            </div>
            <div class="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
              <h3 class="text-lg font-semibold text-white mb-2">Telefon</h3>
              <p class="text-primary font-medium">+90 (312) 000 00 00</p>
              <p class="text-xs text-slate-500 mt-1">Hafta içi: 09:00 - 18:00</p>
            </div>
          </div>
        </div>
      `,
    },
    {
      slug: 'iade',
      title: 'Kolay İade & Değişim',
      sortOrder: 2,
      content: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">Kolay İade & Değişim</h1>
          <p class="text-slate-400">${store.name} üzerinden satın aldığınız ürünleri, teslimat tarihinden itibaren 14 gün içerisinde ücretsiz olarak iade edebilir veya değiştirebilirsiniz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">İade Koşulları</h2>
          <ul class="list-disc pl-5 space-y-2 text-slate-400 font-sans">
            <li>Ürünün orijinal ambalajı bozulmamış, kullanılmamış ve hasar görmemiş olmalıdır.</li>
            <li>Tüm aksesuarları ve faturası ile birlikte gönderilmelidir.</li>
            <li>Kişiselleştirilmiş ürünlerde iade yapılmamaktadır.</li>
          </ul>
        </div>
      `,
    },
    {
      slug: 'sss',
      title: 'Sıkça Sorulan Sorular',
      sortOrder: 3,
      content: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">Sıkça Sorulan Sorular</h1>
          <div class="space-y-4">
            <div class="border-b border-slate-800 pb-4">
              <h3 class="text-lg font-semibold text-white mb-1">Siparişim ne zaman kargoya verilir?</h3>
              <p class="text-slate-400 font-sans">Hafta içi saat 15:00'e kadar verilen siparişler aynı gün kargoya verilir.</p>
            </div>
            <div class="border-b border-slate-800 pb-4">
              <h3 class="text-lg font-semibold text-white mb-1">Kargo ücreti ne kadar?</h3>
              <p class="text-slate-400 font-sans">500 TL ve üzeri alışverişlerinizde kargo ücretsizdir. Diğer siparişler için standart kargo ücreti 49.90 TL'dir.</p>
            </div>
            <div class="border-b border-slate-800 pb-4">
              <h3 class="text-lg font-semibold text-white mb-1">Ödeme seçenekleriniz nelerdir?</h3>
              <p class="text-slate-400 font-sans">Kredi kartı (iyzico / PayTR) ve kapıda nakit ödeme seçeneklerimiz mevcuttur.</p>
            </div>
          </div>
        </div>
      `,
    },
    {
      slug: 'sozlesmeler',
      title: 'Şartlar & Politikalar',
      sortOrder: 4,
      content: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">Şartlar & Politikalar</h1>
          <p class="text-slate-400">${store.name} web sitesini kullanarak aşağıdaki üyelik sözleşmesi, gizlilik politikası ve mesafeli satış sözleşmesi şartlarını kabul etmiş olursunuz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">1. Gizlilik Politikası</h2>
          <p class="text-slate-400 font-sans">Kişisel verileriniz KVKK kapsamında korunmakta ve üçüncü şahıslarla paylaşılmamaktadır.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">2. Mesafeli Satış Sözleşmesi</h2>
          <p class="text-slate-400 font-sans">Satın alma işlemlerinde Tüketici Hakları Kanunu geçerlidir.</p>
        </div>
      `,
    },
    {
      slug: 'hakkimizda',
      title: 'Hakkımızda',
      sortOrder: 5,
      content: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">Hakkımızda</h1>
          <p class="text-slate-400">${store.name}, kalite ve güvenirliliğin simgesidir. Kuruluşundan itibaren müşteri memnuniyetini ön planda tutarak hizmet vermekteyiz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">Misyonumuz</h2>
          <p class="text-slate-400 font-sans">En kaliteli ürünleri en uygun fiyatlarla sunarak, her müşterinin evini daha güzel ve konforlu bir yer haline getirmek.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">Vizyonumuz</h2>
          <p class="text-slate-400 font-sans">Sektörde Türkiye'nin en güvenilir ve tercih edilen e-ticaret platformu olmak.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">Değerlerimiz</h2>
          <ul class="list-disc pl-5 space-y-2 text-slate-400 font-sans">
            <li>Müşteri Memnuniyeti: Her zaman müşterinin ihtiyaçlarını ön planda tutuyor, hızlı ve kaliteli hizmet sunuyoruz.</li>
            <li>Kalite: Ürünlerimiz en yüksek kalite standartlarını karşılamak üzere seçilmektedir.</li>
            <li>Güvenilirlik: Tüm işlemlerde şeffaflık ve dürüstlüğü prensip ediyoruz.</li>
            <li>İnovasyon: Teknoloji kullanarak müşteri deneyimini sürekli geliştiriyoruz.</li>
          </ul>
        </div>
      `,
    },
    {
      slug: 'kvkk',
      title: 'KVKK Sözleşmesi',
      sortOrder: 6,
      content: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">KVKK Sözleşmesi (Gizlilik Politikası)</h1>
          <p class="text-slate-400">6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, kişisel verilerinizin nasıl işlendiğini açıklamak istiyoruz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">1. Veri Sahibinin Hakları</h2>
          <p class="text-slate-400 font-sans">Kişisel verileriniz hakkında bilgi sahibi olmak, düzeltmesini isteyebilmek, silinmesini talep edebilmek gibi haklara sahipsiniz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">2. Verilerin Kullanımı</h2>
          <p class="text-slate-400 font-sans">Toplanan kişisel verileriniz, siparişlerinizi işlemek, kargo göndermek, müşteri hizmetleri sağlamak ve kanuni yükümlülükleri yerine getirmek amacıyla kullanılır.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">3. Veri Güvenliği</h2>
          <p class="text-slate-400 font-sans">Verileriniz en modern şifreleme teknolojileri kullanılarak korunmakta ve üçüncü şahıslarla izinsiz paylaşılmamaktadır.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">4. İletişim</h2>
          <p class="text-slate-400 font-sans">Veri konusunda sorularınız için: ${store.email} adresine yazabilirsiniz.</p>
        </div>
      `,
    },
    {
      slug: 'uyelik',
      title: 'Üyelik Sözleşmesi',
      sortOrder: 7,
      content: `
        <div class="space-y-6">
          <h1 class="text-3xl font-extrabold text-white">Üyelik Sözleşmesi</h1>
          <p class="text-slate-400">${store.name} platformunda üyeliğiniz ile ilgili hak ve sorumlulukları açıklamak istiyoruz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">1. Üyelik Şartları</h2>
          <ul class="list-disc pl-5 space-y-2 text-slate-400 font-sans">
            <li>18 yaşından büyük olmanız gerekir.</li>
            <li>Gerçek kişi veya yasal tüzel kişi olmanız şarttır.</li>
            <li>Sahte, yanıltıcı bilgi vermeniz yasaktır.</li>
          </ul>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">2. Üyelik Hakkı</h2>
          <p class="text-slate-400 font-sans">Üyelik iptal edilmesi durumunda sipariş verme, cari bakiye ve diğer hizmetlerden faydalanma hakkınız sona erer.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">3. Sorumluluklar</h2>
          <p class="text-slate-400 font-sans">Şifrenizin gizliliğini sağlamaktan, verdiğiniz bilgilerin doğruluğundan ve hesabınızda yapılan işlemlerden siz sorumlusunuz.</p>
          <h2 class="text-xl font-bold text-white mt-6 mb-3">4. Kısıtlamalar</h2>
          <p class="text-slate-400 font-sans">Platform herhangi bir nedenden dolayı hesabı kapatma veya kısıtlama hakkına sahiptir.</p>
        </div>
      `,
    },
  ];
}

// Sistem slug'ları (silinemez, slug değiştirilemez)
export const SYSTEM_PAGE_SLUGS = ['iletisim', 'iade', 'sss', 'sozlesmeler', 'hakkimizda', 'kvkk', 'uyelik'];

// ─── Seed (idempotent) ───────────────────────────────────────────────────────
// Tablo boşsa 7 sistem sayfasını ekler. Eski site_settings.pages_<slug> içeriği
// varsa onu taşır (admin'in önceki düzenlemeleri kaybolmasın).
export async function seedDefaultPagesIfEmpty(): Promise<number> {
  const count = await prisma.page.count();
  if (count > 0) return 0;

  const store = await getStoreIdentity();
  const defaults = buildDefaultPages({ name: store.name, email: store.email });

  // Eski ayar tabanlı içerikleri al
  const legacy = await prisma.siteSettings.findMany({
    where: { key: { in: defaults.map((d) => `pages_${d.slug}`) } },
  });
  const legacyMap = new Map(legacy.map((r) => [r.key, r.value]));

  await prisma.page.createMany({
    data: defaults.map((d) => ({
      slug: d.slug,
      title: d.title,
      content: legacyMap.get(`pages_${d.slug}`) || d.content,
      showInMenu: true,
      sortOrder: d.sortOrder,
      isActive: true,
      isSystem: true,
    })),
  });
  return defaults.length;
}

// ─── Public ──────────────────────────────────────────────────────────────────
export async function listMenuPages(): Promise<Array<{ slug: string; title: string; isSystem: boolean; showInHeader: boolean; showInFooter: boolean }>> {
  return prisma.page.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { slug: true, title: true, isSystem: true, showInHeader: true, showInFooter: true },
  });
}

export async function getPageBySlug(slug: string): Promise<PageDto | null> {
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page || !page.isActive) return null;
  return page;
}

// ─── Admin ───────────────────────────────────────────────────────────────────
export async function listAllPages(): Promise<PageDto[]> {
  return prisma.page.findMany({ orderBy: { sortOrder: 'asc' } });
}

function slugify(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function createPage(data: {
  title: string; content: string; slug?: string; showInMenu?: boolean; showInHeader?: boolean; showInFooter?: boolean; isActive?: boolean; sortOrder?: number;
}): Promise<PageDto> {
  const title = (data.title || '').trim();
  if (!title) throw new AppError('Başlık gerekli', 400);

  let slug = (data.slug || '').trim() ? slugify(data.slug as string) : slugify(title);
  if (!slug) throw new AppError('Geçerli bir slug üretilemedi', 400);

  // Slug çakışması -> sonuna sayı ekle
  const existing = await prisma.page.findMany({ where: { slug: { startsWith: slug } }, select: { slug: true } });
  if (existing.some((e) => e.slug === slug)) {
    let i = 2;
    while (existing.some((e) => e.slug === `${slug}-${i}`)) i++;
    slug = `${slug}-${i}`;
  }

  const max = await prisma.page.aggregate({ _max: { sortOrder: true } });
  return prisma.page.create({
    data: {
      slug,
      title,
      content: data.content ?? '',
      showInMenu: data.showInMenu ?? true,
      showInHeader: data.showInHeader ?? true,
      showInFooter: data.showInFooter ?? true,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
      isSystem: false,
    },
  });
}

export async function updatePage(id: string, data: {
  title?: string; content?: string; showInMenu?: boolean; showInHeader?: boolean; showInFooter?: boolean; isActive?: boolean; sortOrder?: number; slug?: string;
}): Promise<PageDto> {
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) throw new AppError('Sayfa bulunamadı', 404);

  // Sistem sayfasının slug'ı değiştirilemez
  const updateData: Record<string, unknown> = {
    ...(data.title !== undefined && { title: data.title.trim() }),
    ...(data.content !== undefined && { content: data.content }),
    ...(data.showInMenu !== undefined && { showInMenu: data.showInMenu }),
    ...(data.showInHeader !== undefined && { showInHeader: data.showInHeader }),
    ...(data.showInFooter !== undefined && { showInFooter: data.showInFooter }),
    ...(data.isActive !== undefined && { isActive: data.isActive }),
    ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
  };
  if (!page.isSystem && data.slug !== undefined && data.slug.trim()) {
    updateData.slug = slugify(data.slug);
  }
  return prisma.page.update({ where: { id }, data: updateData });
}

export async function deletePage(id: string): Promise<void> {
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) throw new AppError('Sayfa bulunamadı', 404);
  if (page.isSystem) throw new AppError('Sistem sayfaları silinemez', 400);
  await prisma.page.delete({ where: { id } });
}

export async function reorderPages(ids: string[]): Promise<void> {
  await prisma.$transaction(
    ids.map((id, index) => prisma.page.update({ where: { id }, data: { sortOrder: index } })),
  );
}

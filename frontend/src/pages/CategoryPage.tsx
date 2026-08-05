import { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ChevronRight, SlidersHorizontal, X, ChevronDown,
  Grid2x2, LayoutGrid, Loader2, SearchX, PackageOpen, ArrowRight,
} from 'lucide-react';
import { productApi, type FilterAttribute } from '@/services/productApi';
import { ProductGrid } from '@/components/product/ProductGrid';
import { SeoHead, SITE_URL } from '@/components/seo/SeoHead';
import { breadcrumbSchema } from '@/lib/schemas';
import { useStoreInfo } from '@/hooks/useStoreInfo';

const SORTS = [
  { value: 'popular', label: 'En Çok Satanlar' },
  { value: 'price_asc', label: 'Fiyat (Artan)' },
  { value: 'price_desc', label: 'Fiyat (Azalan)' },
  { value: 'newest', label: 'Yeniler' },
];
type Sort = 'popular' | 'price_asc' | 'price_desc' | 'newest';

// ─── Küçük yardımcı bileşenler ─────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="py-3 border-b border-espresso-50 dark:border-espresso-700 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full mb-2 group"
      >
        <span className="text-sm font-semibold text-espresso-700 dark:text-cream-200">
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-espresso-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && children}
    </div>
  );
}

function CheckboxItem({
  label,
  checked,
  onChange,
  colorHex,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  colorHex?: string | null;
}) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          checked ? 'bg-caramel-400 border-caramel-400' : 'border-espresso-200 dark:border-espresso-600 group-hover:border-espresso-300'
        }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      {colorHex && (
        <span
          className="w-4 h-4 rounded-full border border-espresso-200 shrink-0"
          style={{ backgroundColor: colorHex }}
        />
      )}
      <span
        className={`text-sm transition-colors truncate ${
          checked
            ? 'text-espresso-700 dark:text-cream-100 font-medium'
            : 'text-espresso-500 dark:text-espresso-300 group-hover:text-espresso-600'
        }`}
      >
        {label}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    </label>
  );
}

function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer">
      <span className="text-sm text-espresso-500 dark:text-espresso-300">{label}</span>
      <button
        type="button"
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-caramel-400' : 'bg-espresso-200 dark:bg-espresso-600'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

// ─── Ana Bileşen ───────────────────────────────────────────────────────────────

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { name: storeName } = useStoreInfo();

  const [sort, setSort] = useState<Sort>('popular');
  const [page, setPage] = useState(1);
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(2);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Aktif filtreler
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string[]>>({});
  const [priceMin, setPriceMin] = useState<number | ''>('');
  const [priceMax, setPriceMax] = useState<number | ''>('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);

  // ─── Filtre seçeneklerini backend'den çek ──────────────────────────────────
  const { data: filterData, isLoading: filterLoading } = useQuery({
    queryKey: ['filter-options', slug],
    queryFn: () => productApi.filterOptions(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
  const filterOptions = filterData?.data?.data;
  const dynamicPriceMin = filterOptions?.priceRange.min ?? 0;
  const dynamicPriceMax = filterOptions?.priceRange.max ?? 10000;

  // ─── Kategori bilgisi ──────────────────────────────────────────────────────
  const { data: catData } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => productApi.category(slug!),
    enabled: !!slug,
  });
  const category = catData?.data?.data;

  // ─── Ürün listesi ──────────────────────────────────────────────────────────
  const queryParams = useMemo(() => ({
    category: slug,
    sort,
    page,
    limit: 20,
    ...(selectedBrand && { brand: selectedBrand }),
    ...(inStockOnly && { inStock: true }),
    ...(onSaleOnly && { onSale: true }),
    ...(priceMin !== '' && { minPrice: Number(priceMin) }),
    ...(priceMax !== '' && { maxPrice: Number(priceMax) }),
    ...(Object.keys(selectedAttrs).length > 0 && { attributes: selectedAttrs }),
  }), [slug, sort, page, selectedBrand, inStockOnly, onSaleOnly, priceMin, priceMax, selectedAttrs]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: () => productApi.list(queryParams),
    enabled: !!slug,
  });

  const products = data?.data?.items ?? [];
  const pagination = data?.data?.pagination;

  // ─── Aktif filtre sayısı ───────────────────────────────────────────────────
  const attrFilterCount = Object.values(selectedAttrs).reduce((s, v) => s + v.length, 0);
  const activeFilterCount =
    attrFilterCount +
    (selectedBrand ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (onSaleOnly ? 1 : 0) +
    (priceMin !== '' || priceMax !== '' ? 1 : 0);

  function clearAll() {
    setSelectedBrand('');
    setSelectedAttrs({});
    setPriceMin('');
    setPriceMax('');
    setInStockOnly(false);
    setOnSaleOnly(false);
    setPage(1);
  }

  // Attribute toggle yardımcısı
  const toggleAttr = useCallback((slug: string, value: string) => {
    setSelectedAttrs((prev) => {
      const current = prev[slug] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return next.length === 0
        ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== slug))
        : { ...prev, [slug]: next };
    });
    setPage(1);
  }, []);

  // ─── Aktif filtre chip'leri ────────────────────────────────────────────────
  const activeChips = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    if (selectedBrand) {
      const b = filterOptions?.brands.find((b) => b.id === selectedBrand);
      chips.push({ label: b?.name ?? selectedBrand, clear: () => { setSelectedBrand(''); setPage(1); } });
    }
    for (const [attrSlug, values] of Object.entries(selectedAttrs)) {
      for (const val of values) {
        chips.push({ label: val, clear: () => toggleAttr(attrSlug, val) });
      }
    }
    if (inStockOnly) chips.push({ label: 'Stokta Var', clear: () => { setInStockOnly(false); setPage(1); } });
    if (onSaleOnly) chips.push({ label: 'İndirimli', clear: () => { setOnSaleOnly(false); setPage(1); } });
    if (priceMin !== '' || priceMax !== '') {
      const label = `${priceMin !== '' ? priceMin : dynamicPriceMin}₺ - ${priceMax !== '' ? priceMax : dynamicPriceMax}₺`;
      chips.push({ label, clear: () => { setPriceMin(''); setPriceMax(''); setPage(1); } });
    }
    return chips;
  }, [selectedBrand, selectedAttrs, inStockOnly, onSaleOnly, priceMin, priceMax, filterOptions, dynamicPriceMin, dynamicPriceMax, toggleAttr]);

  const breadcrumbItems = [
    { name: 'Ana Sayfa', url: SITE_URL },
    ...(category?.parent
      ? [{ name: category.parent.name, url: `${SITE_URL}/kategori/${category.parent.slug}` }]
      : []),
    { name: category?.name ?? slug ?? '', url: `${SITE_URL}/kategori/${slug}` },
  ];

  // ─── Sol Filtre Paneli ─────────────────────────────────────────────────────
  function Sidebar() {
    return (
      <div className="bg-white dark:bg-espresso-900 rounded-2xl border border-espresso-100 dark:border-espresso-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-espresso-800 dark:text-cream-50">Filtreler</p>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-caramel-600 hover:text-caramel-700 transition-colors"
            >
              Temizle ({activeFilterCount})
            </button>
          )}
        </div>

        {filterLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-caramel-400" />
          </div>
        ) : !filterOptions ? null : (
          <>
            {/* Marka filtresi — sadece 2+ marka varsa göster */}
            {filterOptions.brands.length > 1 && (
              <FilterSection title="Marka">
                {filterOptions.brands.map((b) => (
                  <CheckboxItem
                    key={b.id}
                    label={b.name}
                    checked={selectedBrand === b.id}
                    onChange={() => {
                      setSelectedBrand((prev) => (prev === b.id ? '' : b.id));
                      setPage(1);
                    }}
                  />
                ))}
              </FilterSection>
            )}

            {/* Dinamik attribute filtreleri */}
            {filterOptions.attributes.map((attr: FilterAttribute) => (
              <FilterSection key={attr.slug} title={attr.name}>
                <div className={attr.inputType === 'color' ? 'flex flex-wrap gap-2 pt-1' : ''}>
                  {attr.values.map((v) => {
                    const isSelected = (selectedAttrs[attr.slug] ?? []).includes(v.value);
                    if (attr.inputType === 'color' && v.colorHex) {
                      return (
                        <button
                          key={v.id}
                          onClick={() => toggleAttr(attr.slug, v.value)}
                          title={v.value}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${
                            isSelected
                              ? 'border-caramel-400 scale-110'
                              : 'border-transparent hover:border-espresso-300'
                          }`}
                          style={{ backgroundColor: v.colorHex }}
                          aria-label={v.value}
                          aria-pressed={isSelected}
                        />
                      );
                    }
                    return (
                      <CheckboxItem
                        key={v.id}
                        label={v.value}
                        checked={isSelected}
                        onChange={() => toggleAttr(attr.slug, v.value)}
                      />
                    );
                  })}
                </div>
              </FilterSection>
            ))}

            {/* Fiyat Aralığı */}
            <FilterSection title="Fiyat Aralığı">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={priceMin}
                    placeholder={String(dynamicPriceMin)}
                    onChange={(e) => { setPriceMin(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
                    className="w-full h-9 px-2 rounded-lg border border-espresso-200 dark:border-espresso-600 bg-white dark:bg-espresso-800 text-sm text-espresso-700 dark:text-cream-200 focus:outline-none focus:border-caramel-400"
                    min={0}
                  />
                  <span className="text-espresso-300 shrink-0">-</span>
                  <input
                    type="number"
                    value={priceMax}
                    placeholder={String(dynamicPriceMax)}
                    onChange={(e) => { setPriceMax(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
                    className="w-full h-9 px-2 rounded-lg border border-espresso-200 dark:border-espresso-600 bg-white dark:bg-espresso-800 text-sm text-espresso-700 dark:text-cream-200 focus:outline-none focus:border-caramel-400"
                    min={0}
                  />
                </div>
                <input
                  type="range"
                  min={dynamicPriceMin}
                  max={dynamicPriceMax}
                  step={Math.max(1, Math.round((dynamicPriceMax - dynamicPriceMin) / 100))}
                  value={priceMax !== '' ? priceMax : dynamicPriceMax}
                  onChange={(e) => { setPriceMax(Number(e.target.value)); setPage(1); }}
                  className="w-full accent-caramel-400"
                />
                <p className="text-xs text-espresso-400">
                  {priceMin !== '' ? priceMin : dynamicPriceMin} ₺ –{' '}
                  {priceMax !== '' ? priceMax : dynamicPriceMax} ₺
                </p>
              </div>
            </FilterSection>

            {/* Stok / İndirim */}
            <FilterSection title="Durum">
              <ToggleSwitch
                label="Stokta Olanlar"
                checked={inStockOnly}
                onChange={() => { setInStockOnly((v) => !v); setPage(1); }}
              />
              <ToggleSwitch
                label="İndirimli Ürünler"
                checked={onSaleOnly}
                onChange={() => { setOnSaleOnly((v) => !v); setPage(1); }}
              />
            </FilterSection>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <SeoHead
        title={category?.name ?? slug}
        description={
          category?.description
            ? category.description.slice(0, 155)
            : `${category?.name ?? slug} kategorisindeki ürünleri keşfedin. ${storeName} kalite güvencesiyle.`
        }
        keywords={[category?.name, storeName, 'satın al', 'fiyat'].filter(Boolean).join(', ')}
        url={`${SITE_URL}/kategori/${slug}`}
        image={category?.imageUrl ?? undefined}
        schema={breadcrumbSchema(breadcrumbItems)}
      />

      <div className="max-w-8xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-espresso-400 mb-4">
          <Link to="/" className="hover:text-caramel-600 transition-colors">Ana Sayfa</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          {category?.parent && (
            <>
              <Link to={`/kategori/${category.parent.slug}`} className="hover:text-caramel-600 transition-colors">
                {category.parent.name}
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
          <span className="text-espresso-700 dark:text-cream-200 font-medium">{category?.name ?? slug}</span>
        </nav>

        {/* Başlık */}
        <div className="mb-5">
          <h1 className="font-alatsi text-2xl sm:text-3xl font-bold text-espresso-800 dark:text-cream-50">
            {category?.name ?? slug}
          </h1>
          {pagination && (
            <p className="text-sm text-espresso-500 mt-1">{pagination.total} ürün</p>
          )}
        </div>

        {/* Alt kategoriler */}
        {category?.children && category.children.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5 lg:grid lg:grid-cols-4 lg:gap-3">
            {category.children.map((child) => (
              <Link
                key={child.id}
                to={`/kategori/${child.slug}`}
                className="px-4 py-1.5 rounded-full border border-espresso-200 dark:border-espresso-600 text-sm text-espresso-600 dark:text-cream-300 hover:bg-caramel-50 hover:border-caramel-300 hover:text-caramel-700 transition-colors"
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}

        {/* Ürün yoksa tam genişlik boş durum */}
        {!isLoading && products.length === 0 && (
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-espresso-700 via-espresso-800 to-espresso-900 dark:from-espresso-800 dark:via-espresso-900 dark:to-espresso-950">
            {/* Dekoratif */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-caramel-400/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-ember-500/8 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

            <div className="relative px-6 sm:px-12 lg:px-20 py-16 sm:py-24 flex flex-col items-center text-center">
              {/* İkon */}
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <PackageOpen className="w-11 h-11 text-cream-200" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-caramel-400 flex items-center justify-center shadow-lg">
                  <SearchX className="w-5 h-5 text-white" />
                </div>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-cream-50 mb-3">
                Ürün bulunamadı
              </h3>
              <p className="text-cream-300 max-w-md mb-10 leading-relaxed">
                {activeFilterCount > 0
                  ? 'Seçtiğiniz filtrelere uygun ürün bulunmuyor. Filtreleri değiştirmeyi veya temizlemeyi deneyin.'
                  : 'Bu kategoride henüz ürün bulunmuyor. Diğer kategorilerimize göz atarak aradığınız ürünü bulabilirsiniz.'}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAll}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                )}
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-cream-100 font-semibold text-sm transition-colors"
                >
                  Ana Sayfaya Dön <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/ara"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-cream-300 hover:text-cream-100 text-sm font-medium transition-colors"
                >
                  Tüm Ürünleri Gör <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Ürün varsa veya yükleniyorsa normal layout */}
        {(isLoading || products.length > 0) && (
        <div className="flex gap-6">
          {/* Sol Filtre Paneli — Desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-40">
              <Sidebar />
            </div>
          </aside>

          {/* Sağ Alan */}
          <div className="flex-1 min-w-0">
            {/* Araç Çubuğu */}
            <div className="flex items-center justify-between gap-3 mb-4 p-3 bg-white dark:bg-espresso-900 rounded-xl border border-espresso-100 dark:border-espresso-700">
              {/* Mobil filtre butonu */}
              <button
                onClick={() => setShowMobileFilters(true)}
                className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg bg-cream-100 dark:bg-espresso-800 text-sm font-medium text-espresso-600 dark:text-cream-200"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtreler
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-caramel-400 text-white text-xs">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <span className="hidden lg:block text-sm text-espresso-400">Sırala:</span>

              <div className="flex items-center gap-2 ml-auto">
                {/* Sıralama */}
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => { setSort(e.target.value as Sort); setPage(1); }}
                    className="appearance-none pl-3 pr-9 h-9 rounded-lg border border-espresso-200 dark:border-espresso-600 bg-white dark:bg-espresso-800 text-sm text-espresso-600 dark:text-cream-200 font-medium focus:outline-none focus:border-caramel-400 cursor-pointer"
                  >
                    {SORTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso-300 pointer-events-none" />
                </div>

                {/* Grid geçişi */}
                <div className="hidden sm:flex items-center gap-1 border border-espresso-200 dark:border-espresso-600 rounded-lg p-0.5">
                  <button
                    onClick={() => setGridCols(2)}
                    className={`p-1.5 rounded-md transition-colors ${gridCols === 2 ? 'bg-espresso-700 text-white' : 'text-espresso-300 hover:text-espresso-500'}`}
                    aria-label="2'li grid"
                  >
                    <Grid2x2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setGridCols(3)}
                    className={`p-1.5 rounded-md transition-colors ${gridCols === 3 ? 'bg-espresso-700 text-white' : 'text-espresso-300 hover:text-espresso-500'}`}
                    aria-label="3'lü grid"
                  >
                    <Grid2x2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setGridCols(4)}
                    className={`p-1.5 rounded-md transition-colors ${gridCols === 4 ? 'bg-espresso-700 text-white' : 'text-espresso-300 hover:text-espresso-500'}`}
                    aria-label="4'lü grid"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Aktif filtre chip'leri */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {activeChips.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={chip.clear}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-caramel-100 dark:bg-caramel-900/30 text-caramel-700 dark:text-caramel-300 text-xs font-medium hover:bg-caramel-200 transition-colors"
                  >
                    {chip.label}
                    <X className="w-3 h-3" />
                  </button>
                ))}
                {activeChips.length > 1 && (
                  <button
                    onClick={clearAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-espresso-100 dark:bg-espresso-800 text-espresso-500 text-xs font-medium hover:bg-espresso-200 transition-colors"
                  >
                    Tümünü Temizle
                  </button>
                )}
              </div>
            )}

            {/* Ürün Grid */}
            <motion.div layout>
              <ProductGrid products={products} loading={isLoading} cols={gridCols} />
            </motion.div>

            {/* Sayfalama */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  disabled={page === 1}
                  onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="px-4 py-2 rounded-lg border border-espresso-200 text-sm text-espresso-600 disabled:opacity-40 hover:bg-cream-100 transition-colors"
                >
                  Önceki
                </button>
                <span className="flex items-center px-4 text-sm text-espresso-500">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  disabled={page === pagination.totalPages}
                  onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="px-4 py-2 rounded-lg border border-espresso-200 text-sm text-espresso-600 disabled:opacity-40 hover:bg-cream-100 transition-colors"
                >
                  Sonraki
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Mobil Filtre Çekmecesi — sağdan açılır */}
      {showMobileFilters && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMobileFilters(false)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-cream-50 dark:bg-espresso-950 overflow-y-auto"
          >
            <div className="sticky top-0 bg-cream-50 dark:bg-espresso-950 flex items-center justify-between p-4 border-b border-espresso-100 dark:border-espresso-700 z-10">
              <p className="font-bold text-espresso-800 dark:text-cream-50">Filtreler</p>
              <button onClick={() => setShowMobileFilters(false)} className="p-2 text-espresso-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <Sidebar />
            </div>
            <div className="sticky bottom-0 p-4 bg-cream-50 dark:bg-espresso-950 border-t border-espresso-100 dark:border-espresso-700">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full h-11 rounded-xl bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm transition-colors"
              >
                {pagination ? `${pagination.total} Ürünü Göster` : 'Ürünleri Göster'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

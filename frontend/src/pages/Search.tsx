import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Filter, RotateCcw, Grid2x2, LayoutGrid } from 'lucide-react';
import { productApi } from '@/services/productApi';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SeoHead } from '@/components/seo/SeoHead';

const SORTS = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Düşük → Yüksek' },
  { value: 'price_desc', label: 'Fiyat: Yüksek → Düşük' },
  { value: 'popular', label: 'En Popüler' },
];

type Sort = 'newest' | 'price_asc' | 'price_desc' | 'popular';

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const selectedCategory = searchParams.get('category') ?? null;
  const selectedBrand = searchParams.get('brand') ?? null;
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const sort = (searchParams.get('sort') ?? 'newest') as Sort;
  const page = Number(searchParams.get('page') ?? '1');
  const gridCols = (searchParams.get('gridCols') ?? '2') as '2' | '3' | '4';

  const [input, setInput] = useState(q);
  const [tempMaxPrice, setTempMaxPrice] = useState(searchParams.get('maxPrice') ?? '5000');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Keep search input in sync if query changes from header search
  useEffect(() => {
    setInput(q);
  }, [q]);

  // Keep temp price inputs in sync with URL
  useEffect(() => {
    setTempMaxPrice(searchParams.get('maxPrice') ?? '5000');
  }, [searchParams]);

  const updateFilters = (updates: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    // Reset page on filter changes unless page itself is updated
    if (!('page' in updates)) {
      params.set('page', '1');
    }
    setSearchParams(params);
  };

  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['products', 'catalog', { q, selectedCategory, selectedBrand, minPrice, maxPrice, sort, page }],
    queryFn: () =>
      productApi.list({
        search: q || undefined,
        category: selectedCategory || undefined,
        brand: selectedBrand || undefined,
        minPrice,
        maxPrice,
        sort,
        page,
        limit: 12,
      }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.categories(),
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: () => productApi.brands(),
  });

  const rawProducts = productsData?.data?.items ?? [];
  const products = inStockOnly
    ? rawProducts.filter((p) => p.variants?.some((v) => v.stockQty > 0))
    : rawProducts;
  const pagination = productsData?.data?.pagination;
  const categories = categoriesData?.data?.data ?? [];
  const brands = brandsData?.data?.data ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilters({ q: input || null });
  }

  const renderFilters = () => (
    <div className="flex flex-col gap-6">
      {/* Title & Clear */}
      <div className="flex items-center justify-between border-b border-espresso-100 pb-4">
        <h3 className="font-bold text-espresso-800 text-xs tracking-widest uppercase">Filtreler</h3>
        {(selectedCategory || selectedBrand || minPrice !== undefined || maxPrice !== undefined || inStockOnly) && (
          <button
            onClick={() => {
              setSearchParams(q ? { q } : {});
              setTempMaxPrice('5000');
              setInStockOnly(false);
            }}
            className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold cursor-pointer border-none bg-transparent"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Temizle
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-3">
        <h4 className="font-bold text-espresso-800 text-[11px] tracking-wider uppercase">Kategoriler</h4>
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {categories.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-2.5 py-0.5 text-sm text-espresso-500 hover:text-espresso-800 cursor-pointer select-none font-medium"
            >
              <input
                type="checkbox"
                checked={selectedCategory === cat.slug}
                onChange={() => updateFilters({ category: selectedCategory === cat.slug ? null : cat.slug })}
                className="accent-primary h-4 w-4 rounded border-espresso-300 cursor-pointer"
              />
              <span className={selectedCategory === cat.slug ? "text-espresso-800 font-semibold" : ""}>
                {cat.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="flex flex-col gap-3 border-t border-espresso-100 pt-5">
        <h4 className="font-bold text-espresso-800 text-[11px] tracking-wider uppercase">Fiyat Aralığı</h4>
        <div className="text-xs text-espresso-500 font-medium">
          Maksimum Fiyat: <span className="font-bold text-espresso-800">₺{tempMaxPrice || '5000'}</span>
        </div>
        <input
          type="range"
          min="0"
          max="5000"
          step="100"
          value={tempMaxPrice || '5000'}
          onChange={(e) => {
            const val = e.target.value;
            setTempMaxPrice(val);
            updateFilters({ maxPrice: val === '5000' ? null : val });
          }}
          className="w-full accent-espresso-800 h-1 bg-cream-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-espresso-300 font-bold uppercase tracking-wider">
          <span>₺0</span>
          <span>₺5000</span>
        </div>
      </div>

      {/* Brands */}
      <div className="flex flex-col gap-3 border-t border-espresso-100 pt-5">
        <h4 className="font-bold text-espresso-800 text-[11px] tracking-wider uppercase">Markalar</h4>
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {brands.map((brand) => (
            <label
              key={brand.id}
              className="flex items-center gap-2.5 py-0.5 text-sm text-espresso-500 hover:text-espresso-800 cursor-pointer select-none font-medium"
            >
              <input
                type="checkbox"
                checked={selectedBrand === brand.id}
                onChange={() => updateFilters({ brand: selectedBrand === brand.id ? null : brand.id })}
                className="accent-primary h-4 w-4 rounded border-espresso-300 cursor-pointer"
              />
              <span className={selectedBrand === brand.id ? "text-espresso-800 font-semibold" : ""}>
                {brand.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="flex flex-col gap-3 border-t border-espresso-100 pt-5">
        <h4 className="font-bold text-espresso-800 text-[11px] tracking-wider uppercase">Stok Durumu</h4>
        <label className="flex items-center gap-2.5 py-0.5 text-sm text-espresso-500 hover:text-espresso-800 cursor-pointer select-none font-medium">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="accent-primary h-4 w-4 rounded border-espresso-300 cursor-pointer"
          />
          <span className={inStockOnly ? "text-espresso-800 font-semibold" : ""}>Stokta Olanlar</span>
        </label>
      </div>
    </div>
  );

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <SeoHead
        title={q ? `"${q}" için arama sonuçları` : 'Ürün Ara'}
        description={q ? `"${q}" araması için ${productsData?.data?.pagination?.total ?? ''} ürün bulundu.` : 'Ev tekstili ürünlerinde arama yapın.'}
        noindex
      />
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block w-64 shrink-0 bg-white border border-espresso-100 rounded-2xl p-6 h-fit shadow-xs">
          {renderFilters()}
        </aside>

        {/* Main Content Area */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-6 text-espresso-700 tracking-tight">
            {q ? `"${q}" için sonuçlar` : 'Tüm Ürünler'}
          </h1>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-lg">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ürün ara..."
                className="pl-9"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <Button type="submit" className="cursor-pointer border-none font-medium">Ara</Button>
          </form>

          {/* Catalog Top Bar (Sort & Mobile filter trigger) */}
          <div className="flex items-center justify-between border-b border-espresso-100 pb-4 mb-6">
            <div>
              {pagination && (
                <p className="text-sm text-espresso-400 font-medium">
                  Toplam <span className="font-bold text-espresso-800">{pagination.total}</span> üründen <span className="font-bold text-espresso-800">{products.length}</span> tanesi gösteriliyor
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Mobile Filter Trigger */}
              <div className="lg:hidden">
                <Sheet>
                  <SheetTrigger
                    render={
                      <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs cursor-pointer">
                        <Filter className="h-4 w-4" />
                        Filtrele
                      </Button>
                    }
                  />
                  <SheetContent side="left" className="w-[300px] overflow-y-auto p-6">
                    {renderFilters()}
                  </SheetContent>
                </Sheet>
              </div>

              {/* Sorting Select */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-espresso-400 font-medium whitespace-nowrap">Sırala:</span>
                <Select value={sort} onValueChange={(v) => updateFilters({ sort: v })}>
                  <SelectTrigger className="w-40 h-9 text-xs border border-espresso-200 bg-white">
                    <SelectValue>{SORTS.find(s => s.value === sort)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SORTS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Grid Columns Toggle */}
              <div className="hidden sm:flex items-center gap-1 border border-espresso-200 rounded-lg p-0.5">
                <button
                  onClick={() => updateFilters({ gridCols: '2' })}
                  className={`p-1.5 rounded-md transition-colors ${gridCols === '2' ? 'bg-espresso-700 text-white' : 'text-espresso-300 hover:text-espresso-500'}`}
                  aria-label="2'li grid"
                >
                  <Grid2x2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateFilters({ gridCols: '3' })}
                  className={`p-1.5 rounded-md transition-colors ${gridCols === '3' ? 'bg-espresso-700 text-white' : 'text-espresso-300 hover:text-espresso-500'}`}
                  aria-label="3'lü grid"
                >
                  <Grid2x2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateFilters({ gridCols: '4' })}
                  className={`p-1.5 rounded-md transition-colors ${gridCols === '4' ? 'bg-espresso-700 text-white' : 'text-espresso-300 hover:text-espresso-500'}`}
                  aria-label="4'lü grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <ProductGrid products={products} loading={isProductsLoading} cols={Number(gridCols) as 2 | 3 | 4} />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => updateFilters({ page: String(page - 1) })}
                className="cursor-pointer"
              >
                Önceki
              </Button>
              <span className="flex items-center px-4 text-sm text-espresso-400 font-medium">
                {page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === pagination.totalPages}
                onClick={() => updateFilters({ page: String(page + 1) })}
                className="cursor-pointer"
              >
                Sonraki
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

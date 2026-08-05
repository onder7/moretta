import { useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  SlidersHorizontal, X, ChevronRight, Grid2x2, LayoutGrid, ChevronDown,
} from 'lucide-react';
import { products, categories } from '@/data/products';
import type { Product, CoffeeType, RoastLevel } from '@/types';
import ProductCard from '@/components/ProductCard';

type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'newest';

const coffeeTypes: CoffeeType[] = ['Arabica', 'Robusta', 'Blend'];
const roastLevels: RoastLevel[] = ['Açık', 'Açık-Orta', 'Orta', 'Orta-Koyu', 'Koyu'];
const origins = ['Etiyopya', 'Kolombiya', 'Brezilya', 'Guatemala', 'Kenya', 'Costa Rica'];
const flavorProfiles = ['Meyvemsi', 'Çikolata', 'Karamel', 'Fındık', 'Narenciye', 'Baharatlı', 'Çiçeksi'];

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [searchParams] = useSearchParams();
  const subcategory = searchParams.get('sub');

  const category = categories.find((c) => c.id === categoryId);
  const categoryLabel = category?.label ?? 'Tüm Ürünler';

  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<CoffeeType[]>([]);
  const [selectedRoasts, setSelectedRoasts] = useState<RoastLevel[]>([]);
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(500);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>('popular');
  const [gridCols, setGridCols] = useState<3 | 4>(4);

  const toggle = <T,>(arr: T[], val: T, setter: (v: T[]) => void) => {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const filtered = useMemo(() => {
    let result: Product[] = [...products];

    if (categoryId) {
      result = result.filter((p) => p.category === categoryId);
    }
    if (subcategory) {
      result = result.filter(
        (p) => p.name.includes(subcategory) || p.type.includes(subcategory) || p.roast.includes(subcategory),
      );
    }
    if (selectedTypes.length > 0) result = result.filter((p) => selectedTypes.includes(p.type));
    if (selectedRoasts.length > 0) result = result.filter((p) => selectedRoasts.includes(p.roast));
    if (selectedOrigins.length > 0) result = result.filter((p) => selectedOrigins.includes(p.origin));
    if (selectedFlavors.length > 0) {
      result = result.filter((p) => p.flavorNotes.some((f) => selectedFlavors.some((sf) => f.includes(sf))));
    }
    result = result.filter((p) => p.price >= priceMin && p.price <= priceMax);
    if (inStockOnly) result = result.filter((p) => p.inStock);
    if (onSaleOnly) result = result.filter((p) => p.oldPrice);

    switch (sort) {
      case 'price-asc': result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
      case 'newest': result.sort((a, b) => (b.badge === 'Yeni Hasat' ? 1 : 0) - (a.badge === 'Yeni Hasat' ? 1 : 0)); break;
      default: result.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    return result;
  }, [categoryId, subcategory, selectedTypes, selectedRoasts, selectedOrigins, selectedFlavors, priceMin, priceMax, inStockOnly, onSaleOnly, sort]);

  const clearAll = () => {
    setSelectedTypes([]);
    setSelectedRoasts([]);
    setSelectedOrigins([]);
    setSelectedFlavors([]);
    setPriceMin(0);
    setPriceMax(500);
    setInStockOnly(false);
    setOnSaleOnly(false);
  };

  const activeFilterCount =
    selectedTypes.length + selectedRoasts.length + selectedOrigins.length + selectedFlavors.length +
    (inStockOnly ? 1 : 0) + (onSaleOnly ? 1 : 0) +
    (priceMin !== 0 || priceMax !== 500 ? 1 : 0);

  const FilterSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="py-4 border-b border-espresso-50 last:border-0">
      <p className="text-sm font-semibold text-espresso-700 mb-3">{title}</p>
      {children}
    </div>
  );

  const CheckboxItem = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'bg-caramel-400 border-caramel-400' : 'border-espresso-200 group-hover:border-espresso-300'}`}>
        {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className={`text-sm transition-colors ${checked ? 'text-espresso-700 font-medium' : 'text-espresso-500 group-hover:text-espresso-600'}`}>
        {label}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    </label>
  );

  const Sidebar = () => (
    <div className="bg-white rounded-2xl border border-espresso-100 p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-espresso-800">Filtreler</p>
        {activeFilterCount > 0 && (
          <button onClick={clearAll} className="text-xs text-caramel-600 hover:text-caramel-700 transition-colors">
            Temizle ({activeFilterCount})
          </button>
        )}
      </div>

      <FilterSection title="Kahve Türü">
        {coffeeTypes.map((t) => (
          <CheckboxItem
            key={t}
            label={t}
            checked={selectedTypes.includes(t)}
            onChange={() => toggle(selectedTypes, t, setSelectedTypes)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Kavrum Seviyesi">
        {roastLevels.map((r) => (
          <CheckboxItem
            key={r}
            label={r}
            checked={selectedRoasts.includes(r)}
            onChange={() => toggle(selectedRoasts, r, setSelectedRoasts)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Yöre / Menşei">
        {origins.map((o) => (
          <CheckboxItem
            key={o}
            label={o}
            checked={selectedOrigins.includes(o)}
            onChange={() => toggle(selectedOrigins, o, setSelectedOrigins)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Tat Profili">
        {flavorProfiles.map((f) => (
          <CheckboxItem
            key={f}
            label={f}
            checked={selectedFlavors.includes(f)}
            onChange={() => toggle(selectedFlavors, f, setSelectedFlavors)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Fiyat Aralığı">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(Number(e.target.value))}
              className="w-full h-9 px-2 rounded-lg border border-espresso-200 text-sm text-espresso-700 focus:outline-none focus:border-caramel-400"
              placeholder="Min"
            />
            <span className="text-espresso-300">-</span>
            <input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(Number(e.target.value))}
              className="w-full h-9 px-2 rounded-lg border border-espresso-200 text-sm text-espresso-700 focus:outline-none focus:border-caramel-400"
              placeholder="Max"
            />
          </div>
          <input
            type="range"
            min={0}
            max={500}
            value={priceMax}
            onChange={(e) => setPriceMax(Number(e.target.value))}
            className="w-full accent-caramel-400"
          />
          <p className="text-xs text-espresso-400">{priceMin} TL - {priceMax} TL</p>
        </div>
      </FilterSection>

      <FilterSection title="Stok Durumu">
        <label className="flex items-center justify-between py-1.5 cursor-pointer">
          <span className="text-sm text-espresso-500">Stoktakiler</span>
          <button
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`relative w-10 h-5 rounded-full transition-colors ${inStockOnly ? 'bg-caramel-400' : 'bg-espresso-200'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${inStockOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </label>
        <label className="flex items-center justify-between py-1.5 cursor-pointer">
          <span className="text-sm text-espresso-500">İndirimdekiler</span>
          <button
            onClick={() => setOnSaleOnly(!onSaleOnly)}
            className={`relative w-10 h-5 rounded-full transition-colors ${onSaleOnly ? 'bg-caramel-400' : 'bg-espresso-200'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${onSaleOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </label>
      </FilterSection>
    </div>
  );

  return (
    <div className="max-w-8xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-espresso-400 mb-4">
        <Link to="/" className="hover:text-caramel-600 transition-colors">Ana Sayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-espresso-700 font-medium">{categoryLabel}</span>
        {subcategory && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-espresso-700 font-medium">{subcategory}</span>
          </>
        )}
      </nav>

      {/* Category Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-espresso-800">{categoryLabel}</h1>
        <p className="text-sm text-espresso-500 mt-1">
          {filtered.length} ürün listeleniyor
          {subcategory && ` · ${subcategory} kategorisinde`}
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-40">
            <Sidebar />
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 mb-5 p-3 bg-white rounded-xl border border-espresso-100">
            <button
              onClick={() => setShowFilters(true)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg bg-cream-100 text-sm font-medium text-espresso-600"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtreler
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-caramel-400 text-white text-xs">{activeFilterCount}</span>
              )}
            </button>

            <div className="hidden lg:flex items-center gap-2 text-sm text-espresso-500">
              <span>Sırala:</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="appearance-none pl-3 pr-9 h-9 rounded-lg border border-espresso-200 bg-white text-sm text-espresso-600 font-medium focus:outline-none focus:border-caramel-400 cursor-pointer"
                >
                  <option value="popular">En Çok Satanlar</option>
                  <option value="price-asc">Fiyat (Artan)</option>
                  <option value="price-desc">Fiyat (Azalan)</option>
                  <option value="newest">Yeniler</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso-300 pointer-events-none" />
              </div>

              <div className="hidden sm:flex items-center gap-1 border border-espresso-200 rounded-lg p-0.5">
                <button
                  onClick={() => setGridCols(3)}
                  className={`p-1.5 rounded-md transition-colors ${gridCols === 3 ? 'bg-espresso-700 text-white' : 'text-espresso-300 hover:text-espresso-500'}`}
                >
                  <Grid2x2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridCols(4)}
                  className={`p-1.5 rounded-md transition-colors ${gridCols === 4 ? 'bg-espresso-700 text-white' : 'text-espresso-300 hover:text-espresso-500'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                ...selectedTypes.map((v) => ({ label: v, clear: () => toggle(selectedTypes, v, setSelectedTypes) })),
                ...selectedRoasts.map((v) => ({ label: v, clear: () => toggle(selectedRoasts, v, setSelectedRoasts) })),
                ...selectedOrigins.map((v) => ({ label: v, clear: () => toggle(selectedOrigins, v, setSelectedOrigins) })),
                ...selectedFlavors.map((v) => ({ label: v, clear: () => toggle(selectedFlavors, v, setSelectedFlavors) })),
                ...(inStockOnly ? [{ label: 'Stoktakiler', clear: () => setInStockOnly(false) }] : []),
                ...(onSaleOnly ? [{ label: 'İndirimdekiler', clear: () => setOnSaleOnly(false) }] : []),
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={chip.clear}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-caramel-100 text-caramel-700 text-xs font-medium hover:bg-caramel-200 transition-colors"
                >
                  {chip.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

          {/* Product Grid */}
          {filtered.length > 0 ? (
            <motion.div
              layout
              className={`grid gap-4 ${
                gridCols === 4
                  ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-20">
              <p className="text-lg text-espresso-500 mb-2">Filtrelerinize uygun ürün bulunamadı</p>
              <button onClick={clearAll} className="text-caramel-600 hover:underline text-sm">
                Filtreleri temizle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {showFilters && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-cream-50 overflow-y-auto p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-espresso-800">Filtreler</p>
              <button onClick={() => setShowFilters(false)} className="p-2 text-espresso-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar />
            <button
              onClick={() => setShowFilters(false)}
              className="w-full h-11 mt-4 rounded-xl bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm transition-colors"
            >
              {filtered.length} Ürünü Göster
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

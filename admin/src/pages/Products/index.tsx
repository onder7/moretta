import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

interface Variant {
  id: string;
  sku: string;
  price: number;
  stockQty: number;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  category: { id: string; name: string };
  brand?: { id: string; name: string };
  images: { url: string }[];
  variants: Variant[];
  _count: { reviews: number };
}

interface ProductsData {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

interface FilterOption { id: string; name: string }

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

export default function Products() {
  const [data, setData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ success: boolean; data: FilterOption[] }>('/admin/categories'),
      api.get<{ success: boolean; data: FilterOption[] }>('/admin/brands'),
    ]).then(([c, b]) => {
      setCategories(c.data ?? []);
      setBrands(b.data ?? []);
    }).catch(console.error);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (categoryFilter) params.set('categoryId', categoryFilter);
    if (brandFilter) params.set('brandId', brandFilter);
    api.get<{ success: boolean; data: ProductsData }>(`/admin/products?${params}`)
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, categoryFilter, brandFilter]);

  useEffect(() => { load(); }, [load]);

  async function deleteProduct(id: string) {
    setDeleting(id);
    try {
      await api.delete(`/admin/products/${id}`);
      setShowConfirm(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silme hatası');
    } finally {
      setDeleting(null);
    }
  }

  async function toggleFeatured(product: Product) {
    try {
      await api.put(`/admin/products/${product.id}`, { isFeatured: !product.isFeatured });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Hata');
    }
  }

  async function toggleActive(product: Product) {
    try {
      await api.put(`/admin/products/${product.id}`, { isActive: !product.isActive });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Hata');
    }
  }

  const minPrice = (p: Product) =>
    p.variants.length > 0 ? Math.min(...p.variants.map((v) => v.price)) : 0;

  const totalStock = (p: Product) =>
    p.variants.reduce((s, v) => s + v.stockQty, 0);

  return (
    <div>
      {/* Silme onay modalı */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Ürünü Sil</h3>
            <p className="text-sm text-gray-500 mb-5">
              Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(null)}
                className="px-4 py-2 rounded border border-stroke text-sm hover:bg-gray-50">
                İptal
              </button>
              <button onClick={() => deleteProduct(showConfirm)} disabled={deleting === showConfirm}
                className="px-4 py-2 rounded bg-meta-1 text-white text-sm hover:bg-opacity-90 disabled:opacity-50">
                {deleting === showConfirm ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Başlık */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">Ürün Yönetimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} ürün</p>
        </div>
        <Link
          to="/products/new"
          className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 transition"
        >
          <span className="text-lg leading-none">+</span>
          Yeni Ürün
        </Link>
      </div>

      {/* Arama & Filtreler */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setSearch(searchInput), setPage(1))}
          placeholder="Ürün adı veya slug..."
          className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark dark:text-white w-56"
        />
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark dark:text-white"
        >
          <option value="">Tüm Kategoriler</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={brandFilter}
          onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }}
          className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark dark:text-white"
        >
          <option value="">Tüm Markalar</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button
          onClick={() => { setSearch(searchInput); setPage(1); }}
          className="rounded bg-primary px-4 py-2 text-sm text-white hover:bg-opacity-90"
        >
          Ara
        </button>
        {(search || categoryFilter || brandFilter) && (
          <button
            onClick={() => { setSearch(''); setSearchInput(''); setCategoryFilter(''); setBrandFilter(''); setPage(1); }}
            className="rounded border border-stroke px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-meta-4"
          >
            Filtreleri Temizle
          </button>
        )}
      </div>

      {/* Tablo */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark bg-gray-2 dark:bg-meta-4">
                  <th className="px-4 py-4 text-left font-medium text-gray-600 w-16">Görsel</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Ürün</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Fiyat</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Stok</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Yorum</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Öne Çıkan</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Aktif</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {data?.products.map((p) => (
                  <tr key={p.id} className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/30">
                    <td className="px-4 py-3">
                      {p.images[0] ? (
                        <img src={p.images[0].url} alt={p.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center text-gray-300 text-xs">?</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-black dark:text-white max-w-xs truncate">{p.name}</div>
                      <div className="text-xs text-gray-500">
                        {p.category.name}{p.brand ? ` · ${p.brand.name}` : ''}
                        <span className="ml-2 text-gray-300">/{p.slug}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{fmt(minPrice(p))}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`font-medium ${
                          totalStock(p) === 0 ? 'text-meta-1' : totalStock(p) < 5 ? 'text-yellow-600' : 'text-meta-3'
                        }`}>
                          Toplam: {totalStock(p)}
                        </span>
                        <div className="text-xs space-y-0.5">
                          {p.variants.map((v) => (
                            <div key={v.id} className="flex items-center gap-2">
                              <span className="text-gray-500 w-14 truncate" title={v.sku}>{v.sku}:</span>
                              {/* Stok salt-okunur — düzenleme yalnızca Stok Yönetimi'nden */}
                              <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-meta-4 rounded text-gray-700 dark:text-gray-300">
                                {v.stockQty}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{p._count.reviews}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleFeatured(p)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition ${
                          p.isFeatured ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {p.isFeatured ? '★ Evet' : '☆ Hayır'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition ${
                          p.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {p.isActive ? 'Aktif' : 'Pasif'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/products/${p.id}`}
                          className="px-3 py-1 rounded bg-blue-50 text-blue-700 text-xs hover:bg-blue-100 transition"
                        >
                          Düzenle
                        </Link>
                        <button
                          onClick={() => setShowConfirm(p.id)}
                          className="px-3 py-1 rounded bg-red-50 text-meta-1 text-xs hover:bg-red-100 transition"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data?.products.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">Ürün bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-stroke dark:border-strokedark">
            <span className="text-sm text-gray-500">{data.total} ürün</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded border border-stroke text-sm disabled:opacity-40 hover:bg-gray-50">
                Önceki
              </button>
              <span className="px-3 py-1 text-sm">{page} / {data.totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
                className="px-3 py-1 rounded border border-stroke text-sm disabled:opacity-40 hover:bg-gray-50">
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';

interface StockItem {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  stockQty: number;
  price: number;
  categoryName: string;
  status: 'kritik' | 'düşük' | 'normal';
}

interface StockMovement {
  id: string;
  sku: string;
  oldQty: number;
  newQty: number;
  difference: number;
  reason: string;
  createdAt: string;
}

interface ApiResponse {
  stocks: StockItem[];
  movements: StockMovement[];
}

const fmt = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });

export default function StockManagement() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'tümü' | 'kritik' | 'düşük' | 'normal'>('tümü');
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState<string>('');
  const [updatingVariant, setUpdatingVariant] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get<ApiResponse>('/admin/stock-management')
      .then((r) => setData(r))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStock(variantId: string, newQty: number) {
    if (newQty < 0) return alert('Stok negatif olamaz');
    setUpdatingVariant(variantId);
    try {
      await api.patch(`/admin/variants/${variantId}/stock`, { newQty });
      setEditingVariant(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Stok güncellemesi hatası');
    } finally {
      setUpdatingVariant(null);
    }
  }

  const stocks = data?.stocks ?? [];
  const movements = data?.movements ?? [];

  const filteredStocks = filter === 'tümü'
    ? stocks
    : stocks.filter((s) => s.status === filter);

  const kritikCount = stocks.filter((s) => s.status === 'kritik').length;
  const düşükCount = stocks.filter((s) => s.status === 'düşük').length;

  const getStatusColor = (status: string) => {
    if (status === 'kritik') return 'bg-red-100 text-red-800';
    if (status === 'düşük') return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'kritik') return '🔴 KRİTİK';
    if (status === 'düşük') return '🟡 DÜŞÜK';
    return '🟢 NORMAL';
  };

  return (
    <div>
      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Toplam Ürün</p>
              <h3 className="text-2xl font-bold text-black dark:text-white">{stocks.length}</h3>
            </div>
            <div className="text-4xl text-primary opacity-20">📦</div>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Kritik Stok</p>
              <h3 className="text-2xl font-bold text-red-600">{kritikCount}</h3>
            </div>
            <div className="text-4xl opacity-20">🔴</div>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Düşük Stok</p>
              <h3 className="text-2xl font-bold text-yellow-600">{düşükCount}</h3>
            </div>
            <div className="text-4xl opacity-20">🟡</div>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Son Değişiklik</p>
              <h3 className="text-lg font-bold text-black dark:text-white">
                {movements[0] ? new Date(movements[0].createdAt).toLocaleDateString('tr-TR') : '-'}
              </h3>
            </div>
            <div className="text-4xl opacity-20">📊</div>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(['tümü', 'kritik', 'düşük', 'normal'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-meta-4 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {f === 'tümü' && 'Tümü'}
            {f === 'kritik' && `Kritik (${kritikCount})`}
            {f === 'düşük' && `Düşük (${düşükCount})`}
            {f === 'normal' && `Normal (${stocks.filter((s) => s.status === 'normal').length})`}
          </button>
        ))}
      </div>

      {/* Stok Tablosu */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="px-5 py-4 border-b border-stroke dark:border-strokedark">
          <h3 className="text-lg font-semibold text-black dark:text-white">Stok Durumu</h3>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark bg-gray-2 dark:bg-meta-4">
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Ürün</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">SKU</th>
                  <th className="px-4 py-4 text-center font-medium text-gray-600">Stok</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Fiyat</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Kategori</th>
                  <th className="px-4 py-4 text-center font-medium text-gray-600">Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((item) => (
                  <tr key={item.variantId} className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/30">
                    <td className="px-4 py-3 font-medium text-black dark:text-white max-w-xs truncate">
                      {item.productName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.sku}</td>
                    <td className="px-4 py-3 text-center">
                      {editingVariant === item.variantId ? (
                        <input
                          autoFocus
                          type="number"
                          min="0"
                          value={editingStock}
                          onChange={(e) => setEditingStock(e.target.value)}
                          onBlur={() => updateStock(item.variantId, Number(editingStock))}
                          onKeyDown={(e) => e.key === 'Enter' && updateStock(item.variantId, Number(editingStock))}
                          className="w-16 rounded border border-primary bg-transparent px-2 py-1 text-center text-sm"
                          disabled={updatingVariant === item.variantId}
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingVariant(item.variantId);
                            setEditingStock(String(item.stockQty));
                          }}
                          className="px-3 py-1 bg-gray-100 dark:bg-meta-4 rounded hover:bg-gray-200 dark:hover:bg-meta-4/80 transition cursor-pointer font-medium"
                        >
                          {item.stockQty}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">{fmt(item.price)}</td>
                    <td className="px-4 py-3 text-gray-600">{item.categoryName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredStocks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      {filter === 'tümü' ? 'Ürün bulunamadı.' : `${filter} stoklu ürün yok.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stok Hareketi Logu */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="px-5 py-4 border-b border-stroke dark:border-strokedark">
          <h3 className="text-lg font-semibold text-black dark:text-white">Son Stok Hareketleri</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stroke dark:border-strokedark bg-gray-2 dark:bg-meta-4">
                <th className="px-4 py-4 text-left font-medium text-gray-600">SKU</th>
                <th className="px-4 py-4 text-center font-medium text-gray-600">Eski</th>
                <th className="px-4 py-4 text-center font-medium text-gray-600">Yeni</th>
                <th className="px-4 py-4 text-center font-medium text-gray-600">Değişim</th>
                <th className="px-4 py-4 text-left font-medium text-gray-600">Sebep</th>
                <th className="px-4 py-4 text-left font-medium text-gray-600">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {movements.slice(0, 20).map((m) => (
                <tr key={m.id} className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/30">
                  <td className="px-4 py-3 font-medium text-black dark:text-white">{m.sku}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{m.oldQty}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{m.newQty}</td>
                  <td className={`px-4 py-3 text-center font-medium ${m.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {m.difference > 0 ? '+' : ''}{m.difference}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {m.reason === 'admin_update' && 'Admin Güncellemesi'}
                    {m.reason === 'order_placed' && 'Sipariş Verildi'}
                    {m.reason === 'order_cancelled' && 'Sipariş İptal'}
                    {m.reason === 'adjustment' && 'Ayarlama'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {new Date(m.createdAt).toLocaleString('tr-TR')}
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Stok hareketi bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {movements.length > 20 && (
          <div className="px-5 py-3 border-t border-stroke dark:border-strokedark text-center text-sm text-gray-500">
            Son 20 hareket gösterilmektedir
          </div>
        )}
      </div>
    </div>
  );
}

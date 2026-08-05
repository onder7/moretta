import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  user: { email: string; profile?: { firstName?: string; lastName?: string } };
  address: { city: string; district: string };
  items: { quantity: number; unitPrice: number }[];
  payment?: { status: string };
}

interface OrdersData {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUSES = ['', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Bekliyor',     color: 'bg-yellow-100 text-yellow-800' },
  PROCESSING: { label: 'Hazırlanıyor', color: 'bg-blue-100 text-blue-800' },
  SHIPPED:    { label: 'Kargoda',      color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED:  { label: 'Teslim',       color: 'bg-green-100 text-green-800' },
  CANCELLED:  { label: 'İptal',        color: 'bg-red-100 text-red-800' },
  REFUNDED:   { label: 'İade',         color: 'bg-gray-100 text-gray-800' },
};

const PAYMENT_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'Bekliyor',  color: 'bg-yellow-100 text-yellow-800' },
  SUCCESS:  { label: 'Ödendi',    color: 'bg-green-100 text-green-800' },
  FAILED:   { label: 'Başarısız', color: 'bg-red-100 text-red-800' },
  REFUNDED: { label: 'İade',      color: 'bg-gray-100 text-gray-600' },
};

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

export default function Orders() {
  const [data, setData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    api.get<{ success: boolean; data: OrdersData }>(`/admin/orders?${params}`)
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const totalItems = (o: Order) => o.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">Sipariş Yönetimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} sipariş</p>
        </div>
        <Link
          to="/orders/manual"
          className="inline-flex items-center gap-1 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
        >
          + Manuel Satış
        </Link>
      </div>

      {/* Filtreler */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark dark:text-white"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s ? STATUS_LABEL[s]?.label : 'Tüm Durumlar'}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setSearch(searchInput), setPage(1))}
            placeholder="Sipariş ID veya email..."
            className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark dark:text-white w-56"
          />
          <button
            onClick={() => { setSearch(searchInput); setPage(1); }}
            className="rounded bg-primary px-4 py-2 text-sm text-white hover:bg-opacity-90"
          >
            Ara
          </button>
          {search && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
              className="rounded border border-stroke px-4 py-2 text-sm hover:bg-gray-50"
            >
              Temizle
            </button>
          )}
        </div>
      </div>

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
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Sipariş No</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Müşteri</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Ürün</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Tutar</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Ödeme</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Şehir</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Durum</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">Tarih</th>
                  <th className="px-4 py-4 text-left font-medium text-gray-600">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {data?.orders.map((order) => {
                  const st = STATUS_LABEL[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-600' };
                  const pay = order.payment ? (PAYMENT_LABEL[order.payment.status] ?? { label: order.payment.status, color: 'bg-gray-100 text-gray-600' }) : null;
                  const name = order.user.profile?.firstName
                    ? `${order.user.profile.firstName} ${order.user.profile.lastName ?? ''}`.trim()
                    : order.user.email;
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/30"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        #{order.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-black dark:text-white max-w-[160px] truncate">{name}</div>
                        <div className="text-xs text-gray-500 max-w-[160px] truncate">{order.user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-center">
                        {totalItems(order)} adet
                      </td>
                      <td className="px-4 py-3 font-medium">{fmt(order.total)}</td>
                      <td className="px-4 py-3">
                        {pay ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pay.color}`}>{pay.label}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{order.address.city}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/orders/${order.id}`}
                          className="px-3 py-1 rounded bg-primary/10 text-primary text-xs hover:bg-primary/20 transition"
                        >
                          Detay
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {data?.orders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">Sipariş bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Sayfalama */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-stroke dark:border-strokedark">
            <span className="text-sm text-gray-500">{data.total} sipariş</span>
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

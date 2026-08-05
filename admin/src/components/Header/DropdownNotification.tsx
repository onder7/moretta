import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

interface OrderNotif {
  id: string;
  status: string;
  total: number | string;
  createdAt: string;
  user: {
    email: string;
    profile?: { firstName?: string; lastName?: string } | null;
  };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins}dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa önce`;
  return `${Math.floor(hours / 24)}g önce`;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: 'Bekliyor',  cls: 'bg-amber-100 text-amber-700' },
  PROCESSING: { label: 'İşleniyor', cls: 'bg-blue-100 text-blue-700' },
  SHIPPED:    { label: 'Kargoda',   cls: 'bg-indigo-100 text-indigo-700' },
  DELIVERED:  { label: 'Teslim',    cls: 'bg-green-100 text-green-700' },
  CANCELLED:  { label: 'İptal',     cls: 'bg-red-100 text-red-700' },
  REFUNDED:   { label: 'İade',      cls: 'bg-gray-100 text-gray-600' },
};

const DropdownNotification = () => {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<OrderNotif[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchData = () => {
    api
      .get<{ success: boolean; data: { orders: OrderNotif[]; pendingCount: number } }>('/admin/new-orders')
      .then((r) => {
        setOrders(r.data.orders);
        setPendingCount(r.data.pendingCount);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const customerName = (o: OrderNotif) => {
    const p = o.user.profile;
    if (p?.firstName) return `${p.firstName} ${p.lastName ?? ''}`.trim();
    return o.user.email;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-stroke bg-gray hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
      >
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 right-0 z-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-meta-1 px-0.5 text-[9px] font-bold text-white">
            {pendingCount > 99 ? '99+' : pendingCount}
            <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75" />
          </span>
        )}
        <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M16.1999 14.9343L15.6374 14.0624C15.5249 13.8937 15.4687 13.7249 15.4687 13.528V7.67803C15.4687 6.01865 14.7655 4.47178 13.4718 3.31865C12.4312 2.39053 11.0812 1.7999 9.64678 1.6874V1.1249C9.64678 0.787402 9.36553 0.478027 8.9999 0.478027C8.6624 0.478027 8.35303 0.759277 8.35303 1.1249V1.65928C8.29678 1.65928 8.24053 1.65928 8.18428 1.6874C4.92178 2.05303 2.4749 4.66865 2.4749 7.79053V13.528C2.44678 13.8093 2.39053 13.9499 2.33428 14.0343L1.7999 14.9343C1.63115 15.2155 1.63115 15.553 1.7999 15.8343C1.96865 16.0874 2.2499 16.2562 2.55928 16.2562H8.38115V16.8749C8.38115 17.2124 8.6624 17.5218 9.02803 17.5218C9.36553 17.5218 9.6749 17.2405 9.6749 16.8749V16.2562H15.4687C15.778 16.2562 16.0593 16.0874 16.228 15.8343C16.3968 15.553 16.3968 15.2155 16.1999 14.9343ZM3.23428 14.9905L3.43115 14.653C3.5999 14.3718 3.68428 14.0343 3.74053 13.6405V7.79053C3.74053 5.31553 5.70928 3.23428 8.3249 2.95303C9.92803 2.78428 11.503 3.2624 12.6562 4.2749C13.6687 5.1749 14.2312 6.38428 14.2312 7.67803V13.528C14.2312 13.9499 14.3437 14.3437 14.5968 14.7374L14.7655 14.9905H3.23428Z" fill="" />
        </svg>
      </button>

      {open && (
        <div className="absolute -right-4 sm:right-0 mt-2.5 w-80 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark z-50">
          <div className="flex items-center justify-between px-4.5 py-3 border-b border-stroke dark:border-strokedark">
            <h5 className="text-sm font-semibold text-black dark:text-white">Sipariş Bildirimleri</h5>
            {pendingCount > 0 && (
              <span className="rounded-full bg-meta-1/10 px-2 py-0.5 text-xs font-medium text-meta-1">
                {pendingCount} bekliyor
              </span>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-stroke dark:divide-strokedark">
            {orders.length === 0 ? (
              <li className="px-4.5 py-6 text-center text-sm text-gray-400">
                Son 48 saatte sipariş yok
              </li>
            ) : (
              orders.map((o) => {
                const st = STATUS_LABELS[o.status] ?? { label: o.status, cls: 'bg-gray-100 text-gray-600' };
                return (
                  <li key={o.id}>
                    <Link
                      to={`/orders/${o.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4.5 py-3 hover:bg-gray-2 dark:hover:bg-meta-4"
                    >
                      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                          <path d="M6 2v6l2-2 2 2V2h4v6l2-2 2 2V2h2v20H4V2h2zm0 9v9h12v-9H6zm2 2h8v2H8v-2zm0 3h5v2H8v-2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-black dark:text-white truncate">
                            #{o.id.slice(-8).toUpperCase()}
                          </span>
                          <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${st.cls}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 truncate">{customerName(o)}</p>
                        <div className="mt-0.5 flex items-center justify-between">
                          <span className="text-xs font-medium text-primary">
                            ₺{Number(o.total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-gray-400">{timeAgo(o.createdAt)}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>

          <div className="border-t border-stroke dark:border-strokedark">
            <Link
              to="/orders"
              onClick={() => setOpen(false)}
              className="block px-4.5 py-3 text-center text-sm text-primary hover:bg-gray-2 dark:hover:bg-meta-4 font-medium"
            >
              Tüm Siparişleri Gör
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropdownNotification;

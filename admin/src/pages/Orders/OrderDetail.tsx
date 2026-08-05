import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderDetail {
  id: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  notes?: string;
  createdAt: string;
  user: {
    email: string;
    profile?: { firstName?: string; lastName?: string; phone?: string };
  };
  address: {
    title: string;
    firstName: string;
    lastName: string;
    phone: string;
    city: string;
    district: string;
    postalCode?: string;
    address: string;
  };
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    variant: {
      sku: string;
      attributes: Record<string, string>;
      product: {
        name: string;
        images: { url: string }[];
      };
    };
  }[];
  statusHistory: {
    id: string;
    status: string;
    note?: string;
    createdAt: string;
  }[];
  payment?: {
    provider: string;
    amount: number;
    status: string;
    transactionId?: string;
  };
  shipping?: {
    carrier?: string;
    trackingNumber?: string;
    status: string;
    estimatedAt?: string;
  };
}

interface Props {
  orderId: string;
  onClose: () => void;
  onUpdated: () => void;
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

const STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Bekliyor',     color: 'bg-yellow-100 text-yellow-800' },
  PROCESSING: { label: 'Hazırlanıyor', color: 'bg-blue-100 text-blue-800' },
  SHIPPED:    { label: 'Kargoda',      color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED:  { label: 'Teslim',       color: 'bg-green-100 text-green-800' },
  CANCELLED:  { label: 'İptal',        color: 'bg-red-100 text-red-800' },
  REFUNDED:   { label: 'İade',         color: 'bg-gray-100 text-gray-800' },
};

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'Bekliyor',   color: 'bg-yellow-100 text-yellow-800' },
  SUCCESS:  { label: 'Başarılı',   color: 'bg-green-100 text-green-800' },
  FAILED:   { label: 'Başarısız',  color: 'bg-red-100 text-red-800' },
  REFUNDED: { label: 'İade',       color: 'bg-gray-100 text-gray-600' },
};

function fmt(n: number) {
  return Number(n).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderDetail({ orderId, onClose, onUpdated }: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingUpdating, setShippingUpdating] = useState(false);
  const [shippingSuccess, setShippingSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<{ success: boolean; data: OrderDetail }>(`/admin/orders/${orderId}`)
      .then((r) => {
        setOrder(r.data);
        setNewStatus(r.data.status);
        setCarrier(r.data.shipping?.carrier ?? '');
        setTrackingNumber(r.data.shipping?.trackingNumber ?? '');
      })
      .catch(() => setError('Sipariş yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function handleUpdateStatus() {
    if (!order || newStatus === order.status && !note.trim()) return;
    setUpdating(true);
    setError('');
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: newStatus, note: note.trim() || undefined });
      setNote('');
      // Reload detail
      const r = await api.get<{ success: boolean; data: OrderDetail }>(`/admin/orders/${orderId}`);
      setOrder(r.data);
      setNewStatus(r.data.status);
      setCarrier(r.data.shipping?.carrier ?? '');
      setTrackingNumber(r.data.shipping?.trackingNumber ?? '');
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Güncelleme hatası');
    } finally {
      setUpdating(false);
    }
  }

  async function handleUpdateShipping() {
    setShippingUpdating(true);
    setError('');
    setShippingSuccess(false);
    try {
      const r = await api.put<{ success: boolean; data: OrderDetail['shipping'] }>(
        `/admin/orders/${orderId}/shipping`,
        { carrier: carrier.trim() || undefined, trackingNumber: trackingNumber.trim() || undefined },
      );
      setOrder((prev) => prev ? { ...prev, shipping: r.data } : prev);
      setShippingSuccess(true);
      setTimeout(() => setShippingSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kargo güncelleme hatası');
    } finally {
      setShippingUpdating(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-2xl bg-white dark:bg-boxdark shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stroke dark:border-strokedark shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-white">
              Sipariş #{order?.id.slice(-8).toUpperCase() ?? '...'}
            </h2>
            {order && (
              <p className="text-xs text-gray-500 mt-0.5">{fmtDate(order.createdAt)}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {order && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_LABEL[order.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABEL[order.status]?.label ?? order.status}
              </span>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : error && !order ? (
          <div className="flex-1 flex items-center justify-center text-meta-1 text-sm">{error}</div>
        ) : order ? (
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-6">

              {error && (
                <div className="rounded bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">{error}</div>
              )}

              {/* ── Müşteri & Adres ── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-stroke dark:border-strokedark p-4">
                  <h3 className={sectionTitle}>Müşteri</h3>
                  <p className="text-sm font-medium text-black dark:text-white">
                    {order.user.profile?.firstName
                      ? `${order.user.profile.firstName} ${order.user.profile.lastName ?? ''}`.trim()
                      : order.user.email}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{order.user.email}</p>
                  {order.user.profile?.phone && (
                    <p className="text-xs text-gray-500">{order.user.profile.phone}</p>
                  )}
                </div>

                <div className="rounded-lg border border-stroke dark:border-strokedark p-4">
                  <h3 className={sectionTitle}>Teslimat Adresi</h3>
                  <p className="text-sm font-medium text-black dark:text-white">
                    {order.address.firstName} {order.address.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{order.address.phone}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {order.address.address}, {order.address.district}, {order.address.city}
                    {order.address.postalCode ? ` ${order.address.postalCode}` : ''}
                  </p>
                </div>
              </div>

              {/* ── Ürünler ── */}
              <div>
                <h3 className={sectionTitle}>Ürünler</h3>
                <div className="rounded-lg border border-stroke dark:border-strokedark overflow-hidden">
                  {order.items.map((item, i) => {
                    const img = item.variant.product.images[0]?.url;
                    const attrs = Object.entries(item.variant.attributes ?? {});
                    return (
                      <div key={item.id}
                        className={`flex items-center gap-3 px-4 py-3 ${i < order.items.length - 1 ? 'border-b border-stroke dark:border-strokedark' : ''}`}
                      >
                        {img ? (
                          <img src={img} alt={item.variant.product.name}
                            className="h-12 w-12 rounded object-cover shrink-0 bg-gray-100" />
                        ) : (
                          <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center text-gray-300 text-xs shrink-0">?</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black dark:text-white truncate">
                            {item.variant.product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            SKU: {item.variant.sku}
                            {attrs.length > 0 && ` · ${attrs.map(([k, v]) => `${k}: ${v}`).join(', ')}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-black dark:text-white">
                            {item.quantity} × {fmt(Number(item.unitPrice))}
                          </p>
                          <p className="text-xs text-gray-500">{fmt(item.quantity * Number(item.unitPrice))}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Fiyat özeti */}
                <div className="mt-3 rounded-lg border border-stroke dark:border-strokedark p-4 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Ara Toplam</span><span>{fmt(Number(order.subtotal))}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Kargo</span>
                    <span>{Number(order.shippingFee) === 0 ? 'Ücretsiz' : fmt(Number(order.shippingFee))}</span>
                  </div>
                  {Number(order.discount) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>İndirim</span><span>-{fmt(Number(order.discount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-semibold text-black dark:text-white border-t border-stroke dark:border-strokedark pt-1.5">
                    <span>Toplam</span><span>{fmt(Number(order.total))}</span>
                  </div>
                </div>
              </div>

              {/* ── Ödeme & Kargo ── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-stroke dark:border-strokedark p-4">
                  <h3 className={sectionTitle}>Ödeme</h3>
                  {order.payment ? (
                    <>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS[order.payment.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                          {PAYMENT_STATUS[order.payment.status]?.label ?? order.payment.status}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{order.payment.provider}</span>
                      </div>
                      <p className="text-sm font-medium text-black dark:text-white mt-1">{fmt(Number(order.payment.amount))}</p>
                      {order.payment.transactionId && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{order.payment.transactionId}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Ödeme kaydı yok</p>
                  )}
                </div>

                <div className="rounded-lg border border-stroke dark:border-strokedark p-4">
                  <h3 className={sectionTitle}>Kargo</h3>
                  {order.shipping ? (
                    <>
                      <p className="text-sm text-black dark:text-white">
                        {order.shipping.carrier ?? 'Belirtilmemiş'}
                      </p>
                      {order.shipping.trackingNumber && (
                        <p className="text-xs font-mono text-gray-500 mt-0.5">
                          Takip: {order.shipping.trackingNumber}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">
                        Durum: {order.shipping.status}
                      </p>
                      {order.shipping.estimatedAt && (
                        <p className="text-xs text-gray-400">
                          Tahmini: {new Date(order.shipping.estimatedAt).toLocaleDateString('tr-TR')}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Kargo bilgisi yok</p>
                  )}
                </div>
              </div>

              {/* ── Müşteri Notu ── */}
              {order.notes && (
                <div className="rounded-lg border border-stroke dark:border-strokedark p-4">
                  <h3 className={sectionTitle}>Müşteri Notu</h3>
                  <p className="text-sm text-gray-600 mt-1">{order.notes}</p>
                </div>
              )}

              {/* ── Durum Geçmişi ── */}
              {order.statusHistory.length > 0 && (
                <div>
                  <h3 className={sectionTitle}>Durum Geçmişi</h3>
                  <div className="mt-2 space-y-0">
                    {order.statusHistory.map((log, i) => {
                      const st = STATUS_LABEL[log.status] ?? { label: log.status, color: 'bg-gray-100 text-gray-600' };
                      return (
                        <div key={log.id} className="flex gap-3">
                          {/* Timeline line */}
                          <div className="flex flex-col items-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1 shrink-0" />
                            {i < order.statusHistory.length - 1 && (
                              <div className="w-px flex-1 bg-stroke dark:bg-strokedark my-1" />
                            )}
                          </div>
                          <div className="pb-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                                {st.label}
                              </span>
                              <span className="text-xs text-gray-400">{fmtDate(log.createdAt)}</span>
                            </div>
                            {log.note && (
                              <p className="text-xs text-gray-500 mt-0.5">{log.note}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* ── Kargo Bilgileri (sticky bottom) ── */}
            {order.shipping && (
              <div className="px-6 pb-0 pt-4 border-t border-stroke dark:border-strokedark space-y-3">
                <h3 className="text-sm font-semibold text-black dark:text-white">Kargo Bilgileri</h3>
                {shippingSuccess && (
                  <div className="rounded bg-green-50 border border-green-200 text-green-700 px-3 py-2 text-xs">
                    Kargo bilgileri kaydedildi.
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="Kargo firması (ör. MNG, Yurtiçi)"
                    className="flex-1 rounded border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:text-white"
                  />
                  <input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Takip numarası"
                    className="flex-1 rounded border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:text-white"
                  />
                  <button
                    onClick={handleUpdateShipping}
                    disabled={shippingUpdating}
                    className="px-5 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 shrink-0"
                  >
                    {shippingUpdating ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Durum Güncelle (sticky bottom) ── */}
            <div className="sticky bottom-0 border-t border-stroke dark:border-strokedark bg-white dark:bg-boxdark px-6 py-4 space-y-3">
              <h3 className="text-sm font-semibold text-black dark:text-white">Durum Güncelle</h3>
              <div className="flex gap-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-meta-4 dark:text-white"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]?.label}</option>
                  ))}
                </select>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Not (isteğe bağlı)"
                  className="flex-1 rounded border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:text-white"
                />
                <button
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className="px-5 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 shrink-0"
                >
                  {updating ? 'Kaydediliyor...' : 'Güncelle'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sectionTitle = 'text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2';

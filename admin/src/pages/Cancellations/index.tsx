import { useState, useEffect } from 'react';
import { api, API_BASE, getToken } from '../../lib/api';
import { BsChevronRight, BsCheckLg, BsXLg } from 'react-icons/bs';

interface Cancellation {
  id: string;
  orderId: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  reason: string;
  description?: string;
  refundAmount?: string;
  adminNotes?: string;
  couponOffered?: boolean;
  couponCode?: string;
  couponValue?: string;
  requestedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  refundedAt?: string;
  order: {
    id: string;
    total: string;
    createdAt: string;
    user: {
      id: string;
      email: string;
      profile?: { firstName?: string; lastName?: string };
    };
  };
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-green-100 text-green-800',
};

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Talep Alındı',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
  REFUNDED: 'Tamamlandı',
};

const REASON_LABELS: Record<string, string> = {
  CHANGED_MIND: 'Siparişten Vazgeçtim',
  DELIVERY_TIME_LONG: 'Teslimat Süresi Çok Uzun',
  BETTER_PRICE_FOUND: 'Başka Platformda Daha Uygun Fiyat',
  PRODUCT_INFO_ERROR: 'Ürün Bilgilerinde Hata/Eksiklik',
  OTHER: 'Diğer',
};

function CancellationDetail({ cancellation, onClose, onSuccess }: { cancellation: Cancellation; onClose: () => void; onSuccess: () => void }) {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [refunding, setRefunding] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.put(`/checkout/admin/cancellations/${cancellation.id}/approve`, {
        adminNotes: approvalNotes,
      });
      alert('İptal onaylandı');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await api.put(`/checkout/admin/cancellations/${cancellation.id}/reject`, { reason: rejectionReason });
      alert('İptal reddedildi');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu');
    } finally {
      setRejecting(false);
    }
  };

  const handleRefund = async () => {
    setRefunding(true);
    try {
      await api.post(`/checkout/admin/cancellations/${cancellation.id}/refund`, {});
      alert('İade işlemi tamamlandı');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu');
    } finally {
      setRefunding(false);
    }
  };

  const handleUnreject = async () => {
    if (!confirm('Reddi iptal etmek istediğinizden emin misiniz? Müşteri yeni talep gönderebilecek.')) return;
    setRejecting(true);
    try {
      await api.delete(`/checkout/admin/cancellations/${cancellation.id}/unreject`);
      alert('İptal reddi iptal edildi');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[500px] bg-white shadow-xl z-50 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b bg-white">
          <div className="flex-1">
            <h2 className="text-lg font-bold">İptal Talebi: #{cancellation.orderId.slice(-8).toUpperCase()}</h2>
            <p className="text-sm text-gray-600 mt-1">{cancellation.order.user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0">
            <BsXLg className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Durum</label>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[cancellation.status]}`}>
              {STATUS_LABELS[cancellation.status]}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">İptal Nedeni</label>
              <p className="text-sm text-gray-700">{REASON_LABELS[cancellation.reason] || cancellation.reason}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">İade Tutarı</label>
              <p className="text-sm font-mono text-gray-700">{cancellation.refundAmount} TRY</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Talep Tarihi</label>
              <p className="text-sm text-gray-700">{new Date(cancellation.requestedAt).toLocaleDateString('tr-TR')}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Sipariş Tarihi</label>
              <p className="text-sm text-gray-700">{new Date(cancellation.order.createdAt).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>

          {/* Description */}
          {cancellation.description && (
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Açıklama</label>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{cancellation.description}</p>
            </div>
          )}

          {/* Admin Notes */}
          {cancellation.adminNotes && (
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Yönetici Notları</label>
              <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded border border-blue-200">{cancellation.adminNotes}</p>
            </div>
          )}

          {/* Actions */}
          {cancellation.status === 'REQUESTED' && (
            <div className="border-t pt-6 space-y-4">
              <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border">
                Onaylandığında sipariş iptal edilir, stok geri yüklenir ve müşteriye{' '}
                <span className="font-semibold">{cancellation.refundAmount} TRY</span> iade edilir.
              </div>

              {/* Admin Notes */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Notlar (İsteğe Bağlı)</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Onay işlemi hakkında notlar..."
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary"
                  rows={2}
                />
              </div>

              {/* Approve Button */}
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <BsCheckLg className="h-4 w-4" />
                  {approving ? 'İşleniyor...' : 'Onayla'}
                </button>
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-semibold text-gray-700 block mb-2">Reddetme Sebebi (İsteğe Bağlı)</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Neden reddettiğinizi açıklayın..."
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary"
                  rows={3}
                />
              </div>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <BsXLg className="h-4 w-4" />
                {rejecting ? 'İşleniyor...' : 'Reddet'}
              </button>
            </div>
          )}

          {cancellation.status === 'APPROVED' && (
            <div className="border-t pt-6">
              <button
                onClick={handleRefund}
                disabled={refunding}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {refunding ? 'İşleniyor...' : 'İadeyi Gönder'}
              </button>
            </div>
          )}

          {cancellation.status === 'REJECTED' && (
            <div className="border-t pt-6">
              <button
                onClick={handleUnreject}
                disabled={rejecting}
                className="w-full bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {rejecting ? 'İşleniyor...' : 'Reddi İptal Et'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── İade (Return) ────────────────────────────────────────────────────────────

interface ReturnRow {
  id: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  reason: string;
  description?: string | null;
  refundAmount?: string | null;
  adminNotes?: string | null;
  requestedAt: string;
  deliveryNo?: string | null;
  trackingNumber?: string | null;
  hasLabel?: boolean;
  items: Array<{
    id: string;
    quantity: number;
    orderItem: { id: string; unitPrice: string; variant?: { product?: { name?: string } } };
  }>;
  order: { id: string; status: string; total: string; createdAt: string };
  user: { id: string; email: string; profile?: { firstName?: string; lastName?: string } };
}

const RETURN_STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};
const RETURN_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Talep Alındı',
  APPROVED: 'Onaylandı (İade edildi)',
  REJECTED: 'Reddedildi',
};
const RETURN_REASON_LABELS: Record<string, string> = {
  DEFECTIVE: 'Ürün kusurlu / arızalı',
  WRONG_ITEM: 'Yanlış ürün geldi',
  NOT_AS_DESCRIBED: 'Açıklamaya uymuyor',
  DAMAGED_SHIPPING: 'Kargoda hasar',
  CHANGED_MIND: 'Vazgeçtim / beğenmedim',
  OTHER: 'Diğer',
};

function returnTotal(r: ReturnRow) {
  return r.items.reduce((s, it) => s + Number(it.orderItem.unitPrice) * it.quantity, 0);
}

function ReturnDetail({ ret, onClose, onSuccess }: { ret: ReturnRow; onClose: () => void; onSuccess: () => void }) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [shipmentNo, setShipmentNo] = useState<string | null>(ret.trackingNumber ?? null);

  const handleCreateReturnShipment = async () => {
    setShipping(true);
    try {
      const r = await api.post<{ success: boolean; data: { trackingNumber: string | null; deliveryNo: string } }>(
        `/admin/returns/${ret.id}/shipment`,
        {},
      );
      const no = r.data.trackingNumber || r.data.deliveryNo;
      setShipmentNo(no);
      alert(`İade kargosu oluşturuldu.\nGönderi no: ${no}`);
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'İade kargosu oluşturulamadı');
    } finally {
      setShipping(false);
    }
  };

  // ZPL etiketi metin dosyası olarak iner; barkod yazıcıya bu dosya gönderilir.
  const handleDownloadReturnLabel = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/returns/${ret.id}/shipment/label`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) { alert('Etiket alınamadı (bu iade için kayıtlı barkod yok)'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hepsijet-iade-${shipmentNo ?? ret.id}.zpl`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Etiket indirilemedi');
    }
  };

  const handleApprove = async () => {
    if (!confirm('İadeyi onaylıyor musunuz? Seçili ürünlerin stoğu geri yüklenecek.')) return;
    setApproving(true);
    try {
      await api.put(`/checkout/admin/returns/${ret.id}/approve`, {});
      alert('İade onaylandı, stok geri yüklendi');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await api.put(`/checkout/admin/returns/${ret.id}/reject`, { reason: rejectionReason });
      alert('İade reddedildi');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu');
    } finally {
      setRejecting(false);
    }
  };

  const total = ret.refundAmount != null ? Number(ret.refundAmount) : returnTotal(ret);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[500px] bg-white shadow-xl z-50 flex flex-col overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b bg-white">
          <div className="flex-1">
            <h2 className="text-lg font-bold">İade Talebi: #{ret.order.id.slice(-8).toUpperCase()}</h2>
            <p className="text-sm text-gray-600 mt-1">{ret.user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0">
            <BsXLg className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Durum</label>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${RETURN_STATUS_COLORS[ret.status]}`}>
              {RETURN_STATUS_LABELS[ret.status]}
            </div>
          </div>

          {/* İade edilen kalemler */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">İade Edilen Ürünler</label>
            <div className="border rounded-lg divide-y">
              {ret.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between p-3 text-sm">
                  <span className="text-gray-800">{it.orderItem.variant?.product?.name ?? 'Ürün'}</span>
                  <span className="text-gray-600 whitespace-nowrap">
                    {it.quantity} × {Number(it.orderItem.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 text-sm font-semibold bg-gray-50">
                <span>Toplam İade Tutarı</span>
                <span>{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">İade Nedeni</label>
              <p className="text-sm text-gray-700">{RETURN_REASON_LABELS[ret.reason] || ret.reason}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Talep Tarihi</label>
              <p className="text-sm text-gray-700">{new Date(ret.requestedAt).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>

          {ret.description && (
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Açıklama</label>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{ret.description}</p>
            </div>
          )}

          {ret.adminNotes && (
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Red Açıklaması</label>
              <p className="text-sm text-gray-700 bg-red-50 p-3 rounded border border-red-200">{ret.adminNotes}</p>
            </div>
          )}

          {/* HepsiJET iade kargosu — müşteriden alınıp depoya döner */}
          {ret.status !== 'REJECTED' && (
            <div className="border-t pt-6">
              <label className="text-sm font-semibold text-gray-700 block mb-2">İade Kargosu (HepsiJET)</label>
              {shipmentNo ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    Gönderi no: <span className="font-mono font-semibold">{shipmentNo}</span>
                  </p>
                  <button
                    onClick={handleDownloadReturnLabel}
                    className="text-sm text-primary hover:underline"
                  >
                    Kargo etiketini indir (ZPL)
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCreateReturnShipment}
                  disabled={shipping}
                  className="w-full border border-primary text-primary px-4 py-2 rounded-lg font-medium hover:bg-primary/5 disabled:opacity-50"
                >
                  {shipping ? 'Oluşturuluyor...' : 'İade Kargosu Oluştur'}
                </button>
              )}
            </div>
          )}

          {ret.status === 'REQUESTED' && (
            <div className="border-t pt-6 space-y-4">
              <button
                onClick={handleApprove}
                disabled={approving}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <BsCheckLg className="h-4 w-4" />
                {approving ? 'İşleniyor...' : 'Onayla (stok geri yükle + iade)'}
              </button>
              <div className="border-t pt-4">
                <label className="text-sm font-semibold text-gray-700 block mb-2">Reddetme Sebebi (İsteğe Bağlı)</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Neden reddettiğinizi açıklayın..."
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary"
                  rows={3}
                />
                <button
                  onClick={handleReject}
                  disabled={rejecting}
                  className="w-full mt-2 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <BsXLg className="h-4 w-4" />
                  {rejecting ? 'İşleniyor...' : 'Reddet'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ReturnsPanel() {
  const [filter, setFilter] = useState<'all' | 'REQUESTED' | 'APPROVED' | 'REJECTED'>('all');
  const [selected, setSelected] = useState<ReturnRow | null>(null);
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: ReturnRow[] }>(
        `/checkout/admin/returns${filter !== 'all' ? `?status=${filter}` : ''}`,
      );
      const list = (res as any).data || [];
      setReturns(Array.isArray(list) ? list : []);
    } catch (err: any) {
      alert('İade talepleri yüklenemedi: ' + (err.message || err));
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReturns(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-4">
        {(['all', 'REQUESTED', 'APPROVED', 'REJECTED'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === status ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {status === 'all' ? 'Tümü' : RETURN_STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
      ) : returns.length === 0 ? (
        <div className="text-center py-8 text-gray-500">İade talebi bulunamadı</div>
      ) : (
        <div className="border rounded-lg divide-y">
          {returns.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(r)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-medium">#{r.order.id.slice(-8).toUpperCase()}</span>
                  <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${RETURN_STATUS_COLORS[r.status]}`}>{RETURN_STATUS_LABELS[r.status]}</div>
                </div>
                <p className="text-sm text-gray-600">{r.user.profile?.firstName} {r.user.profile?.lastName || r.user.email}</p>
                <p className="text-xs text-gray-500 mt-1">{RETURN_REASON_LABELS[r.reason]} · {r.items.reduce((s, i) => s + i.quantity, 0)} ürün</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-semibold">{(r.refundAmount != null ? Number(r.refundAmount) : returnTotal(r)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY</p>
                <p className="text-xs text-gray-500">{new Date(r.requestedAt).toLocaleDateString('tr-TR')}</p>
              </div>
              <BsChevronRight className="h-5 w-5 text-gray-400 ml-4" />
            </div>
          ))}
        </div>
      )}

      {selected && <ReturnDetail ret={selected} onClose={() => setSelected(null)} onSuccess={() => fetchReturns()} />}
    </div>
  );
}

export function Cancellations() {
  const [mainTab, setMainTab] = useState<'cancellations' | 'returns'>('cancellations');
  const [filter, setFilter] = useState<'all' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REFUNDED'>('all');
  const [selectedCancellation, setSelectedCancellation] = useState<Cancellation | null>(null);
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCancellations = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Cancellation[] }>(
        `/checkout/admin/cancellations${filter !== 'all' ? `?status=${filter}` : ''}`
      );
      const cancellationList = (res as any).data || [];
      setCancellations(Array.isArray(cancellationList) ? cancellationList : []);
    } catch (err: any) {
      console.error('Error fetching cancellations:', err);
      alert('İptal talepleri yüklenemedi: ' + (err.message || err));
      setCancellations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCancellations();
  }, [filter]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">İptal & İade Yönetimi</h1>

        {/* Ana Sekmeler: İptaller / İadeler */}
        <div className="flex gap-1 border-b mb-4">
          {([['cancellations', 'İptaller'], ['returns', 'İadeler']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMainTab(key)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                mainTab === key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mainTab === 'returns' ? (
        <ReturnsPanel />
      ) : (
      <>
      <div className="mb-6">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'REQUESTED', 'APPROVED', 'REJECTED', 'REFUNDED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Tümü' : STATUS_LABELS[status]}
              {status !== 'all' && cancellations.filter((c) => c.status === status).length > 0 && (
                <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                  {cancellations.filter((c) => c.status === status).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
      ) : cancellations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">İptal talebi bulunamadı</div>
      ) : (
        <div className="border rounded-lg divide-y">
          {cancellations.map((cancellation) => (
            <div
              key={cancellation.id}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setSelectedCancellation(cancellation)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-medium">#{cancellation.orderId.slice(-8).toUpperCase()}</span>
                  <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[cancellation.status]}`}>
                    {STATUS_LABELS[cancellation.status]}
                  </div>
                  {cancellation.couponCode && (
                    <div className="inline-block px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      🎟️ {cancellation.couponCode}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {cancellation.order.user.profile?.firstName} {cancellation.order.user.profile?.lastName || cancellation.order.user.email}
                </p>
                <p className="text-xs text-gray-500 mt-1">{REASON_LABELS[cancellation.reason]}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-semibold">{cancellation.refundAmount} TRY</p>
                <p className="text-xs text-gray-500">{new Date(cancellation.requestedAt).toLocaleDateString('tr-TR')}</p>
              </div>
              <BsChevronRight className="h-5 w-5 text-gray-400 ml-4" />
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedCancellation && (
        <CancellationDetail
          cancellation={selectedCancellation}
          onClose={() => setSelectedCancellation(null)}
          onSuccess={() => fetchCancellations()}
        />
      )}
      </>
      )}
    </div>
  );
}

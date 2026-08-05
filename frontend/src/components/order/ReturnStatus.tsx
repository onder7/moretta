import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { checkoutApi } from '@/services/checkoutApi';

interface ReturnRow {
  id: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  reason: string;
  description: string | null;
  refundAmount: number | null;
  adminNotes: string | null;
  requestedAt: string;
  items: Array<{ orderItemId: string; quantity: number }>;
}

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  REQUESTED: { label: 'İade Talebi Alındı', badge: 'bg-yellow-100 text-yellow-800' },
  APPROVED:  { label: 'İade Onaylandı',      badge: 'bg-green-100 text-green-800' },
  REJECTED:  { label: 'İade Reddedildi',     badge: 'bg-red-100 text-red-700' },
};

const REASON_LABELS: Record<string, string> = {
  DEFECTIVE: 'Ürün kusurlu / arızalı',
  WRONG_ITEM: 'Yanlış ürün geldi',
  NOT_AS_DESCRIBED: 'Açıklamaya uymuyor',
  DAMAGED_SHIPPING: 'Kargoda hasar',
  CHANGED_MIND: 'Vazgeçtim / beğenmedim',
  OTHER: 'Diğer',
};

function formatPrice(n: number) {
  return Number(n).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

/** Bir siparişin iade taleplerini listeler. `version` değişince yeniden çeker. */
export function ReturnStatus({ orderId, version = 0 }: { orderId: string; version?: number }) {
  const [returns, setReturns] = useState<ReturnRow[]>([]);

  useEffect(() => {
    checkoutApi
      .getOrderReturns(orderId)
      .then((r) => setReturns(r.data.data ?? []))
      .catch(() => setReturns([]));
  }, [orderId, version]);

  if (returns.length === 0) return null;

  return (
    <div className="space-y-3">
      {returns.map((r) => {
        const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.REQUESTED;
        const totalQty = r.items.reduce((s, i) => s + i.quantity, 0);
        return (
          <div key={r.id} className="rounded-lg border border-espresso-200 dark:border-espresso-800 bg-white dark:bg-espresso-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-espresso-800 dark:text-cream-100">
                <RotateCcw className="h-4 w-4" /> İade Talebi
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>{cfg.label}</span>
            </div>
            <div className="text-xs text-espresso-400 dark:text-cream-400 space-y-1">
              <p>Neden: <span className="text-espresso-600 dark:text-cream-300">{REASON_LABELS[r.reason] ?? r.reason}</span></p>
              <p>{totalQty} ürün · {new Date(r.requestedAt).toLocaleDateString('tr-TR')}</p>
              {r.status === 'APPROVED' && r.refundAmount != null && (
                <p className="text-green-700 dark:text-green-400 font-medium">İade tutarı: {formatPrice(r.refundAmount)}</p>
              )}
              {r.status === 'REJECTED' && r.adminNotes && (
                <p className="text-red-600">Açıklama: {r.adminNotes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

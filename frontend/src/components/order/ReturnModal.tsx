import { useState, useEffect } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { checkoutApi } from '@/services/checkoutApi';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ReturnableItem {
  id: string;
  quantity: number;
  unitPrice: number | string;
  variant?: { product?: { name?: string; images?: { url: string }[] } } | null;
}

interface ReturnModalProps {
  orderId: string;
  items: ReturnableItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RETURN_REASONS = [
  { value: 'DEFECTIVE', label: 'Ürün kusurlu / arızalı' },
  { value: 'WRONG_ITEM', label: 'Yanlış ürün geldi' },
  { value: 'NOT_AS_DESCRIBED', label: 'Açıklamaya uymuyor' },
  { value: 'DAMAGED_SHIPPING', label: 'Kargoda hasar gördü' },
  { value: 'CHANGED_MIND', label: 'Vazgeçtim / beğenmedim' },
  { value: 'OTHER', label: 'Diğer' },
];

function formatPrice(n: number | string) {
  return Number(n).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

type Sel = Record<string, { selected: boolean; quantity: number }>;

export function ReturnModal({ orderId, items, isOpen, onClose, onSuccess }: ReturnModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [returnedMap, setReturnedMap] = useState<Record<string, number>>({});
  const [sel, setSel] = useState<Sel>({});

  // Modal açıldığında: mevcut iadeleri çek → kalan adetleri hesapla
  useEffect(() => {
    if (!isOpen) return;
    setReason('');
    setDescription('');
    setSel(Object.fromEntries(items.map((i) => [i.id, { selected: false, quantity: 1 }])));
    checkoutApi
      .getOrderReturns(orderId)
      .then((res) => {
        const map: Record<string, number> = {};
        for (const r of res.data.data ?? []) {
          if (r.status === 'REJECTED') continue; // reddedilenler kalanı düşürmez
          for (const it of r.items) map[it.orderItemId] = (map[it.orderItemId] ?? 0) + it.quantity;
        }
        setReturnedMap(map);
      })
      .catch(() => setReturnedMap({}));
  }, [isOpen, orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const remaining = (item: ReturnableItem) => item.quantity - (returnedMap[item.id] ?? 0);
  const anyReturnable = items.some((i) => remaining(i) > 0);

  const toggle = (item: ReturnableItem) => {
    const max = remaining(item);
    if (max <= 0) return;
    setSel((s) => ({ ...s, [item.id]: { selected: !s[item.id]?.selected, quantity: Math.min(s[item.id]?.quantity || 1, max) } }));
  };
  const setQty = (item: ReturnableItem, q: number) => {
    const max = remaining(item);
    setSel((s) => ({ ...s, [item.id]: { ...s[item.id], quantity: Math.min(max, Math.max(1, q)) } }));
  };
  const selectAll = () =>
    setSel(Object.fromEntries(items.map((i) => [i.id, { selected: remaining(i) > 0, quantity: Math.max(1, remaining(i)) }])));

  const selectedItems = items.filter((i) => sel[i.id]?.selected && remaining(i) > 0);

  const handleSubmit = async () => {
    if (!reason) { toast.error('Lütfen bir iade nedeni seçiniz'); return; }
    if (selectedItems.length === 0) { toast.error('İade edilecek en az bir ürün seçiniz'); return; }
    setLoading(true);
    try {
      const res = await checkoutApi.requestReturn(orderId, {
        reason,
        description: reason === 'OTHER' ? description : description || undefined,
        items: selectedItems.map((i) => ({ orderItemId: i.id, quantity: sel[i.id].quantity })),
      });
      if (res.data.success) {
        toast.success('İade talebiniz başarıyla gönderildi!');
        onClose();
        onSuccess();
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'İade talebi gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold">İade Talebi Oluştur</h2>
          <button onClick={onClose} disabled={loading} className="text-espresso-300 hover:text-espresso-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Ürün seçimi */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-espresso-600">İade edilecek ürünler *</label>
              {anyReturnable && (
                <button type="button" onClick={selectAll} className="text-xs font-medium text-primary hover:underline">
                  Tümünü Seç
                </button>
              )}
            </div>
            <div className="space-y-2">
              {items.map((item) => {
                const max = remaining(item);
                const s = sel[item.id] ?? { selected: false, quantity: 1 };
                const disabled = max <= 0;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${disabled ? 'opacity-50 bg-cream-50' : 'cursor-pointer'} ${s.selected ? 'border-primary bg-primary/5' : 'border-espresso-100'}`}
                    onClick={() => !disabled && toggle(item)}
                  >
                    <input
                      type="checkbox"
                      checked={s.selected}
                      disabled={disabled}
                      onChange={() => toggle(item)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    {item.variant?.product?.images?.[0]?.url && (
                      <img src={item.variant.product.images[0].url} alt="" className="h-10 w-10 rounded object-cover bg-cream-100 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-espresso-700 truncate">{item.variant?.product?.name ?? 'Ürün'}</p>
                      <p className="text-xs text-espresso-300">
                        {formatPrice(item.unitPrice)} · {disabled ? 'Tamamı iade edildi' : `İade edilebilir: ${max} adet`}
                      </p>
                    </div>
                    {s.selected && max > 0 && (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => setQty(item, s.quantity - 1)} className="h-7 w-7 flex items-center justify-center rounded border hover:bg-cream-50">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{s.quantity}</span>
                        <button type="button" onClick={() => setQty(item, s.quantity + 1)} disabled={s.quantity >= max} className="h-7 w-7 flex items-center justify-center rounded border hover:bg-cream-50 disabled:opacity-40">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {!anyReturnable && (
              <p className="text-xs text-amber-600 mt-2">Bu siparişte iade edilebilecek ürün kalmadı.</p>
            )}
          </div>

          {/* İade nedeni */}
          <div>
            <label className="text-sm font-medium text-espresso-600 block mb-3">İade Nedeni *</label>
            <div className="space-y-2">
              {RETURN_REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="return-reason" value={r.value} checked={reason === r.value} onChange={(e) => setReason(e.target.value)} disabled={loading} />
                  <span className="text-sm text-espresso-600">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-espresso-600 block mb-2">Açıklama {reason === 'OTHER' ? '*' : '(opsiyonel)'}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="İade nedeninizi kısaca açıklayabilirsiniz..."
              disabled={loading}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary disabled:bg-cream-50"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Bilgi:</strong> İade talebiniz onaylandığında seçtiğiniz ürünlerin tutarı ödeme yönteminize iade edilir (1–7 iş günü).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Vazgeç</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={loading || selectedItems.length === 0 || !reason}>
            {loading ? 'Gönderiliyor...' : 'İade Talebini Gönder'}
          </Button>
        </div>
      </div>
    </div>
  );
}

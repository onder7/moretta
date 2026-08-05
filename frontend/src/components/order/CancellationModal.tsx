import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CancellationModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CANCELLATION_REASONS = [
  { value: 'CHANGED_MIND', label: 'Siparişten Vazgeçtim' },
  { value: 'DELIVERY_TIME_LONG', label: 'Teslimat Süresi Çok Uzun' },
  { value: 'BETTER_PRICE_FOUND', label: 'Başka Platformda Daha Uygun Fiyat Buldum' },
  { value: 'PRODUCT_INFO_ERROR', label: 'Ürün Bilgilerinde Hata/Eksiklik' },
  { value: 'OTHER', label: 'Diğer' },
];

export function CancellationModal({ orderId, isOpen, onClose, onSuccess }: CancellationModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error('Lütfen bir neden seçiniz');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{ success: boolean; data: any }>(
        `/checkout/orders/${orderId}/cancel-request`,
        {
          reason: selectedReason,
          description: selectedReason === 'OTHER' ? description : undefined,
        }
      );

      if (response.data.success) {
        toast.success('İptal talebiniz başarıyla gönderildi!');
        setSelectedReason('');
        setDescription('');
        onClose();
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || 'İptal talebi gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold">Siparişi İptal Et</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-espresso-300 hover:text-espresso-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-espresso-600 block mb-3">
              İptal Nedeni *
            </label>
            <div className="space-y-2">
              {CANCELLATION_REASONS.map((reason) => (
                <label key={reason.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    disabled={loading}
                    className="rounded"
                  />
                  <span className="text-sm text-espresso-600">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedReason === 'OTHER' && (
            <div>
              <label className="text-sm font-medium text-espresso-600 block mb-2">
                Açıklama
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="İptal nedeninizi açıklayınız..."
                disabled={loading}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary disabled:bg-cream-50"
                rows={4}
              />
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Bilgi:</strong> İptal talebiniz alındıktan sonra en kısa sürede incelenecektir. Onaylandığında 1-7 iş günü içinde ödemeniz iade edilecektir.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            İptal
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!selectedReason || loading}
          >
            {loading ? 'Gönderiliyor...' : 'Talebini Gönder'}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CancellationStatusProps {
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  reason?: string;
  adminNotes?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  REQUESTED: {
    label: 'İptal Talep Edildi',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
  },
  APPROVED: {
    label: 'İptal Onaylandı',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  REJECTED: {
    label: 'İptal Reddedildi',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
  },
  REFUNDED: {
    label: 'İade Tamamlandı',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
  },
};

const REASON_CONFIG: Record<string, string> = {
  CHANGED_MIND: 'Siparişten Vazgeçtim',
  DELIVERY_TIME_LONG: 'Teslimat Süresi Çok Uzun',
  BETTER_PRICE_FOUND: 'Başka Platformda Daha Uygun Fiyat',
  PRODUCT_INFO_ERROR: 'Ürün Bilgilerinde Hata/Eksiklik',
  OTHER: 'Diğer',
};

export function CancellationStatus({ status, reason, adminNotes }: CancellationStatusProps) {
  const config = STATUS_CONFIG[status];
  const reasonLabel = reason ? REASON_CONFIG[reason] : null;

  return (
    <div className={`border rounded-lg p-4 ${config.bgColor} space-y-3`}>
      <p className={`text-sm font-semibold ${config.color}`}>{config.label}</p>
      {reasonLabel && <p className="text-xs text-espresso-500">{reasonLabel}</p>}
      {adminNotes && <p className="text-xs text-espresso-600 bg-white/50 p-2 rounded">{adminNotes}</p>}
    </div>
  );
}

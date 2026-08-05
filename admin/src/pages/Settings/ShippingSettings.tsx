import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface ShippingConfig {
  shippingFee: number;
  freeShippingThreshold: number;
}

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

const inputCls =
  'w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary';

export default function ShippingSettings() {
  const [config, setConfig] = useState<ShippingConfig | null>(null);
  const [fee, setFee] = useState('');
  const [threshold, setThreshold] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ success: boolean; data: ShippingConfig }>('/admin/shipping-config')
      .then((r) => {
        setConfig(r.data);
        setFee(String(r.data.shippingFee));
        setThreshold(String(r.data.freeShippingThreshold));
      })
      .catch(() => setError('Ayarlar yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const feeNum = parseFloat(fee);
    const thresholdNum = parseFloat(threshold);

    if (isNaN(feeNum) || feeNum < 0) { setError('Geçerli bir kargo ücreti girin.'); return; }
    if (isNaN(thresholdNum) || thresholdNum < 0) { setError('Geçerli bir ücretsiz kargo limiti girin.'); return; }

    setSaving(true);
    try {
      const r = await api.put<{ success: boolean; data: ShippingConfig }>(
        '/admin/shipping-config',
        { shippingFee: feeNum, freeShippingThreshold: thresholdNum },
      );
      setConfig(r.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt hatası');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-title-md2 font-semibold text-black dark:text-white">Kargo Ayarları</h2>
        <p className="text-sm text-gray-500 mt-1">
          Kargo ücretini ve ücretsiz kargo limitini buradan yönetebilirsiniz.
          Değişiklikler anında geçerli olur.
        </p>
      </div>

      {/* Mevcut durum kartları */}
      {config && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                <svg className="fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 24 24">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C13.9 20 22 14.5 22 4l-1.05.95C19.68 6.27 17.37 7.2 17 8z" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Kargo Ücreti</p>
                <p className="text-xl font-bold text-black dark:text-white">{fmt(config.shippingFee)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                <svg className="fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 24 24">
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-5 8.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm8-6H3V6h12v4.5h-1z" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ücretsiz Kargo Limiti</p>
                <p className="text-xl font-bold text-black dark:text-white">{fmt(config.freeShippingThreshold)} ve üzeri</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
        <h3 className="text-base font-semibold text-black dark:text-white mb-5">Ayarları Güncelle</h3>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
            )}
            {success && (
              <div className="rounded bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
                Ayarlar başarıyla kaydedildi.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1">
                Kargo Ücreti (₺)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className={inputCls}
                placeholder="49.90"
              />
              <p className="text-xs text-gray-400 mt-1">
                Ücretsiz kargo limitinin altında kalan siparişlere uygulanır.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-1">
                Ücretsiz Kargo Limiti (₺)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className={inputCls}
                placeholder="500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Bu tutarın üzerindeki siparişlerde kargo ücretsiz olur. 0 girersen kargo hiçbir zaman ücretsiz olmaz.
              </p>
            </div>

            {/* Önizleme */}
            {fee && threshold && (
              <div className="rounded-lg bg-gray-50 dark:bg-meta-4 p-4 text-sm space-y-1.5">
                <p className="font-medium text-black dark:text-white text-xs uppercase tracking-wider mb-2">Önizleme</p>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>{fmt(Number(threshold) * 0.8)} tutarında sipariş</span>
                  <span className="font-medium text-black dark:text-white">Kargo: {fmt(Number(fee))}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>{fmt(Number(threshold))} ve üzeri sipariş</span>
                  <span className="font-medium text-green-600">Kargo: Ücretsiz</span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-2.5 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

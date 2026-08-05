import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface DiscountUsage {
  name: string;
  email: string;
  orderRef: string;
  usedAt: string;
}

interface Discount {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minOrder?: number;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  description?: string | null;
  owner?: { id: string; email: string; name: string } | null;
  usages?: DiscountUsage[];
}

interface FormState {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: string;
  minOrder: string;
  maxUses: string;
  expiresAt: string;
  isActive: boolean;
}

const inputCls = 'w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white';
const btnPrimaryCls = 'rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90';
const btnDangerCls = 'rounded bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90';

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    code: '',
    type: 'PERCENT',
    value: '',
    minOrder: '',
    maxUses: '',
    expiresAt: '',
    isActive: true,
  });

  useEffect(() => {
    loadDiscounts();
  }, []);

  function loadDiscounts() {
    setLoading(true);
    api
      .get<{ success: boolean; data: Discount[] }>('/discounts')
      .then((r) => setDiscounts(r.data ?? []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }

  function handleSave() {
    if (!form.code || !form.value) {
      alert('Kod ve değer gerekli');
      return;
    }

    setSaving(true);
    const payload = {
      code: form.code.toUpperCase(),
      type: form.type,
      value: form.value,
      minOrder: form.minOrder || undefined,
      maxUses: form.maxUses || undefined,
      expiresAt: form.expiresAt || undefined,
      isActive: form.isActive,
    };

    const promise = editingId
      ? api.put(`/discounts/${editingId}`, payload)
      : api.post('/discounts', payload);

    promise
      .then(() => {
        loadDiscounts();
        resetForm();
        setShowForm(false);
      })
      .catch((e) => alert('Hata: ' + (e.response?.data?.error || e.message)))
      .finally(() => setSaving(false));
  }

  function resetForm() {
    setForm({
      code: '',
      type: 'PERCENT',
      value: '',
      minOrder: '',
      maxUses: '',
      expiresAt: '',
      isActive: true,
    });
    setEditingId(null);
  }

  function handleEdit(discount: Discount) {
    setEditingId(discount.id);
    setForm({
      code: discount.code,
      type: discount.type,
      value: discount.value.toString(),
      minOrder: discount.minOrder?.toString() || '',
      maxUses: discount.maxUses?.toString() || '',
      expiresAt: discount.expiresAt ? discount.expiresAt.split('T')[0] : '',
      isActive: discount.isActive,
    });
    setShowForm(true);
  }

  function handleDelete(id: string) {
    if (!confirm('Silmek istediğinizden emin misiniz?')) return;
    api
      .delete(`/discounts/${id}`)
      .then(() => loadDiscounts())
      .catch((e) => alert('Hata: ' + (e.response?.data?.error || e.message)));
  }

  return (
    <div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 shadow-xl max-w-md w-full mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
              {editingId ? 'İndirimi Düzenle' : 'Yeni İndirim'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">Kupon Kodu *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className={inputCls}
                  placeholder="INDIRIM20"
                  disabled={!!editingId}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-1">Tip</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'PERCENT' | 'FIXED' })}
                    className={inputCls}
                  >
                    <option value="PERCENT">Yüzde (%)</option>
                    <option value="FIXED">Sabit (TL)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-1">Değer *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className={inputCls}
                    placeholder={form.type === 'PERCENT' ? '20' : '50.00'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">Min. Sipariş (TL)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minOrder}
                  onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                  className={inputCls}
                  placeholder="100.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">Max Kullanım</label>
                <input
                  type="number"
                  min="1"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  className={inputCls}
                  placeholder="Sınırsız"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">Son Kullanım Tarihi</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className={inputCls}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm text-black dark:text-white">Aktif</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 rounded border border-stroke text-sm hover:bg-gray-50"
              >
                İptal
              </button>
              <button onClick={handleSave} disabled={saving} className={btnPrimaryCls}>
                {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">İndirim Yönetimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">{discounts.length} indirim</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className={btnPrimaryCls}
        >
          + Yeni İndirim
        </button>
      </div>

      <div className="rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark bg-gray-2 dark:bg-meta-4">
                  <th className="px-5 py-4 text-left font-medium">Kod</th>
                  <th className="px-5 py-4 text-center font-medium">Tip</th>
                  <th className="px-5 py-4 text-center font-medium">Değer</th>
                  <th className="px-5 py-4 text-center font-medium">Kullanılmış</th>
                  <th className="px-5 py-4 text-left font-medium">Kullanan / Sahip</th>
                  <th className="px-5 py-4 text-center font-medium">Durum</th>
                  <th className="px-5 py-4 text-left font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((discount) => (
                  <tr key={discount.id} className="border-b border-stroke dark:border-strokedark hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <span className="font-semibold">{discount.code}</span>
                      {discount.expiresAt && (
                        <div className="text-xs text-gray-500">
                          Bitiş: {new Date(discount.expiresAt).toLocaleDateString('tr-TR')}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded dark:bg-gray-700">
                        {discount.type === 'PERCENT' ? '%' : 'TL'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center font-medium">
                      {discount.value}
                      {discount.type === 'PERCENT' ? '%' : ' TL'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {discount.maxUses ? `${discount.usedCount}/${discount.maxUses}` : discount.usedCount}
                    </td>
                    <td className="px-5 py-4 align-top min-w-[200px]">
                      {discount.owner && (
                        <div className="mb-1">
                          <span
                            title={discount.owner.email}
                            className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded"
                          >
                            Kişiye özel: {discount.owner.name}
                          </span>
                        </div>
                      )}
                      {discount.usages && discount.usages.length > 0 ? (
                        <div className="space-y-0.5 max-h-24 overflow-y-auto pr-1">
                          {discount.usages.map((u, i) => (
                            <div key={i} className="text-xs text-gray-600 dark:text-gray-300" title={u.email}>
                              <span className="font-medium">{u.name}</span>
                              {u.orderRef && <span className="text-gray-400"> · {u.orderRef}</span>}
                              {u.usedAt && (
                                <span className="text-gray-400"> · {new Date(u.usedAt).toLocaleDateString('tr-TR')}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        !discount.owner && <span className="text-xs text-gray-400">Henüz kullanılmadı</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          discount.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {discount.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(discount)}
                          className="px-3 py-1 rounded bg-blue-50 text-blue-700 text-xs hover:bg-blue-100"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(discount.id)}
                          className={btnDangerCls + ' text-xs px-3 py-1'}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {discounts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      İndirim bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

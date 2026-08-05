import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface AttributeValue {
  id: string;
  value: string;
  colorHex?: string | null;
  sortOrder: number;
}

interface Attribute {
  id: string;
  name: string;
  slug: string;
  inputType: string;
  sortOrder: number;
  isActive: boolean;
  values: AttributeValue[];
}

const inputCls = 'w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white';
const inputSmCls = 'rounded border border-stroke bg-transparent px-2.5 py-1.5 text-xs text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white';

export default function AttributesPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Yeni özellik formu
  const [newName, setNewName] = useState('');
  const [newInputType, setNewInputType] = useState('select');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Düzenleme
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editInputType, setEditInputType] = useState('');

  // Yeni değer formu (per attribute)
  const [newValueMap, setNewValueMap] = useState<Record<string, { value: string; colorHex: string }>>({});

  // Değer düzenleme
  const [editValueId, setEditValueId] = useState<string | null>(null);
  const [editValueData, setEditValueData] = useState({ value: '', colorHex: '' });

  function load() {
    setLoading(true);
    api.get<{ success: boolean; data: Attribute[] }>('/admin/attributes')
      .then((r) => setAttributes(r.data ?? []))
      .catch(() => setError('Yüklenemedi'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/admin/attributes', { name: newName.trim(), inputType: newInputType });
      setNewName('');
      setNewInputType('select');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    try {
      await api.put(`/admin/attributes/${id}`, { name: editName, inputType: editInputType });
      setEditId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu özelliği ve tüm değerlerini silmek istediğinizden emin misiniz?')) return;
    try {
      await api.delete(`/admin/attributes/${id}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata');
    }
  }

  async function handleAddValue(attrId: string) {
    const data = newValueMap[attrId];
    if (!data?.value?.trim()) return;
    try {
      await api.post(`/admin/attributes/${attrId}/values`, {
        value: data.value.trim(),
        colorHex: data.colorHex || undefined,
      });
      setNewValueMap((m) => ({ ...m, [attrId]: { value: '', colorHex: '' } }));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata');
    }
  }

  async function handleUpdateValue(attrId: string, valueId: string) {
    try {
      await api.put(`/admin/attributes/${attrId}/values/${valueId}`, {
        value: editValueData.value,
        colorHex: editValueData.colorHex || undefined,
      });
      setEditValueId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata');
    }
  }

  async function handleDeleteValue(attrId: string, valueId: string) {
    if (!confirm('Bu değeri silmek istediğinizden emin misiniz?')) return;
    try {
      await api.delete(`/admin/attributes/${attrId}/values/${valueId}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">Ürün Özellikleri</h2>
          <p className="text-sm text-gray-500 mt-0.5">Varyant sisteminde kullanılacak özellik tiplerini ve değerlerini yönetin.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {/* Yeni Özellik Ekleme */}
      <div className="rounded-xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">Yeni Özellik Ekle</h3>
        <form onSubmit={handleCreate} className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Özellik Adı *</label>
            <input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={inputCls}
              placeholder="Örn: Renk, Beden, Hafıza"
            />
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-600 mb-1">Tip</label>
            <select value={newInputType} onChange={(e) => setNewInputType(e.target.value)} className={inputCls}>
              <option value="select">Seçim (Select)</option>
              <option value="color">Renk (Color)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
          >
            {saving ? 'Ekleniyor...' : '+ Özellik Ekle'}
          </button>
        </form>
      </div>

      {/* Özellik Listesi */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : attributes.length === 0 ? (
        <div className="rounded-xl border border-stroke bg-white dark:bg-boxdark p-8 text-center text-gray-400">
          Henüz özellik tanımlanmamış.
        </div>
      ) : (
        <div className="space-y-3">
          {attributes.map((attr) => (
            <div key={attr.id} className="rounded-xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark overflow-hidden">
              {/* Başlık */}
              <div className="flex items-center gap-3 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [attr.id]: !e[attr.id] }))}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <span className={`transition-transform ${expanded[attr.id] ? 'rotate-90' : ''}`}>▶</span>
                  <span className="font-semibold text-black dark:text-white">{attr.name}</span>
                  <span className="text-xs bg-gray-100 dark:bg-meta-4 text-gray-500 px-2 py-0.5 rounded-full">
                    {attr.inputType === 'color' ? 'Renk' : 'Seçim'}
                  </span>
                  <span className="text-xs text-gray-400">{attr.values.length} değer</span>
                </button>

                {editId === attr.id ? (
                  <div className="flex items-center gap-2">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className={`${inputSmCls} w-36`} />
                    <select value={editInputType} onChange={(e) => setEditInputType(e.target.value)} className={`${inputSmCls} w-32`}>
                      <option value="select">Seçim</option>
                      <option value="color">Renk</option>
                    </select>
                    <button onClick={() => handleUpdate(attr.id)} className="text-xs text-green-600 font-medium hover:underline">Kaydet</button>
                    <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline">İptal</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setEditId(attr.id); setEditName(attr.name); setEditInputType(attr.inputType); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Düzenle
                    </button>
                    <button onClick={() => handleDelete(attr.id)} className="text-xs text-red-500 hover:underline">Sil</button>
                  </div>
                )}
              </div>

              {/* Değerler */}
              {expanded[attr.id] && (
                <div className="border-t border-stroke dark:border-strokedark px-5 py-4 space-y-3">
                  {/* Mevcut değerler */}
                  <div className="flex flex-wrap gap-2">
                    {attr.values.map((val) => (
                      <div key={val.id} className="flex items-center gap-1.5 bg-gray-50 dark:bg-meta-4 rounded-lg px-2.5 py-1.5">
                        {editValueId === val.id ? (
                          <>
                            {attr.inputType === 'color' && (
                              <input
                                type="color"
                                value={editValueData.colorHex || '#000000'}
                                onChange={(e) => setEditValueData((d) => ({ ...d, colorHex: e.target.value }))}
                                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                              />
                            )}
                            <input
                              value={editValueData.value}
                              onChange={(e) => setEditValueData((d) => ({ ...d, value: e.target.value }))}
                              className={`${inputSmCls} w-24`}
                            />
                            <button onClick={() => handleUpdateValue(attr.id, val.id)} className="text-[10px] text-green-600 font-medium">✓</button>
                            <button onClick={() => setEditValueId(null)} className="text-[10px] text-gray-400">✕</button>
                          </>
                        ) : (
                          <>
                            {attr.inputType === 'color' && val.colorHex && (
                              <span className="w-4 h-4 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: val.colorHex }} />
                            )}
                            <span className="text-xs text-black dark:text-white">{val.value}</span>
                            <button
                              onClick={() => { setEditValueId(val.id); setEditValueData({ value: val.value, colorHex: val.colorHex ?? '' }); }}
                              className="text-[10px] text-primary hover:underline ml-1"
                            >✎</button>
                            <button onClick={() => handleDeleteValue(attr.id, val.id)} className="text-[10px] text-red-400 hover:underline">✕</button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Yeni değer ekle */}
                  <div className="flex items-center gap-2 pt-1">
                    {attr.inputType === 'color' && (
                      <input
                        type="color"
                        value={newValueMap[attr.id]?.colorHex || '#3B82F6'}
                        onChange={(e) => setNewValueMap((m) => ({ ...m, [attr.id]: { ...(m[attr.id] ?? { value: '' }), colorHex: e.target.value } }))}
                        className="w-8 h-8 rounded cursor-pointer border border-stroke p-0.5"
                      />
                    )}
                    <input
                      value={newValueMap[attr.id]?.value ?? ''}
                      onChange={(e) => setNewValueMap((m) => ({ ...m, [attr.id]: { ...(m[attr.id] ?? { colorHex: '' }), value: e.target.value } }))}
                      className={`${inputSmCls} w-40`}
                      placeholder="Yeni değer..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddValue(attr.id))}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddValue(attr.id)}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition"
                    >
                      + Ekle
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

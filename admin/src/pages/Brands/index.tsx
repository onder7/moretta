import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  isActive: boolean;
  _count: { products: number };
}

interface FormState {
  name: string;
  slug: string;
  logoUrl: string;
  isActive: boolean;
}

function toSlug(s: string) {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const defaultForm = (): FormState => ({ name: '', slug: '', logoUrl: '', isActive: true });

const inputCls = 'w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary';

export default function Brands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean; data: Brand[] }>('/admin/brands')
      .then((r) => setBrands(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditingId(undefined);
    setForm(defaultForm());
    setError('');
    setFormOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditingId(brand.id);
    setForm({ name: brand.name, slug: brand.slug, logoUrl: brand.logoUrl ?? '', isActive: brand.isActive });
    setError('');
    setFormOpen(true);
  }

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: editingId ? f.slug : toSlug(name) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      slug: form.slug,
      logoUrl: form.logoUrl || undefined,
      isActive: form.isActive,
    };
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/brands/${editingId}`, payload);
      } else {
        await api.post('/admin/brands', payload);
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt hatası');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await api.delete(`/admin/brands/${id}`);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silme hatası');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      {/* Silme onay modalı */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Markayı Sil</h3>
            <p className="text-sm text-gray-500 mb-5">Bu markayı silmek istediğinizden emin misiniz?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded border border-stroke text-sm hover:bg-gray-50">İptal</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting === deleteConfirm}
                className="px-4 py-2 rounded bg-meta-1 text-white text-sm hover:bg-opacity-90 disabled:opacity-50">
                {deleting === deleteConfirm ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form drawer */}
      {formOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setFormOpen(false)} />
          <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white dark:bg-boxdark shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke dark:border-strokedark shrink-0">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                {editingId ? 'Markayı Düzenle' : 'Yeni Marka'}
              </h2>
              <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {error && (
                <div className="rounded bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">Marka Adı *</label>
                <input required value={form.name} onChange={(e) => handleNameChange(e.target.value)}
                  className={inputCls} placeholder="Örn: TAÇ" />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">Slug *</label>
                <input required value={form.slug} onChange={(e) => set('slug', e.target.value)}
                  className={inputCls} placeholder="tac" />
                <p className="text-xs text-gray-400 mt-1">URL'de kullanılır. Otomatik oluşur, düzenleyebilirsiniz.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">Logo URL</label>
                <input value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)}
                  className={inputCls} placeholder="https://..." />
                {form.logoUrl && (
                  <img src={form.logoUrl} alt="Logo" className="mt-2 h-12 object-contain rounded border border-stroke p-1" />
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => set('isActive', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary" />
                <span className="text-sm text-black dark:text-white">Aktif</span>
              </label>

              <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-white dark:bg-boxdark border-t border-stroke dark:border-strokedark flex justify-end gap-3">
                <button type="button" onClick={() => setFormOpen(false)}
                  className="px-5 py-2 rounded border border-stroke text-sm hover:bg-gray-50 dark:hover:bg-meta-4">
                  İptal
                </button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50">
                  {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </aside>
        </>
      )}

      {/* Başlık */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">Marka Yönetimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">{brands.length} marka</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 transition">
          <span className="text-lg leading-none">+</span>
          Yeni Marka
        </button>
      </div>

      {/* Tablo */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark bg-gray-2 dark:bg-meta-4">
                  <th className="px-5 py-4 text-left font-medium text-gray-600">Logo</th>
                  <th className="px-5 py-4 text-left font-medium text-gray-600">Marka</th>
                  <th className="px-5 py-4 text-center font-medium text-gray-600">Ürün Sayısı</th>
                  <th className="px-5 py-4 text-left font-medium text-gray-600">Durum</th>
                  <th className="px-5 py-4 text-left font-medium text-gray-600">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => (
                  <tr key={brand.id}
                    className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/30">
                    <td className="px-5 py-4">
                      {brand.logoUrl ? (
                        <img src={brand.logoUrl} alt={brand.name}
                          className="h-8 w-16 object-contain rounded border border-stroke p-0.5 bg-white" />
                      ) : (
                        <div className="h-8 w-16 rounded border border-stroke bg-gray-100 flex items-center justify-center text-gray-400 text-[10px]">
                          Logo yok
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-black dark:text-white">{brand.name}</div>
                      <div className="text-xs text-gray-400">/{brand.slug}</div>
                    </td>
                    <td className="px-5 py-4 text-center font-medium">{brand._count.products}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${brand.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {brand.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(brand)}
                          className="px-3 py-1 rounded bg-blue-50 text-blue-700 text-xs hover:bg-blue-100 transition">
                          Düzenle
                        </button>
                        <button onClick={() => setDeleteConfirm(brand.id)}
                          className="px-3 py-1 rounded bg-red-50 text-meta-1 text-xs hover:bg-red-100 transition">
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {brands.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-400">Marka bulunamadı.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  showInMenu: boolean;
  sortOrder: number;
  parentId?: string | null;
  imageUrl?: string;
  children: Category[];
  _count: { products: number };
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
  showInMenu: boolean;
  parentId: string;
  imageUrl: string;
}

function toSlug(s: string) {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const defaultForm = (): FormState => ({
  name: '', slug: '', description: '', sortOrder: '0', isActive: true, showInMenu: true, parentId: '', imageUrl: '',
});

const inputCls = 'w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary';

interface DraggableCategoryRowProps {
  cat: Category;
  isParent: boolean;
  depth?: number;
  parentName?: string;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, current: boolean) => Promise<void>;
  onToggleMenu: (id: string, current: boolean) => Promise<void>;
  togglingActive?: string | null;
  togglingMenu?: string | null;
}

function DraggableCategoryRow({ cat, isParent, depth = 0, parentName, onEdit, onDelete, onToggleActive, onToggleMenu, togglingActive, togglingMenu }: DraggableCategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/30 ${
        isDragging ? 'bg-blue-50 dark:bg-blue-950' : ''
      }`}
      {...(isParent ? attributes : {})}
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          {isParent && (
            <span
              className="text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600 shrink-0"
              {...listeners}
              title="Sürükleyerek sırala"
            >
              ⋮⋮
            </span>
          )}
          <div style={{ paddingLeft: `${depth * 16}px` }}>
            <div className="font-medium text-black dark:text-white">
              {depth === 0 ? cat.name : depth === 1 ? `↳ ${cat.name}` : `↳↳ ${cat.name}`}
            </div>
            <div className="text-xs text-gray-400">/{cat.slug}</div>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-gray-600">
        {isParent ? <span className="text-gray-400 italic">Ana Kategori</span> : (parentName ?? '—')}
      </td>
      <td className="px-5 py-4 text-center font-medium">{cat._count.products}</td>
      <td className="px-5 py-4 text-center">{cat.children?.length ?? 0}</td>
      <td className="px-5 py-4 text-center text-gray-600">{cat.sortOrder}</td>
      <td className="px-5 py-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive(cat.id, cat.isActive);
          }}
          disabled={togglingActive === cat.id}
          className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition ${
            cat.isActive
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          } ${togglingActive === cat.id ? 'opacity-50' : ''}`}
          title="Durumu değiştirmek için tıklayın"
        >
          {togglingActive === cat.id ? '...' : cat.isActive ? 'Aktif' : 'Pasif'}
        </button>
      </td>
      <td className="px-5 py-4 text-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu(cat.id, cat.showInMenu);
          }}
          disabled={togglingMenu === cat.id}
          className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition ${
            cat.showInMenu
              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          } ${togglingMenu === cat.id ? 'opacity-50' : ''}`}
          title="Menüde gösterilip gösterilmeyeceğini değiştirmek için tıklayın"
        >
          {togglingMenu === cat.id ? '...' : cat.showInMenu ? 'Evet' : 'Hayır'}
        </button>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(cat);
            }}
            className="px-3 py-1 rounded bg-blue-50 text-blue-700 text-xs hover:bg-blue-100 transition"
          >
            Düzenle
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(cat.id);
            }}
            className="px-3 py-1 rounded bg-red-50 text-meta-1 text-xs hover:bg-red-100 transition"
          >
            Sil
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [togglingActive, setTogglingActive] = useState<string | null>(null);
  const [togglingMenu, setTogglingMenu] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean; data: Category[] }>('/admin/categories')
      .then((r) => setCategories(r.data ?? []))
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

  function openEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? '',
      sortOrder: String(cat.sortOrder),
      isActive: cat.isActive,
      showInMenu: cat.showInMenu,
      parentId: cat.parentId ?? '',
      imageUrl: cat.imageUrl ?? '',
    });
    setError('');
    setFormOpen(true);
  }

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: editingId ? f.slug : toSlug(name) }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await api.upload<{ data: { url: string } }>('/admin/upload', file);
      set('imageUrl', res.data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resim yükleme hatası');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || undefined,
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive,
      showInMenu: form.showInMenu,
      parentId: form.parentId || undefined,
      imageUrl: form.imageUrl || undefined,
    };
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/categories/${editingId}`, payload);
      } else {
        await api.post('/admin/categories', payload);
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
      await api.delete(`/admin/categories/${id}`);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silme hatası');
    } finally {
      setDeleting(null);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newCategories = arrayMove(categories, oldIndex, newIndex);
    setCategories(newCategories);

    const updates = newCategories.map((cat, idx) => ({
      id: cat.id,
      sortOrder: idx,
    }));

    try {
      await Promise.all(
        updates.map((upd) =>
          api.patch(`/admin/categories/${upd.id}`, { sortOrder: upd.sortOrder })
        )
      );
    } catch (err) {
      console.error('Sıralama güncellenirken hata:', err);
      load();
    }
  }

  function flatAll(cats: Category[]): Category[] {
    return cats.flatMap((c) => [c, ...flatAll(c.children ?? [])]);
  }

  async function handleToggleActive(id: string, currentValue: boolean) {
    setTogglingActive(id);
    try {
      await api.patch(`/admin/categories/${id}`, { isActive: !currentValue });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Durum güncellenirken hata oluştu');
    } finally {
      setTogglingActive(null);
    }
  }

  async function handleToggleMenu(id: string, currentValue: boolean) {
    setTogglingMenu(id);
    try {
      await api.patch(`/admin/categories/${id}`, { showInMenu: !currentValue });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Menü durumu güncellenirken hata oluştu');
    } finally {
      setTogglingMenu(null);
    }
  }

  const sortableIds = categories.map((c) => c.id);

  return (
    <div>
      {/* Silme onay modalı */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Kategoriyi Sil</h3>
            <p className="text-sm text-gray-500 mb-5">Bu kategoriyi silmek istediğinizden emin misiniz?</p>
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
          <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white dark:bg-boxdark shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke dark:border-strokedark shrink-0">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                {editingId ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
              </h2>
              <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {error && (
                <div className="rounded bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">Kategori Adı *</label>
                <input required value={form.name} onChange={(e) => handleNameChange(e.target.value)}
                  className={inputCls} placeholder="Örn: Nevresim Takımları" />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">Slug *</label>
                <input required value={form.slug} onChange={(e) => set('slug', e.target.value)}
                  className={inputCls} placeholder="nevresim-takimlari" />
                <p className="text-xs text-gray-400 mt-1">URL'de kullanılır. Otomatik oluşur, düzenleyebilirsiniz.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">Açıklama</label>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                  rows={3} className={inputCls} placeholder="Kategori açıklaması..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">Kategori Resmi</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className={`${inputCls} disabled:opacity-50`}
                />
                <p className="text-xs text-gray-400 mt-1">{uploading ? 'Yükleniyor...' : 'JPG, PNG, WebP vb.'}</p>
                {form.imageUrl && (
                  <div className="mt-3 rounded overflow-hidden border border-stroke dark:border-strokedark">
                    <img src={form.imageUrl} alt={form.name} className="w-full h-32 object-cover" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-1">Üst Kategori</label>
                  <select value={form.parentId} onChange={(e) => set('parentId', e.target.value)} className={inputCls}>
                    <option value="">Ana Kategori</option>
                    {flatAll(categories)
                      .filter((c) => c.id !== editingId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.parentId ? `↳ ${c.name}` : c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-1">Sıra</label>
                  <input type="number" min={0} value={form.sortOrder}
                    onChange={(e) => set('sortOrder', e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive}
                    onChange={(e) => set('isActive', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary" />
                  <span className="text-sm text-black dark:text-white">Aktif</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.showInMenu}
                    onChange={(e) => set('showInMenu', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary" />
                  <span className="text-sm text-black dark:text-white">Menüde Göster</span>
                </label>
              </div>

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
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">Kategori Yönetimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">{categories.length} kategori</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 transition">
          <span className="text-lg leading-none">+</span>
          Yeni Kategori
        </button>
      </div>

      {/* Tablo */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                    <th className="px-5 py-4 text-left font-medium text-gray-600">Kategori</th>
                    <th className="px-5 py-4 text-left font-medium text-gray-600">Üst Kategori</th>
                    <th className="px-5 py-4 text-center font-medium text-gray-600">Ürün</th>
                    <th className="px-5 py-4 text-center font-medium text-gray-600">Alt Kategori</th>
                    <th className="px-5 py-4 text-center font-medium text-gray-600">Sıra</th>
                    <th className="px-5 py-4 text-left font-medium text-gray-600">Durum</th>
                    <th className="px-5 py-4 text-center font-medium text-gray-600">Menüde</th>
                    <th className="px-5 py-4 text-left font-medium text-gray-600">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                    {categories.flatMap((parent) => [
                      <DraggableCategoryRow
                        key={parent.id}
                        cat={parent}
                        isParent={true}
                        depth={0}
                        onEdit={openEdit}
                        onDelete={(id) => setDeleteConfirm(id)}
                        onToggleActive={handleToggleActive}
                        onToggleMenu={handleToggleMenu}
                        togglingActive={togglingActive}
                        togglingMenu={togglingMenu}
                      />,
                      ...(parent.children ?? []).flatMap((sub) => [
                        <DraggableCategoryRow
                          key={sub.id}
                          cat={sub}
                          isParent={false}
                          depth={1}
                          parentName={parent.name}
                          onEdit={openEdit}
                          onDelete={(id) => setDeleteConfirm(id)}
                          onToggleActive={handleToggleActive}
                          onToggleMenu={handleToggleMenu}
                          togglingActive={togglingActive}
                          togglingMenu={togglingMenu}
                        />,
                        ...(sub.children ?? []).map((grand) => (
                          <DraggableCategoryRow
                            key={grand.id}
                            cat={grand}
                            isParent={false}
                            depth={2}
                            parentName={sub.name}
                            onEdit={openEdit}
                            onDelete={(id) => setDeleteConfirm(id)}
                            onToggleActive={handleToggleActive}
                            onToggleMenu={handleToggleMenu}
                            togglingActive={togglingActive}
                            togglingMenu={togglingMenu}
                          />
                        )),
                      ]),
                    ])}
                    {categories.length === 0 && (
                      <tr><td colSpan={8} className="py-12 text-center text-gray-400">Kategori bulunamadı.</td></tr>
                    )}
                  </SortableContext>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DndContext>
    </div>
  );
}

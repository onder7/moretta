import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category { id: string; name: string }
interface Brand    { id: string; name: string }

interface AttributeValue { id: string; value: string; colorHex?: string | null; sortOrder: number }
interface Attribute {
  id: string; name: string; slug: string; inputType: string; sortOrder: number;
  values: AttributeValue[];
}

interface VariantInput {
  id?: string;
  label: string;
  sku: string;
  price: string;
  compareAt: string;
  stockQty: string;
  desi: string;
  attributeValueIds: string[];
}

interface ImageInput {
  url: string;
  altText: string;
  isPrimary: boolean;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  brandId: string;
  isActive: boolean;
  isFeatured: boolean;
  vatRate: number;
  vatIncluded: boolean;
  intensity: number;
  selectedAttributes: Record<string, string[]>; // attrId → seçili valueId[]
  variants: VariantInput[];
  images: ImageInput[];
  tags: string;
  // Hybrid Pricing
  pricingMethod: 'fixed' | 'markup';
  costPrice: string;
  markupPercentage: string;
}

interface ProductFormProps {
  productId?: string;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(s: string) {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (!arrays.length) return [[]];
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])),
    [[]]
  );
}

// Türkiye'deki güncel KDV oranları: %1, %10, %20
const VAT_RATES = [1, 10, 20];

const emptyVariant = (label = '', ids: string[] = []): VariantInput => ({
  label, sku: '', price: '', compareAt: '', stockQty: '0', desi: '', attributeValueIds: ids,
});

const defaultForm = (): FormState => ({
  name: '', slug: '', description: '',
  categoryId: '', brandId: '',
  isActive: true, isFeatured: false,
  vatRate: 20, vatIncluded: true,
  intensity: 0,
  selectedAttributes: {},
  variants: [emptyVariant('Varsayılan')],
  images: [],
  tags: '',
  pricingMethod: 'fixed',
  costPrice: '',
  markupPercentage: '',
});

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductForm({ productId, onClose, onSaved }: ProductFormProps) {
  const isEdit = Boolean(productId);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load reference data
  useEffect(() => {
    Promise.all([
      api.get<{ success: boolean; data: Category[] }>('/admin/categories'),
      api.get<{ success: boolean; data: Brand[] }>('/admin/brands'),
      api.get<{ success: boolean; data: Attribute[] }>('/admin/attributes'),
    ]).then(([c, b, a]) => {
      setCategories(c.data ?? []);
      setBrands(b.data ?? []);
      setAttributes(a.data ?? []);
    });
  }, []);

  // Load product if editing
  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    api.get<{ success: boolean; data: any }>(`/admin/products/${productId}`)
      .then((r) => {
        const p = r.data;

        // Rebuild selectedAttributes from variant attributeValues
        const selAttrs: Record<string, Set<string>> = {};
        for (const v of p.variants ?? []) {
          for (const av of v.attributeValues ?? []) {
            const attrId = av.attributeValue?.attribute?.id;
            const valId  = av.attributeValue?.id;
            if (attrId && valId) {
              if (!selAttrs[attrId]) selAttrs[attrId] = new Set();
              selAttrs[attrId].add(valId);
            }
          }
        }
        const selectedAttributes: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(selAttrs)) selectedAttributes[k] = [...v];

        setForm({
          name: p.name,
          slug: p.slug,
          description: p.description ?? '',
          categoryId: p.categoryId,
          brandId: p.brandId ?? '',
          isActive: p.isActive,
          isFeatured: p.isFeatured,
          vatRate: p.vatRate ?? 20,
          intensity: p.intensity ?? 0,
          vatIncluded: p.vatIncluded ?? true,
          selectedAttributes,
          pricingMethod: p.pricingMethod ?? 'fixed',
          costPrice: p.costPrice ? String(p.costPrice) : '',
          markupPercentage: p.markupPercentage ? String(p.markupPercentage) : '',
          variants: (p.variants ?? []).map((v: any) => {
            const ids: string[] = (v.attributeValues ?? []).map(
              (av: any) => av.attributeValue?.id
            ).filter(Boolean);
            return {
              id: v.id,
              label: ids.length ? ids.map((vid: string) => {
                for (const attr of p.variants[0]?.attributeValues ?? []) {
                  if (attr.attributeValue?.id === vid) return attr.attributeValue.value;
                }
                return vid;
              }).join(' / ') : v.sku,
              sku: v.sku,
              price: String(v.price),
              compareAt: v.compareAt ? String(v.compareAt) : '',
              stockQty: String(v.stockQty),
              desi: v.desi ? String(v.desi) : '',
              attributeValueIds: ids,
            };
          }),
          images: (p.images ?? []).map((img: any) => ({
            url: img.url,
            altText: img.altText ?? '',
            isPrimary: img.isPrimary,
          })),
          tags: (p.tags ?? []).map((t: any) => t.tag).join(', '),
        });
      })
      .catch(() => setError('Ürün yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [productId]);

  // ── Field helpers ──────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: toSlug(name) }));
  }

  // ── Attribute / variant helpers ────────────────────────────────────────────

  function toggleAttributeValue(attrId: string, valueId: string, checked: boolean) {
    setForm((f) => {
      const prev = f.selectedAttributes[attrId] ?? [];
      const next = checked ? [...prev, valueId] : prev.filter((id) => id !== valueId);
      return { ...f, selectedAttributes: { ...f.selectedAttributes, [attrId]: next } };
    });
  }

  function toggleAttribute(attrId: string, enabled: boolean) {
    setForm((f) => {
      const sel = { ...f.selectedAttributes };
      if (!enabled) delete sel[attrId];
      else sel[attrId] = sel[attrId] ?? [];
      return { ...f, selectedAttributes: sel };
    });
  }

  function generateCombinations() {
    const groups: { attrId: string; valueIds: string[] }[] = [];
    for (const attr of attributes) {
      const selected = form.selectedAttributes[attr.id];
      if (selected && selected.length > 0) {
        groups.push({ attrId: attr.id, valueIds: selected });
      }
    }

    if (groups.length === 0) {
      setForm((f) => ({ ...f, variants: [emptyVariant('Varsayılan')] }));
      return;
    }

    const combos = cartesianProduct(groups.map((g) => g.valueIds));

    setForm((f) => {
      const newVariants: VariantInput[] = combos.map((combo) => {
        const existing = f.variants.find(
          (v) => v.attributeValueIds.length === combo.length &&
            combo.every((id) => v.attributeValueIds.includes(id))
        );

        const labels = combo.map((vid) => {
          for (const attr of attributes) {
            const val = attr.values.find((v) => v.id === vid);
            if (val) return val.value;
          }
          return vid;
        });

        const label = labels.join(' / ');
        const slugParts = combo.map((vid) => {
          for (const attr of attributes) {
            const val = attr.values.find((v) => v.id === vid);
            if (val) return toSlug(val.value).substring(0, 5);
          }
          return vid.substring(0, 5);
        });
        const autoSku = `${toSlug(f.name || 'urun')}-${slugParts.join('-')}`;

        return existing
          ? { ...existing, label, attributeValueIds: combo }
          : emptyVariant(label, combo);
      });

      // Set auto-SKU only for new variants without a SKU
      newVariants.forEach((v, i) => {
        if (!v.sku) newVariants[i] = { ...v, sku: `${toSlug(f.name || 'urun')}-${i + 1}` };
      });

      return { ...f, variants: newVariants };
    });
  }

  function setVariant(i: number, patch: Partial<VariantInput>) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[i] = { ...variants[i], ...patch };
      return { ...f, variants };
    });
  }

  function addVariant() {
    setForm((f) => ({ ...f, variants: [...f.variants, emptyVariant()] }));
  }

  function removeVariant(i: number) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));
  }

  // ── Image helpers ──────────────────────────────────────────────────────────

  function setImage(i: number, patch: Partial<ImageInput>) {
    setForm((f) => {
      const images = [...f.images];
      if (patch.isPrimary) images.forEach((_, idx) => { images[idx] = { ...images[idx], isPrimary: false }; });
      images[i] = { ...images[i], ...patch };
      return { ...f, images };
    });
  }

  function removeImage(i: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  }

  async function uploadFiles(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (!imageFiles.length) return;

    setUploadingCount(imageFiles.length);
    setError('');

    const results = await Promise.allSettled(
      imageFiles.map((file) =>
        api.upload<{ success: boolean; data: { url: string } }>('/admin/upload/product', file)
      )
    );

    const succeeded: ImageInput[] = results
      .filter((r): r is PromiseFulfilledResult<{ success: boolean; data: { url: string } }> => r.status === 'fulfilled')
      .map((r) => ({ url: r.value.data.url, altText: '', isPrimary: false }));

    if (succeeded.length) {
      setForm((f) => {
        const images = [...f.images, ...succeeded];
        if (!images.some((img) => img.isPrimary) && images.length > 0) {
          images[0] = { ...images[0], isPrimary: true };
        }
        return { ...f, images };
      });
    }

    setUploadingCount(0);

    const failCount = results.filter((r) => r.status === 'rejected').length;
    if (failCount > 0) setError(`${failCount} görsel yüklenemedi.`);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    uploadFiles(files);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.categoryId) { setError('Kategori seçiniz.'); return; }
    if (form.variants.some((v) => !v.sku || !v.price)) {
      setError('Her varyant için SKU ve fiyat zorunludur.');
      return;
    }

    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || undefined,
      categoryId: form.categoryId,
      brandId: form.brandId || undefined,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      vatRate: form.vatRate,
      intensity: form.intensity,
      vatIncluded: form.vatIncluded,
      pricingMethod: form.pricingMethod,
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      markupPercentage: form.markupPercentage ? Number(form.markupPercentage) : undefined,
      variants: form.variants.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        sku: v.sku,
        price: Number(v.price),
        compareAt: v.compareAt ? Number(v.compareAt) : undefined,
        stockQty: Number(v.stockQty),
        desi: v.desi ? Number(v.desi) : undefined,
        attributeValueIds: v.attributeValueIds,
      })),
      images: form.images.map((img, i) => ({
        url: img.url,
        altText: img.altText || undefined,
        isPrimary: img.isPrimary,
        sortOrder: i,
      })),
      tags: form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/admin/products/${productId}`, payload);
      } else {
        await api.post('/admin/products', payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt hatası');
    } finally {
      setSaving(false);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeAttrCount = Object.values(form.selectedAttributes).filter((v) => v.length > 0).length;
  const comboCount = activeAttrCount === 0 ? 0 : cartesianProduct(
    Object.values(form.selectedAttributes).filter((v) => v.length > 0)
  ).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-2xl bg-white dark:bg-boxdark shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stroke dark:border-strokedark shrink-0">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            {isEdit ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

            {error && (
              <div className="rounded bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
            )}

            {/* ── Temel Bilgiler ── */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Temel Bilgiler</h3>
              <div className="space-y-4">

                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-1">Ürün Adı *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className={inputCls}
                    placeholder="Örn: Beyaz Gold Çeyiz Seti"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-1">Slug *</label>
                  <input
                    required
                    value={form.slug}
                    onChange={(e) => set('slug', e.target.value)}
                    className={inputCls}
                    placeholder="beyaz-gold-ceyiz-seti"
                  />
                  <p className="text-xs text-gray-400 mt-1">Ad girildiğinde otomatik oluşur, düzenleyebilirsiniz.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white mb-1">Kategori *</label>
                    <select
                      required
                      value={form.categoryId}
                      onChange={(e) => set('categoryId', e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Seçiniz...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white mb-1">Marka</label>
                    <select
                      value={form.brandId}
                      onChange={(e) => set('brandId', e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Seçiniz...</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-1">Açıklama</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    rows={3}
                    className={inputCls}
                    placeholder="Ürün açıklaması..."
                  />
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => set('isActive', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary"
                    />
                    <span className="text-sm text-black dark:text-white">Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(e) => set('isFeatured', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary"
                    />
                    <span className="text-sm text-black dark:text-white">Öne Çıkan</span>
                  </label>
                </div>

                {/* KDV Ayarları */}
                <div className="rounded-lg border border-stroke dark:border-strokedark p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">KDV Ayarları</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white mb-1">KDV Oranı</label>
                      <select
                        value={form.vatRate}
                        onChange={(e) => set('vatRate', Number(e.target.value))}
                        className={inputCls}
                      >
                        {VAT_RATES.map((r) => (
                          <option key={r} value={r}>%{r}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col justify-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.vatIncluded}
                          onChange={(e) => set('vatIncluded', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary"
                        />
                        <span className="text-sm text-black dark:text-white">Fiyata KDV Dahil</span>
                      </label>
                      <p className="text-xs text-gray-400 mt-1">
                        {form.vatIncluded
                          ? 'Girilen fiyat müşterinin ödeyeceği KDV dahil fiyattır.'
                          : 'Girilen fiyat KDV hariç net fiyattır. Müşteriye KDV dahil gösterilir.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Intensity */}
                <div className="rounded-lg border border-stroke dark:border-strokedark p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Ürün Özellikleri</h4>
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white mb-2">Sertlik Derecesi (0-5)</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="5"
                        value={form.intensity}
                        onChange={(e) => set('intensity', Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex items-center gap-1 min-w-fit">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <svg
                            key={n}
                            className={`w-5 h-5 transition-colors ${
                              n <= form.intensity
                                ? 'fill-amber-600 text-amber-600'
                                : 'fill-gray-300 text-gray-300 dark:fill-gray-600 dark:text-gray-600'
                            }`}
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                          </svg>
                        ))}
                        <span className="ml-2 text-sm font-semibold text-black dark:text-white min-w-[2rem]">{form.intensity}/5</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Ürünün sertlik (yoğunluk) derecesini belirleyin. Müşterilere detail sayfasında gösterilecektir.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Fiyatlandırma ── */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Fiyatlandırma Yöntemi</h3>
              <div className="space-y-3">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={form.pricingMethod === 'fixed'} onChange={() => set('pricingMethod', 'fixed')} className="h-4 w-4" />
                    <span className="text-sm text-black dark:text-white">Sabit Fiyat</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={form.pricingMethod === 'markup'} onChange={() => set('pricingMethod', 'markup')} className="h-4 w-4" />
                    <span className="text-sm text-black dark:text-white">Alış Fiyatı + Marj</span>
                  </label>
                </div>
                {form.pricingMethod === 'markup' && (
                  <div className="grid grid-cols-2 gap-4 mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <input type="number" placeholder="Alış Fiyatı" value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)} className={inputCls} />
                    <input type="number" placeholder="Marj %" value={form.markupPercentage} onChange={(e) => set('markupPercentage', e.target.value)} className={inputCls} />
                  </div>
                )}
              </div>
            </section>

            {/* ── Görseller ── */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
                Görseller ({form.images.length})
              </h3>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !uploadingCount && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-4 ${
                  isDragging
                    ? 'border-primary bg-primary/5 cursor-copy'
                    : uploadingCount
                    ? 'border-stroke cursor-not-allowed'
                    : 'border-stroke dark:border-strokedark hover:border-primary cursor-pointer'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileInput}
                />
                {uploadingCount > 0 ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm text-gray-500">{uploadingCount} görsel yükleniyor...</span>
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto h-10 w-10 text-gray-300 mb-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-sm text-gray-500">Görsel seçmek için tıklayın veya buraya sürükleyin</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, GIF · Maks. 5 MB</p>
                  </>
                )}
              </div>

              {form.images.length > 0 && (
                <div className="space-y-2">
                  {form.images.map((img, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-stroke dark:border-strokedark">
                      <img
                        src={img.url}
                        alt=""
                        className="h-14 w-14 rounded object-cover shrink-0 bg-gray-100"
                      />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <input
                          value={img.altText}
                          onChange={(e) => setImage(i, { altText: e.target.value })}
                          className={inputSmCls}
                          placeholder="Alt metin (isteğe bağlı)"
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={img.isPrimary}
                            onChange={(e) => setImage(i, { isPrimary: e.target.checked })}
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-xs text-gray-600">Ana görsel</span>
                          {img.isPrimary && (
                            <span className="text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded">
                              ANA
                            </span>
                          )}
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="text-meta-1 hover:text-red-700 text-lg leading-none shrink-0"
                        title="Görseli kaldır"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Varyant Özellikleri ── */}
            {attributes.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Varyant Özellikleri</h3>

                <div className="space-y-3">
                  {attributes.map((attr) => {
                    const isChecked = attr.id in form.selectedAttributes;
                    const selectedVals = form.selectedAttributes[attr.id] ?? [];
                    return (
                      <div key={attr.id} className="rounded-lg border border-stroke dark:border-strokedark p-3">
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => toggleAttribute(attr.id, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary"
                          />
                          <span className="text-sm font-medium text-black dark:text-white">{attr.name}</span>
                          <span className="text-xs text-gray-400">({attr.values.length} değer)</span>
                        </label>

                        {isChecked && attr.values.length > 0 && (
                          <div className="flex flex-wrap gap-2 pl-6">
                            {attr.values.map((val) => {
                              const sel = selectedVals.includes(val.id);
                              return (
                                <label
                                  key={val.id}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
                                    sel
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-stroke text-gray-600 hover:border-primary'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={sel}
                                    onChange={(e) => toggleAttributeValue(attr.id, val.id, e.target.checked)}
                                    className="sr-only"
                                  />
                                  {attr.inputType === 'color' && val.colorHex && (
                                    <span
                                      className="h-3 w-3 rounded-full border border-black/10 shrink-0"
                                      style={{ background: val.colorHex }}
                                    />
                                  )}
                                  {val.value}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {comboCount > 0 && (
                  <button
                    type="button"
                    onClick={generateCombinations}
                    className="mt-3 w-full py-2 rounded border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition"
                  >
                    Kombinasyonları Üret ({comboCount} varyant)
                  </button>
                )}
              </section>
            )}

            {/* ── Varyantlar ── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Varyantlar ({form.variants.length})
                </h3>
                <button type="button" onClick={addVariant} className={btnSecondary}>
                  + Manuel Ekle
                </button>
              </div>

              <div className="space-y-4">
                {form.variants.map((v, vi) => (
                  <div key={vi} className="rounded-lg border border-stroke dark:border-strokedark p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-500">Varyant {vi + 1}</span>
                        {v.attributeValueIds.length > 0
                          ? v.attributeValueIds.map((vid) => {
                              let label = vid;
                              let color: string | null | undefined;
                              let isColor = false;
                              for (const attr of attributes) {
                                const val = attr.values.find((av) => av.id === vid);
                                if (val) { label = val.value; color = val.colorHex; isColor = attr.inputType === 'color'; break; }
                              }
                              return (
                                <span key={vid} className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  {isColor && color && (
                                    <span className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ background: color }} />
                                  )}
                                  {label}
                                </span>
                              );
                            })
                          : <span className="text-xs text-gray-400">{v.label || 'Varsayılan'}</span>
                        }
                      </div>
                      {form.variants.length > 1 && (
                        <button type="button" onClick={() => removeVariant(vi)}
                          className="text-xs text-meta-1 hover:underline shrink-0 ml-2">
                          Kaldır
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">SKU *</label>
                        <input
                          required
                          value={v.sku}
                          onChange={(e) => setVariant(vi, { sku: e.target.value })}
                          className={inputSmCls}
                          placeholder="SKU-001"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Stok Adedi *</label>
                        <input
                          required
                          type="number"
                          min={0}
                          value={v.stockQty}
                          onChange={(e) => setVariant(vi, { stockQty: e.target.value })}
                          className={inputSmCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Fiyat (₺) · {form.vatIncluded ? 'KDV Dahil' : 'KDV Hariç'} *
                        </label>
                        <input
                          required
                          type="number"
                          min={0}
                          step="0.01"
                          value={v.price}
                          onChange={(e) => setVariant(vi, { price: e.target.value })}
                          className={inputSmCls}
                          placeholder="0.00"
                        />
                        {v.price && Number(v.price) > 0 && form.vatRate > 0 && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {form.vatIncluded
                              ? `KDV Hariç: ${(Number(v.price) / (1 + form.vatRate / 100)).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 })}`
                              : `KDV Dahil: ${(Number(v.price) * (1 + form.vatRate / 100)).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 })}`
                            }
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Karşılaştırma Fiyatı (₺)</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={v.compareAt}
                          onChange={(e) => setVariant(vi, { compareAt: e.target.value })}
                          className={inputSmCls}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Desi (Kargo Ağırlığı)</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={v.desi}
                          onChange={(e) => setVariant(vi, { desi: e.target.value })}
                          className={inputSmCls}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Etiketler ── */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Etiketler</h3>
              <input
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
                className={inputCls}
                placeholder="çeyiz, altın, set (virgülle ayırın)"
              />
            </section>

            {/* ── Footer ── */}
            <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-white dark:bg-boxdark border-t border-stroke dark:border-strokedark flex justify-end gap-3">
              <button type="button" onClick={onClose}
                className="px-5 py-2 rounded border border-stroke text-sm hover:bg-gray-50 dark:hover:bg-meta-4">
                İptal
              </button>
              <button type="submit" disabled={saving || uploadingCount > 0}
                className="px-6 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Ürün Ekle'}
              </button>
            </div>

          </form>
        )}
      </aside>
    </>
  );
}

// ─── Style constants ──────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary';

const inputSmCls =
  'w-full rounded border border-stroke bg-transparent px-2.5 py-1.5 text-xs text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white';

const btnSecondary =
  'px-3 py-1.5 rounded border border-stroke text-xs font-medium hover:bg-gray-50 dark:hover:bg-meta-4 transition';

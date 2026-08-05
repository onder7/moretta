import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { QuillEditor } from '../../components/QuillEditor';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  children?: { id: string; name: string; parentId?: string | null; children?: { id: string; name: string }[] }[];
}
interface Brand    { id: string; name: string }

interface AttributeValue { id: string; value: string; colorHex?: string | null; sortOrder: number }
interface Attribute { id: string; name: string; slug: string; inputType: string; sortOrder: number; values: AttributeValue[] }

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

// Türkiye'deki güncel KDV oranları: %1, %10, %20
const VAT_RATES = [1, 10, 20];

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
  selectedAttributes: Record<string, string[]>; // attributeId → seçili valueId[]
  variants: VariantInput[];
  images: ImageInput[];
  tags: string;
  pricingMethod: 'fixed' | 'markup';
  costPrice: string;
  markupPercentage: string;
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

function fmtPrice(n: string | number) {
  return Number(n).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (!arrays.length) return [[]];
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])),
    [[]]
  );
}

const defaultForm = (): FormState => ({
  name: '', slug: '', description: '',
  categoryId: '', brandId: '',
  isActive: true, isFeatured: false,
  vatRate: 20, vatIncluded: true,
  intensity: 0,
  selectedAttributes: {},
  variants: [],
  images: [],
  tags: '',
  pricingMethod: 'fixed',
  costPrice: '',
  markupPercentage: '',
});

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Card({ title, children, action, className = '' }: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark ${className}`}>
      <div className="px-5 py-3.5 border-b border-stroke dark:border-strokedark flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary';

const inputSmCls =
  'w-full rounded border border-stroke bg-transparent px-2.5 py-1.5 text-xs text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const { id: productId } = useParams<{ id: string }>();
  const isNew = !productId || productId === 'new';
  const navigate = useNavigate();

  const [form, setForm]             = useState<FormState>(defaultForm());
  const [globalTaxRate, setGlobalTaxRate] = useState(20);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands]         = useState<Brand[]>([]);
  const [loading, setLoading]       = useState(!isNew);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError]           = useState('');
  const [savedOk, setSavedOk]       = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load categories, brands & attributes
  useEffect(() => {
    Promise.all([
      api.get<{ success: boolean; data: Category[] }>('/admin/categories'),
      api.get<{ success: boolean; data: Brand[] }>('/admin/brands'),
      api.get<{ success: boolean; data: Attribute[] }>('/admin/attributes'),
      api.get<{ taxRate: number }>('/tax-config'),
    ]).then(([c, b, a, t]) => {
      setCategories(c.data ?? []);
      setBrands(b.data ?? []);
      setAttributes(a.data ?? []);
      const rate = (t as any)?.data?.taxRate ?? (t as any)?.taxRate;
      if (rate) setGlobalTaxRate(rate);
    });
  }, []);

  // Load product for edit
  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    api.get<{ success: boolean; data: any }>(`/admin/products/${productId}`)
      .then((r) => {
        const p = r.data;

        // Mevcut varyantlardan seçili attribute'ları geri çöz
        const selectedAttributes: Record<string, string[]> = {};
        const variants: VariantInput[] = p.variants.map((v: any) => {
          const valueIds: string[] = (v.attributeValues ?? []).map(
            (av: any) => av.attributeValue.id
          );
          // Her valueId'nin hangi attribute'a ait olduğunu bul ve seçiliye ekle
          valueIds.forEach((vid: string) => {
            (v.attributeValues ?? []).forEach((av: any) => {
              if (av.attributeValue.id === vid) {
                const attrId = av.attributeValue.attribute.id;
                if (!selectedAttributes[attrId]) selectedAttributes[attrId] = [];
                if (!selectedAttributes[attrId].includes(vid)) {
                  selectedAttributes[attrId].push(vid);
                }
              }
            });
          });

          const label = (v.attributeValues ?? [])
            .map((av: any) => av.attributeValue.value)
            .join(' / ') || `Varyant`;

          return {
            id: v.id,
            label,
            sku: v.sku,
            price: String(v.price),
            compareAt: v.compareAt ? String(v.compareAt) : '',
            stockQty: String(v.stockQty),
            desi: v.desi ? String(v.desi) : '',
            attributeValueIds: valueIds,
          };
        });

        setForm({
          name: p.name,
          slug: p.slug,
          description: p.description ?? '',
          categoryId: p.categoryId,
          brandId: p.brandId ?? '',
          isActive: p.isActive,
          isFeatured: p.isFeatured,
          vatRate: p.vatRate ?? 20,
          vatIncluded: p.vatIncluded ?? true,
          intensity: p.intensity ?? 0,
          pricingMethod: p.pricingMethod ?? 'fixed',
          costPrice: p.costPrice ? String(p.costPrice) : '',
          markupPercentage: p.markupPercentage ? String(p.markupPercentage) : '',
          selectedAttributes,
          variants,
          images: p.images.map((img: any) => ({
            url: img.url,
            altText: img.altText ?? '',
            isPrimary: img.isPrimary,
          })),
          tags: p.tags.map((t: any) => t.tag).join(', '),
        });
      })
      .catch(() => setError('Ürün yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [productId, isNew]);

  // Markup modda varyant fiyatlarını otomatik hesapla & güncelle
  useEffect(() => {
    if (form.pricingMethod === 'markup' && form.costPrice && form.markupPercentage) {
      setForm((f) => ({
        ...f,
        variants: f.variants.map((v) => {
          const cost = Number(f.costPrice);
          const margin = Number(f.markupPercentage);
          const calculated = cost + (cost * margin / 100);
          return { ...v, price: calculated.toFixed(2) };
        }),
      }));
    }
  }, [form.pricingMethod, form.costPrice, form.markupPercentage]);

  // ── Form helpers ─────────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: toSlug(name) }));
  }

  // Variant fiyatını pricing method'a göre hesapla (display için)
  function calculateVariantPrice(variant: VariantInput): string {
    if (form.pricingMethod === 'markup' && form.costPrice && form.markupPercentage) {
      const cost = Number(form.costPrice);
      const margin = Number(form.markupPercentage);
      const calculated = cost + (cost * margin / 100);
      return calculated.toFixed(2);
    }
    return variant.price; // Fixed mode: manuel değer
  }

  // ── Attribute seçimi ──────────────────────────────────────────────────────────

  function toggleAttributeValue(attrId: string, valueId: string, checked: boolean) {
    setForm((f) => {
      const prev = f.selectedAttributes[attrId] ?? [];
      const next = checked ? [...prev, valueId] : prev.filter((id) => id !== valueId);
      return { ...f, selectedAttributes: { ...f.selectedAttributes, [attrId]: next } };
    });
  }

  function toggleAttribute(attrId: string, enabled: boolean) {
    setForm((f) => {
      const next = { ...f.selectedAttributes };
      if (!enabled) delete next[attrId];
      else next[attrId] = next[attrId] ?? [];
      return { ...f, selectedAttributes: next };
    });
  }

  // ── Kartezyen kombinasyon üretimi ─────────────────────────────────────────────

  function generateCombinations() {
    // Her seçili attribute için seçili valueId listesi
    const attrIds = Object.keys(form.selectedAttributes).filter(
      (id) => form.selectedAttributes[id].length > 0
    );

    if (attrIds.length === 0) {
      // Özellik seçilmemişse tek boş varyant
      setForm((f) => ({
        ...f,
        variants: [{
          label: 'Standart',
          sku: toSlug(f.name) || 'urun',
          price: '', compareAt: '', stockQty: '0', desi: '',
          attributeValueIds: [],
        }],
      }));
      return;
    }

    const groups = attrIds.map((attrId) => form.selectedAttributes[attrId]);
    const combos = cartesianProduct(groups); // string[][] (valueId combinations)

    // Her kombinasyon için mevcut varyantı koru ya da yeni oluştur
    const newVariants: VariantInput[] = combos.map((combo) => {
      const existing = form.variants.find(
        (v) => combo.every((vid) => v.attributeValueIds.includes(vid)) &&
               v.attributeValueIds.length === combo.length
      );

      // Label: her değerin gösterim adını bul
      const label = combo
        .map((vid) => {
          for (const attr of attributes) {
            const val = attr.values.find((v) => v.id === vid);
            if (val) return val.value;
          }
          return vid;
        })
        .join(' / ');

      const slugBase = toSlug(form.name || 'urun');
      const skuSuffix = combo
        .map((vid) => {
          for (const attr of attributes) {
            const val = attr.values.find((v) => v.id === vid);
            if (val) return toSlug(val.value).substring(0, 4);
          }
          return vid.substring(0, 4);
        })
        .join('-');

      return existing
        ? { ...existing, label, attributeValueIds: combo }
        : {
            label,
            sku: `${slugBase}-${skuSuffix}`,
            price: '', compareAt: '', stockQty: '0', desi: '',
            attributeValueIds: combo,
          };
    });

    setForm((f) => ({ ...f, variants: newVariants }));
  }

  // ── Varyant helper ────────────────────────────────────────────────────────────

  function setVariant(i: number, patch: Partial<VariantInput>) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[i] = { ...variants[i], ...patch };
      return { ...f, variants };
    });
  }

  function removeVariant(i: number) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));
  }

  // ── Image helpers ─────────────────────────────────────────────────────────────

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
    uploadFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.categoryId) { setError('Kategori seçiniz.'); return; }
    if (form.variants.length === 0) { setError('En az bir varyant gereklidir. "Kombinasyon Üret" butonunu kullanın.'); return; }
    // Markup modda fiyatları otomatik hesapla
    const variantsToSave = form.variants.map((v) => {
      if (form.pricingMethod === 'markup' && form.costPrice && form.markupPercentage && !v.price) {
        const cost = Number(form.costPrice);
        const margin = Number(form.markupPercentage);
        const calculated = cost + (cost * margin / 100);
        return { ...v, price: calculated.toString() };
      }
      return v;
    });

    if (variantsToSave.some((v) => !v.sku || !v.price)) {
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
      vatIncluded: form.vatIncluded,
      intensity: form.intensity,
      pricingMethod: form.pricingMethod,
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      markupPercentage: form.markupPercentage ? Number(form.markupPercentage) : undefined,
      variants: variantsToSave.map((v) => ({
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
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    };
    setSaving(true);
    try {
      if (isNew) {
        const r = await api.post<{ success: boolean; data: { id: string } }>('/admin/products', payload);
        navigate(`/products/${r.data.id}`, { replace: true });
      } else {
        await api.put(`/admin/products/${productId}`, payload);
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt hatası');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/admin/products/${productId}`);
      navigate('/products', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silme hatası');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-10 w-10 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const primaryImage = form.images.find((img) => img.isPrimary) ?? form.images[0];
  const categoryName = categories.find((c) => c.id === form.categoryId)?.name;
  const brandName    = brands.find((b) => b.id === form.brandId)?.name;

  return (
    <form onSubmit={handleSubmit}>

      {/* ── Top Bar ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
            <Link to="/products" className="hover:text-primary transition-colors">Ürünler</Link>
            <span>/</span>
            <span className="text-black dark:text-white font-medium">
              {isNew ? 'Yeni Ürün' : form.name || '...'}
            </span>
          </nav>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            {isNew ? 'Yeni Ürün Ekle' : 'Ürün Düzenle'}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {savedOk && (
            <span className="text-sm text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
              Kaydedildi ✓
            </span>
          )}

          {!isNew && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm font-medium hover:bg-red-100 transition"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sil
            </button>
          )}

          {confirmDelete && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <span className="text-sm text-red-700">Emin misiniz?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded disabled:opacity-50"
              >
                {deleting ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 px-2 py-1">
                Vazgeç
              </button>
            </div>
          )}

          <Link
            to="/products"
            className="px-4 py-2 rounded-lg border border-stroke bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4 transition"
          >
            ← Listeye Dön
          </Link>

          <button
            type="submit"
            disabled={saving || uploadingCount > 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
          >
            {saving ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Kaydediliyor...
              </>
            ) : (
              isNew ? '+ Ürün Ekle' : 'Değişiklikleri Kaydet'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ─── Left Column ─── */}
        <div className="flex flex-col gap-5">

          {/* Kart 1: Ürün Özeti */}
          {!isNew && (
            <Card title="Ürün Özeti">
              <div className="flex gap-4 items-start">
                <div className="h-20 w-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                  {primaryImage ? (
                    <img src={primaryImage.url} alt={form.name} className="h-full w-full object-cover" />
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="#d1d5db" strokeWidth="1.5"/>
                      <path d="M3 15l5-5 4 4 3-3 6 6" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-black dark:text-white text-sm line-clamp-2">{form.name || '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">/{form.slug}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {categoryName && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{categoryName}</span>
                    )}
                    {brandName && (
                      <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{brandName}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${form.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {form.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                    {form.isFeatured && (
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">★ Öne Çıkan</span>
                    )}
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      KDV {form.vatIncluded ? 'Dahil' : 'Hariç'} %{globalTaxRate}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Kart 2: Temel Bilgiler */}
          <Card title="Temel Bilgiler">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ürün Adı *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={inputCls}
                  placeholder="Örn: Beyaz Gold Çeyiz Seti"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Slug *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">/</span>
                  <input
                    required
                    value={form.slug}
                    onChange={(e) => set('slug', e.target.value)}
                    className={inputCls + ' pl-6'}
                    placeholder="beyaz-gold-ceyiz-seti"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Kategori *</label>
                <select
                  required
                  value={form.categoryId}
                  onChange={(e) => set('categoryId', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Seçiniz...</option>
                  {categories.map((parent) => {
                    const subs = parent.children ?? [];
                    if (subs.length === 0) {
                      return <option key={parent.id} value={parent.id}>{parent.name}</option>;
                    }
                    return (
                      <optgroup key={parent.id} label={parent.name}>
                        <option value={parent.id}>— {parent.name} (tümü)</option>
                        {subs.map((sub) => {
                          const grands = sub.children ?? [];
                          return [
                            <option key={sub.id} value={sub.id}>↳ {sub.name}</option>,
                            ...grands.map((g) => (
                              <option key={g.id} value={g.id}>&nbsp;&nbsp;↳↳ {g.name}</option>
                            )),
                          ];
                        })}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Marka</label>
                <select
                  value={form.brandId}
                  onChange={(e) => set('brandId', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Seçiniz...</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Açıklama</label>
                <QuillEditor
                  value={form.description}
                  onChange={(html) => set('description', html)}
                />
              </div>

              {/* Toggle switches */}
              <div className="flex flex-col gap-3 pt-1">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">Aktif</p>
                    <p className="text-xs text-gray-400">Müşteriler bu ürünü görebilir</p>
                  </div>
                  <div
                    onClick={() => set('isActive', !form.isActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${form.isActive ? 'bg-primary' : 'bg-gray-200 dark:bg-strokedark'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">Öne Çıkan</p>
                    <p className="text-xs text-gray-400">Ana sayfada gösterilir</p>
                  </div>
                  <div
                    onClick={() => set('isFeatured', !form.isFeatured)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${form.isFeatured ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-strokedark'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isFeatured ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>
              </div>
            </div>
          </Card>

          {/* Kart 3: KDV Ayarları */}
          <Card title="KDV Ayarları">
            <div className="space-y-4">
              {/* KDV oranı artık Sistem Ayarları → KDV'den yönetiliyor */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                KDV oranı tüm ürünler için <strong>Sistem Ayarları → KDV</strong> bölümünden tek merkezden belirlenir. Ürün sayfası, sepet ve ödeme adımı hep aynı oranı kullanır.
              </div>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-black dark:text-white">Fiyata KDV Dahil</p>
                  <p className="text-xs text-gray-400">
                    {form.vatIncluded
                      ? 'Girilen fiyat KDV dahil (müşterinin ödediği son fiyat)'
                      : 'Girilen fiyat KDV hariç — müşteriye KDV eklenerek gösterilir'}
                  </p>
                </div>
                <div
                  onClick={() => set('vatIncluded', !form.vatIncluded)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ml-3 ${form.vatIncluded ? 'bg-primary' : 'bg-gray-200 dark:bg-strokedark'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.vatIncluded ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              <div className="rounded-lg bg-gray-50 dark:bg-meta-4 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                {form.vatIncluded
                  ? 'Fiyat olduğu gibi gösterilir. Sepette KDV ayrıca eklenmez.'
                  : 'Fiyata global KDV oranı eklenerek müşteriye gösterilir. Sepette de aynı oran uygulanır.'}
              </div>
            </div>
          </Card>

          {/* Sertlik Derecesi */}
          <Card title="Sertlik Derecesi">
            <div>
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
              <p className="text-xs text-gray-400 mt-2">Müşterilere ürün detay sayfasında gösterilir.</p>
            </div>
          </Card>

          {/* Fiyatlandırma */}
          <Card title="Fiyatlandırma Yöntemi">
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
                  <span className="text-sm text-black dark:text-white">Alış Fiyatı + %</span>
                </label>
              </div>
              {form.pricingMethod === 'markup' && (
                <div className="grid grid-cols-2 gap-4 mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <input type="number" placeholder="Alış Fiyatı" value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)} className={inputCls} />
                  <input type="number" placeholder="Marj %" value={form.markupPercentage} onChange={(e) => set('markupPercentage', e.target.value)} className={inputCls} />
                </div>
              )}
            </div>
          </Card>

          {/* Kart 4: Etiketler */}
          <Card title="Etiketler">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Virgülle ayırarak girin
            </label>
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              className={inputCls}
              placeholder="çeyiz, altın, set"
            />
            {form.tags && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {form.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                  <span key={tag} className="text-xs bg-gray-100 dark:bg-meta-4 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ─── Right Column (2/3) ─── */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Kart 5: Görseller */}
          <Card
            title={`Görseller${form.images.length > 0 ? ` (${form.images.length})` : ''}`}
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !uploadingCount && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors mb-4 ${
                isDragging ? 'border-primary bg-primary/5 cursor-copy'
                : uploadingCount ? 'border-stroke cursor-not-allowed'
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
                  <span className="text-sm text-gray-500">{uploadingCount} görsel yükleniyor…</span>
                </div>
              ) : (
                <>
                  <svg className="mx-auto mb-2 text-gray-300" width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-sm text-gray-500">Görseli sürükle veya tıkla</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · Maks. 5 MB</p>
                </>
              )}
            </div>

            {form.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {form.images.map((img, i) => (
                  <div key={i} className={`relative rounded-xl overflow-hidden border-2 transition-colors group ${img.isPrimary ? 'border-primary' : 'border-stroke dark:border-strokedark hover:border-gray-300'}`}>
                    <img src={img.url} alt={img.altText || ''} className="w-full aspect-square object-cover" />
                    {img.isPrimary && (
                      <span className="absolute top-1.5 left-1.5 text-[10px] bg-primary text-white font-semibold px-1.5 py-0.5 rounded-md">Ana</span>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      {!img.isPrimary && (
                        <button type="button" onClick={() => setImage(i, { isPrimary: true })} title="Ana görsel yap"
                          className="bg-white text-xs text-gray-700 px-2 py-1 rounded-lg font-medium hover:bg-primary hover:text-white transition">
                          Ana
                        </button>
                      )}
                      <button type="button" onClick={() => removeImage(i)} title="Kaldır"
                        className="bg-white text-red-600 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-600 hover:text-white transition">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Kart 6: Özellik Seçimi (Varyant Parametreleri) */}
          <Card
            title="Varyant Özellikleri"
            action={
              <a href="/admin/attributes" target="_blank" className="text-xs text-primary hover:underline">
                Özellik Yönetimi →
              </a>
            }
          >
            {attributes.length === 0 ? (
              <p className="text-sm text-gray-400">
                Henüz özellik tanımlanmamış.{' '}
                <a href="/admin/attributes" className="text-primary hover:underline">Özellik Yönetimi</a>
                {' '}sayfasından Renk, Beden vb. ekleyin.
              </p>
            ) : (
              <div className="space-y-4">
                {attributes.map((attr) => {
                  const isEnabled = attr.id in form.selectedAttributes;
                  return (
                    <div key={attr.id} className="rounded-lg border border-stroke dark:border-strokedark p-3 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => toggleAttribute(attr.id, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary"
                        />
                        <span className="text-sm font-medium text-black dark:text-white">{attr.name}</span>
                        <span className="text-[10px] text-gray-400">({attr.values.length} değer)</span>
                      </label>
                      {isEnabled && (
                        <div className="flex flex-wrap gap-2 pl-6">
                          {attr.values.map((val) => {
                            const checked = form.selectedAttributes[attr.id]?.includes(val.id) ?? false;
                            return (
                              <label key={val.id} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => toggleAttributeValue(attr.id, val.id, e.target.checked)}
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-primary"
                                />
                                {attr.inputType === 'color' && val.colorHex && (
                                  <span className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: val.colorHex }} />
                                )}
                                <span className="text-xs text-black dark:text-white">{val.value}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={generateCombinations}
                  className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-opacity-90 transition flex items-center justify-center gap-2"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3a3 3 0 1 0 6 0 3 3 0 0 0-6 0z" fill="currentColor"/>
                  </svg>
                  Kombinasyonları Üret ({
                    (() => {
                      const groups = Object.values(form.selectedAttributes).filter((g) => g.length > 0);
                      return groups.length ? groups.reduce((p, g) => p * g.length, 1) : 0;
                    })()
                  } kombinasyon)
                </button>
              </div>
            )}
          </Card>

          {/* Kart 7: Varyant Tablosu */}
          {form.variants.length > 0 && (
            <Card title={`Varyantlar (${form.variants.length})`}>
              <div className="space-y-3">
                {form.variants.map((v, vi) => (
                  <div key={vi} className="rounded-xl border border-stroke dark:border-strokedark overflow-hidden">
                    {/* Varyant başlığı */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-meta-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {v.attributeValueIds.map((vid) => {
                          for (const attr of attributes) {
                            const val = attr.values.find((a) => a.id === vid);
                            if (val) return (
                              <span key={vid} className="flex items-center gap-1 text-xs bg-white dark:bg-boxdark border border-stroke dark:border-strokedark px-2 py-0.5 rounded-full">
                                {attr.inputType === 'color' && val.colorHex && (
                                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: val.colorHex }} />
                                )}
                                {attr.name}: <strong>{val.value}</strong>
                              </span>
                            );
                          }
                          return null;
                        })}
                        {v.attributeValueIds.length === 0 && (
                          <span className="text-xs text-gray-500">{v.label || 'Standart'}</span>
                        )}
                        {v.sku && <span className="font-mono text-[10px] text-primary">{v.sku}</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {v.price && (
                          <span className="text-xs font-medium text-black dark:text-white">
                            {fmtPrice(v.price)} <span className="text-[10px] text-gray-400">KDV {form.vatIncluded ? 'D' : 'H'}</span>
                          </span>
                        )}
                        {form.variants.length > 1 && (
                          <button type="button" onClick={() => removeVariant(vi)} className="text-xs text-red-500 hover:text-red-700">
                            Kaldır
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Varyant alanları */}
                    <div className="p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">SKU *</label>
                          <input
                            required
                            value={v.sku}
                            onChange={(e) => setVariant(vi, { sku: e.target.value })}
                            className={inputSmCls}
                            placeholder="SKU-001"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                            Fiyat {form.vatIncluded ? '(KDV D.)' : '(KDV H.)'} {form.pricingMethod === 'markup' ? '(Otomatik)' : '*'}
                          </label>
                          <input
                            required type="number" min={0} step="0.01"
                            value={form.pricingMethod === 'markup' ? calculateVariantPrice(v) : v.price}
                            onChange={(e) => form.pricingMethod === 'fixed' && setVariant(vi, { price: e.target.value })}
                            readOnly={form.pricingMethod === 'markup'}
                            className={`${inputSmCls} ${form.pricingMethod === 'markup' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 cursor-not-allowed' : ''}`}
                            placeholder="0.00"
                          />
                          {form.pricingMethod === 'markup' && form.costPrice && form.markupPercentage && (
                            <>
                              <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                                💡 {form.costPrice} + ({form.markupPercentage}%) = {calculateVariantPrice(v)}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {form.vatIncluded
                                  ? `H: ${(Number(calculateVariantPrice(v)) / (1 + globalTaxRate / 100)).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}₺`
                                  : `D: ${(Number(calculateVariantPrice(v)) * (1 + globalTaxRate / 100)).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}₺`}
                              </p>
                            </>
                          )}
                          {form.pricingMethod === 'fixed' && v.price && Number(v.price) > 0 && globalTaxRate > 0 && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {form.vatIncluded
                                ? `H: ${(Number(v.price) / (1 + globalTaxRate / 100)).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}₺`
                                : `D: ${(Number(v.price) * (1 + globalTaxRate / 100)).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}₺`}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Karş. Fiyat</label>
                          <input
                            type="number" min={0} step="0.01"
                            value={v.compareAt}
                            onChange={(e) => setVariant(vi, { compareAt: e.target.value })}
                            className={inputSmCls}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Stok</label>
                          {v.id ? (
                            <>
                              {/* Mevcut varyantta stok salt-okunur — yalnızca Stok Yönetimi ve sipariş akışı değiştirir */}
                              <input
                                type="number"
                                value={v.stockQty}
                                readOnly
                                title="Stok yalnızca Stok Yönetimi'nden düzenlenir"
                                className={inputSmCls + ' bg-gray-100 dark:bg-meta-4 cursor-not-allowed text-gray-500'}
                              />
                              <Link to="/stock-management" className="block text-[10px] text-primary hover:underline mt-1">
                                Stok Yönetimi'nden düzenle →
                              </Link>
                            </>
                          ) : (
                            <input
                              required type="number" min={0}
                              value={v.stockQty}
                              onChange={(e) => setVariant(vi, { stockQty: e.target.value })}
                              className={inputSmCls}
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Desi</label>
                          <input
                            type="number" min={0} step="0.01"
                            value={v.desi}
                            onChange={(e) => setVariant(vi, { desi: e.target.value })}
                            className={inputSmCls}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Sticky Save Bar (mobile) ── */}
      <div className="sticky bottom-0 mt-6 -mx-6 px-6 py-3 bg-white dark:bg-boxdark border-t border-stroke dark:border-strokedark flex justify-end gap-3 lg:hidden">
        <Link to="/products" className="px-4 py-2 rounded-lg border border-stroke text-sm text-gray-700 hover:bg-gray-50">
          İptal
        </Link>
        <button
          type="submit"
          disabled={saving || uploadingCount > 0}
          className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : isNew ? 'Ürün Ekle' : 'Kaydet'}
        </button>
      </div>

    </form>
  );
}

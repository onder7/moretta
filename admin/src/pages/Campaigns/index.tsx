import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  discountText: string;
  discountAmount?: number;
  discountType?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  showOnHome: boolean;
  color: string;
  displayType: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  products: any[];
}

// ISO/UTC zaman damgasını <input type="date"> için yerel YYYY-MM-DD'ye çevirir
function toDateInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const inputCls = 'w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white';
const btnPrimaryCls = 'rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90';
const btnDangerCls = 'rounded bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    discountText: '',
    discountAmount: '',
    discountType: 'percentage',
    startDate: '',
    endDate: '',
    isActive: true,
    showOnHome: false,
    color: 'primary',
    displayType: 'sticky',
    imageUrl: '',
    ctaText: '',
    ctaLink: '',
  });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
    loadProducts();
  }, []);

  function loadProducts() {
    api
      .get<{ success: boolean; data: any[] }>('/products?limit=100')
      .then((r) => {
        const prods = r.data ?? r.items ?? [];
        const productsWithPrices = (Array.isArray(prods) ? prods : []).map((p: any) => {
          const variant = p.variants?.[0];
          return {
            ...p,
            price: variant?.price ? parseFloat(String(variant.price)) : undefined,
            compareAt: variant?.compareAt ? parseFloat(String(variant.compareAt)) : undefined,
          };
        });
        setProducts(productsWithPrices);
      })
      .catch((e) => {
        console.error('Products yüklenemedi:', e);
        setProducts([]);
      });
  }

  function loadCampaigns() {
    setLoading(true);
    api
      .get<{ success: boolean; data: Campaign[] }>('/campaigns')
      .then((r) => setCampaigns(r.data ?? []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }

  function handleSave() {
    if (!form.name || !form.discountText || !form.startDate || !form.endDate) {
      alert('Tüm zorunlu alanları doldurunuz');
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name,
      description: form.description || undefined,
      discountText: form.discountText,
      discountAmount: form.discountAmount ? Number(form.discountAmount) : undefined,
      discountType: form.discountType,
      // Tarihler yerel saatle yorumlanır: başlangıç gün başı (00:00), bitiş gün sonu (23:59:59).
      // (Aksi halde "2026-06-23" UTC gece yarısı olur ve kampanya TR saatiyle 03:00'te biter.)
      startDate: new Date(`${form.startDate}T00:00:00`).toISOString(),
      endDate: new Date(`${form.endDate}T23:59:59`).toISOString(),
      isActive: form.isActive,
      showOnHome: form.showOnHome,
      color: form.color,
      displayType: form.displayType,
      imageUrl: form.imageUrl || undefined,
      ctaText: form.ctaText || undefined,
      ctaLink: form.ctaLink || undefined,
    };

    const promise = editingId
      ? api.put(`/campaigns/${editingId}`, payload)
      : api.post('/campaigns', payload);

    promise
      .then((res) => {
        const campaignId = editingId || res.data?.id;

        if (!campaignId) return res;

        // Önce mevcut ürünleri sil
        return api.delete(`/campaigns/${campaignId}/products`)
          .catch(() => {/* Ignore if no products to delete */})
          .then(() => {
            // Sonra yeni ürünleri ekle
            if (selectedProducts.length > 0) {
              return api.post(`/campaigns/${campaignId}/products`, {
                productIds: selectedProducts,
              });
            }
            return res;
          });
      })
      .then(() => {
        loadCampaigns();
        resetForm();
        setSelectedProducts([]);
        setShowForm(false);
      })
      .catch((e) => alert('Hata: ' + (e.response?.data?.error || e.message)))
      .finally(() => setSaving(false));
  }

  function resetForm() {
    setForm({
      name: '',
      description: '',
      discountText: '',
      discountAmount: '',
      discountType: 'percentage',
      startDate: '',
      endDate: '',
      isActive: true,
      showOnHome: false,
      color: 'primary',
      displayType: 'sticky',
      imageUrl: '',
      ctaText: '',
      ctaLink: '',
    });
    setSelectedProducts([]);
    setEditingId(null);
  }

  function handleEdit(campaign: Campaign) {
    setForm({
      name: campaign.name,
      description: campaign.description || '',
      discountText: campaign.discountText,
      discountAmount: campaign.discountAmount?.toString() || '',
      discountType: campaign.discountType || 'percentage',
      // Yerel tarih bileşenleriyle çöz: UTC string'i split etmek gün kaydırabilir
      startDate: toDateInput(campaign.startDate),
      endDate: toDateInput(campaign.endDate),
      isActive: campaign.isActive,
      showOnHome: campaign.showOnHome,
      color: campaign.color,
      displayType: campaign.displayType,
      imageUrl: (campaign as any).imageUrl || '',
      ctaText: campaign.ctaText || 'Kampanyayı Gör',
      ctaLink: campaign.ctaLink || `/kampanya/${campaign.id}`,
    });
    // Mevcut ürünleri yükle
    const existingProductIds = campaign.products.map((p: any) => p.product.id);
    setSelectedProducts(existingProductIds);
    setEditingId(campaign.id);
    setShowForm(true);
  }

  function handleDelete(id: string) {
    if (!confirm('Silmek istediğinizden emin misiniz?')) return;

    api
      .delete(`/campaigns/${id}`)
      .then(() => loadCampaigns())
      .catch((e) => alert('Hata: ' + (e.response?.data?.error || e.message)));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      const url = data?.data?.url;
      if (url) {
        setForm({ ...form, imageUrl: url });
        alert('Resim yüklendi!');
      } else {
        alert('Resim yüklendi ancak URL alınamadı');
      }
    } catch (err: any) {
      alert('Resim yükleme hatası: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-black dark:text-white">Kampanyalar</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className={btnPrimaryCls}
        >
          {showForm ? 'İptal' : '+ Yeni Kampanya'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-stroke bg-white p-6 dark:border-strokedark dark:bg-boxdark max-h-[80vh] overflow-y-auto">
          <h2 className="mb-4 text-xl font-bold">{editingId ? 'Kampanya Düzenle' : 'Yeni Kampanya'}</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Kampanya Adı *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                  placeholder="Yazlık İndirim Kampanyası"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">İndirim Metni *</label>
                <input
                  type="text"
                  value={form.discountText}
                  onChange={(e) => setForm({ ...form, discountText: e.target.value })}
                  className={inputCls}
                  placeholder="%-50 İndirim"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Açıklama</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputCls}
                rows={3}
                placeholder="Kampanya hakkında bilgiler..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">İndirim Miktarı</label>
                <input
                  type="number"
                  value={form.discountAmount}
                  onChange={(e) => setForm({ ...form, discountAmount: e.target.value })}
                  className={inputCls}
                  placeholder="50"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">İndirim Tipi</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                  className={inputCls}
                >
                  <option value="percentage">Yüzde (%)</option>
                  <option value="fixed">Sabit (TL)</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Görünüş</label>
                <select
                  value={form.displayType}
                  onChange={(e) => setForm({ ...form, displayType: e.target.value })}
                  className={inputCls}
                >
                  <option value="sticky">Yapışkanlı</option>
                  <option value="banner">Banner</option>
                  <option value="badge">Badge</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Kampanya Rengi</label>
                <div className="flex flex-wrap gap-2">
                  {['primary', 'red', 'orange', 'purple', 'green', 'navy'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      className={`px-4 py-2 rounded text-sm font-medium text-white transition ${
                        form.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      } ${
                        color === 'primary' ? 'bg-indigo-600' :
                        color === 'red' ? 'bg-red-600' :
                        color === 'orange' ? 'bg-orange-500' :
                        color === 'purple' ? 'bg-violet-600' :
                        color === 'green' ? 'bg-green-600' :
                        'bg-blue-800'
                      }`}
                    >
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Kampanya Resimi (Banner için)</label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="flex-1 rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white"
                  />
                  {uploading && <span className="text-sm text-gray-500 self-center">Yükleniyor...</span>}
                </div>
                {form.imageUrl && (
                  <div className="mt-2 relative w-full h-24 rounded border border-stroke overflow-hidden">
                    <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Başlama Tarihi *</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Bitiş Tarihi *</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">CTA Buton Metni</label>
                <input
                  type="text"
                  value={form.ctaText}
                  onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                  className={inputCls}
                  placeholder="İndirimlileri Gör"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">CTA Linki</label>
                <input
                  type="text"
                  value={form.ctaLink}
                  onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                  className={inputCls}
                  placeholder="/kampanya/yazlik-indirim"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <span className="text-sm">Aktif</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.showOnHome}
                  onChange={(e) => setForm({ ...form, showOnHome: e.target.checked })}
                />
                <span className="text-sm">Ana Sayfada Göster</span>
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Kampanyaya Ürün Ekle</label>
              <input
                type="text"
                placeholder="Ürün ara..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className={inputCls + ' mb-2'}
              />
              <div className="border border-stroke rounded-lg p-3 bg-gray-50 dark:bg-gray-800 max-h-64 overflow-y-auto space-y-2">
                {products
                  .filter((p) => p.compareAt && p.name?.toLowerCase().includes(productSearch.toLowerCase()))
                  .slice(0, 50)
                  .map((p) => {
                    const price = typeof p.price === 'number' ? p.price : parseFloat(String(p.price || 0));
                    const compareAt = typeof p.compareAt === 'number' ? p.compareAt : parseFloat(String(p.compareAt || 0));
                    const discount = compareAt && price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
                    return (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-gray-700 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts([...selectedProducts, p.id]);
                            } else {
                              setSelectedProducts(selectedProducts.filter((id) => id !== p.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium">{p.name}</span>
                          {compareAt && price ? (
                            <div className="text-xs text-gray-500 mt-0.5">
                              <span className="line-through">{compareAt.toFixed(2)} TL</span>
                              {' → '}
                              <span className="font-semibold text-green-600">{price.toFixed(2)} TL</span>
                              {discount > 0 && <span className="text-red-600 ml-1">({discount}% indirim)</span>}
                            </div>
                          ) : price ? (
                            <div className="text-xs text-gray-500 mt-0.5">{price.toFixed(2)} TL</div>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                {products.filter((p) => p.name?.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                  <p className="text-sm text-gray-500">Ürün bulunamadı</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {selectedProducts.length > 0 ? `${selectedProducts.length} ürün seçildi` : 'Ürün seç'}
              </p>
            </div>

            <div className="flex gap-4">
              <button onClick={handleSave} disabled={saving} className={btnPrimaryCls}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="rounded border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Yükleniyor...</div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-lg border border-stroke bg-white p-6 text-center dark:border-strokedark dark:bg-boxdark">
          <p className="text-gray-500">Kampanya bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="rounded-lg border border-stroke bg-white p-4 dark:border-strokedark dark:bg-boxdark"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-black dark:text-white">{campaign.name}</h3>
                  <p className="text-sm text-gray-500">{campaign.discountText}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-700">
                      {new Date(campaign.startDate).toLocaleDateString('tr-TR')}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-700">
                      {new Date(campaign.endDate).toLocaleDateString('tr-TR')}
                    </span>
                    {campaign.isActive && (
                      <span className="rounded bg-green-100 px-2 py-1 text-green-700 dark:bg-green-900/30">
                        Aktif
                      </span>
                    )}
                    {campaign.showOnHome && (
                      <span className="rounded bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900/30">
                        Ana Sayfada
                      </span>
                    )}
                    <span className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-700">
                      {campaign.products.length} ürün
                    </span>
                  </div>

                  {/* Products in campaign */}
                  {campaign.products.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Ürünler:</p>
                      <div className="space-y-1">
                        {campaign.products.slice(0, 3).map((cp: any) => (
                          <div key={cp.product?.id} className="text-xs text-gray-500">
                            • {cp.product?.name}
                          </div>
                        ))}
                        {campaign.products.length > 3 && (
                          <div className="text-xs text-gray-500">
                            + {campaign.products.length - 3} ürün daha
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(campaign)}
                    className={btnPrimaryCls}
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => setExpandedCampaignId(expandedCampaignId === campaign.id ? null : campaign.id)}
                    className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    {expandedCampaignId === campaign.id ? 'Kapat' : '+ Ürün Ekle'}
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className={btnDangerCls}
                  >
                    Sil
                  </button>
                </div>
              </div>

              {/* Expanded product selection for this campaign */}
              {expandedCampaignId === campaign.id && (
                <div className="mt-4 border-t border-stroke pt-4 dark:border-strokedark">
                  <h4 className="mb-3 font-medium">Kampanyaya Ürün Ekle</h4>
                  <input
                    type="text"
                    placeholder="Ürün ara..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className={inputCls + ' mb-3'}
                  />
                  <div className="mb-3 border border-stroke rounded-lg p-3 bg-gray-50 dark:bg-gray-800 max-h-48 overflow-y-auto space-y-2">
                    {products
                      .filter((p) => p.compareAt && p.name?.toLowerCase().includes(productSearch.toLowerCase()))
                      .slice(0, 50)
                      .map((p) => {
                        const price = typeof p.price === 'number' ? p.price : parseFloat(String(p.price || 0));
                        const compareAt = typeof p.compareAt === 'number' ? p.compareAt : parseFloat(String(p.compareAt || 0));
                        const discount = compareAt && price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
                        return (
                          <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-gray-700 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProducts([...selectedProducts, p.id]);
                                } else {
                                  setSelectedProducts(selectedProducts.filter((id) => id !== p.id));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium">{p.name}</span>
                              <div className="text-xs text-gray-500 mt-0.5">
                                <span className="line-through">{compareAt.toFixed(2)} TL</span>
                                {' → '}
                                <span className="font-semibold text-green-600">{price.toFixed(2)} TL</span>
                                {discount > 0 && <span className="text-red-600 ml-1">({discount}%)</span>}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    {products.filter((p) => p.compareAt && p.name?.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                      <p className="text-sm text-gray-500">İndirimli ürün bulunamadı</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (selectedProducts.length === 0) {
                          alert('Lütfen en az bir ürün seçin');
                          return;
                        }
                        try {
                          await api.post(`/campaigns/${campaign.id}/products`, {
                            productIds: selectedProducts,
                          });
                          setSelectedProducts([]);
                          setProductSearch('');
                          setExpandedCampaignId(null);
                          loadCampaigns();
                          alert('Ürünler başarıyla eklendi!');
                        } catch (e: any) {
                          alert('Hata: ' + (e.response?.data?.error || e.message));
                        }
                      }}
                      className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      {selectedProducts.length} Ürünü Ekle
                    </button>
                    <button
                      onClick={() => {
                        setExpandedCampaignId(null);
                        setSelectedProducts([]);
                        setProductSearch('');
                      }}
                      className="rounded border border-stroke px-4 py-2 text-sm font-medium dark:border-strokedark"
                    >
                      İptal
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

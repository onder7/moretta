import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Trash2, Edit2, Plus, ArrowLeft, ChevronRight, Package } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { productApi } from '@/services/productApi';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';
import { ProductCard } from '@/components/product/ProductCard';

type AddressType = 'SHIPPING' | 'BILLING' | 'BOTH';

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district?: string;
  neighborhood?: string;
  address: string;
  postalCode: string;
  type: AddressType;
}

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  postalCode: string;
  isShipping: boolean;
  isBilling: boolean;
}

function buildEmptyForm(user?: { profile?: { firstName?: string; lastName?: string; phone?: string } | null }): FormData {
  return {
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    phone: user?.profile?.phone || '',
    city: '',
    district: '',
    neighborhood: '',
    address: '',
    postalCode: '',
    isShipping: true,
    isBilling: false,
  };
}

// Tip etiketleri
function TypeBadges({ type }: { type: AddressType }) {
  return (
    <div className="flex gap-2 flex-wrap mt-1">
      {(type === 'SHIPPING' || type === 'BOTH') && (
        <span className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
          📦 Gönderim Adresi
        </span>
      )}
      {(type === 'BILLING' || type === 'BOTH') && (
        <span className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
          💳 Fatura Adresi
        </span>
      )}
    </div>
  );
}

// Form state → API type dönüşümü
function toType(isShipping: boolean, isBilling: boolean): AddressType {
  if (isShipping && isBilling) return 'BOTH';
  if (isBilling) return 'BILLING';
  return 'SHIPPING';
}

// API type → Form state dönüşümü
function fromType(type: AddressType) {
  return {
    isShipping: type === 'SHIPPING' || type === 'BOTH',
    isBilling: type === 'BILLING' || type === 'BOTH',
  };
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-espresso-100 dark:border-espresso-700 dark:bg-espresso-700 dark:text-white focus:border-primary outline-none transition-colors';

const selectClass = inputClass + ' disabled:opacity-50 disabled:cursor-not-allowed';

export function Addresses() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [typeError, setTypeError] = useState('');
  const [saveError, setSaveError] = useState('');

  const [formData, setFormData] = useState<FormData>(() => buildEmptyForm(user ?? undefined));

  const { data: addresses = [], isLoading, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const res = await fetch('/api/addresses', { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
  });

  // ─── İl / İlçe / Mahalle (kademeli) ─────────────────────────────────────────
  const { data: iller = [] } = useQuery<string[]>({
    queryKey: ['loc-iller'],
    queryFn: async () => {
      const res = await fetch('/api/locations/iller');
      if (!res.ok) return [];
      return (await res.json()).data || [];
    },
    staleTime: Infinity,
  });

  const { data: ilceler = [] } = useQuery<string[]>({
    queryKey: ['loc-ilceler', formData.city],
    queryFn: async () => {
      const res = await fetch(`/api/locations/ilceler?il=${encodeURIComponent(formData.city)}`);
      if (!res.ok) return [];
      return (await res.json()).data || [];
    },
    enabled: !!formData.city,
    staleTime: Infinity,
  });

  const { data: mahalleler = [] } = useQuery<string[]>({
    queryKey: ['loc-mahalleler', formData.city, formData.district],
    queryFn: async () => {
      const res = await fetch(
        `/api/locations/mahalleler?il=${encodeURIComponent(formData.city)}&ilce=${encodeURIComponent(formData.district)}`,
      );
      if (!res.ok) return [];
      return (await res.json()).data || [];
    },
    enabled: !!formData.city && !!formData.district,
    staleTime: Infinity,
  });

  async function handleSaveAddress() {
    setSaveError('');
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setSaveError('Ad ve soyadı zorunludur.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) {
      setSaveError('Geçerli bir telefon numarası giriniz (en az 10 rakam).');
      return;
    }
    if (!formData.city || !formData.district) {
      setSaveError('İl ve ilçe seçimi zorunludur.');
      return;
    }
    if (!formData.address.trim() || formData.address.trim().length < 5) {
      setSaveError('Adres en az 5 karakter olmalıdır.');
      return;
    }
    if (!formData.isShipping && !formData.isBilling) {
      setTypeError('En az bir adres türü seçmelisiniz.');
      return;
    }
    setTypeError('');
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/addresses/${editingId}` : '/api/addresses';
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        city: formData.city,
        district: formData.district,
        neighborhood: formData.neighborhood,
        address: formData.address.trim(),
        postalCode: formData.postalCode.trim(),
        type: toType(formData.isShipping, formData.isBilling),
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || body?.error || 'Adres kaydedilemedi');
      }
      setFormData(buildEmptyForm(user ?? undefined));
      setIsAdding(false);
      setEditingId(null);
      refetch();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setSaveError(err.message || 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAddress(id: string) {
    if (!window.confirm('Bu adresi silmek istediğinize emin misiniz?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Adres silinemedi');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu');
    } finally {
      setDeleting(null);
    }
  }

  function openNew() {
    setEditingId(null);
    setFormData(buildEmptyForm(user ?? undefined));
    setTypeError('');
    setSaveError('');
    setIsAdding(true);
  }

  function openEdit(addr: Address) {
    setEditingId(addr.id);
    setFormData({
      firstName: addr.firstName,
      lastName: addr.lastName,
      phone: addr.phone,
      city: addr.city,
      district: addr.district || '',
      neighborhood: addr.neighborhood || '',
      address: addr.address,
      postalCode: addr.postalCode,
      ...fromType(addr.type),
    });
    setTypeError('');
    setSaveError('');
    setIsAdding(true);
  }

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await productApi.categories();
      return res.data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const recentlyViewed = useRecentlyViewedStore((s) => s.items);

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-espresso-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/hesabim')} className="text-primary hover:text-primary/80 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-espresso-900 dark:text-white">Adreslerim</h1>
              <p className="text-espresso-500 dark:text-cream-400">Gönderim ve fatura adreslerinizi yönetin</p>
            </div>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white font-medium hover:bg-opacity-90 transition-all"
          >
            <Plus size={20} />
            Yeni Adres
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content — Addresses */}
          <div className="lg:col-span-2">
            {/* Address List */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : addresses.length === 0 && !isAdding ? (
              <div className="rounded-lg border-2 border-dashed border-espresso-200 bg-cream-100 p-12 text-center dark:border-espresso-700 dark:bg-espresso-800">
                <MapPin size={48} className="mx-auto text-espresso-300 mb-4" />
                <p className="text-espresso-500 dark:text-cream-400 mb-4">Henüz kayıtlı adres bulunmamaktadır</p>
                <button onClick={openNew} className="inline-block text-primary hover:underline font-medium">
                  İlk adresini ekle →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 mb-8">
                {addresses.map((addr: Address) => (
                  <div key={addr.id} className="rounded-lg border border-espresso-100 bg-white p-6 dark:border-espresso-700 dark:bg-espresso-800">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-espresso-900 dark:text-white">
                          {addr.firstName} {addr.lastName}
                        </h3>
                        <TypeBadges type={addr.type} />
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => openEdit(addr)} className="text-espresso-400 hover:text-primary transition-colors p-2">
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          disabled={deleting === addr.id}
                          className="text-espresso-400 hover:text-red-500 transition-colors p-2 disabled:opacity-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-espresso-600 dark:text-cream-300">{addr.address}</p>
                      <p className="text-espresso-600 dark:text-cream-300">
                        {addr.neighborhood && `${addr.neighborhood}, `}
                        {addr.postalCode} {addr.district && `${addr.district} / `}{addr.city}
                      </p>
                      <p className="text-espresso-500 dark:text-cream-400">📱 {addr.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add/Edit Form */}
            {isAdding && (
              <div className="rounded-lg border border-espresso-100 bg-white p-6 dark:border-espresso-700 dark:bg-espresso-800">
                <h2 className="text-xl font-bold text-espresso-900 dark:text-white mb-6">
                  {editingId ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}
                </h2>

                <div className="space-y-4">
                  {/* Ad Soyadı */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-espresso-600 dark:text-cream-300 mb-1">Ad</label>
                      <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-espresso-600 dark:text-cream-300 mb-1">Soyadı</label>
                      <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className={inputClass} />
                    </div>
                  </div>

                  {/* Telefon */}
                  <div>
                    <label className="block text-sm font-medium text-espresso-600 dark:text-cream-300 mb-1">Telefon</label>
                    <input type="tel" placeholder="+90 5XX XXX XXXX" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} />
                  </div>

                  {/* İl / İlçe / Mahalle */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-espresso-600 dark:text-cream-300 mb-1">İl</label>
                      <select
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value, district: '', neighborhood: '' })}
                        className={selectClass}
                      >
                        <option value="">Seçiniz</option>
                        {iller.map((il) => <option key={il} value={il}>{il}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-espresso-600 dark:text-cream-300 mb-1">İlçe</label>
                      <select
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value, neighborhood: '' })}
                        disabled={!formData.city}
                        className={selectClass}
                      >
                        <option value="">{formData.city ? 'Seçiniz' : 'Önce il seçin'}</option>
                        {ilceler.map((ilce) => <option key={ilce} value={ilce}>{ilce}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-espresso-600 dark:text-cream-300 mb-1">Mahalle / Köy</label>
                      <select
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                        disabled={!formData.district}
                        className={selectClass}
                      >
                        <option value="">{formData.district ? 'Seçiniz' : 'Önce ilçe seçin'}</option>
                        {mahalleler.map((mah) => <option key={mah} value={mah}>{mah}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Açık Adres */}
                  <div>
                    <label className="block text-sm font-medium text-espresso-600 dark:text-cream-300 mb-1">Açık Adres (cadde, sokak, bina, daire no)</label>
                    <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={3} className={inputClass} />
                  </div>

                  {/* Posta Kodu */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-espresso-600 dark:text-cream-300 mb-1">Posta Kodu</label>
                      <input type="text" placeholder="34200" value={formData.postalCode} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} className={inputClass} />
                    </div>
                  </div>

                  {/* Adres Türü — çoklu seçim */}
                  <div>
                    <label className="block text-sm font-medium text-espresso-600 dark:text-cream-300 mb-2">
                      Adres Türü <span className="text-xs text-espresso-300 font-normal">(birden fazla seçilebilir)</span>
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <label className={`flex items-center gap-2.5 cursor-pointer px-4 py-2.5 rounded-lg border-2 transition-all select-none ${
                        formData.isShipping
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-espresso-100 dark:border-espresso-700 hover:border-espresso-300'
                      }`}>
                        <input
                          type="checkbox"
                          checked={formData.isShipping}
                          onChange={(e) => { setFormData({ ...formData, isShipping: e.target.checked }); setTypeError(''); }}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="text-sm font-medium text-espresso-600 dark:text-cream-300">📦 Gönderim Adresi</span>
                      </label>
                      <label className={`flex items-center gap-2.5 cursor-pointer px-4 py-2.5 rounded-lg border-2 transition-all select-none ${
                        formData.isBilling
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-espresso-100 dark:border-espresso-700 hover:border-espresso-300'
                      }`}>
                        <input
                          type="checkbox"
                          checked={formData.isBilling}
                          onChange={(e) => { setFormData({ ...formData, isBilling: e.target.checked }); setTypeError(''); }}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="text-sm font-medium text-espresso-600 dark:text-cream-300">💳 Fatura Adresi</span>
                      </label>
                    </div>
                    {typeError && <p className="text-xs text-red-500 mt-1.5">{typeError}</p>}
                  </div>

                  {/* Hata mesajı */}
                  {saveError && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{saveError}</p>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-espresso-100 dark:border-espresso-700">
                    <button
                      onClick={handleSaveAddress}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all"
                    >
                      {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Ekle'}
                    </button>
                    <button
                      onClick={() => { setIsAdding(false); setEditingId(null); setFormData(buildEmptyForm(user ?? undefined)); setTypeError(''); setSaveError(''); }}
                      className="flex-1 px-4 py-2 border border-espresso-100 dark:border-espresso-700 text-espresso-600 dark:text-cream-300 font-medium rounded-lg hover:bg-cream-50 dark:hover:bg-espresso-700 transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Son Görüntülenen Ürünler — adres listesinin altında, tam genişlikte */}
            {recentlyViewed.length > 0 && (
              <div className="mt-8 rounded-lg border border-espresso-100 bg-white dark:border-espresso-700 dark:bg-espresso-800">
                <div className="p-4 border-b border-espresso-100 dark:border-espresso-700">
                  <h3 className="font-semibold text-espresso-900 dark:text-white">Son Görüntülenenler</h3>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {recentlyViewed.slice(0, 4).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Kategoriler */}
            {categories.length > 0 && (
              <div className="rounded-lg border border-espresso-100 bg-white dark:border-espresso-700 dark:bg-espresso-800">
                <div className="p-4 border-b border-espresso-100 dark:border-espresso-700">
                  <h3 className="font-semibold text-espresso-900 dark:text-white flex items-center gap-2">
                    <Package size={18} className="text-primary" />
                    Kategoriler
                  </h3>
                </div>
                <nav className="p-2">
                  {categories.slice(0, 8).map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/kategori/${cat.slug}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-espresso-600 dark:text-cream-300 hover:bg-cream-50 dark:hover:bg-espresso-700 hover:text-primary transition-colors group"
                    >
                      {cat.imageUrl ? (
                        <img src={cat.imageUrl} alt={cat.name} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {cat.name.charAt(0)}
                        </div>
                      )}
                      <span className="flex-1 font-medium">{cat.name}</span>
                      <ChevronRight size={14} className="text-espresso-300 group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </nav>
                <div className="p-3 border-t border-espresso-100 dark:border-espresso-700">
                  <Link
                    to="/urunler"
                    className="block text-center text-sm text-primary hover:underline font-medium"
                  >
                    Tüm Ürünleri Gör →
                  </Link>
                </div>
              </div>
            )}

            {/* Hesabım Hızlı Erişim */}
            <div className="rounded-lg border border-espresso-100 bg-white p-4 dark:border-espresso-700 dark:bg-espresso-800">
              <h3 className="font-semibold text-espresso-900 dark:text-white mb-3">Hesabım</h3>
              <nav className="space-y-1">
                {[
                  { to: '/hesabim', label: 'Hesap Özeti' },
                  { to: '/hesabim/siparisler', label: 'Siparişlerim' },
                  { to: '/hesabim/favoriler', label: 'Favorilerim' },
                  { to: '/hesabim/profil', label: 'Profil Bilgileri' },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-espresso-600 dark:text-cream-300 hover:bg-cream-50 dark:hover:bg-espresso-700 hover:text-primary transition-colors"
                  >
                    <span>{item.label}</span>
                    <ChevronRight size={14} className="text-espresso-300" />
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

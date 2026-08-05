import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

// ─── Tipler ──────────────────────────────────────────────────────────────────
interface Variant {
  id: string;
  sku: string | null;
  price: number;
  stockQty: number;
  isActive: boolean;
}
interface ProductResult {
  id: string;
  name: string;
  images: { url: string }[];
  variants: Variant[];
}
interface Line {
  variantId: string;
  productName: string;
  sku: string | null;
  stockQty: number;
  quantity: number;
  unitPrice: number;
}

const PAYMENT_METHODS = [
  { value: 'NAKIT', label: 'Nakit' },
  { value: 'HAVALE', label: 'Havale / EFT' },
  { value: 'KREDI_KARTI', label: 'Kredi Kartı (harici POS)' },
  { value: 'DIGER', label: 'Diğer' },
];

const STATUSES = [
  { value: 'DELIVERED', label: 'Teslim edildi' },
  { value: 'PROCESSING', label: 'Hazırlanıyor' },
  { value: 'SHIPPED', label: 'Kargoda' },
  { value: 'PENDING', label: 'Bekliyor' },
];

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
}

export default function ManualOrder() {
  const navigate = useNavigate();

  // Ürün arama
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sepet kalemleri
  const [lines, setLines] = useState<Line[]>([]);

  // Müşteri
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Adres
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [addressText, setAddressText] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Fatura
  const [isCorporate, setIsCorporate] = useState(false);
  const [billingName, setBillingName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [identityNo, setIdentityNo] = useState('');
  const [taxOffice, setTaxOffice] = useState('');

  // Ödeme & sipariş
  const [paymentMethod, setPaymentMethod] = useState('NAKIT');
  const [paid, setPaid] = useState(true);
  const [status, setStatus] = useState('DELIVERED');
  const [shippingFee, setShippingFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState('');
  const [decrementStock, setDecrementStock] = useState(true);
  const [issueInvoice, setIssueInvoice] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Ürün arama (debounce) ───────────────────────────────────────────────
  const runSearch = useCallback((q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setResults([]); return; }
    searchTimer.current = setTimeout(() => {
      setSearching(true);
      api.get<{ success: boolean; data: { products: ProductResult[] } }>(
        `/admin/products?search=${encodeURIComponent(q)}&limit=10`,
      )
        .then((r) => setResults(r.data.products))
        .catch((e) => setError(e.message))
        .finally(() => setSearching(false));
    }, 300);
  }, []);

  const addVariant = (p: ProductResult, v: Variant) => {
    if (lines.some((l) => l.variantId === v.id)) return;
    setLines((prev) => [
      ...prev,
      {
        variantId: v.id,
        productName: p.name,
        sku: v.sku,
        stockQty: v.stockQty,
        quantity: 1,
        unitPrice: Number(v.price),
      },
    ]);
    setSearch('');
    setResults([]);
  };

  const updateLine = (id: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.variantId === id ? { ...l, ...patch } : l)));
  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((l) => l.variantId !== id));

  // ─── Toplamlar ────────────────────────────────────────────────────────────
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const total = Math.max(0, subtotal - Number(discount) + Number(shippingFee));

  // ─── Kaydet ──────────────────────────────────────────────────────────────
  const submit = async () => {
    setError(null);
    if (lines.length === 0) return setError('En az bir ürün eklemelisiniz.');
    if (!firstName.trim() || !lastName.trim()) return setError('Müşteri ad ve soyadı zorunludur.');
    if (!phone.trim()) return setError('Telefon zorunludur.');
    if (!city.trim() || !district.trim() || !addressText.trim())
      return setError('İl, ilçe ve adres zorunludur.');
    if (isCorporate && !taxNumber.trim()) return setError('Kurumsal fatura için VKN zorunludur.');

    setSubmitting(true);
    try {
      const payload = {
        customer: { firstName, lastName, phone, email: email.trim() || undefined },
        address: { city, district, neighborhood, address: addressText, postalCode },
        items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPrice: l.unitPrice })),
        billing: {
          isCorporate,
          billingName: billingName.trim() || `${firstName} ${lastName}`.trim(),
          taxNumber: isCorporate ? taxNumber.trim() : undefined,
          identityNo: !isCorporate ? identityNo.trim() || undefined : undefined,
          taxOffice: isCorporate ? taxOffice.trim() || undefined : undefined,
        },
        paymentMethod,
        paid,
        status,
        shippingFee: Number(shippingFee),
        discount: Number(discount),
        note: note.trim() || undefined,
        decrementStock,
      };

      const res = await api.post<{ success: boolean; data: { id: string } }>('/admin/orders/manual', payload);
      const orderId = res.data.id;

      if (issueInvoice) {
        // Fatura hatası siparişi geçersiz kılmaz; detay sayfasındaki e-fatura
        // paneli durumu/hatayı gösterir ve tekrar denemeye izin verir.
        try { await api.post(`/admin/orders/${orderId}/e-invoice`, {}); } catch { /* detay sayfasında görünür */ }
      }
      navigate(`/orders/${orderId}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full rounded border border-stroke bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white';
  const labelCls = 'mb-1 block text-sm font-medium text-black dark:text-white';
  const card = 'rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">Manuel Satış</h2>
          <p className="mt-0.5 text-sm text-gray-500">Sistem dışı (telefon, mağaza) satışlarını kaydet ve fatura kes</p>
        </div>
        <button onClick={() => navigate('/orders')} className="text-sm text-gray-500 hover:underline">
          ← Siparişler
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* SOL: ürünler + adres */}
        <div className="space-y-6 lg:col-span-2">
          {/* Ürün ekle */}
          <div className={card}>
            <h3 className="mb-3 font-medium text-black dark:text-white">Ürünler</h3>
            <div className="relative">
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); runSearch(e.target.value); }}
                placeholder="Ürün adı veya SKU ile ara..."
                className={inputCls}
              />
              {(results.length > 0 || searching) && (
                <div className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded border border-stroke bg-white shadow-lg dark:border-strokedark dark:bg-boxdark">
                  {searching && <div className="px-3 py-2 text-sm text-gray-400">Aranıyor…</div>}
                  {results.map((p) => (
                    <div key={p.id} className="border-b border-stroke last:border-0 dark:border-strokedark">
                      <div className="px-3 pt-2 text-xs font-semibold text-gray-500">{p.name}</div>
                      {p.variants.filter((v) => v.isActive).map((v) => (
                        <button
                          key={v.id}
                          onClick={() => addVariant(p, v)}
                          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-meta-4"
                        >
                          <span>{v.sku || 'Varyant'} · <span className="text-gray-500">Stok: {v.stockQty}</span></span>
                          <span className="font-medium">{fmt(Number(v.price))}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Kalemler */}
            {lines.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stroke text-left text-xs text-gray-500 dark:border-strokedark">
                      <th className="py-2">Ürün</th>
                      <th className="py-2 w-20">Adet</th>
                      <th className="py-2 w-32">Birim Fiyat</th>
                      <th className="py-2 w-28 text-right">Tutar</th>
                      <th className="py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.variantId} className="border-b border-stroke dark:border-strokedark">
                        <td className="py-2">
                          <div className="font-medium text-black dark:text-white">{l.productName}</div>
                          <div className="text-xs text-gray-500">{l.sku} · Stok: {l.stockQty}</div>
                        </td>
                        <td className="py-2">
                          <input
                            type="number" min={1}
                            value={l.quantity}
                            onChange={(e) => updateLine(l.variantId, { quantity: Math.max(1, Number(e.target.value)) })}
                            className={inputCls}
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="number" min={0} step="0.01"
                            value={l.unitPrice}
                            onChange={(e) => updateLine(l.variantId, { unitPrice: Number(e.target.value) })}
                            className={inputCls}
                          />
                        </td>
                        <td className="py-2 text-right font-medium">{fmt(l.unitPrice * l.quantity)}</td>
                        <td className="py-2 text-right">
                          <button onClick={() => removeLine(l.variantId)} className="text-red-500 hover:text-red-700">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Müşteri */}
          <div className={card}>
            <h3 className="mb-3 font-medium text-black dark:text-white">Müşteri Bilgileri</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className={labelCls}>Ad *</label><input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Soyad *</label><input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Telefon *</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>E-posta (opsiyonel)</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Varsa mevcut hesaba bağlanır" className={inputCls} /></div>
            </div>
          </div>

          {/* Adres */}
          <div className={card}>
            <h3 className="mb-3 font-medium text-black dark:text-white">Teslimat / Fatura Adresi</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className={labelCls}>İl *</label><input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>İlçe *</label><input value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Mahalle</label><input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Posta Kodu</label><input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputCls} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Açık Adres *</label><textarea value={addressText} onChange={(e) => setAddressText(e.target.value)} rows={2} className={inputCls} /></div>
            </div>
          </div>

          {/* Fatura */}
          <div className={card}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-black dark:text-white">Fatura Bilgileri</h3>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isCorporate} onChange={(e) => setIsCorporate(e.target.checked)} />
                Kurumsal (e-Fatura)
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className={labelCls}>{isCorporate ? 'Ünvan' : 'Ad Soyad (fatura)'}</label><input value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder="Boşsa müşteri adı kullanılır" className={inputCls} /></div>
              {isCorporate ? (
                <>
                  <div><label className={labelCls}>VKN *</label><input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>Vergi Dairesi</label><input value={taxOffice} onChange={(e) => setTaxOffice(e.target.value)} className={inputCls} /></div>
                </>
              ) : (
                <div><label className={labelCls}>TCKN (opsiyonel)</label><input value={identityNo} onChange={(e) => setIdentityNo(e.target.value)} placeholder="Boşsa e-Arşiv varsayılanı" className={inputCls} /></div>
              )}
            </div>
          </div>
        </div>

        {/* SAĞ: özet + ödeme */}
        <div className="space-y-6">
          <div className={`${card} lg:sticky lg:top-4`}>
            <h3 className="mb-3 font-medium text-black dark:text-white">Ödeme & Özet</h3>

            <label className={labelCls}>Ödeme Yöntemi</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={`${inputCls} mb-3`}>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>

            <label className={labelCls}>Sipariş Durumu</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} mb-3`}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Kargo (₺)</label><input type="number" min={0} step="0.01" value={shippingFee} onChange={(e) => setShippingFee(Number(e.target.value))} className={inputCls} /></div>
              <div><label className={labelCls}>İndirim (₺)</label><input type="number" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className={inputCls} /></div>
            </div>

            <div className="mb-3">
              <label className={labelCls}>Not</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Manuel satış" className={inputCls} />
            </div>

            <div className="space-y-2 border-t border-stroke pt-3 text-sm dark:border-strokedark">
              <div className="flex justify-between"><span className="text-gray-500">Ara Toplam</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">İndirim</span><span>-{fmt(Number(discount))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Kargo</span><span>{fmt(Number(shippingFee))}</span></div>
              <div className="flex justify-between border-t border-stroke pt-2 text-base font-semibold dark:border-strokedark"><span>Toplam</span><span>{fmt(total)}</span></div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Ödeme alındı</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={decrementStock} onChange={(e) => setDecrementStock(e.target.checked)} /> Stoktan düş</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={issueInvoice} onChange={(e) => setIssueInvoice(e.target.checked)} /> Oluşturunca e-fatura kes</label>
            </div>

            <button
              onClick={submit}
              disabled={submitting}
              className="mt-5 w-full rounded bg-primary py-3 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Kaydediliyor…' : 'Satışı Oluştur'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

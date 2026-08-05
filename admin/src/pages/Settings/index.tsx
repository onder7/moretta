import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getToken } from '../../lib/api';
import { useAdminAuth } from '../../context/AdminAuthContext';
import MFATab from './mfa';
import { QuillEditor } from '../../components/QuillEditor';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

// ─── Shared UI Primitives ────────────────────────────────────────────────────

const inputCls =
  'w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary';

const labelCls = 'block text-sm font-medium text-black dark:text-white mb-1';

function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-gray-200 dark:bg-meta-4'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </div>
  );
}

function SaveBar({
  saving,
  saved,
  error,
  onSave,
  onReset,
}: {
  saving: boolean;
  saved: boolean;
  error: string;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-8 flex items-center justify-between border-t border-stroke dark:border-strokedark pt-5">
      <div>
        {error && <p className="text-sm text-meta-1">{error}</p>}
        {saved && !error && (
          <p className="text-sm text-meta-3 flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            Kaydedildi
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onReset}
          disabled={saving}
          className="px-5 py-2 rounded border border-stroke text-sm text-black dark:text-white hover:bg-gray-50 dark:hover:bg-meta-4 disabled:opacity-40 transition"
        >
          İptal
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-6 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
        >
          {saving ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
        </button>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-5">
      <div className="px-6 py-4 border-b border-stroke dark:border-strokedark">
        <h3 className="text-sm font-semibold text-black dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

// ─── Save hook ────────────────────────────────────────────────────────────────

function useSave(group: string, initial: Record<string, string>) {
  const [form, setForm] = useState<Record<string, string>>(initial);
  const [original, setOriginal] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const reset = () => setForm(original);

  const load = useCallback(
    (data: Record<string, string>) => {
      setForm(data);
      setOriginal(data);
    },
    [],
  );

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.put(`/admin/settings/${group}`, form);
      setOriginal(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt hatası');
    } finally {
      setSaving(false);
    }
  };

  return { form, set, reset, load, save, saving, saved, error };
}

// ─── Logo Upload Component ────────────────────────────────────────────────────

function LogoUpload({ currentLogo, onUpload }: { currentLogo?: string; onUpload: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Lütfen bir görüntü dosyası seçin');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Dosya boyutu 5 MB\'dan küçük olmalıdır');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = getToken();
      const response = await fetch(`${API_BASE}/admin/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Yükleme başarısız');

      const data = await response.json();
      onUpload(data.data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yükleme hatası');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-stroke dark:border-strokedark rounded-lg p-6 text-center hover:border-primary transition-colors">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
          id="logo-input"
        />
        <label htmlFor="logo-input" className="cursor-pointer block">
          <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-14-8l-3-3m0 0l-3 3m3-3v8m9 8h-9m0 0l-3 3m3-3l3 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm font-medium text-black dark:text-white">
            {uploading ? 'Yükleniyor...' : 'Tıkla veya dosyayı sürükle'}
          </p>
          <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG (Max. 5 MB)</p>
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Tab: Genel ───────────────────────────────────────────────────────────────

/**
 * Üyelik doğrulama ayarı. `general` grubundan ayrı bir grupta (`auth_`) tutulur,
 * o yüzden kendi kaydetme mantığı var — değiştirir değiştirmez kaydeder.
 */
function EmailVerificationSection() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get<{ success: boolean; data: Record<string, string> }>('/admin/settings/auth')
      .then((r) => setEnabled(r.data?.email_verification_required === 'true'))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (v: boolean) => {
    const previous = enabled;
    setEnabled(v);
    setSaving(true);
    setSaved(false);
    try {
      await api.put('/admin/settings/auth', { email_verification_required: v ? 'true' : 'false' });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setEnabled(previous); // kaydedilemediyse görüntüyü geri al
      alert('Ayar kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Üyelik ve E-posta Doğrulama"
      subtitle="Yeni üye kaydı ve misafir siparişlerinde e-posta doğrulaması istenip istenmeyeceği"
    >
      <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 dark:border-strokedark p-4">
        <div className="flex-1">
          <p className="text-sm font-medium">E-posta doğrulaması zorunlu</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            <strong>Açık:</strong> Yeni üyeler pasif olarak kaydedilir, aktivasyon linki gönderilir ve
            link tıklanana kadar giriş yapamazlar. Misafirler siparişi tamamlarken e-postalarına gelen
            6 haneli kodu girmek zorundadır.
            <br />
            <strong>Kapalı:</strong> Üyeler doğrudan aktif olur, misafirler doğrulama olmadan sipariş verir.
          </p>
          {enabled && (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
              E-posta gönderimi çalışmıyorsa yeni üyeler hesaplarını aktifleştiremez. Bildirimler
              sekmesinden SMTP ayarlarını test edin.
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {loading ? (
            <span className="text-xs text-gray-400">yükleniyor…</span>
          ) : (
            <Toggle checked={enabled} onChange={toggle} />
          )}
          {saving && <span className="text-xs text-gray-400">kaydediliyor…</span>}
          {saved && <span className="text-xs text-green-600">✓ kaydedildi</span>}
        </div>
      </div>
    </SectionCard>
  );
}

function GeneralTab() {
  const [loading, setLoading] = useState(true);
  const s = useSave('general', {});

  useEffect(() => {
    api
      .get<{ success: boolean; data: Record<string, string> }>('/admin/settings/general')
      .then((r) => s.load(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Loader />;

  const g = s.form;
  return (
    <div>
      <SectionCard title="Firma Bilgileri" subtitle="Yasal ve kurumsal kimlik bilgileri">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Mağaza Adı *">
            <input className={inputCls} value={g.store_name ?? ''} onChange={(e) => s.set('store_name', e.target.value)} placeholder="Örn. Mağaza Adı" />
          </Field>
          <Field label="Yasal Şirket Unvanı">
            <input className={inputCls} value={g.legal_name ?? ''} onChange={(e) => s.set('legal_name', e.target.value)} placeholder="Örn. Mağaza Ticaret A.Ş." />
          </Field>
          <Field label="Vergi Dairesi">
            <input className={inputCls} value={g.tax_office ?? ''} onChange={(e) => s.set('tax_office', e.target.value)} placeholder="Ankara Vergi Dairesi" />
          </Field>
          <Field label="Vergi Numarası">
            <input className={inputCls} value={g.tax_number ?? ''} onChange={(e) => s.set('tax_number', e.target.value)} placeholder="1234567890" />
          </Field>
        </div>
        <Field label="Footer Sloganı" hint="Sayfa alt bilgisinde (footer) mağaza adının altında görünen kısa tanıtım yazısı. Biçimlendirme (kalın, link, renk) ekleyebilirsiniz.">
          <QuillEditor
            value={g.footer_slogan ?? ''}
            onChange={(html) => s.set('footer_slogan', html)}
            minHeight={120}
            placeholder="Güvenli ödeme ve hızlı kargo seçenekleriyle binlerce ürünü keşfedin."
          />
        </Field>
      </SectionCard>

      <SectionCard title="İletişim Bilgileri">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Müşteri Hizmetleri E-postası *">
            <input className={inputCls} type="email" value={g.email ?? ''} onChange={(e) => s.set('email', e.target.value)} placeholder="destek@example.com" />
          </Field>
          <Field label="Telefon">
            <input className={inputCls} type="tel" value={g.phone ?? ''} onChange={(e) => s.set('phone', e.target.value)} placeholder="+90 312 000 00 00" />
          </Field>
        </div>
        <Field label="Depo / Ofis Adresi">
          <textarea
            className={inputCls + ' min-h-[80px] resize-y'}
            value={g.address ?? ''}
            onChange={(e) => s.set('address', e.target.value)}
            placeholder="Atatürk Bulvarı No:1 Çankaya/Ankara"
          />
        </Field>
        <Field label="Harita Embed Kodu (Google Maps)" hint="Google Maps'ten 'Paylaş' → 'Haritayı gömün' ile alınan embed src değerini yapıştır">
          <textarea
            className={inputCls + ' min-h-[60px] resize-y font-mono text-xs'}
            value={g.mapEmbed ?? ''}
            onChange={(e) => s.set('mapEmbed', e.target.value)}
            placeholder="https://www.google.com/maps/embed?pb=..."
          />
        </Field>
      </SectionCard>

      <SectionCard title="Yerelleştirme" subtitle="Dil, para birimi ve bölge ayarları">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Para Birimi">
            <select className={inputCls} value={g.currency ?? 'TRY'} onChange={(e) => s.set('currency', e.target.value)}>
              <option value="TRY">₺ Türk Lirası (TRY)</option>
              <option value="USD">$ Dolar (USD)</option>
              <option value="EUR">€ Euro (EUR)</option>
            </select>
          </Field>
          <Field label="Saat Dilimi">
            <select className={inputCls} value={g.timezone ?? 'Europe/Istanbul'} onChange={(e) => s.set('timezone', e.target.value)}>
              <option value="Europe/Istanbul">Europe/Istanbul (UTC+3)</option>
              <option value="UTC">UTC</option>
              <option value="Europe/London">Europe/London</option>
            </select>
          </Field>
          <Field label="Varsayılan Dil">
            <select className={inputCls} value={g.language ?? 'tr'} onChange={(e) => s.set('language', e.target.value)}>
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Mağaza Logosu" subtitle="Önerilen: 200×60 px, PNG/SVG">
        <Field label="Logo Yükle">
          <LogoUpload
            currentLogo={g.logo_url}
            onUpload={(url) => s.set('logo_url', url)}
          />
        </Field>
        {g.logo_url && (
          <div className="mt-4 p-3 rounded border border-stroke dark:border-strokedark bg-gray-50 dark:bg-gray-900 flex items-center gap-3">
            <img src={g.logo_url} alt="logo" className="h-12 object-contain" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 truncate">{g.logo_url.split('/').pop()}</p>
            </div>
            <button
              onClick={() => s.set('logo_url', '')}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Sil
            </button>
          </div>
        )}
      </SectionCard>

      <EmailVerificationSection />

      <SaveBar saving={s.saving} saved={s.saved} error={s.error} onSave={s.save} onReset={s.reset} />
    </div>
  );
}

// ─── Tab: Ödeme ───────────────────────────────────────────────────────────────

function PaymentTab() {
  const [loading, setLoading] = useState(true);
  const s = useSave('payment', {});

  useEffect(() => {
    api
      .get<{ success: boolean; data: Record<string, string> }>('/admin/settings/payment')
      .then((r) => s.load(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Loader />;

  const g = s.form;
  const bool = (key: string) => g[key] === 'true';

  return (
    <div>
      {/* iyzico */}
      <SectionCard
        title="iyzico"
        subtitle="Türkiye'nin önde gelen ödeme altyapısı"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-black dark:text-white flex items-center gap-2">
              iyzico Aktif
              {bool('iyzico_enabled') && (
                (g.iyzico_env ?? 'sandbox') === 'production' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Canlı (Production)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Test (Sandbox)
                  </span>
                )
              )}
            </p>
            <p className="text-xs text-gray-400">Ödeme sayfasında iyzico checkout gösterilir</p>
          </div>
          <Toggle checked={bool('iyzico_enabled')} onChange={(v) => s.set('iyzico_enabled', String(v))} />
        </div>
        {bool('iyzico_enabled') && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="API Key">
              <input className={inputCls} value={g.iyzico_api_key ?? ''} onChange={(e) => s.set('iyzico_api_key', e.target.value)} placeholder="Canlı için: xxx (sandbox- öneki olmadan)" autoComplete="off" spellCheck={false} />
            </Field>
            <Field label="Secret Key">
              <input className={inputCls} type="password" value={g.iyzico_secret ?? ''} onChange={(e) => s.set('iyzico_secret', e.target.value)} placeholder="••••••••" autoComplete="new-password" />
            </Field>
            <Field label="Ortam" hint="Canlı ödeme almak için Production seçin ve iyzico panelinizden aldığınız CANLI API anahtarlarını girin.">
              <select className={inputCls} value={g.iyzico_env ?? 'sandbox'} onChange={(e) => s.set('iyzico_env', e.target.value)}>
                <option value="sandbox">Sandbox (Test)</option>
                <option value="production">Production (Canlı)</option>
              </select>
            </Field>
          </div>
        )}
        {bool('iyzico_enabled') && (g.iyzico_env ?? 'sandbox') === 'production' && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-4 py-3">
            <svg className="flex-shrink-0 mt-0.5 text-amber-500" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              <strong>Canlı mod aktif.</strong> Gerçek kartlardan gerçek tahsilat yapılır. API Key/Secret değerlerinin iyzico panelinizdeki <strong>canlı (production)</strong> anahtarlar olduğundan emin olun; sandbox anahtarları canlı modda çalışmaz.
            </p>
          </div>
        )}
      </SectionCard>

      {/* PayTR */}
      <SectionCard title="PayTR" subtitle="Sanal POS ve alternatif ödeme yöntemleri">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-black dark:text-white">PayTR Aktif</p>
            <p className="text-xs text-gray-400">Ödeme sayfasında PayTR seçeneği gösterilir</p>
          </div>
          <Toggle checked={bool('paytr_enabled')} onChange={(v) => s.set('paytr_enabled', String(v))} />
        </div>
        {bool('paytr_enabled') && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Merchant ID">
              <input className={inputCls} value={g.paytr_merchant_id ?? ''} onChange={(e) => s.set('paytr_merchant_id', e.target.value)} placeholder="123456" />
            </Field>
            <Field label="Merchant Key">
              <input className={inputCls} type="password" value={g.paytr_merchant_key ?? ''} onChange={(e) => s.set('paytr_merchant_key', e.target.value)} placeholder="••••••••" />
            </Field>
            <Field label="Merchant Salt">
              <input className={inputCls} type="password" value={g.paytr_merchant_salt ?? ''} onChange={(e) => s.set('paytr_merchant_salt', e.target.value)} placeholder="••••••••" />
            </Field>
          </div>
        )}
        {bool('paytr_enabled') && (
          <div className="flex items-center justify-between mt-4">
            <div>
              <p className="text-sm font-medium text-black dark:text-white">Test Modu</p>
              <p className="text-xs text-gray-400">Açıkken PayTR test kartlarıyla deneme yapılır (gerçek çekim olmaz). Canlıya alırken kapatın.</p>
            </div>
            <Toggle checked={bool('paytr_test_mode')} onChange={(v) => s.set('paytr_test_mode', String(v))} />
          </div>
        )}
      </SectionCard>

      {/* Kapıda Ödeme */}
      <SectionCard title="Kapıda Ödeme">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-black dark:text-white">Kapıda Ödeme Aktif</p>
            <p className="text-xs text-gray-400">Müşteri sipariş tesliminde nakit ödeyebilir</p>
          </div>
          <Toggle checked={bool('cod_enabled')} onChange={(v) => s.set('cod_enabled', String(v))} />
        </div>
        {bool('cod_enabled') && (
          <Field label="Kapıda Ödeme Ek Ücreti (₺)" hint="0 girin ücretsiz olsun">
            <input className={inputCls} type="number" min="0" step="1" value={g.cod_fee ?? '0'} onChange={(e) => s.set('cod_fee', e.target.value)} placeholder="0" />
          </Field>
        )}
      </SectionCard>

      {/* Havale / EFT */}
      <SectionCard title="Havale / EFT" subtitle="Müşteri sipariş sonrası belirtilen banka hesabına ödeme yapar">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-black dark:text-white">Havale / EFT Aktif</p>
            <p className="text-xs text-gray-400">Ödeme sayfasında havale seçeneği gösterilir</p>
          </div>
          <Toggle checked={bool('havale_enabled')} onChange={(v) => s.set('havale_enabled', String(v))} />
        </div>

        {bool('havale_enabled') && (
          <div className="space-y-4 border-t border-stroke dark:border-strokedark pt-4">
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 px-4 py-3">
              <svg className="flex-shrink-0 mt-0.5 text-blue-500" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Bu bilgiler sipariş tamamlandıktan sonra müşteriye gösterilir. IBAN formatını doğru girin (TR ile başlamalı).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Banka Adı *" hint="Örn: Ziraat Bankası, Garanti BBVA">
                <input
                  className={inputCls}
                  value={g.havale_bank_name ?? ''}
                  onChange={(e) => s.set('havale_bank_name', e.target.value)}
                  placeholder="Ziraat Bankası"
                />
              </Field>
              <Field label="Hesap Sahibi Adı *">
                <input
                  className={inputCls}
                  value={g.havale_account_name ?? ''}
                  onChange={(e) => s.set('havale_account_name', e.target.value)}
                  placeholder="Örn. Mağaza Ticaret A.Ş."
                />
              </Field>
            </div>

            <Field label="IBAN *" hint="Boşluksuz veya 4'lü gruplar halinde yazabilirsiniz">
              <input
                className={inputCls + ' font-mono tracking-wider'}
                value={g.havale_iban ?? ''}
                onChange={(e) => s.set('havale_iban', e.target.value)}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
              />
            </Field>

            <Field
              label="Açıklama / Referans Notu"
              hint="Boş bırakılırsa sipariş numarası otomatik kullanılır"
            >
              <input
                className={inputCls}
                value={g.havale_description ?? ''}
                onChange={(e) => s.set('havale_description', e.target.value)}
                placeholder="Sipariş numaranızı açıklama kısmına yazınız"
              />
            </Field>
          </div>
        )}
      </SectionCard>

      <SaveBar saving={s.saving} saved={s.saved} error={s.error} onSave={s.save} onReset={s.reset} />
    </div>
  );
}

// ─── Tab: Kargo ───────────────────────────────────────────────────────────────

interface HepsijetPing {
  ok: boolean;
  mode: string;
  xdock?: string;
  company?: string;
  message?: string;
}

function ShippingTab() {
  const [loading, setLoading] = useState(true);
  const s = useSave('shipping', {});
  const [taxRate, setTaxRate] = useState(20);
  const [savingTax, setSavingTax] = useState(false);
  const [savedTax, setSavedTax] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<HepsijetPing | null>(null);

  useEffect(() => {
    api
      .get<{ success: boolean; data: Record<string, string> }>('/admin/settings/shipping')
      .then((r) => {
        // shipping_fee and free_shipping_threshold come without prefix
        // because the legacy endpoint stored them WITHOUT the "shipping_" prefix
        // We also load from the generic settings group
        api
          .get<{ success: boolean; data: { shippingFee: number; freeShippingThreshold: number } }>(
            '/admin/shipping-config',
          )
          .then((legacy) => {
            s.load({
              ...r.data,
              fee: String(legacy.data.shippingFee),
              free_threshold: String(legacy.data.freeShippingThreshold),
            });
          })
          .catch(() => s.load(r.data));
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    api.get('/tax-config').then((r: any) => {
      const rate = r?.data?.taxRate ?? r?.taxRate;
      if (rate != null) setTaxRate(rate);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveTax = async () => {
    setSavingTax(true);
    setSavedTax(false);
    try {
      await api.put('/admin/tax-config', { taxRate });
      setSavedTax(true);
      setTimeout(() => setSavedTax(false), 2000);
    } catch {
      alert('KDV oranı kaydedilemedi');
    } finally {
      setSavingTax(false);
    }
  };

  const handleHepsijetPing = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      const r = await api.get<{ success: boolean; data: HepsijetPing }>('/admin/hepsijet/ping');
      setPingResult(r.data);
    } catch (err) {
      setPingResult({ ok: false, mode: '', message: err instanceof Error ? err.message : 'Bağlantı hatası' });
    } finally {
      setPinging(false);
    }
  };

  const handleSave = async () => {
    // Save legacy shipping config + generic group
    const fee = parseFloat(s.form.fee ?? '49.9');
    const threshold = parseFloat(s.form.free_threshold ?? '500');
    try {
      await Promise.all([
        api.put('/admin/shipping-config', {
          shippingFee: isNaN(fee) ? 49.9 : fee,
          freeShippingThreshold: isNaN(threshold) ? 500 : threshold,
        }),
        api.put('/admin/settings/shipping', s.form),
      ]);
      s.load(s.form); // mark as saved
    } catch (err) {
      throw err;
    }
  };

  if (loading) return <Loader />;

  const g = s.form;

  const CarrierSection = ({
    title,
    prefix,
  }: {
    title: string;
    prefix: string;
  }) => (
    <SectionCard title={title}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="API Key / Kullanıcı Adı">
          <input className={inputCls} value={g[`${prefix}_api_key`] ?? ''} onChange={(e) => s.set(`${prefix}_api_key`, e.target.value)} placeholder="API Key" />
        </Field>
        <Field label="Müşteri No / API Secret">
          <input className={inputCls} type="password" value={g[`${prefix}_customer_no`] ?? ''} onChange={(e) => s.set(`${prefix}_customer_no`, e.target.value)} placeholder="••••••••" />
        </Field>
      </div>
    </SectionCard>
  );

  return (
    <div>
      <SectionCard title="Kargo Ücretlendirmesi">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Standart Kargo Ücreti (₺)">
            <input className={inputCls} type="number" min="0" step="0.01" value={g.fee ?? ''} onChange={(e) => s.set('fee', e.target.value)} placeholder="49.90" />
          </Field>
          <Field label="Ücretsiz Kargo Limiti (₺)" hint="Bu tutarın üzerindeki siparişler ücretsiz kargo alır">
            <input className={inputCls} type="number" min="0" step="1" value={g.free_threshold ?? ''} onChange={(e) => s.set('free_threshold', e.target.value)} placeholder="500" />
          </Field>
        </div>
      </SectionCard>

      {/* KDV Ayarları — tüm ürün/sepet/ödeme hesaplamalarında kullanılır */}
      <SectionCard title="KDV (Katma Değer Vergisi)" subtitle="Ürün sayfası, sepet ve ödeme adımında uygulanacak global oran">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">KDV Oranı (%)</label>
            <select
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className={inputCls}
            >
              {[0, 1, 5, 8, 10, 18, 20].map((r) => (
                <option key={r} value={r}>%{r}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">Bu oran ürün fiyatı üzerine eklenir (kargo ücreti KDV dahil gösterilir).</p>
          </div>
          <button
            onClick={handleSaveTax}
            disabled={savingTax}
            className="shrink-0 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {savingTax ? 'Kaydediliyor…' : savedTax ? '✓ Kaydedildi' : 'KDV Kaydet'}
          </button>
        </div>
      </SectionCard>

      {/* HepsiJET — gönderi oluşturma entegrasyonu (RETAIL TR) */}
      <SectionCard
        title="HepsiJET Entegrasyonu"
        subtitle="Sipariş detayından tek tıkla kargo gönderisi oluşturur ve barkod (ZPL) üretir"
      >
        <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-strokedark p-4 mb-5">
          <div>
            <p className="text-sm font-medium">HepsiJET aktif</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Kapalıyken sipariş detayındaki "Kargo Oluştur" butonu çalışmaz.
            </p>
          </div>
          <Toggle
            checked={g.hepsijet_enabled === 'true'}
            onChange={(v) => s.set('hepsijet_enabled', v ? 'true' : 'false')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Ortam">
            <select
              className={inputCls}
              value={g.hepsijet_mode ?? 'test'}
              onChange={(e) => s.set('hepsijet_mode', e.target.value)}
            >
              <option value="test">Test (integrationapitest.hepsijet.com)</option>
              <option value="prod">Canlı (integration.hepsijet.com)</option>
            </select>
          </Field>
          <Field label="Gönderi Tipi">
            <select
              className={inputCls}
              value={g.hepsijet_product_code ?? 'HX_STD'}
              onChange={(e) => s.set('hepsijet_product_code', e.target.value)}
            >
              <option value="HX_STD">HX_STD — Standart Teslimat</option>
              <option value="HX_SD">HX_SD — Aynı Gün</option>
              <option value="HX_ND">HX_ND — Ertesi Gün</option>
              <option value="HJ_DT">HJ_DT — Kapıdan Kapıya</option>
            </select>
          </Field>
          <Field label="İade Gönderi Tipi" hint="İade kargolarında (deliveryType: RETURNED) kullanılır. Boşsa yukarıdaki tip geçerlidir.">
            <select
              className={inputCls}
              value={g.hepsijet_return_product_code ?? ''}
              onChange={(e) => s.set('hepsijet_return_product_code', e.target.value)}
            >
              <option value="">Gönderi tipiyle aynı</option>
              <option value="HX_STD">HX_STD — Standart Teslimat</option>
              <option value="HX_SD">HX_SD — Aynı Gün</option>
              <option value="HX_ND">HX_ND — Ertesi Gün</option>
              <option value="HJ_DT">HJ_DT — Kapıdan Kapıya</option>
            </select>
          </Field>
          <Field label="Kullanıcı Adı">
            <input
              className={inputCls}
              value={g.hepsijet_username ?? ''}
              onChange={(e) => s.set('hepsijet_username', e.target.value)}
              placeholder="HepsiJET tarafından verilir"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Field label="Şifre">
            <input
              className={inputCls}
              type="password"
              value={g.hepsijet_password ?? ''}
              onChange={(e) => s.set('hepsijet_password', e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>
        </div>

        <p className="mt-6 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Firma Bilgileri (HepsiJET tarafından tanımlanır)
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Firma Adı" hint="company.name — birebir HepsiJET'in verdiği değer">
            <input className={inputCls} value={g.hepsijet_company_name ?? ''} onChange={(e) => s.set('hepsijet_company_name', e.target.value)} />
          </Field>
          <Field label="Firma Kodu" hint="company.abbreviationCode">
            <input className={inputCls} value={g.hepsijet_company_code ?? ''} onChange={(e) => s.set('hepsijet_company_code', e.target.value)} />
          </Field>
          <Field label="Gönderi No Öneki" hint="customerDeliveryNo bu kodla başlamak zorunda — HepsiJET'in verdiği firma kısaltması (toplam 8-21 karakter)">
            <input className={inputCls} maxLength={9} value={g.hepsijet_delivery_prefix ?? ''} onChange={(e) => s.set('hepsijet_delivery_prefix', e.target.value)} placeholder="örn. MABridge" />
          </Field>
          <Field label="XDock Kodu" hint="currentXDock.abbreviationCode — örn. ETMS123">
            <input className={inputCls} value={g.hepsijet_xdock ?? ''} onChange={(e) => s.set('hepsijet_xdock', e.target.value)} />
          </Field>
          <Field label="Varsayılan Desi" hint="Ürün bazlı desi henüz yok; her gönderi bu değerle iletilir">
            <input className={inputCls} type="number" min="1" step="0.1" value={g.hepsijet_default_desi ?? ''} onChange={(e) => s.set('hepsijet_default_desi', e.target.value)} placeholder="4" />
          </Field>
        </div>

        <p className="mt-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Gönderici (Depo) Adresi
        </p>
        <p className="mb-3 text-xs text-amber-600 dark:text-amber-500">
          Alanlar HepsiJET'in API adlarıyla etiketlendi. HepsiJET'in gönderdiği tanım mailinde
          <strong> town</strong> mahalle, <strong>district</strong> ilçe olarak verilmişti; dokümanda ise tersi
          (town=ilçe, district=mahalle). Buraya <strong>mailde yazan değerler</strong> girildi. Alıcı adresi
          dokümandaki eşlemeyi kullanıyor — HepsiJET'ten teyit alınmalı.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Gönderici Adres ID" hint="senderAddress.companyAddressId — HepsiJET verir, sabittir">
            <input className={inputCls} value={g.hepsijet_sender_address_id ?? ''} onChange={(e) => s.set('hepsijet_sender_address_id', e.target.value)} />
          </Field>
          <Field label="city" hint="HepsiJET'in verdiği değer — örn. ANTALYA">
            <input className={inputCls} value={g.hepsijet_sender_city ?? ''} onChange={(e) => s.set('hepsijet_sender_city', e.target.value)} placeholder="ANTALYA" />
          </Field>
          <Field label="town" hint="HepsiJET'in verdiği değer — mailde mahalle yazılmıştı (KIZILTOPRAK)">
            <input className={inputCls} value={g.hepsijet_sender_town ?? ''} onChange={(e) => s.set('hepsijet_sender_town', e.target.value)} />
          </Field>
          <Field label="district" hint="HepsiJET'in verdiği değer — mailde ilçe yazılmıştı (MURATPAŞA)">
            <input className={inputCls} value={g.hepsijet_sender_district ?? ''} onChange={(e) => s.set('hepsijet_sender_district', e.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Açık Adres">
            <textarea
              className={inputCls}
              rows={2}
              value={g.hepsijet_sender_address ?? ''}
              onChange={(e) => s.set('hepsijet_sender_address', e.target.value)}
              placeholder="Cadde, sokak, no, kat…"
            />
          </Field>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleHepsijetPing}
            disabled={pinging}
            className="px-4 py-2 rounded-lg border border-primary bg-primary/5 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50 transition"
          >
            {pinging ? 'Deneniyor…' : 'Bağlantıyı Test Et'}
          </button>
          {pingResult && (
            <span className={`text-xs font-medium ${pingResult.ok ? 'text-green-600' : 'text-red-600'}`}>
              {pingResult.ok
                ? `✓ Bağlantı başarılı (${pingResult.mode}${pingResult.xdock ? ` · XDock: ${pingResult.xdock}` : ''}${pingResult.company ? ` · Firma kodu: ${pingResult.company}` : ''})`
                : `✗ ${pingResult.message}`}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Test etmeden önce ayarları kaydedin — bağlantı testi kayıtlı değerleri kullanır.
        </p>
      </SectionCard>

      <CarrierSection title="Yurtiçi Kargo API" prefix="yurtici" />
      <CarrierSection title="Aras Kargo API" prefix="aras" />
      <CarrierSection title="MNG Kargo API" prefix="mng" />
      <CarrierSection title="Sürat Kargo API" prefix="surat" />

      <SaveBar
        saving={s.saving}
        saved={s.saved}
        error={s.error}
        onSave={() => {
          s.save(); // also calls the PUT for generic group
          // additionally save legacy endpoint
          handleSave().catch(() => {});
        }}
        onReset={s.reset}
      />
    </div>
  );
}

// ─── Tab: Ekip ────────────────────────────────────────────────────────────────

const SUB_ROLES = [
  { value: 'SUPER_ADMIN',  label: 'Süper Admin' },
  { value: 'EDITOR',       label: 'Editör' },
  { value: 'LOGISTICS',    label: 'Lojistik / Depo' },
  { value: 'ACCOUNTANT',   label: 'Muhasebe' },
  { value: 'SUPPORT',      label: 'Müşteri Temsilcisi' },
];

interface TeamMember {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  subRole: string;
  profile?: { firstName?: string; lastName?: string; avatarUrl?: string } | null;
}

function TeamTab() {
  const { user: me } = useAdminAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EDITOR');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ success: boolean; data: TeamMember[] }>('/admin/team')
      .then((r) => setMembers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubRoleChange(userId: string, subRole: string) {
    await api.put(`/admin/team/${userId}`, { subRole }).catch(console.error);
    setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, subRole } : m)));
  }

  async function handleToggleActive(member: TeamMember) {
    if (member.id === me?.id) return;
    await api.put(`/admin/team/${member.id}`, { isActive: !member.isActive }).catch(console.error);
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, isActive: !m.isActive } : m)));
  }

  async function handleRemove(member: TeamMember) {
    if (member.id === me?.id) return;
    if (!confirm(`${member.email} kullanıcısının admin yetkisi kaldırılacak. Devam?`)) return;
    await api.delete(`/admin/team/${member.id}`).catch(console.error);
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.post('/admin/team/invite', { email: inviteEmail.trim(), subRole: inviteRole });
      setInviteSuccess(`${inviteEmail} kullanıcısına admin yetkisi verildi.`);
      setInviteEmail('');
      load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Hata');
    } finally {
      setInviting(false);
    }
  }

  const fullName = (m: TeamMember) =>
    m.profile?.firstName ? `${m.profile.firstName} ${m.profile.lastName ?? ''}`.trim() : null;

  const initials = (m: TeamMember) => {
    const n = fullName(m);
    if (n) return n.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
    return m.email.slice(0, 2).toUpperCase();
  };

  return (
    <div>
      {/* Members table */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-5">
        <div className="px-6 py-4 border-b border-stroke dark:border-strokedark">
          <h3 className="text-sm font-semibold text-black dark:text-white">Admin Kullanıcılar</h3>
          <p className="text-xs text-gray-400 mt-0.5">{members.length} admin kayıtlı</p>
        </div>
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="animate-spin h-7 w-7 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark bg-gray-2 dark:bg-meta-4">
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Kullanıcı</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Rol</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Eklenme</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Durum</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isMe = m.id === me?.id;
                  return (
                    <tr key={m.id} className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {m.profile?.avatarUrl ? (
                            <img src={m.profile.avatarUrl} className="h-9 w-9 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {initials(m)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-black dark:text-white">
                              {fullName(m) ?? m.email}
                              {isMe && <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Ben</span>}
                            </p>
                            {fullName(m) && <p className="text-xs text-gray-400">{m.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={m.subRole}
                          disabled={isMe}
                          onChange={(e) => handleSubRoleChange(m.id, e.target.value)}
                          className="rounded border border-stroke bg-transparent px-2 py-1 text-xs text-black dark:border-strokedark dark:text-white disabled:opacity-50"
                        >
                          {SUB_ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-5 py-3">
                        <Toggle
                          checked={m.isActive}
                          onChange={() => handleToggleActive(m)}
                        />
                      </td>
                      <td className="px-5 py-3 text-right">
                        {!isMe && (
                          <button
                            onClick={() => handleRemove(m)}
                            className="text-xs text-meta-1 hover:underline"
                          >
                            Yetkiyi Kaldır
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite form */}
      <SectionCard title="Yeni Admin Ekle" subtitle="Mevcut müşteri hesabını admin olarak yetkilendir">
        <form onSubmit={handleInvite} className="space-y-4">
          {inviteError && (
            <div className="rounded bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">{inviteError}</div>
          )}
          {inviteSuccess && (
            <div className="rounded bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 text-sm">{inviteSuccess}</div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="Kullanıcı E-postası">
                <input
                  className={inputCls}
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="kullanici@email.com"
                  required
                />
              </Field>
            </div>
            <Field label="Rol">
              <select className={inputCls} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                {SUB_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={inviting}
              className="px-6 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
            >
              {inviting ? 'Ekleniyor…' : 'Admin Olarak Ekle'}
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

// ─── Email Transport Status Card ─────────────────────────────────────────────

interface EmailStatus {
  method: 'smtp' | 'brevo' | 'none';
  source: 'env' | 'db' | 'none';
  details: Record<string, string | number | boolean>;
}

function EmailTransportCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    api
      .get<{ success: boolean; data: EmailStatus }>('/admin/email-status')
      .then((r) => setStatus(r.data))
      .catch(console.error);
  }, [refreshKey]);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) return;
    setSending(true);
    setTestResult(null);
    try {
      const r = await api.post<{ success: boolean; message: string }>('/admin/email-test', { to: testEmail.trim() });
      setTestResult({ ok: true, message: r.message ?? 'Test e-postası gönderildi.' });
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message ?? 'Gönderilemedi.' });
    } finally {
      setSending(false);
    }
  };

  const METHOD_LABELS: Record<string, string> = {
    smtp: 'SMTP',
    brevo: 'Brevo API',
    none: 'Yapılandırılmamış',
  };

  const METHOD_COLORS: Record<string, string> = {
    smtp: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    brevo: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    none: 'bg-gray-100 text-gray-500 dark:bg-meta-4 dark:text-gray-400',
  };

  const method = status?.method ?? 'none';

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-5">
      <div className="px-6 py-4 border-b border-stroke dark:border-strokedark flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-black dark:text-white">E-posta Transport Durumu</h3>
          <p className="text-xs text-gray-400 mt-0.5">Aktif gönderim yöntemi .env dosyasından okunur</p>
        </div>
        {status && (
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${METHOD_COLORS[method]}`}>
              {METHOD_LABELS[method]}
            </span>
            {status.source !== 'none' && (
              <span className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-meta-4 text-gray-500 dark:text-gray-400">
                {status.source === 'env' ? '.env' : 'Admin Panel'}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-5 space-y-5">
        {!status && (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {status && method === 'none' && (
          <div className="flex items-start gap-3 rounded-md bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-4 py-3">
            <svg className="flex-shrink-0 mt-0.5 text-amber-500" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong className="block mb-0.5">E-posta gönderimi devre dışı.</strong>
              <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">.env</code> dosyasına{' '}
              <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">SMTP_HOST</code> veya{' '}
              <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">BREVO_API_KEY</code> ekleyin.
            </div>
          </div>
        )}

        {status && method === 'smtp' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-stroke dark:border-strokedark px-4 py-3">
              <p className="text-gray-400 mb-0.5">Host</p>
              <p className="font-mono font-semibold text-black dark:text-white">{String(status.details.host ?? '—')}</p>
            </div>
            <div className="rounded-lg border border-stroke dark:border-strokedark px-4 py-3">
              <p className="text-gray-400 mb-0.5">Port</p>
              <p className="font-mono font-semibold text-black dark:text-white">{String(status.details.port ?? '—')}</p>
            </div>
            <div className="rounded-lg border border-stroke dark:border-strokedark px-4 py-3">
              <p className="text-gray-400 mb-0.5">Gönderen</p>
              <p className="font-mono font-semibold text-black dark:text-white truncate">{String(status.details.from ?? '—')}</p>
            </div>
          </div>
        )}

        {status && method === 'brevo' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-stroke dark:border-strokedark px-4 py-3">
              <p className="text-gray-400 mb-0.5">API Key</p>
              <p className="font-mono font-semibold text-black dark:text-white">{status.details.keySet ? '••••••• (ayarlı)' : 'Eksik'}</p>
            </div>
            <div className="rounded-lg border border-stroke dark:border-strokedark px-4 py-3">
              <p className="text-gray-400 mb-0.5">Gönderen Adı</p>
              <p className="font-mono font-semibold text-black dark:text-white">{String(status.details.senderName ?? '—')}</p>
            </div>
            <div className="rounded-lg border border-stroke dark:border-strokedark px-4 py-3">
              <p className="text-gray-400 mb-0.5">Gönderen E-posta</p>
              <p className="font-mono font-semibold text-black dark:text-white truncate">{String(status.details.senderEmail ?? '—')}</p>
            </div>
          </div>
        )}

        {/* Test Email */}
        {status && (
          <form onSubmit={handleSendTest} className="border-t border-stroke dark:border-strokedark pt-4 space-y-3">
            <p className="text-sm font-medium text-black dark:text-white">Test E-postası Gönder</p>
            {method === 'none' && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Önce aşağıdaki SMTP veya Brevo ayarlarını doldurup kaydedin, ardından test edebilirsiniz.
              </p>
            )}
            <div className="flex gap-3">
              <input
                type="email"
                className={inputCls + ' flex-1'}
                placeholder="test@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                required
                disabled={sending || method === 'none'}
              />
              <button
                type="submit"
                disabled={sending || method === 'none'}
                className="px-5 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition whitespace-nowrap shrink-0"
              >
                {sending ? 'Gönderiliyor…' : 'Gönder'}
              </button>
            </div>
            {testResult && (
              <p className={`text-xs flex items-center gap-1.5 ${testResult.ok ? 'text-meta-3' : 'text-meta-1'}`}>
                {testResult.ok ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                )}
                {testResult.message}
              </p>
            )}
          </form>
        )}

        <div className="border-t border-stroke dark:border-strokedark pt-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            <strong className="text-gray-500">Öncelik sırası:</strong>{' '}
            <code className="bg-gray-100 dark:bg-meta-4 px-1 rounded">SMTP_HOST</code> ayarlıysa SMTP kullanılır,
            yoksa <code className="bg-gray-100 dark:bg-meta-4 px-1 rounded">BREVO_API_KEY</code> kullanılır.
            Her iki değer de yoksa e-posta gönderilmez (sadece loglanır).
            Değişiklik için sunucunuzdaki <code className="bg-gray-100 dark:bg-meta-4 px-1 rounded">.env</code> dosyasını güncelleyin ve uygulamayı yeniden başlatın.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Bildirimler ─────────────────────────────────────────────────────────

function NotificationsTab() {
  const [loading, setLoading] = useState(true);
  const [emailRefresh, setEmailRefresh] = useState(0);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [smtpTestSending, setSmtpTestSending] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const s = useSave('notif', {});

  useEffect(() => {
    api
      .get<{ success: boolean; data: Record<string, string> }>('/admin/settings/notif')
      .then((r) => s.load(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    await s.save();
    setEmailRefresh((n) => n + 1);
  };

  const handleSmtpTest = async () => {
    if (!smtpTestEmail.trim()) return;
    setSmtpTestSending(true);
    setSmtpTestResult(null);
    try {
      // Ayarları önce kaydet ki backend yeni SMTP değerlerini okusun
      await s.save();
      setEmailRefresh((n) => n + 1);
      const r = await api.post<{ success: boolean; message: string }>('/admin/email-test', { to: smtpTestEmail.trim() });
      setSmtpTestResult({ ok: true, message: r.message ?? 'Test e-postası gönderildi.' });
    } catch (err: any) {
      setSmtpTestResult({ ok: false, message: err?.message ?? 'Gönderilemedi.' });
    } finally {
      setSmtpTestSending(false);
    }
  };

  if (loading) return <Loader />;

  const g = s.form;
  const bool = (key: string) => g[key] === 'true';

  return (
    <div>
      <EmailTransportCard refreshKey={emailRefresh} />

      {/* ─── Brevo API ─────────────────────────────────────────────────── */}
      <SectionCard
        title="Brevo API (Transactional Email)"
        subtitle="SMTP_HOST .env'de boşsa bu ayarlar kullanılır. Sadece API Key zorunludur."
      >
        {/* öncelik uyarısı */}
        <div className="flex items-start gap-2.5 rounded-lg bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800 px-4 py-3 mb-4">
          <svg className="flex-shrink-0 mt-0.5 text-violet-500" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
            API anahtarınızı{' '}
            <strong>app.brevo.com → Settings → API Keys</strong>'dan alın.
            {' '}Öncelik: <code className="bg-violet-100 dark:bg-violet-900/30 px-1 rounded">.env SMTP_HOST</code> &gt; <code className="bg-violet-100 dark:bg-violet-900/30 px-1 rounded">.env BREVO_API_KEY</code> &gt; <strong>Bu form</strong> &gt; Gönderim yok
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Brevo API Key *" hint="xkeysib-... ile başlar. Sadece bu alanı doldurmak yeterlidir.">
              <input
                className={inputCls}
                type="password"
                value={g.brevo_api_key ?? ''}
                onChange={(e) => s.set('brevo_api_key', e.target.value)}
                placeholder="xkeysib-••••••••••••••••••••••••••••••••"
                autoComplete="new-password"
              />
            </Field>
          </div>
          <Field label="Gönderen Adı" hint="Boş bırakılırsa mağaza adı kullanılır">
            <input
              className={inputCls}
              value={g.brevo_sender_name ?? ''}
              onChange={(e) => s.set('brevo_sender_name', e.target.value)}
              placeholder="Örn. Mağaza Adı"
            />
          </Field>
          <Field label="Gönderen E-posta" hint="Brevo'da doğrulanmış bir adres olmalıdır">
            <input
              className={inputCls}
              type="email"
              value={g.brevo_sender_email ?? ''}
              onChange={(e) => s.set('brevo_sender_email', e.target.value)}
              placeholder="noreply@example.com"
            />
          </Field>
        </div>
      </SectionCard>

      {/* ─── SMTP ──────────────────────────────────────────────────────── */}
      <SectionCard title="SMTP Ayarları" subtitle="Brevo yerine kendi SMTP sunucunuzu kullanmak istiyorsanız doldurun">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="SMTP Host">
            <input className={inputCls} value={g.smtp_host ?? ''} onChange={(e) => s.set('smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
          </Field>
          <Field label="SMTP Port">
            <input className={inputCls} type="number" value={g.smtp_port ?? '587'} onChange={(e) => s.set('smtp_port', e.target.value)} placeholder="587" />
          </Field>
          <Field label="Kullanıcı Adı">
            <input className={inputCls} value={g.smtp_user ?? ''} onChange={(e) => s.set('smtp_user', e.target.value)} placeholder="noreply@sirket.com" />
          </Field>
          <Field label="Şifre / Uygulama Şifresi">
            <input className={inputCls} type="password" value={g.smtp_pass ?? ''} onChange={(e) => s.set('smtp_pass', e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </Field>
          <Field label="Gönderen Adı">
            <input className={inputCls} value={g.smtp_from_name ?? ''} onChange={(e) => s.set('smtp_from_name', e.target.value)} placeholder="Örn. Mağaza Adı" />
          </Field>
          <Field label="Gönderen E-posta">
            <input className={inputCls} type="email" value={g.smtp_from_email ?? ''} onChange={(e) => s.set('smtp_from_email', e.target.value)} placeholder="noreply@example.com" />
          </Field>
        </div>

        {/* ─── SMTP Test Mail ──────────────────────────────────────────── */}
        <div className="border-t border-stroke dark:border-strokedark mt-5 pt-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-black dark:text-white">Test E-postası Gönder</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Gönder'e bastığınızda ayarlar otomatik kaydedilir ve girdiğiniz SMTP sunucusu üzerinden bir test e-postası yollanır.
            </p>
          </div>
          <div className="flex gap-3">
            <input
              type="email"
              className={inputCls + ' flex-1'}
              placeholder="test@email.com"
              value={smtpTestEmail}
              onChange={(e) => setSmtpTestEmail(e.target.value)}
              disabled={smtpTestSending}
            />
            <button
              type="button"
              onClick={handleSmtpTest}
              disabled={smtpTestSending || !smtpTestEmail.trim()}
              className="px-5 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition whitespace-nowrap shrink-0"
            >
              {smtpTestSending ? 'Gönderiliyor…' : 'Test Gönder'}
            </button>
          </div>
          {smtpTestResult && (
            <p className={`text-xs flex items-center gap-1.5 ${smtpTestResult.ok ? 'text-meta-3' : 'text-meta-1'}`}>
              {smtpTestResult.ok ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              )}
              {smtpTestResult.message}
            </p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Admin Uyarıları" subtitle="Panel yöneticilerine gelen otomatik bildirimler">
        <Field label="Admin Bildirim E-postası" hint="Birden fazla e-posta için virgülle ayırın">
          <input className={inputCls} value={g.admin_email ?? ''} onChange={(e) => s.set('admin_email', e.target.value)} placeholder="admin@sirket.com, muhasebe@sirket.com" />
        </Field>
        <div className="space-y-3 mt-2">
          {[
            { key: 'new_order_alert',    label: 'Yeni sipariş geldiğinde bildir' },
            { key: 'low_stock_alert',    label: 'Stok tükendiğinde bildir' },
            { key: 'new_review_alert',   label: 'Yeni yorum yapıldığında bildir' },
            { key: 'new_question_alert', label: 'Yeni soru sorulduğunda bildir' },
            { key: 'new_return_alert',   label: 'Yeni iade talebi geldiğinde bildir' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-black dark:text-white">{label}</span>
              <Toggle checked={bool(key)} onChange={(v) => s.set(key, String(v))} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Müşteri E-posta Şablonları" subtitle="Otomatik gönderilen e-postaların içeriği. {{ad}}, {{siparis_no}} gibi değişken kullanabilirsiniz.">
        <div className="space-y-6">
          {[
            { prefix: 'order_received', title: 'Sipariş Alındı' },
            { prefix: 'order_shipped',  title: 'Kargoya Verildi' },
            { prefix: 'order_delivered',title: 'Teslim Edildi' },
          ].map(({ prefix, title }) => (
            <div key={prefix} className="rounded-md border border-stroke dark:border-strokedark p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
              <Field label="E-posta Konusu">
                <input
                  className={inputCls}
                  value={g[`${prefix}_subject`] ?? ''}
                  onChange={(e) => s.set(`${prefix}_subject`, e.target.value)}
                  placeholder={`Mağazamızdan ${title.toLowerCase()} bildirimi`}
                />
              </Field>
              <Field label="E-posta İçeriği">
                <textarea
                  className={inputCls + ' min-h-[110px] resize-y font-mono text-xs'}
                  value={g[`${prefix}_body`] ?? ''}
                  onChange={(e) => s.set(`${prefix}_body`, e.target.value)}
                  placeholder={`Sayın {{ad}},\n\nSiparişiniz (#{{siparis_no}}) ${title.toLowerCase()} bilgisi...`}
                />
              </Field>
            </div>
          ))}
        </div>
      </SectionCard>

      <SaveBar saving={s.saving} saved={s.saved} error={s.error} onSave={handleSave} onReset={s.reset} />
    </div>
  );
}

// ─── Tab: Sosyal Medya ────────────────────────────────────────────────────────

const SOCIAL_PLATFORMS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp Numarası',
    placeholder: '905551234567',
    hint: 'Sadece rakamlar, başında + olmadan (örn: 905551234567). Ürün sayfasındaki "WhatsApp ile Sipariş Ver" butonu bu numarayı kullanır.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" className="text-green-500">
        <path d="M16.003 3C9.375 3 4 8.373 4 15.001c0 2.118.553 4.107 1.518 5.837L4 29l8.38-1.495A12.94 12.94 0 0016.003 28c6.628 0 12.003-5.373 12.003-12.001S22.631 3 16.003 3zm5.97 16.774c-.327-.163-1.935-.955-2.234-1.065-.3-.109-.517-.163-.735.163-.218.328-.844 1.065-.935 1.065-.163 0-.327-.054-.49-.163-.327-.163-1.38-.508-2.625-1.62-.97-.866-1.625-1.937-1.815-2.265-.19-.327-.02-.503.144-.666.147-.147.327-.382.49-.572.164-.19.219-.327.328-.545.109-.218.054-.41-.027-.572-.082-.163-.735-1.774-1.008-2.427-.264-.635-.537-.545-.735-.556h-.626c-.218 0-.572.082-.872.41-.3.327-1.143 1.118-1.143 2.727s1.17 3.162 1.333 3.38c.163.218 2.302 3.514 5.58 4.93.78.336 1.388.536 1.863.687.783.25 1.496.214 2.059.13.628-.094 1.935-.79 2.208-1.554.273-.763.273-1.417.19-1.554-.08-.136-.3-.218-.626-.382z"/>
      </svg>
    ),
  },
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/kullanici_adi',
    hint: 'Tam URL girin (https:// ile başlamalı)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pink-500">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    key: 'facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/sayfa_adi',
    hint: '',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600">
        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
      </svg>
    ),
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    placeholder: 'https://twitter.com/kullanici_adi',
    hint: '',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-sky-400">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
      </svg>
    ),
  },
  {
    key: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@kanal_adi',
    hint: '',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
        <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/company/sirket-adi',
    hint: '',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-blue-700">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    ),
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@kullanici_adi',
    hint: '',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-black dark:text-white">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
] as const;

function SocialMediaTab() {
  const [loading, setLoading] = useState(true);
  const s = useSave('social', {});

  useEffect(() => {
    api
      .get<{ success: boolean; data: Record<string, string> }>('/admin/settings/social')
      .then((r) => s.load(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Loader />;

  const g = s.form;
  const filledCount = SOCIAL_PLATFORMS.filter((p) => g[p.key]?.trim()).length;

  return (
    <div>
      <SectionCard
        title="Sosyal Medya & İletişim Kanalları"
        subtitle="Footerda görünmesini istediğiniz kanalları doldurun. Boş bırakılan kanallar sitede gösterilmez."
      >
        {/* Özet satırı */}
        <div className="flex items-center gap-2 mb-2 p-3 rounded-lg bg-gray-50 dark:bg-meta-4/30 border border-stroke dark:border-strokedark">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary flex-shrink-0">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {filledCount === 0
              ? 'Henüz hiçbir kanal eklenmedi — Footer\'da sosyal medya bölümü görünmez.'
              : `${filledCount} kanal aktif — Footer'da ${filledCount} sosyal medya ikonu gösterilecek.`}
          </p>
        </div>

        <div className="space-y-4">
          {SOCIAL_PLATFORMS.map((platform) => (
            <div key={platform.key} className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-stroke dark:border-strokedark bg-gray-50 dark:bg-meta-4">
                {platform.icon}
              </div>
              <div className="flex-1">
                <label className={labelCls}>{platform.label}</label>
                <input
                  className={inputCls}
                  value={g[platform.key] ?? ''}
                  onChange={(e) => s.set(platform.key, e.target.value)}
                  placeholder={platform.placeholder}
                  type={platform.key === 'whatsapp' ? 'tel' : 'url'}
                />
                {platform.hint && (
                  <p className="mt-1 text-xs text-gray-400">{platform.hint}</p>
                )}
              </div>
              {g[platform.key]?.trim() && (
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-meta-3" title="Aktif" />
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <SaveBar saving={s.saving} saved={s.saved} error={s.error} onSave={s.save} onReset={s.reset} />
    </div>
  );
}

function MaintenanceTab() {
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ success: boolean; data: { isActive: boolean; message: string } }>('/admin/settings/maintenance')
      .then((r) => {
        if (r.success) {
          setIsActive(r.data.isActive);
          setMessage(r.data.message);
        }
      })
      .catch((err) => console.error('Failed to load maintenance settings:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await api.put<{ success: boolean; data: { isActive: boolean; message: string } }>('/admin/settings/maintenance', {
        isActive,
        message,
      });
      if (res.success) {
        setIsActive(res.data.isActive);
        setMessage(res.data.message);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Bakım modu kaydedilirken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLoading(true);
    api.get<{ success: boolean; data: { isActive: boolean; message: string } }>('/admin/settings/maintenance')
      .then((r) => {
        if (r.success) {
          setIsActive(r.data.isActive);
          setMessage(r.data.message);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  if (loading) return <Loader />;

  return (
    <div>
      <SectionCard title="Sistem Bakım Modu" subtitle="Web sitesini ziyaretçilere kapatıp bakım ekranına yönlendirin">
        <div className="flex items-start justify-between border-b border-stroke dark:border-strokedark pb-5 mb-5">
          <div className="max-w-[80%]">
            <p className="text-sm font-semibold text-black dark:text-white">Bakım Modunu Aktifleştir</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Bakım modu aktifken son kullanıcılar siteye erişemez, yapım aşaması ekranını görür. Admin paneline giriş yapmış yöneticiler ise siteyi normal şekilde görüntülemeye devam eder.
            </p>
          </div>
          <Toggle checked={isActive} onChange={setIsActive} />
        </div>

        <Field label="Bakım Modu Duyuru Mesajı" hint="Ziyaretçilerin bakım ekranında göreceği özel mesaj">
          <textarea
            className={inputCls + ' min-h-[100px] resize-y'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Sistemimizde güncelleme yapılmaktadır, kısa süre sonra görüşmek üzere!"
          />
        </Field>
      </SectionCard>

      <SaveBar
        saving={saving}
        saved={saved}
        error={error}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  );
}

// ─── Watermark (Filigran) Tab ────────────────────────────────────────────────

type WmPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'tiled';

interface WatermarkConfig {
  enabled: boolean;
  url: string;
  position: WmPosition;
  opacity: number;
  size: number;
  margin: number;
}

const WM_POSITIONS: { value: WmPosition; label: string }[] = [
  { value: 'bottom-right', label: 'Sağ Alt' },
  { value: 'bottom-left', label: 'Sol Alt' },
  { value: 'top-right', label: 'Sağ Üst' },
  { value: 'top-left', label: 'Sol Üst' },
  { value: 'center', label: 'Orta' },
  { value: 'tiled', label: 'Döşeli (Tekrarlı)' },
];

function WatermarkTab() {
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<WatermarkConfig>({
    enabled: false,
    url: '',
    position: 'bottom-right',
    opacity: 70,
    size: 22,
    margin: 16,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get<{ success: boolean; data: WatermarkConfig }>('/admin/settings/watermark')
      .then((r) => { if (r.success) setCfg(r.data); })
      .catch((err) => console.error('Filigran ayarları yüklenemedi:', err))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Dosya 5 MB\'dan küçük olmalıdır'); return; }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = getToken();
      // Filigran görselinin kendisine filigran basılmaz → ham /admin/upload
      const response = await fetch(`${API_BASE}/admin/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Yükleme başarısız');
      const data = await response.json();
      setCfg((c) => ({ ...c, url: data.data.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yükleme hatası');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      if (cfg.enabled && !cfg.url) {
        throw new Error('Filigran açıkken bir filigran görseli yüklemelisiniz.');
      }
      const res = await api.put<{ success: boolean; data: WatermarkConfig }>('/admin/settings/watermark', cfg);
      if (res.success) {
        setCfg(res.data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Filigran ayarları kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  // Önizleme için filigran konumunu CSS'e çevir
  const previewStyle = (): React.CSSProperties => {
    const w = `${cfg.size}%`;
    const m = `${Math.round(cfg.margin / 2)}px`;
    const base: React.CSSProperties = { position: 'absolute', width: w, height: 'auto', opacity: cfg.opacity / 100 };
    switch (cfg.position) {
      case 'top-left': return { ...base, top: m, left: m };
      case 'top-right': return { ...base, top: m, right: m };
      case 'bottom-left': return { ...base, bottom: m, left: m };
      case 'center': return { ...base, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
      case 'tiled': return {}; // aşağıda ayrı ele alınır
      case 'bottom-right':
      default: return { ...base, bottom: m, right: m };
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <SectionCard
        title="Ürün Görseli Filigranı (Watermark)"
        subtitle="Yüklenen ürün görsellerine otomatik olarak logonuzu/filigranınızı basın"
      >
        <div className="flex items-start justify-between border-b border-stroke dark:border-strokedark pb-5 mb-5">
          <div className="max-w-[80%]">
            <p className="text-sm font-semibold text-black dark:text-white">Filigranı Aktifleştir</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Açıkken, bundan sonra yüklenen <strong>ürün görsellerine</strong> filigran basılır. Daha önce
              yüklenmiş görseller etkilenmez. Editör/kategori/logo görselleri filigranlanmaz.
            </p>
          </div>
          <Toggle checked={cfg.enabled} onChange={(v) => setCfg((c) => ({ ...c, enabled: v }))} />
        </div>

        <Field label="Filigran Görseli" hint="Saydam arka planlı PNG önerilir (ör. beyaz logo)">
          <div className="flex items-center gap-4">
            <div
              className="h-24 w-24 flex-shrink-0 rounded border border-stroke dark:border-strokedark flex items-center justify-center overflow-hidden"
              style={{
                backgroundImage:
                  'linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)',
                backgroundSize: '12px 12px',
                backgroundPosition: '0 0,0 6px,6px -6px,-6px 0px',
              }}
            >
              {cfg.url ? (
                <img src={cfg.url} alt="Filigran" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[10px] text-gray-400 text-center px-1">Görsel yok</span>
              )}
            </div>
            <div className="space-y-2">
              <input type="file" accept="image/png,image/webp,image/*" onChange={handleUpload} disabled={uploading} className="hidden" id="wm-input" />
              <label
                htmlFor="wm-input"
                className={`inline-flex cursor-pointer items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
              >
                {uploading ? 'Yükleniyor…' : cfg.url ? 'Görseli Değiştir' : 'Görsel Yükle'}
              </label>
              {cfg.url && (
                <button
                  type="button"
                  onClick={() => setCfg((c) => ({ ...c, url: '' }))}
                  className="block text-xs text-red-500 hover:underline"
                >
                  Görseli kaldır
                </button>
              )}
            </div>
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
          <Field label="Konum">
            <select
              className={inputCls}
              value={cfg.position}
              onChange={(e) => setCfg((c) => ({ ...c, position: e.target.value as WmPosition }))}
            >
              {WM_POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Field>

          <Field label={`Boyut — görsel genişliğinin %${cfg.size}'i`} hint="Filigranın ürün görseline göre büyüklüğü">
            <input
              type="range" min={5} max={100} step={1}
              value={cfg.size}
              onChange={(e) => setCfg((c) => ({ ...c, size: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
          </Field>

          <Field label={`Opaklık — %${cfg.opacity}`} hint="0 saydam, 100 tam görünür">
            <input
              type="range" min={0} max={100} step={1}
              value={cfg.opacity}
              onChange={(e) => setCfg((c) => ({ ...c, opacity: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
          </Field>

          <Field label="Kenar Boşluğu (px)" hint="Köşe konumlarında kenardan uzaklık">
            <input
              type="number" min={0} max={200}
              value={cfg.margin}
              onChange={(e) => setCfg((c) => ({ ...c, margin: Number(e.target.value) }))}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Önizleme */}
        <div className="mt-6">
          <p className="text-sm font-medium text-black dark:text-white mb-2">Önizleme</p>
          <div className="relative w-full max-w-xs aspect-square rounded border border-stroke dark:border-strokedark overflow-hidden bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
            <span className="text-gray-400 dark:text-gray-500 text-sm select-none">Ürün Görseli</span>
            {cfg.url && cfg.position === 'tiled' && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${cfg.url})`,
                  backgroundRepeat: 'repeat',
                  backgroundSize: `${cfg.size}%`,
                  opacity: cfg.opacity / 100,
                }}
              />
            )}
            {cfg.url && cfg.position !== 'tiled' && (
              <img src={cfg.url} alt="Filigran önizleme" style={previewStyle()} />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Önizleme yaklaşıktır; gerçek sonuç sunucuda görsele basılır.
          </p>
        </div>
      </SectionCard>

      <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} onReset={load} />
    </div>
  );
}

interface AdminPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  showInMenu: boolean;
  showInHeader: boolean;
  showInFooter: boolean;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
}

interface PageDraft {
  id: string;        // boş = yeni sayfa
  slug: string;
  title: string;
  content: string;
  showInHeader: boolean;
  showInFooter: boolean;
  isSystem: boolean;
}

function SortablePageRow({
  page,
  onToggle,
  onEdit,
  onRemove,
}: {
  page: AdminPage;
  onToggle: (p: AdminPage, field: 'showInHeader' | 'showInFooter' | 'isActive') => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <tr ref={setNodeRef} style={style} className="border-b border-stroke dark:border-strokedark">
      <td className="py-3 pl-1 pr-2 text-gray-400 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="4" cy="3" r="1.2"/><circle cx="10" cy="3" r="1.2"/><circle cx="4" cy="7" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="4" cy="11" r="1.2"/><circle cx="10" cy="11" r="1.2"/></svg>
      </td>
      <td className="py-3 pr-4 font-medium text-black dark:text-white">
        {page.title}
        {page.isSystem && (
          <span className="ml-2 rounded-full bg-gray-100 dark:bg-meta-4 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">Sistem</span>
        )}
      </td>
      <td className="py-3 pr-4 font-mono text-xs text-gray-500">
        /{page.isSystem ? page.slug : `sayfa/${page.slug}`}
      </td>
      <td className="py-3 pr-3 text-center">
        <input type="checkbox" checked={page.showInHeader} onChange={() => onToggle(page, 'showInHeader')} className="h-4 w-4 cursor-pointer" />
      </td>
      <td className="py-3 pr-3 text-center">
        <input type="checkbox" checked={page.showInFooter} onChange={() => onToggle(page, 'showInFooter')} className="h-4 w-4 cursor-pointer" />
      </td>
      <td className="py-3 pr-4 text-center">
        <input type="checkbox" checked={page.isActive} onChange={() => onToggle(page, 'isActive')} className="h-4 w-4 cursor-pointer" />
      </td>
      <td className="py-3 pr-4 text-right whitespace-nowrap">
        <button type="button" onClick={onEdit} className="text-primary hover:underline mr-3">Düzenle</button>
        {!page.isSystem && (
          <button type="button" onClick={onRemove} className="text-red-500 hover:underline">Sil</button>
        )}
      </td>
    </tr>
  );
}

function PagesTab() {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<AdminPage[]>([]);
  const [draft, setDraft] = useState<PageDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    api
      .get<{ success: boolean; data: AdminPage[] }>('/admin/pages')
      .then((r) => setPages(r.data ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function toggle(p: AdminPage, field: 'showInHeader' | 'showInFooter' | 'isActive') {
    setPages((prev) => prev.map((x) => (x.id === p.id ? { ...x, [field]: !x[field] } : x)));
    try {
      await api.put(`/admin/pages/${p.id}`, { [field]: !p[field] });
    } catch (e: any) {
      setError(e.message);
      load();
    }
  }

  async function remove(p: AdminPage) {
    if (!confirm(`"${p.title}" sayfasını silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/admin/pages/${p.id}`);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pages.findIndex((p) => p.id === active.id);
    const newIndex = pages.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(pages, oldIndex, newIndex);
    setPages(reordered);
    try {
      await api.put('/admin/pages/reorder', { ids: reordered.map((p) => p.id) });
    } catch (e: any) {
      setError(e.message);
      load();
    }
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.title.trim()) { setError('Başlık gerekli'); return; }
    setSaving(true);
    setError('');
    try {
      if (draft.id) {
        await api.put(`/admin/pages/${draft.id}`, {
          title: draft.title,
          content: draft.content,
          showInHeader: draft.showInHeader,
          showInFooter: draft.showInFooter,
          ...(draft.isSystem ? {} : { slug: draft.slug }),
        });
      } else {
        await api.post('/admin/pages', {
          title: draft.title,
          content: draft.content,
          showInHeader: draft.showInHeader,
          showInFooter: draft.showInFooter,
          slug: draft.slug || undefined,
        });
      }
      setDraft(null);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <div>
      <SectionCard
        title="Müşteri Hizmetleri Sayfaları"
        subtitle="Sıralamak için sürükleyin · Header/Footer gösterimini satır üzerinden açın/kapatın"
      >
        {error && (
          <div className="mb-4 rounded bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stroke dark:border-strokedark text-left text-xs uppercase text-gray-500">
                <th className="py-2 w-6"></th>
                <th className="py-2 pr-4">Başlık</th>
                <th className="py-2 pr-4">Bağlantı</th>
                <th className="py-2 pr-3 text-center">Header</th>
                <th className="py-2 pr-3 text-center">Footer</th>
                <th className="py-2 pr-4 text-center">Aktif</th>
                <th className="py-2 pr-4 text-right">İşlem</th>
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {pages.map((p) => (
                    <SortablePageRow
                      key={p.id}
                      page={p}
                      onToggle={toggle}
                      onEdit={() => setDraft({ id: p.id, slug: p.slug, title: p.title, content: p.content, showInHeader: p.showInHeader, showInFooter: p.showInFooter, isSystem: p.isSystem })}
                      onRemove={() => remove(p)}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setDraft({ id: '', slug: '', title: '', content: '', showInHeader: true, showInFooter: true, isSystem: false })}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
          >
            + Yeni Sayfa Ekle
          </button>
        </div>
      </SectionCard>

      {draft && (
        <SectionCard
          title={draft.id ? `Sayfayı Düzenle: ${draft.title}` : 'Yeni Sayfa'}
          subtitle={draft.isSystem ? 'Sistem sayfası — bağlantı (slug) değiştirilemez' : 'Başlık, bağlantı ve içerik belirleyin'}
        >
          <Field label="Başlık">
            <input
              className={inputCls}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Örn. Kargo Takip"
            />
          </Field>

          {!draft.isSystem && (
            <Field label="Bağlantı (slug)" hint="Boş bırakırsanız başlıktan otomatik üretilir. Sayfa /sayfa/<slug> adresinde açılır.">
              <input
                className={inputCls}
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                placeholder="kargo-takip"
              />
            </Field>
          )}

          {/* İçerik Editörü */}
          <div className="mb-4.5">
            <label className={labelCls}>İçerik</label>
            <QuillEditor
              value={draft.content}
              onChange={(html) => setDraft({ ...draft, content: html })}
              placeholder="Sayfa içeriğini yazın... Zengin HTML (<style>, <div class=…>) otomatik HTML kaynak modunda açılır ve olduğu gibi korunur."
              minHeight={360}
            />
          </div>

          <div className="flex gap-6 mb-4">
            <label className="flex items-center gap-2 text-sm text-black dark:text-white cursor-pointer">
              <input
                type="checkbox"
                checked={draft.showInHeader}
                onChange={(e) => setDraft({ ...draft, showInHeader: e.target.checked })}
                className="h-4 w-4"
              />
              Üst menüde (Header) göster
            </label>
            <label className="flex items-center gap-2 text-sm text-black dark:text-white cursor-pointer">
              <input
                type="checkbox"
                checked={draft.showInFooter}
                onChange={(e) => setDraft({ ...draft, showInFooter: e.target.checked })}
                className="h-4 w-4"
              />
              Altbilgide (Footer) göster
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={() => { setDraft(null); setError(''); }}
              className="rounded bg-gray-100 dark:bg-meta-4 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200"
            >
              İptal
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

interface SlideItem {
  img: string;
  link: string;
}

function SliderTab() {
  const [loading, setLoading] = useState(true);
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const handleFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    setError('');
    try {
      const res = await api.upload<{ success: boolean; data: { url: string } }>('/admin/upload', file);
      if (res.success && res.data.url) {
        updateSlide(index, 'img', res.data.url);
      } else {
        setError('Görsel yüklenemedi.');
      }
    } catch (err: any) {
      setError(err.message || 'Görsel yükleme hatası.');
    } finally {
      setUploadingIndex(null);
      e.target.value = '';
    }
  };

  useEffect(() => {
    api.get<{ success: boolean; data: Record<string, string> }>('/admin/settings/homepage')
      .then((r) => {
        if (r.success) {
          const slidesVal = r.data.slides;
          if (slidesVal) {
            try {
              setSlides(JSON.parse(slidesVal));
            } catch {
              setSlides([]);
            }
          } else {
            setSlides([
              { img: '/banner-yaz.png', link: '/ara?search=yaz' },
              { img: '/banner-yilbasi.png', link: '/ara?search=yılbaşı' },
              { img: '/banner-sonbahar.png', link: '/ara?search=turuncu' }
            ]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.put('/admin/settings/homepage', {
        slides: JSON.stringify(slides),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Kayıt hatası');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLoading(true);
    api.get<{ success: boolean; data: Record<string, string> }>('/admin/settings/homepage')
      .then((r) => {
        if (r.success) {
          const slidesVal = r.data.slides;
          if (slidesVal) {
            try {
              setSlides(JSON.parse(slidesVal));
            } catch {
              setSlides([]);
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const updateSlide = (index: number, field: keyof SlideItem, value: string) => {
    setSlides((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, [field]: value } : s))
    );
  };

  const removeSlide = (index: number) => {
    setSlides((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addSlide = () => {
    setSlides((prev) => [...prev, { img: '', link: '' }]);
  };

  if (loading) return <Loader />;

  return (
    <div>
      <SectionCard title="Ana Sayfa Banner Slider Yönetimi" subtitle="Kullanıcı ana sayfasındaki kayan büyük kampanya görsellerini düzenleyin">
        <div className="space-y-6">
          {slides.map((slide, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-5 p-5 rounded-xl border border-stroke dark:border-strokedark bg-gray-50/50 dark:bg-meta-4/20 relative group">
              {/* Preview / Upload Area */}
              <div className="flex flex-col items-center">
                <div
                  onClick={() => document.getElementById(`file-input-${index}`)?.click()}
                  className="w-full md:w-44 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-meta-4 border border-stroke dark:border-strokedark flex flex-col items-center justify-center cursor-pointer hover:border-primary transition group/img relative"
                >
                  {uploadingIndex === index ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-[10px] text-gray-400">Yükleniyor...</span>
                    </div>
                  ) : slide.img ? (
                    <>
                      <img src={slide.img} className="w-full h-full object-cover" alt="Slide preview" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-xs text-white font-medium">
                        Görseli Değiştir
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-400">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span className="text-[10px] font-medium">Görsel Seç</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  id={`file-input-${index}`}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileChange(index, e)}
                />
                <button
                  type="button"
                  disabled={uploadingIndex !== null}
                  onClick={() => document.getElementById(`file-input-${index}`)?.click()}
                  className="mt-2 text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  Dosya Yükle
                </button>
              </div>

              {/* Inputs */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={`Görsel URL #${index + 1}`}>
                    <input
                      className={inputCls}
                      value={slide.img}
                      onChange={(e) => updateSlide(index, 'img', e.target.value)}
                      placeholder="/banner-yaz.png veya https://..."
                    />
                  </Field>
                  <Field label={`Yönlendirme Linki #${index + 1}`}>
                    <input
                      className={inputCls}
                      value={slide.link}
                      onChange={(e) => updateSlide(index, 'link', e.target.value)}
                      placeholder="/kategori/nevresim-takimlari veya /ara?search=yaz"
                    />
                  </Field>
                </div>
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => removeSlide(index)}
                className="absolute top-3 right-3 md:relative md:top-auto md:right-auto md:self-center p-2 rounded-lg text-meta-1 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                title="Slide Sil"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          ))}

          {slides.length === 0 && (
            <div className="text-center py-10 border border-dashed border-stroke dark:border-strokedark rounded-xl">
              <p className="text-sm text-gray-400">Aktif kampanya görseli bulunmuyor. Yeni bir slide ekleyin.</p>
            </div>
          )}

          <button
            type="button"
            onClick={addSlide}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition text-sm font-semibold"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Yeni Slide Ekle
          </button>
        </div>
      </SectionCard>

      <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} onReset={handleReset} />
    </div>
  );
}

interface ContactMsg {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  body: string;
  isRead: boolean;
  createdAt: string;
  user?: {
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    } | null;
  } | null;
}

function MessagesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const messageIdParam = searchParams.get('messageId');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [selectedMsg, setSelectedMsg] = useState<ContactMsg | null>(null);

  const fetchMessages = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean; data: { messages: ContactMsg[]; unreadCount: number } }>('/admin/messages')
      .then((r) => {
        if (r.success) {
          setMessages(r.data.messages || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleMarkRead = async (msgId: string) => {
    try {
      await api.put(`/admin/messages/${msgId}/read`, {});
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, isRead: true } : m))
      );
      if (selectedMsg && selectedMsg.id === msgId) {
        setSelectedMsg((prev) => prev ? { ...prev, isRead: true } : null);
      }
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  };

  useEffect(() => {
    if (messages.length > 0 && messageIdParam) {
      const msg = messages.find((m) => m.id === messageIdParam);
      if (msg) {
        setSelectedMsg(msg);
        if (!msg.isRead) {
          handleMarkRead(msg.id);
        }
      }
    }
  }, [messageIdParam, messages]);

  const handleSelect = (msg: ContactMsg) => {
    setSelectedMsg(msg);
    setSearchParams((prev) => {
      prev.set('messageId', msg.id);
      return prev;
    });
    if (!msg.isRead) {
      handleMarkRead(msg.id);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* Messages List */}
      <div className="xl:col-span-2">
        <SectionCard title="Gelen Kutusu" subtitle="Müşteri iletişim formlarından gelen mesajlar">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleSelect(msg)}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-start gap-4 ${
                  selectedMsg?.id === msg.id
                    ? 'border-primary bg-primary/5 dark:bg-primary/5'
                    : msg.isRead
                    ? 'border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/10 bg-white dark:bg-boxdark'
                    : 'border-stroke dark:border-strokedark bg-blue-50/20 dark:bg-blue-950/10 hover:bg-blue-50/40 font-semibold'
                }`}
              >
                {/* Unread Dot Indicator */}
                <div className="mt-1 shrink-0">
                  {msg.isRead ? (
                    <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                  ) : (
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-black dark:text-white truncate">
                      {msg.name}
                    </p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {new Date(msg.createdAt).toLocaleString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-1.5 font-mono">
                    {msg.email}
                  </p>
                  <p className="text-sm text-black dark:text-white truncate">
                    {msg.subject || '(Konu Belirtilmemiş)'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
                    {msg.body}
                  </p>
                </div>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="text-center py-10 border border-dashed border-stroke dark:border-strokedark rounded-xl">
                <p className="text-sm text-gray-400">Gelen mesaj bulunmuyor.</p>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Message Reader Panel */}
      <div className="xl:col-span-1">
        <SectionCard title="Mesaj Detayı">
          {selectedMsg ? (
            <div className="space-y-5">
              <div className="border-b border-stroke dark:border-strokedark pb-4">
                <h4 className="font-semibold text-black dark:text-white text-base mb-1">
                  {selectedMsg.subject || '(Konu Yok)'}
                </h4>
                <p className="text-xs text-gray-400">
                  {new Date(selectedMsg.createdAt).toLocaleString('tr-TR')}
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-gray-400 block mb-0.5 font-medium">Gönderen</span>
                  <p className="font-semibold text-black dark:text-white">{selectedMsg.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{selectedMsg.email}</p>
                </div>

                {selectedMsg.user && (
                  <div className="bg-gray-50 dark:bg-meta-4/20 p-3 rounded-lg border border-stroke dark:border-strokedark">
                    <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider mb-1">
                      Kayıtlı Müşteri Profili
                    </span>
                    <p className="text-xs text-black dark:text-white font-medium">
                      {selectedMsg.user.profile?.firstName
                        ? `${selectedMsg.user.profile.firstName} ${selectedMsg.user.profile.lastName ?? ''}`.trim()
                        : selectedMsg.user.email}
                    </p>
                    <p className="text-[10px] text-gray-400">{selectedMsg.user.email}</p>
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs text-gray-400 block mb-1.5 font-medium">Mesaj İçeriği</span>
                <div className="p-4 rounded-xl border border-stroke dark:border-strokedark bg-gray-50/50 dark:bg-meta-4/10 text-sm text-black dark:text-white font-sans leading-relaxed whitespace-pre-wrap">
                  {selectedMsg.body}
                </div>
              </div>

              {!selectedMsg.isRead && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(selectedMsg.id)}
                  className="w-full py-2.5 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-95 transition"
                >
                  Okundu Olarak İşaretle
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <svg className="mx-auto mb-3 text-gray-300" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <p className="text-xs">Okumak istediğiniz mesajı listeden seçin.</p>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Loader ───────────────────────────────────────────────────────────────────

// ─── Chatbot Tab ──────────────────────────────────────────────────────────────

interface ChatbotRule {
  id: string;
  title: string;
  keywords: string[];
  response: string;
  quickReplies: string[];
  sortOrder: number;
  isActive: boolean;
}

const EMPTY_RULE: Omit<ChatbotRule, 'id'> = {
  title: '', keywords: [], response: '', quickReplies: [], sortOrder: 0, isActive: true,
};

function KeywordInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const kw = draft.trim().toLowerCase();
    if (kw && !value.includes(kw)) onChange([...value, kw]);
    setDraft('');
  };

  const remove = (kw: string) => onChange(value.filter((k) => k !== kw));

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Kelime ekle, Enter'a bas"
          className={inputCls + ' flex-1'}
        />
        <button type="button" onClick={add} className="px-3 py-2 rounded bg-primary text-white text-sm">+</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((kw) => (
          <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
            {kw}
            <button onClick={() => remove(kw)} className="ml-0.5 hover:text-meta-1">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

function RuleModal({
  rule,
  onClose,
  onSave,
}: {
  rule: Partial<ChatbotRule> | null;
  onClose: () => void;
  onSave: (data: Omit<ChatbotRule, 'id'>) => Promise<void>;
}) {
  const isNew = !rule?.id;
  const [form, setForm] = useState<Omit<ChatbotRule, 'id'>>({
    ...EMPTY_RULE,
    ...(rule ? { title: rule.title ?? '', keywords: rule.keywords ?? [], response: rule.response ?? '', quickReplies: rule.quickReplies ?? [], sortOrder: rule.sortOrder ?? 0, isActive: rule.isActive ?? true } : {}),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [qrDraft, setQrDraft] = useState('');

  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const addQr = () => {
    const qr = qrDraft.trim();
    if (qr && !form.quickReplies.includes(qr)) set('quickReplies', [...form.quickReplies, qr]);
    setQrDraft('');
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Başlık zorunludur'); return; }
    if (!form.response.trim()) { setError('Yanıt metni zorunludur'); return; }
    setSaving(true);
    setError('');
    try { await onSave(form); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Kayıt hatası'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-boxdark rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stroke dark:border-strokedark">
          <h3 className="text-base font-semibold text-black dark:text-white">{isNew ? 'Yeni Kural' : 'Kuralı Düzenle'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Başlık (yönetim için)">
              <input value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="ör. Kargo & Teslimat" />
            </Field>
            <Field label="Sıra">
              <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} className={inputCls} />
            </Field>
          </div>

          <Field label="Tetikleyici Kelimeler" hint="Hiçbir kelime eklemezseniz, bu kural Varsayılan (Anlaşılamayan Sorulara) yanıt olarak çalışır">
            <KeywordInput value={form.keywords} onChange={(v) => set('keywords', v)} />
          </Field>

          <Field label="Asistan Yanıtı" hint="**kalın** için çift yıldız kullanın">
            <textarea
              value={form.response}
              onChange={(e) => set('response', e.target.value)}
              rows={6}
              className={inputCls + ' resize-y font-mono text-xs'}
              placeholder="🚚 **Başlık**&#10;&#10;• Madde 1&#10;• Madde 2"
            />
          </Field>

          <Field label="Hızlı Yanıt Butonları" hint="Kullanıcıya gösterilecek hazır seçenekler">
            <div className="flex gap-2 mb-2">
              <input
                value={qrDraft}
                onChange={(e) => setQrDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQr(); } }}
                placeholder="Buton metni, Enter'a bas"
                className={inputCls + ' flex-1'}
              />
              <button type="button" onClick={addQr} className="px-3 py-2 rounded bg-primary text-white text-sm">+</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.quickReplies.map((qr, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-stroke dark:border-strokedark text-black dark:text-white">
                  {qr}
                  <button onClick={() => set('quickReplies', form.quickReplies.filter((_, j) => j !== i))} className="ml-0.5 text-gray-400 hover:text-meta-1">×</button>
                </span>
              ))}
            </div>
          </Field>

          <div className="flex items-center gap-3">
            <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} />
            <span className="text-sm text-black dark:text-white">Kural aktif</span>
          </div>

          {error && <p className="text-sm text-meta-1">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke dark:border-strokedark">
          <button onClick={onClose} className="px-4 py-2 rounded border border-stroke dark:border-strokedark text-sm text-black dark:text-white hover:bg-gray-50 dark:hover:bg-meta-4 transition">İptal</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition">
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatbotTab() {
  const [rules, setRules] = useState<ChatbotRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'new' | ChatbotRule | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get<{ success: boolean; data: ChatbotRule[] }>('/admin/chatbot/rules');
      setRules(r.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data: Omit<ChatbotRule, 'id'>) => {
    if (modal === 'new') {
      await api.post('/admin/chatbot/rules', data);
    } else if (modal && modal !== 'new') {
      await api.put(`/admin/chatbot/rules/${modal.id}`, data);
    }
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kural silinsin mi?')) return;
    setDeleting(id);
    try { await api.delete(`/admin/chatbot/rules/${id}`); setRules((p) => p.filter((r) => r.id !== id)); }
    catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const handleToggle = async (rule: ChatbotRule) => {
    try {
      await api.put(`/admin/chatbot/rules/${rule.id}`, { isActive: !rule.isActive });
      setRules((p) => p.map((r) => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
    } catch { /* ignore */ }
  };

  return (
    <div>
      {modal && (
        <RuleModal
          rule={modal === 'new' ? {} : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      <SectionCard
        title="Asistan Kural Yönetimi"
        subtitle="Chatbot'un anahtar kelime eşleştirme kuralları — sıralama & aktif/pasif durumu buradan yönetilir"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {rules.length} kural · {rules.filter((r) => r.isActive).length} aktif
          </p>
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Yeni Kural Ekle
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin h-7 w-7 border-2 border-primary border-t-transparent rounded-full" /></div>
        ) : rules.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Henüz kural yok. "Yeni Kural Ekle" butonu ile başlayın.</p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition ${
                  rule.isActive
                    ? 'border-stroke dark:border-strokedark bg-white dark:bg-boxdark'
                    : 'border-dashed border-gray-200 dark:border-strokedark bg-gray-50 dark:bg-meta-4/30 opacity-60'
                }`}
              >
                {/* Sıra */}
                <span className="text-xs text-gray-400 w-5 shrink-0 mt-1 text-center">{rule.sortOrder + 1}</span>

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-black dark:text-white">{rule.title}</span>
                    {!rule.isActive && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-meta-4 text-gray-500">Pasif</span>}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {rule.keywords.length === 0 ? (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium border border-amber-200">
                        🌟 Varsayılan (Fallback) Yanıt
                      </span>
                    ) : (
                      <>
                        {rule.keywords.slice(0, 6).map((kw) => (
                          <span key={kw} className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{kw}</span>
                        ))}
                        {rule.keywords.length > 6 && <span className="text-[11px] text-gray-400">+{rule.keywords.length - 6}</span>}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate max-w-md">{rule.response.replace(/\*\*/g, '').slice(0, 100)}…</p>
                </div>

                {/* Aksiyonlar */}
                <div className="flex items-center gap-2 shrink-0">
                  <Toggle checked={rule.isActive} onChange={() => handleToggle(rule)} />
                  <button
                    onClick={() => setModal(rule)}
                    className="text-xs px-3 py-1.5 rounded border border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 transition"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    disabled={deleting === rule.id}
                    className="text-xs px-3 py-1.5 rounded border border-meta-1 text-meta-1 hover:bg-red-50 dark:hover:bg-meta-1/10 transition disabled:opacity-40"
                  >
                    {deleting === rule.id ? '…' : 'Sil'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Server Stats ─────────────────────────────────────────────────────────────

interface SysCpu  { model: string; cores: number; physicalCores: number; speed: number; usagePercent: number; }
interface SysMem  { totalBytes: number; usedBytes: number; freeBytes: number; usagePercent: number; }
interface SysDisk { fs: string; mount: string; totalBytes: number; usedBytes: number; usagePercent: number; }
interface SysNet  { iface: string; rxBytesPerSec: number; txBytesPerSec: number; rxTotalBytes: number; txTotalBytes: number; }
interface SystemStats {
  hostname: string; platform: string; distro: string; release: string; arch: string;
  uptimeSeconds: number; cpu: SysCpu; mem: SysMem; disks: SysDisk[]; net: SysNet[]; collectedAt: string;
}

function fmtBytes(b: number, decimals = 1): string {
  if (b <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

function fmtUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}g ${h}s ${m}dk`;
  if (h > 0) return `${h}s ${m}dk`;
  return `${m}dk`;
}

function GaugeBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-gray-200 dark:bg-meta-4 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-medium text-black dark:text-white">{value}</span>
    </div>
  );
}

function ServerStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ success: boolean; data: SystemStats }>('/admin/tools/system/stats');
      setStats(r.data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Veri alınamadı');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const cpuColor = (p: number) => p > 80 ? 'bg-meta-1' : p > 60 ? 'bg-amber-400' : 'bg-meta-3';
  const memColor = (p: number) => p > 85 ? 'bg-meta-1' : p > 70 ? 'bg-amber-400' : 'bg-meta-3';
  const diskColor = (p: number) => p > 90 ? 'bg-meta-1' : p > 75 ? 'bg-amber-400' : 'bg-primary';

  return (
    <SectionCard
      title="Sunucu Durumu"
      subtitle="CPU, RAM, disk ve ağ bilgileri — 5 saniyede bir yenilenir"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-meta-3 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-xs text-gray-400">{autoRefresh ? 'Canlı' : 'Durduruldu'}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="text-xs px-3 py-1 rounded border border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 transition"
          >
            Yenile
          </button>
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`text-xs px-3 py-1 rounded transition ${
              autoRefresh
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'border border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4'
            }`}
          >
            {autoRefresh ? 'Otomatik Açık' : 'Otomatik Kapalı'}
          </button>
        </div>
      </div>

      {loading && !stats && (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      {error && <p className="text-sm text-meta-1">{error}</p>}

      {stats && (
        <div className="space-y-5">
          {/* OS Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded bg-gray-50 dark:bg-meta-4/40">
            <StatBadge label="Sunucu" value={stats.hostname} />
            <StatBadge label="OS" value={`${stats.distro} ${stats.release}`} />
            <StatBadge label="Mimari" value={stats.arch} />
            <StatBadge label="Uptime" value={fmtUptime(stats.uptimeSeconds)} />
          </div>

          {/* CPU */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium text-black dark:text-white">CPU</span>
                <span className="ml-2 text-xs text-gray-400">{stats.cpu.model}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{stats.cpu.physicalCores} fiziksel / {stats.cpu.cores} mantıksal çekirdek</span>
                <span>{stats.cpu.speed} GHz</span>
                <span className={`font-semibold text-sm ${stats.cpu.usagePercent > 80 ? 'text-meta-1' : stats.cpu.usagePercent > 60 ? 'text-amber-500' : 'text-meta-3'}`}>
                  %{stats.cpu.usagePercent}
                </span>
              </div>
            </div>
            <GaugeBar pct={stats.cpu.usagePercent} color={cpuColor(stats.cpu.usagePercent)} />
          </div>

          {/* RAM */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-black dark:text-white">RAM</span>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{fmtBytes(stats.mem.usedBytes)} / {fmtBytes(stats.mem.totalBytes)} kullanılıyor</span>
                <span className={`font-semibold text-sm ${stats.mem.usagePercent > 85 ? 'text-meta-1' : stats.mem.usagePercent > 70 ? 'text-amber-500' : 'text-meta-3'}`}>
                  %{stats.mem.usagePercent}
                </span>
              </div>
            </div>
            <GaugeBar pct={stats.mem.usagePercent} color={memColor(stats.mem.usagePercent)} />
            <div className="flex gap-4 mt-1 text-xs text-gray-400">
              <span>Boş: {fmtBytes(stats.mem.freeBytes)}</span>
              <span>Toplam: {fmtBytes(stats.mem.totalBytes)}</span>
            </div>
          </div>

          {/* Disks */}
          <div>
            <p className="text-sm font-medium text-black dark:text-white mb-3">Diskler</p>
            <div className="space-y-3">
              {stats.disks.map((d) => (
                <div key={d.mount}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-gray-600 dark:text-gray-300">{d.mount} <span className="text-gray-400">({d.fs})</span></span>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{fmtBytes(d.usedBytes)} / {fmtBytes(d.totalBytes)}</span>
                      <span className={`font-semibold ${d.usagePercent > 90 ? 'text-meta-1' : d.usagePercent > 75 ? 'text-amber-500' : 'text-gray-500'}`}>
                        %{d.usagePercent}
                      </span>
                    </div>
                  </div>
                  <GaugeBar pct={d.usagePercent} color={diskColor(d.usagePercent)} />
                </div>
              ))}
            </div>
          </div>

          {/* Network */}
          {stats.net.length > 0 && (
            <div>
              <p className="text-sm font-medium text-black dark:text-white mb-3">Ağ Arayüzleri</p>
              <div className="overflow-x-auto rounded border border-stroke dark:border-strokedark">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-meta-4 text-left">
                    <tr>
                      <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300">Arayüz</th>
                      <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300 text-right">↓ İndirme/s</th>
                      <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300 text-right">↑ Yükleme/s</th>
                      <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300 text-right">Toplam ↓</th>
                      <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300 text-right">Toplam ↑</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.net.map((n) => (
                      <tr key={n.iface} className="border-t border-stroke dark:border-strokedark">
                        <td className="px-4 py-2 font-mono text-black dark:text-white">{n.iface}</td>
                        <td className="px-4 py-2 text-right text-meta-3">{fmtBytes(n.rxBytesPerSec)}/s</td>
                        <td className="px-4 py-2 text-right text-primary">{fmtBytes(n.txBytesPerSec)}/s</td>
                        <td className="px-4 py-2 text-right text-gray-500">{fmtBytes(n.rxTotalBytes)}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{fmtBytes(n.txTotalBytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 text-right">
            Son güncelleme: {new Date(stats.collectedAt).toLocaleTimeString('tr-TR')}
          </p>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Tools Tab ────────────────────────────────────────────────────────────────

interface BackupFile {
  filename: string;
  size: number;
  sizeHuman: string;
  createdAt: string;
}

interface BackupSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  hour: number;
  weekday: number;
  keepCount: number;
}

interface DbStatRow {
  table_name: string;
  row_count: number;
  size: string;
}

interface ImportResult {
  total: number;
  success: number;
  errors: { row: number; message: string }[];
}

function ToolsTab() {
  // ── Backup state ──────────────────────────────────────────────────
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [schedule, setSchedule] = useState<BackupSchedule>({
    enabled: false, frequency: 'daily', hour: 2, weekday: 0, keepCount: 7,
  });
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedSaved, setSchedSaved] = useState(false);
  const [restoreModal, setRestoreModal] = useState<{ open: boolean; filename: string; password: string }>({ open: false, filename: '', password: '' });
  const [restoring, setRestoring] = useState(false);
  const [encryptBackup, setEncryptBackup] = useState(true);

  // ── DB state ─────────────────────────────────────────────────────
  const [dbStats, setDbStats] = useState<DbStatRow[]>([]);
  const [dbStatsLoading, setDbStatsLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeMsg, setOptimizeMsg] = useState('');

  // ── Import state ──────────────────────────────────────────────────
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const loadBackups = async () => {
    setBackupLoading(true);
    try {
      const r = await api.get<{ success: boolean; data: BackupFile[] }>('/admin/tools/backup/list');
      setBackups(r.data);
    } catch { /* ignore */ }
    finally { setBackupLoading(false); }
  };

  const loadSchedule = async () => {
    try {
      const r = await api.get<{ success: boolean; data: BackupSchedule }>('/admin/tools/backup/schedule');
      setSchedule(r.data);
    } catch { /* ignore */ }
  };

  const loadDbStats = async () => {
    setDbStatsLoading(true);
    try {
      const r = await api.get<{ success: boolean; data: DbStatRow[] }>('/admin/tools/db/stats');
      setDbStats(r.data);
    } catch { /* ignore */ }
    finally { setDbStatsLoading(false); }
  };

  useEffect(() => { loadBackups(); loadSchedule(); loadDbStats(); }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await api.post('/admin/tools/backup/create', { encrypt: encryptBackup });
      await loadBackups();
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`"${filename}" yedeği silinsin mi?`)) return;
    try {
      await api.delete(`/admin/tools/backup/${encodeURIComponent(filename)}`);
      setBackups((p) => p.filter((b) => b.filename !== filename));
    } catch { /* ignore */ }
  };

  const handleDownload = (filename: string) => {
    const url = `${API_BASE}/admin/tools/backup/${encodeURIComponent(filename)}/download`;
    const token = getToken();
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  const handleRestore = async () => {
    if (!confirm('⚠️ Veritabanı bu yedekten geri yüklenecek! Tüm son değişiklikler kaybolabilir. Emin misiniz?')) return;
    setRestoring(true);
    try {
      await api.post(`/admin/tools/backup/${encodeURIComponent(restoreModal.filename)}/restore`, {
        password: restoreModal.password,
      });
      alert('Veritabanı başarıyla geri yüklendi. Sayfayı yenileyiniz.');
      setRestoreModal({ open: false, filename: '', password: '' });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Geri yükleme başarısız');
    } finally {
      setRestoring(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSchedSaving(true);
    try {
      await api.put('/admin/tools/backup/schedule', schedule);
      setSchedSaved(true);
      setTimeout(() => setSchedSaved(false), 3000);
    } catch { /* ignore */ }
    finally { setSchedSaving(false); }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    setOptimizeMsg('');
    try {
      const r = await api.post<{ success: boolean; message: string }>('/admin/tools/db/optimize', {});
      setOptimizeMsg(r.message ?? 'Tamamlandı');
      await loadDbStats();
    } catch (err) {
      setOptimizeMsg(err instanceof Error ? err.message : 'Hata oluştu');
    } finally { setOptimizing(false); }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const token = getToken();
      const resp = await fetch(`${API_BASE}/admin/tools/products/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
        body: fd,
      });
      const json = await resp.json();
      if (json.success) setImportResult(json.data);
    } catch { /* ignore */ }
    finally { setImporting(false); }
  };

  return (
    <div className="space-y-5">
      {/* ── Sunucu Durumu ─────────────────────────────────────────── */}
      <ServerStats />

      {/* ── Yedekleme ─────────────────────────────────────────────── */}
      <SectionCard title="Yedekleme" subtitle="Manuel ve zamanlanmış veritabanı yedekleme">
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Yedekler, <code className="bg-gray-100 dark:bg-meta-4 px-1 rounded text-xs">/backups</code> klasörüne kaydedilir.
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={encryptBackup}
                  onChange={(e) => setEncryptBackup(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-black dark:text-white">🔒 Şifrele</span>
              </label>
              <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
          >
                {creating ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                )}
                {creating ? 'Yedekleniyor…' : 'Şimdi Yedekle'}
              </button>
            </div>
          </div>
        </div>

        {/* Backup list */}
        {backupLoading ? (
          <div className="flex justify-center py-6"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
        ) : backups.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Henüz yedek bulunmuyor.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-stroke dark:border-strokedark">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-meta-4 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300">Dosya</th>
                  <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300">Boyut</th>
                  <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300">Tarih</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.filename} className="border-t border-stroke dark:border-strokedark">
                    <td className="px-4 py-2 font-mono text-xs text-black dark:text-white">
                      {b.filename}
                      {b.filename.endsWith('.sql.enc') && <span className="ml-2 text-amber-600 dark:text-amber-400 font-semibold">🔒</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{b.sizeHuman}</td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 justify-end">
                        {(b.filename.endsWith('.sql') || b.filename.endsWith('.sql.enc')) && (
                          <button
                            onClick={() => setRestoreModal({ open: true, filename: b.filename, password: '' })}
                            className="text-xs px-3 py-1 rounded border border-meta-3 text-meta-3 hover:bg-green-50 dark:hover:bg-meta-3/10 transition"
                          >
                            Geri Yükle
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(b.filename)}
                          className="text-xs px-3 py-1 rounded border border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 transition"
                        >
                          İndir
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(b.filename)}
                          className="text-xs px-3 py-1 rounded border border-meta-1 text-meta-1 hover:bg-red-50 dark:hover:bg-meta-1/10 transition"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Schedule */}
        <div className="border-t border-stroke dark:border-strokedark pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-black dark:text-white">Zamanlanmış Yedekleme</span>
            <Toggle checked={schedule.enabled} onChange={(v) => setSchedule((p) => ({ ...p, enabled: v }))} />
          </div>

          {schedule.enabled && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Sıklık">
                <select
                  value={schedule.frequency}
                  onChange={(e) => setSchedule((p) => ({ ...p, frequency: e.target.value as 'daily' | 'weekly' }))}
                  className={inputCls}
                >
                  <option value="daily">Günlük</option>
                  <option value="weekly">Haftalık</option>
                </select>
              </Field>
              <Field label="Saat (0-23)">
                <input
                  type="number" min={0} max={23}
                  value={schedule.hour}
                  onChange={(e) => setSchedule((p) => ({ ...p, hour: Number(e.target.value) }))}
                  className={inputCls}
                />
              </Field>
              {schedule.frequency === 'weekly' && (
                <Field label="Gün">
                  <select
                    value={schedule.weekday}
                    onChange={(e) => setSchedule((p) => ({ ...p, weekday: Number(e.target.value) }))}
                    className={inputCls}
                  >
                    {['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'].map((d, i) => (
                      <option key={i} value={i}>{d}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Saklama (adet)">
                <input
                  type="number" min={1} max={30}
                  value={schedule.keepCount}
                  onChange={(e) => setSchedule((p) => ({ ...p, keepCount: Number(e.target.value) }))}
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveSchedule}
              disabled={schedSaving}
              className="px-4 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
            >
              {schedSaving ? 'Kaydediliyor…' : 'Zamanlamayı Kaydet'}
            </button>
            {schedSaved && <span className="text-sm text-meta-3">Kaydedildi</span>}
          </div>
        </div>
      </SectionCard>

      {/* ── Veritabanı Optimizasyonu ───────────────────────────────── */}
      <SectionCard title="Veritabanı Optimizasyonu" subtitle="VACUUM ANALYZE çalıştır, tablo istatistiklerini görüntüle">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handleOptimize}
            disabled={optimizing}
            className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
          >
            {optimizing ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
            )}
            {optimizing ? 'Çalışıyor…' : 'VACUUM ANALYZE Çalıştır'}
          </button>
          {optimizeMsg && (
            <span className={`text-sm ${optimizeMsg.includes('ata') ? 'text-meta-1' : 'text-meta-3'}`}>
              {optimizeMsg}
            </span>
          )}
        </div>

        {dbStatsLoading ? (
          <div className="flex justify-center py-4"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
        ) : dbStats.length > 0 && (
          <div className="overflow-x-auto rounded border border-stroke dark:border-strokedark mt-2">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-meta-4 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300">Tablo</th>
                  <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300 text-right">Satır</th>
                  <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-300 text-right">Boyut</th>
                </tr>
              </thead>
              <tbody>
                {dbStats.map((row) => (
                  <tr key={row.table_name} className="border-t border-stroke dark:border-strokedark">
                    <td className="px-4 py-2 font-mono text-xs text-black dark:text-white">{row.table_name}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{row.row_count.toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{row.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── Ürün İçe Aktarma ──────────────────────────────────────── */}
      <SectionCard title="Excel / CSV ile Ürün İçe Aktarma" subtitle="Toplu ürün eklemek için Excel veya CSV dosyası yükleyin">
        <div className="rounded border border-stroke dark:border-strokedark p-4 text-sm text-gray-500 dark:text-gray-400">
          <p className="font-medium text-black dark:text-white mb-2">Sütun Formatı</p>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr className="text-gray-400">
                  {['ad*','kategori','marka','fiyat*','karsilastirma_fiyati','stok','sku','aciklama','gorsel_url','aktif'].map((h) => (
                    <th key={h} className="pr-4 pb-1 font-mono font-normal text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {['Ürün Adı','Elektronik','Apple','1999.99','2499.99','50','ABC-001','Açıklama','https://…','true'].map((v, i) => (
                    <td key={i} className="pr-4 text-gray-400 font-mono">{v}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs">* Zorunlu alan. Kategori/marka yoksa otomatik oluşturulur.</p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 px-4 py-2 rounded border border-dashed border-stroke dark:border-strokedark cursor-pointer hover:bg-gray-50 dark:hover:bg-meta-4 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
              <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
            </svg>
            <span className="text-sm text-gray-500">
              {importFile ? importFile.name : 'Excel / CSV Seç (.xlsx, .xls, .csv)'}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportResult(null); }}
            />
          </label>

          <button
            onClick={handleImport}
            disabled={!importFile || importing}
            className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
          >
            {importing ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            )}
            {importing ? 'İçe Aktarılıyor…' : 'İçe Aktar'}
          </button>
        </div>

        {importResult && (
          <div className={`rounded border p-4 ${importResult.errors.length > 0 ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10' : 'border-meta-3 bg-green-50 dark:bg-green-900/10'}`}>
            <p className="text-sm font-medium text-black dark:text-white mb-2">
              İçe aktarma tamamlandı: {importResult.success}/{importResult.total} başarılı
            </p>
            {importResult.errors.length > 0 && (
              <ul className="text-xs space-y-1 text-meta-1 max-h-40 overflow-y-auto">
                {importResult.errors.map((e, i) => (
                  <li key={i}>Satır {e.row}: {e.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SectionCard>

      {/* Restore Modal */}
      {restoreModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-meta-4 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-black dark:text-white mb-4">
              ⚠️ Veritabanı Geri Yükle
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Dosya: <code className="bg-gray-100 dark:bg-meta-3 px-2 py-1 rounded text-xs">{restoreModal.filename}</code>
            </p>
            <p className="text-sm text-meta-1 mb-4 font-medium">
              ⚠️ Bu işlem tüm veritabanı verilerini değiştirecektir!
            </p>

            <div className="mb-4">
              <label className="text-sm font-medium text-black dark:text-white block mb-2">
                Admin Şifresi
              </label>
              <input
                type="password"
                value={restoreModal.password}
                onChange={(e) => setRestoreModal((p) => ({ ...p, password: e.target.value }))}
                placeholder="Admin şifresini gir"
                className={inputCls}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRestoreModal({ open: false, filename: '', password: '' })}
                disabled={restoring}
                className="flex-1 px-4 py-2 rounded border border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-3 transition text-sm font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleRestore}
                disabled={restoring || !restoreModal.password}
                className="flex-1 px-4 py-2 rounded bg-meta-1 text-white hover:bg-opacity-90 disabled:opacity-50 transition text-sm font-medium flex items-center justify-center gap-2"
              >
                {restoring ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Geri Yükleniyor...
                  </>
                ) : (
                  'Geri Yükle'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader() {
  return (
    <div className="flex justify-center py-16">
      <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

// ─── Campaign Tab ─────────────────────────────────────────────────────────────

const CAMPAIGN_COLORS = [
  { value: 'primary', label: 'Mavi (Site rengi)', hex: '#4F46E5' },
  { value: 'red',     label: 'Kırmızı',           hex: '#DC2626' },
  { value: 'orange',  label: 'Turuncu',            hex: '#F97316' },
  { value: 'purple',  label: 'Mor',                hex: '#7C3AED' },
  { value: 'green',   label: 'Yeşil',              hex: '#10B981' },
  { value: 'navy',    label: 'Lacivert',            hex: '#1E40AF' },
];

function formatForDatetimeInput(isoStr: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface CampaignForm {
  name: string;
  discountText: string;
  endDate: string;
  showOnHome: boolean;
  color: string;
  displayType: string;
  ctaText: string;
  ctaLink: string;
}

function defaultEndDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 0, 0);
  return formatForDatetimeInput(d.toISOString());
}

const EMPTY_CAMPAIGN: CampaignForm = {
  name: '', discountText: '', endDate: defaultEndDate(), showOnHome: false,
  color: 'primary', displayType: 'sticky', ctaText: '', ctaLink: '',
};

function CampaignTab() {
  const [form, setForm] = useState<CampaignForm>(EMPTY_CAMPAIGN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    api.get<{ success: boolean; data: (CampaignForm & { endDate: string }) | null }>('/admin/campaign')
      .then((r) => {
        if (r.data) {
          setForm({
            ...EMPTY_CAMPAIGN,
            ...r.data,
            endDate: formatForDatetimeInput(r.data.endDate),
            ctaText: r.data.ctaText ?? '',
            ctaLink: r.data.ctaLink ?? '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof CampaignForm, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setSaved(false); setSaveError('');
    try {
      await api.post('/admin/campaign', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Kayıt hatası');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin h-7 w-7 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <SectionCard title="İndirim Günü Kampanyası" subtitle="Ana sayfada görünecek kampanya banner'ı — pasifken hiçbir şey gösterilmez">

        {/* Aktif/Pasif toggle */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-4 border-b border-stroke dark:border-strokedark">
          <div className="flex items-center gap-3">
            <Toggle checked={form.showOnHome} onChange={(v) => set('showOnHome', v)} />
            <span className="text-sm font-medium text-black dark:text-white">
              {form.showOnHome ? 'Ana Sayfada Göster' : 'Gizle'}
            </span>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${form.showOnHome ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-meta-4 dark:text-gray-400'}`}>
            {form.showOnHome ? '● Aktif' : '○ Pasif'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Kampanya Adı">
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="Efsane Cuma" />
          </Field>

          <Field label="İndirim Metni">
            <input value={form.discountText} onChange={(e) => set('discountText', e.target.value)} className={inputCls} placeholder="%50'ye Varan İndirimler" />
          </Field>

          <Field label="Bitiş Tarihi & Saati" hint="Süre dolduğunda banner otomatik kapanır">
            <input
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => set('endDate', e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Görüntüleme Tipi">
            <div className="flex gap-4 mt-1">
              {[
                { value: 'sticky', label: 'Sabit Bar', hint: 'Başlık üstünde ince bant' },
                { value: 'banner',  label: 'Banner',    hint: 'Sayfa içinde büyük banner' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-start gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="displayType"
                    value={opt.value}
                    checked={form.displayType === opt.value}
                    onChange={() => set('displayType', opt.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-black dark:text-white group-hover:text-primary transition">{opt.label}</span>
                    <p className="text-[11px] text-gray-400">{opt.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </Field>

          <Field label="CTA Buton Metni" hint="Boş bırakılırsa buton gösterilmez">
            <input value={form.ctaText} onChange={(e) => set('ctaText', e.target.value)} className={inputCls} placeholder="Hemen İncele" />
          </Field>

          <Field label="CTA Buton Linki">
            <input value={form.ctaLink} onChange={(e) => set('ctaLink', e.target.value)} className={inputCls} placeholder="/ara?indirim=true" />
          </Field>
        </div>

        {/* Renk seçici */}
        <Field label="Kampanya Rengi">
          <div className="flex flex-wrap gap-3 mt-1">
            {CAMPAIGN_COLORS.map((c) => (
              <label key={c.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="color"
                  value={c.value}
                  checked={form.color === c.value}
                  onChange={() => set('color', c.value)}
                  className="sr-only"
                />
                <span
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                    form.color === c.value
                      ? 'border-black dark:border-white scale-105'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex, color: '#fff' }}
                >
                  {form.color === c.value && <span>✓</span>}
                  {c.label}
                </span>
              </label>
            ))}
          </div>
        </Field>

        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          {saveError
            ? <p className="text-sm text-meta-1">{saveError}</p>
            : <span />
          }
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
          >
            {saving ? 'Kaydediliyor…' : saved ? '✓ Kaydedildi' : 'Kaydet'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Popup Tab ────────────────────────────────────────────────────────────────

interface PopupForm {
  title: string;
  content: string;
  imageUrl: string;
  buttonText: string;
  buttonLink: string;
  isActive: boolean;
  displayFreq: string;
}

const EMPTY_POPUP: PopupForm = {
  title: '', content: '', imageUrl: '', buttonText: '', buttonLink: '',
  isActive: false, displayFreq: 'session',
};

function PopupTab() {
  const [form, setForm] = useState<PopupForm>(EMPTY_POPUP);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<{ success: boolean; data: PopupForm | null }>('/admin/popup')
      .then((r) => { if (r.data) setForm({ ...EMPTY_POPUP, ...r.data, imageUrl: r.data.imageUrl ?? '', buttonText: r.data.buttonText ?? '', buttonLink: r.data.buttonLink ?? '' }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof PopupForm, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.post('/admin/popup', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin h-7 w-7 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <SectionCard title="Pop-up Bildirimi" subtitle="Ziyaretçilere gösterilecek açılır pencere — pasif iken frontend'de hiç görünmez">
        {/* Aktif/Pasif toggle */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-4 border-b border-stroke dark:border-strokedark">
          <div className="flex items-center gap-3">
            <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} />
            <span className="text-sm font-medium text-black dark:text-white">
              {form.isActive ? 'Pop-up Aktif' : 'Pop-up Pasif'}
            </span>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${form.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-meta-4 dark:text-gray-400'}`}>
            {form.isActive ? '● Yayında' : '○ Kapalı'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Field label="Başlık">
              <input value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="Büyük İndirim Başladı! 🎉" />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="İçerik" hint="HTML etiketleri desteklenir: <b>, <em>, <br>, <a href='...'> vb.">
              <textarea
                value={form.content}
                onChange={(e) => set('content', e.target.value)}
                rows={5}
                className={inputCls + ' resize-y font-mono text-xs'}
                placeholder="Seçili ürünlerde <b>%40'a varan</b> indirimler sizi bekliyor!"
              />
            </Field>
          </div>

          <Field label="Resim URL" hint="Opsiyonel — popup üstüne görsel eklemek için">
            <input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} className={inputCls} placeholder="https://example.com/banner.jpg" />
          </Field>

          <Field label="Görüntülenme Sıklığı">
            <select value={form.displayFreq} onChange={(e) => set('displayFreq', e.target.value)} className={inputCls}>
              <option value="session">Oturum başına 1 kez</option>
              <option value="once_24h">24 saatte 1 kez</option>
              <option value="always">Her sayfa yenilemede</option>
            </select>
          </Field>

          <Field label="Buton Metni" hint="Boş bırakılırsa buton gösterilmez">
            <input value={form.buttonText} onChange={(e) => set('buttonText', e.target.value)} className={inputCls} placeholder="Hemen İncele" />
          </Field>

          <Field label="Buton Linki">
            <input value={form.buttonLink} onChange={(e) => set('buttonLink', e.target.value)} className={inputCls} placeholder="/kampanya" />
          </Field>
        </div>

        <div className="flex justify-end mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
          >
            {saving ? 'Kaydediliyor…' : saved ? '✓ Kaydedildi' : 'Kaydet'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Tab Config ───────────────────────────────────────────────────────────────

type TabKey = 'general' | 'payment' | 'shipping' | 'team' | 'notifications' | 'social' | 'maintenance' | 'watermark' | 'pages' | 'navlinks' | 'features' | 'slider' | 'messages' | 'tools' | 'chatbot' | 'popup' | 'campaign' | 'oauth' | 'mfa' | 'analytics';

// ─── Tab: Menü Linkleri ───────────────────────────────────────────────────────

interface NavLink {
  id: string;
  label: string;
  url: string;
  openInNewTab: boolean;
  sortOrder: number;
  isActive: boolean;
}

interface NavLinkDraft {
  id?: string;
  label: string;
  url: string;
  openInNewTab: boolean;
  sortOrder: number;
  isActive: boolean;
}

function NavLinksTab() {
  const [links, setLinks] = useState<NavLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<NavLinkDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    api
      .get<{ success: boolean; data: NavLink[] }>('/admin/nav-links')
      .then((r) => setLinks(r.data ?? []))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleActive(link: NavLink) {
    setLinks((prev) => prev.map((x) => (x.id === link.id ? { ...x, isActive: !x.isActive } : x)));
    try {
      await api.put(`/admin/nav-links/${link.id}`, { isActive: !link.isActive });
    } catch (e: any) {
      setError(e.message);
      load();
    }
  }

  async function remove(link: NavLink) {
    if (!confirm(`"${link.label}" linkini silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/admin/nav-links/${link.id}`);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.label.trim()) { setError('Etiket gerekli'); return; }
    if (!draft.url.trim()) { setError('URL gerekli'); return; }
    setSaving(true);
    setError('');
    try {
      if (draft.id) {
        await api.put(`/admin/nav-links/${draft.id}`, {
          label: draft.label,
          url: draft.url,
          openInNewTab: draft.openInNewTab,
          sortOrder: draft.sortOrder,
          isActive: draft.isActive,
        });
      } else {
        await api.post('/admin/nav-links', {
          label: draft.label,
          url: draft.url,
          openInNewTab: draft.openInNewTab,
          sortOrder: draft.sortOrder,
          isActive: draft.isActive,
        });
      }
      setDraft(null);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const emptyDraft = (): NavLinkDraft => ({
    label: '',
    url: '',
    openInNewTab: false,
    sortOrder: links.length > 0 ? Math.max(...links.map((l) => l.sortOrder)) + 10 : 0,
    isActive: true,
  });

  if (loading) return <Loader />;

  return (
    <div>
      <SectionCard
        title="Menü Linkleri"
        subtitle="Kategori nav barında ve mobil menüde görünecek özel linkler"
      >
        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        {/* Link Listesi */}
        {links.length === 0 ? (
          <p className="text-sm text-body py-4 text-center">Henüz özel link eklenmemiş.</p>
        ) : (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark text-left">
                  <th className="pb-2 font-medium text-black dark:text-white">Etiket</th>
                  <th className="pb-2 font-medium text-black dark:text-white">URL</th>
                  <th className="pb-2 font-medium text-black dark:text-white text-center">Yeni Sekme</th>
                  <th className="pb-2 font-medium text-black dark:text-white text-center">Sıra</th>
                  <th className="pb-2 font-medium text-black dark:text-white text-center">Aktif</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} className="border-b border-stroke/50 dark:border-strokedark/50">
                    <td className="py-2.5 pr-3 font-medium text-black dark:text-white">{link.label}</td>
                    <td className="py-2.5 pr-3 text-body max-w-[200px] truncate">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary underline-offset-2 hover:underline">
                        {link.url}
                      </a>
                    </td>
                    <td className="py-2.5 pr-3 text-center">
                      {link.openInNewTab ? (
                        <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full">Evet</span>
                      ) : (
                        <span className="text-xs text-body">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-center text-body">{link.sortOrder}</td>
                    <td className="py-2.5 pr-3 text-center">
                      <Toggle checked={link.isActive} onChange={() => toggleActive(link)} />
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDraft({ id: link.id, label: link.label, url: link.url, openInNewTab: link.openInNewTab, sortOrder: link.sortOrder, isActive: link.isActive })}
                          className="px-3 py-1 text-xs rounded border border-stroke dark:border-strokedark hover:border-primary hover:text-primary transition-colors"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => remove(link)}
                          className="px-3 py-1 text-xs rounded border border-stroke dark:border-strokedark hover:border-red-400 hover:text-red-500 transition-colors"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Yeni Link Butonu */}
        {!draft && (
          <button
            onClick={() => setDraft(emptyDraft())}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded border border-stroke dark:border-strokedark hover:border-primary hover:text-primary text-sm transition-colors"
          >
            <span className="text-lg leading-none">+</span> Yeni Link Ekle
          </button>
        )}

        {/* Form */}
        {draft && (
          <div className="mt-4 border border-stroke dark:border-strokedark rounded-lg p-4 space-y-4 bg-gray-50/50 dark:bg-meta-4/20">
            <h4 className="font-medium text-black dark:text-white">{draft.id ? 'Linki Düzenle' : 'Yeni Link'}</h4>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Etiket (menüde görünen metin)">
                <input
                  className={inputCls}
                  value={draft.label}
                  onChange={(e) => setDraft((d) => d && ({ ...d, label: e.target.value }))}
                  placeholder="Ör: Kampanyalar, Blog, Hakkımızda"
                />
              </Field>
              <Field label="URL" hint="Dahili: /kampanyalar — Harici: https://...">
                <input
                  className={inputCls}
                  value={draft.url}
                  onChange={(e) => setDraft((d) => d && ({ ...d, url: e.target.value }))}
                  placeholder="/kampanyalar veya https://example.com"
                />
              </Field>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Sıra Numarası" hint="Küçük sayı = önce">
                <input
                  type="number"
                  className={inputCls}
                  value={draft.sortOrder}
                  onChange={(e) => setDraft((d) => d && ({ ...d, sortOrder: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Yeni Sekmede Aç">
                <div className="flex items-center gap-3 pt-2">
                  <Toggle
                    checked={draft.openInNewTab}
                    onChange={(v) => setDraft((d) => d && ({ ...d, openInNewTab: v }))}
                  />
                  <span className="text-sm text-body">{draft.openInNewTab ? 'Evet (harici link)' : 'Hayır (aynı sekme)'}</span>
                </div>
              </Field>
              <Field label="Aktif">
                <div className="flex items-center gap-3 pt-2">
                  <Toggle
                    checked={draft.isActive}
                    onChange={(v) => setDraft((d) => d && ({ ...d, isActive: v }))}
                  />
                  <span className="text-sm text-body">{draft.isActive ? 'Menüde görünür' : 'Gizli'}</span>
                </div>
              </Field>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={saveDraft}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
              <button
                onClick={() => { setDraft(null); setError(''); }}
                className="px-4 py-2 text-sm rounded border border-stroke dark:border-strokedark hover:border-primary hover:text-primary transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="mt-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4 text-sm text-blue-800 dark:text-blue-300">
        <strong>İpucu:</strong> Bu linkler, desktop kategori nav barında kategorilerin ardından ve mobil menüde "Bağlantılar" başlığı altında görünür.
        Dahili linkler için <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">/</code> ile başlayan yol kullanın (ör. <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">/kampanyalar</code>).
        Harici linkler için tam URL girin ve "Yeni Sekmede Aç" seçeneğini etkinleştirin.
      </div>
    </div>
  );
}

// ─── Ana Sayfa Avantaj Kartları ──────────────────────────────────────────────

const FEATURE_ICON_OPTIONS: { value: string; label: string }[] = [
  { value: 'truck', label: '🚚 Kargo (kamyon)' },
  { value: 'rotate-ccw', label: '↩️ İade (geri ok)' },
  { value: 'headphones', label: '🎧 Destek (kulaklık)' },
  { value: 'shield-check', label: '🛡️ Güvenlik (kalkan)' },
  { value: 'credit-card', label: '💳 Kredi Kartı' },
  { value: 'gift', label: '🎁 Hediye' },
  { value: 'clock', label: '⏰ Saat' },
  { value: 'award', label: '🏅 Ödül' },
  { value: 'lock', label: '🔒 Kilit' },
  { value: 'badge-check', label: '✅ Onay Rozeti' },
  { value: 'package', label: '📦 Paket' },
  { value: 'phone', label: '📞 Telefon' },
  { value: 'heart', label: '❤️ Kalp' },
  { value: 'star', label: '⭐ Yıldız' },
];

const iconLabel = (v: string) => FEATURE_ICON_OPTIONS.find((o) => o.value === v)?.label ?? v;

interface FeatureCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

interface FeatureCardDraft {
  id?: string;
  icon: string;
  title: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

function FeatureCardsTab() {
  const [cards, setCards] = useState<FeatureCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<FeatureCardDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    api
      .get<{ success: boolean; data: FeatureCard[] }>('/admin/feature-cards')
      .then((r) => setCards(r.data ?? []))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleActive(card: FeatureCard) {
    setCards((prev) => prev.map((x) => (x.id === card.id ? { ...x, isActive: !x.isActive } : x)));
    try {
      await api.put(`/admin/feature-cards/${card.id}`, { isActive: !card.isActive });
    } catch (e: any) {
      setError(e.message);
      load();
    }
  }

  async function remove(card: FeatureCard) {
    if (!confirm(`"${card.title}" kartını silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/admin/feature-cards/${card.id}`);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.title.trim()) { setError('Başlık gerekli'); return; }
    if (!draft.description.trim()) { setError('Açıklama gerekli'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        icon: draft.icon,
        title: draft.title,
        description: draft.description,
        sortOrder: draft.sortOrder,
        isActive: draft.isActive,
      };
      if (draft.id) {
        await api.put(`/admin/feature-cards/${draft.id}`, payload);
      } else {
        await api.post('/admin/feature-cards', payload);
      }
      setDraft(null);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const emptyDraft = (): FeatureCardDraft => ({
    icon: 'truck',
    title: '',
    description: '',
    sortOrder: cards.length > 0 ? Math.max(...cards.map((c) => c.sortOrder)) + 1 : 0,
    isActive: true,
  });

  if (loading) return <Loader />;

  return (
    <div>
      <SectionCard
        title="Ana Sayfa Avantaj Kartları"
        subtitle="Ana sayfadaki kargo / iade / destek / güvenlik kartlarını yönetin"
      >
        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        {cards.length === 0 ? (
          <p className="text-sm text-body py-4 text-center">Henüz kart eklenmemiş.</p>
        ) : (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark text-left">
                  <th className="pb-2 font-medium text-black dark:text-white">İkon</th>
                  <th className="pb-2 font-medium text-black dark:text-white">Başlık</th>
                  <th className="pb-2 font-medium text-black dark:text-white">Açıklama</th>
                  <th className="pb-2 font-medium text-black dark:text-white text-center">Sıra</th>
                  <th className="pb-2 font-medium text-black dark:text-white text-center">Aktif</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => (
                  <tr key={card.id} className="border-b border-stroke/50 dark:border-strokedark/50">
                    <td className="py-2.5 pr-3 text-body whitespace-nowrap">{iconLabel(card.icon)}</td>
                    <td className="py-2.5 pr-3 font-medium text-black dark:text-white">{card.title}</td>
                    <td className="py-2.5 pr-3 text-body max-w-[260px] truncate">{card.description}</td>
                    <td className="py-2.5 pr-3 text-center text-body">{card.sortOrder}</td>
                    <td className="py-2.5 pr-3 text-center">
                      <Toggle checked={card.isActive} onChange={() => toggleActive(card)} />
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDraft({ id: card.id, icon: card.icon, title: card.title, description: card.description, sortOrder: card.sortOrder, isActive: card.isActive })}
                          className="px-3 py-1 text-xs rounded border border-stroke dark:border-strokedark hover:border-primary hover:text-primary transition-colors"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => remove(card)}
                          className="px-3 py-1 text-xs rounded border border-stroke dark:border-strokedark hover:border-red-400 hover:text-red-500 transition-colors"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!draft && (
          <button
            onClick={() => setDraft(emptyDraft())}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded border border-stroke dark:border-strokedark hover:border-primary hover:text-primary text-sm transition-colors"
          >
            <span className="text-lg leading-none">+</span> Yeni Kart Ekle
          </button>
        )}

        {draft && (
          <div className="mt-4 border border-stroke dark:border-strokedark rounded-lg p-4 space-y-4 bg-gray-50/50 dark:bg-meta-4/20">
            <h4 className="font-medium text-black dark:text-white">{draft.id ? 'Kartı Düzenle' : 'Yeni Kart'}</h4>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="İkon">
                <select
                  className={inputCls}
                  value={draft.icon}
                  onChange={(e) => setDraft((d) => d && ({ ...d, icon: e.target.value }))}
                >
                  {FEATURE_ICON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Başlık">
                <input
                  className={inputCls}
                  value={draft.title}
                  onChange={(e) => setDraft((d) => d && ({ ...d, title: e.target.value }))}
                  placeholder="Ör: Ücretsiz & Hızlı Kargo"
                />
              </Field>
            </div>

            <Field label="Açıklama">
              <input
                className={inputCls}
                value={draft.description}
                onChange={(e) => setDraft((d) => d && ({ ...d, description: e.target.value }))}
                placeholder="Ör: 750₺ üzeri alışverişlerinizde kargo bedava."
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Sıra Numarası" hint="Küçük sayı = önce">
                <input
                  type="number"
                  className={inputCls}
                  value={draft.sortOrder}
                  onChange={(e) => setDraft((d) => d && ({ ...d, sortOrder: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Aktif">
                <div className="flex items-center gap-3 pt-2">
                  <Toggle
                    checked={draft.isActive}
                    onChange={(v) => setDraft((d) => d && ({ ...d, isActive: v }))}
                  />
                  <span className="text-sm text-body">{draft.isActive ? 'Ana sayfada görünür' : 'Gizli'}</span>
                </div>
              </Field>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={saveDraft}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
              <button
                onClick={() => { setDraft(null); setError(''); }}
                className="px-4 py-2 text-sm rounded border border-stroke dark:border-strokedark hover:border-primary hover:text-primary transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="mt-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4 text-sm text-blue-800 dark:text-blue-300">
        <strong>İpucu:</strong> Bu kartlar ana sayfada ürünlerin üstündeki avantaj şeridinde görünür. Sırayı "Sıra Numarası" ile, görünürlüğü "Aktif" ile yönetebilirsiniz.
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const s = useSave('analytics', {});

  useEffect(() => {
    api
      .get<{ success: boolean; data: Record<string, string> }>('/admin/settings/analytics')
      .then((r) => s.load(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Loader />;
  
  const g = s.form;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Analytics Entegrasyonu"
        subtitle="Google Analytics, Facebook Pixel, Matomo gibi takip kodlarınızı buraya ekleyebilirsiniz."
      >
        <div className="rounded-md border border-stroke bg-blue-50 p-4 text-sm text-blue-800 dark:border-strokedark dark:bg-blue-900/20 dark:text-blue-300 mb-5">
          <p>
            Verdiğiniz kod bloğu (örn. <code>&lt;script&gt;...&lt;/script&gt;</code>) mağazanın tüm sayfalarında 
            otomatik olarak çalıştırılacaktır. Sadece güvenilir izleme kodlarını yapıştırın.
          </p>
        </div>

        <Field label="Takip / İzleme Kodu (HTML/Script)">
          <textarea
            className={inputCls + ' min-h-[250px] resize-y font-mono text-xs whitespace-pre'}
            value={g.tracking_code ?? ''}
            onChange={(e) => s.set('tracking_code', e.target.value)}
            placeholder="<!-- Global site tag (gtag.js) - Google Analytics -->&#10;<script async src=&#34;https://www.googletagmanager.com/gtag/js?id=G-XXXXX&#34;></script>&#10;..."
          />
        </Field>
      </SectionCard>
      
      <SaveBar saving={s.saving} saved={s.saved} error={s.error} onSave={s.save} onReset={s.reset} />
    </div>
  );
}

function OAuthTab() {
  const [form, setForm] = useState({
    googleClientId: '',
    facebookAppId: '',
    instagramAppId: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  // Google Sign-In gerçek çalışma durumu (env > DB çözümlenmiş değer)
  const [googleActive, setGoogleActive] = useState<boolean | null>(null);

  const loadGoogleStatus = () => {
    api.get<{ success: boolean; data: { googleClientId?: string } }>('/config/public')
      .then((r) => setGoogleActive(!!r.data?.googleClientId))
      .catch(() => setGoogleActive(false));
  };

  useEffect(() => {
    api.get<{ success: boolean; data: Record<string, string> }>('/admin/settings/oauth')
      .then((r) => {
        if (r.data?.data) {
          setForm((p) => ({ ...p, ...r.data.data }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    loadGoogleStatus();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.put('/admin/settings/oauth', form);
      setSaved(true);
      loadGoogleStatus();
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt hatası');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin h-7 w-7 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <SectionCard title="OAuth Sağlayıcı Ayarları" subtitle="Google, Facebook ve Instagram giriş ayarları">
        <div className="space-y-5">
          <Field
            label={
              <span className="inline-flex items-center gap-2">
                Google Client ID
                {googleActive !== null && (
                  googleActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Şu an aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-meta-4 dark:text-gray-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Pasif
                    </span>
                  )
                )}
              </span>
            }
            hint="Herkese açık bir değerdir. https://console.cloud.google.com adresinden alın. .env'de GOOGLE_CLIENT_ID varsa o önceliklidir."
          >
            <input
              type="text"
              value={form.googleClientId}
              onChange={(e) => setForm((p) => ({ ...p, googleClientId: e.target.value }))}
              className={inputCls}
              placeholder="1234567890-abcd.apps.googleusercontent.com"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>

          <Field label="Facebook App ID" hint="https://developers.facebook.com adresinden alın">
            <input
              type="password"
              value={form.facebookAppId}
              onChange={(e) => setForm((p) => ({ ...p, facebookAppId: e.target.value }))}
              className={inputCls}
              placeholder="1234567890123456"
            />
          </Field>

          <Field label="Instagram App ID (Facebook ile aynı)" hint="Facebook App ID'yi buraya da girin">
            <input
              type="password"
              value={form.instagramAppId}
              onChange={(e) => setForm((p) => ({ ...p, instagramAppId: e.target.value }))}
              className={inputCls}
              placeholder="1234567890123456"
            />
          </Field>
        </div>

        <SaveBar
          saving={saving}
          saved={saved}
          error={error}
          onSave={handleSave}
          onReset={() => setForm({ googleClientId: '', facebookAppId: '', instagramAppId: '' })}
        />
      </SectionCard>
    </div>
  );
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'general',
    label: 'Genel',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
      </svg>
    ),
  },
  {
    key: 'payment',
    label: 'Ödeme',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
      </svg>
    ),
  },
  {
    key: 'shipping',
    label: 'Kargo',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      </svg>
    ),
  },
  {
    key: 'team',
    label: 'Ekip',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    ),
  },
  {
    key: 'notifications',
    label: 'Bildirimler',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
      </svg>
    ),
  },
  {
    key: 'social',
    label: 'Sosyal Medya',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    key: 'maintenance',
    label: 'Bakım Modu',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  {
    key: 'watermark',
    label: 'Filigran',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    key: 'pages',
    label: 'Sayfa Yönetimi',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    key: 'navlinks',
    label: 'Menü Linkleri',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    key: 'features',
    label: 'Avantaj Kartları',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="7" rx="1.5" />
        <rect x="3" y="13" width="18" height="7" rx="1.5" />
        <path d="M7 7.5h2M7 16.5h2" />
      </svg>
    ),
  },
  {
    key: 'slider',
    label: 'Slider Yönetimi',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    ),
  },
  {
    key: 'messages',
    label: 'Müşteri Mesajları',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    key: 'tools',
    label: 'Sistem Araçları',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
      </svg>
    ),
  },
  {
    key: 'chatbot',
    label: 'Asistan Yönetimi',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
      </svg>
    ),
  },
  {
    key: 'popup',
    label: 'Pop-up Bildirimi',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="3" x2="9" y2="9" />
        <line x1="15" y1="3" x2="15" y2="9" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="15" />
        <line x1="15" y1="21" x2="15" y2="15" />
        <line x1="3" y1="15" x2="21" y2="15" />
      </svg>
    ),
  },
  {
    key: 'campaign',
    label: 'İndirim Kampanyası',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        <path d="M13 17.5L21 13v4l-8 4.5v-4zM11 17.5L3 13v4l8 4.5v-4z" opacity=".5"/>
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M7 14.5l5 2.5 5-2.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    key: 'oauth',
    label: 'OAuth Ayarları',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
      </svg>
    ),
  },
  {
    key: 'mfa',
    label: 'İki Faktörlü Kimlik Doğrulama',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5s-5 2.24-5 5v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
      </svg>
    ),
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
      </svg>
    ),
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') as TabKey;
  const activeTab = activeTabParam && TABS.some((t) => t.key === activeTabParam) ? activeTabParam : 'general';

  const setActiveTab = (tab: TabKey) => {
    // If switching tabs, we clear the messageId to avoid showing the old message selected on the new tab
    const params: Record<string, string> = { tab };
    setSearchParams(params);
  };

  const content: Record<TabKey, React.ReactNode> = {
    general:       <GeneralTab />,
    payment:       <PaymentTab />,
    shipping:      <ShippingTab />,
    team:          <TeamTab />,
    notifications: <NotificationsTab />,
    social:        <SocialMediaTab />,
    maintenance:   <MaintenanceTab />,
    watermark:     <WatermarkTab />,
    pages:         <PagesTab />,
    navlinks:      <NavLinksTab />,
    features:      <FeatureCardsTab />,
    slider:        <SliderTab />,
    messages:      <MessagesTab />,
    tools:         <ToolsTab />,
    chatbot:       <ChatbotTab />,
    popup:         <PopupTab />,
    campaign:      <CampaignTab />,
    oauth:         <OAuthTab />,
    mfa:           <MFATab />,
    analytics:     <AnalyticsTab />,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-title-md2 font-semibold text-black dark:text-white">Sistem Ayarları</h2>
        <p className="text-sm text-gray-500 mt-0.5">Mağaza, ödeme, kargo ve bildirim yapılandırması</p>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Left sidebar nav */}
        <aside className="w-full lg:w-56 flex-shrink-0">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark overflow-hidden">
            <nav>
              {TABS.map((tab, i) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left transition ${
                    i < TABS.length - 1 ? 'border-b border-stroke dark:border-strokedark' : ''
                  } ${
                    activeTab === tab.key
                      ? 'bg-primary/5 text-primary font-medium border-l-2 border-l-primary'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4 border-l-2 border-l-transparent'
                  }`}
                >
                  <span className={activeTab === tab.key ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {content[activeTab]}
        </div>
      </div>
    </div>
  );
}

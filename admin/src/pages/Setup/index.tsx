import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

// İlk kurulum sihirbazı — DB'de hiç admin yokken gösterilir.
// Altyapı (DB/Redis/JWT) .env'de kalır; burada yalnızca uygulama ayarları toplanır.

const input =
  'w-full rounded-lg border border-stroke bg-transparent py-3 px-4 text-black outline-none transition focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white';
const label = 'mb-1.5 block text-sm font-medium text-black dark:text-white';
const hint = 'mt-1 text-xs text-gray-500';

type EmailProvider = 'none' | 'smtp' | 'brevo';

export default function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Adım 1 — Admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminPass2, setAdminPass2] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Adım 2 — Mağaza
  const [storeName, setStoreName] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');

  // Adım 3 — Entegrasyonlar (opsiyonel)
  const [emailProvider, setEmailProvider] = useState<EmailProvider>('none');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [brevoKey, setBrevoKey] = useState('');
  const [brevoSender, setBrevoSender] = useState('');

  const validateStep1 = (): string | null => {
    if (!adminEmail.trim()) return 'Admin e-posta gerekli';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail.trim())) return 'Geçerli bir e-posta girin';
    if (adminPass.length < 8) return 'Şifre en az 8 karakter olmalı';
    if (adminPass !== adminPass2) return 'Şifreler eşleşmiyor';
    return null;
  };
  const validateStep2 = (): string | null => {
    if (!storeName.trim()) return 'Mağaza adı gerekli';
    return null;
  };

  const next = () => {
    setError('');
    const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null;
    if (err) { setError(err); return; }
    setStep((s) => s + 1);
  };
  const back = () => { setError(''); setStep((s) => s - 1); };

  const submit = async () => {
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        admin: { email: adminEmail.trim(), password: adminPass, firstName: firstName.trim(), lastName: lastName.trim() },
        store: { name: storeName.trim(), email: storeEmail.trim(), phone: storePhone.trim(), address: storeAddress.trim() },
      };
      if (emailProvider === 'smtp' && smtpHost.trim()) {
        payload.email = { provider: 'smtp', smtp: { host: smtpHost.trim(), port: smtpPort.trim(), user: smtpUser.trim(), pass: smtpPass, from: smtpFrom.trim() } };
      } else if (emailProvider === 'brevo' && brevoKey.trim()) {
        payload.email = { provider: 'brevo', brevo: { apiKey: brevoKey.trim(), senderEmail: storeEmail.trim(), senderName: brevoSender.trim() } };
      }

      await api.post('/setup', payload);

      // Başarılı — yeni kimlikle giriş ekranına yönlendir
      const base = import.meta.env.BASE_URL || '/';
      window.location.href = `${base}auth/signin?setup=success`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kurulum başarısız');
      setSaving(false);
    }
  };

  const steps = ['Admin Hesabı', 'Mağaza Bilgisi', 'Entegrasyonlar', 'Özet'];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-2 p-4 dark:bg-boxdark-2">
      <div className="w-full max-w-2xl rounded-md border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        {/* Başlık */}
        <div className="border-b border-stroke px-8 py-6 dark:border-strokedark">
          <h1 className="text-2xl font-bold text-black dark:text-white">Kuruluma Hoş Geldiniz</h1>
          <p className="mt-1 text-sm text-gray-500">Mağazanızı çalışır hale getirmek için birkaç bilgi.</p>
        </div>

        {/* Adım göstergesi */}
        <div className="flex border-b border-stroke dark:border-strokedark">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`flex-1 px-2 py-3 text-center text-xs font-medium ${
                i + 1 === step
                  ? 'border-b-2 border-primary text-primary'
                  : i + 1 < step
                    ? 'text-meta-3'
                    : 'text-gray-400'
              }`}
            >
              <span className="hidden sm:inline">{i + 1}. </span>{s}
            </div>
          ))}
        </div>

        <div className="px-8 py-6">
          {error && (
            <div className="mb-5 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Adım 1 — Admin */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Ad</label>
                  <input className={input} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Adınız" />
                </div>
                <div>
                  <label className={label}>Soyad</label>
                  <input className={input} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Soyadınız" />
                </div>
              </div>
              <div>
                <label className={label}>Admin E-posta *</label>
                <input className={input} type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@siteniz.com" />
                <p className={hint}>Yönetim paneline bu e-posta ile gireceksiniz.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Şifre *</label>
                  <input className={input} type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} placeholder="En az 8 karakter" />
                </div>
                <div>
                  <label className={label}>Şifre (Tekrar) *</label>
                  <input className={input} type="password" value={adminPass2} onChange={(e) => setAdminPass2(e.target.value)} placeholder="Şifreyi tekrar girin" />
                </div>
              </div>
            </div>
          )}

          {/* Adım 2 — Mağaza */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className={label}>Mağaza Adı *</label>
                <input className={input} value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Mağazanızın adı" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>İletişim E-posta</label>
                  <input className={input} type="email" value={storeEmail} onChange={(e) => setStoreEmail(e.target.value)} placeholder="destek@siteniz.com" />
                </div>
                <div>
                  <label className={label}>Telefon</label>
                  <input className={input} type="tel" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} placeholder="+90 ..." />
                </div>
              </div>
              <div>
                <label className={label}>Adres</label>
                <textarea className={input} rows={2} value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} placeholder="Mağaza / firma adresi" />
              </div>
            </div>
          )}

          {/* Adım 3 — Entegrasyonlar */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className={label}>E-posta Sağlayıcı (opsiyonel)</label>
                <select className={input} value={emailProvider} onChange={(e) => setEmailProvider(e.target.value as EmailProvider)}>
                  <option value="none">Şimdilik yok (sonra panelden)</option>
                  <option value="smtp">SMTP</option>
                  <option value="brevo">Brevo API</option>
                </select>
                <p className={hint}>Sipariş onayı / şifre sıfırlama e-postaları için.</p>
              </div>

              {emailProvider === 'smtp' && (
                <div className="space-y-4 rounded-md border border-stroke p-4 dark:border-strokedark">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className={label}>SMTP Sunucu</label>
                      <input className={input} value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
                    </div>
                    <div>
                      <label className={label}>Port</label>
                      <input className={input} value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={label}>Kullanıcı</label>
                      <input className={input} value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="noreply@siteniz.com" />
                    </div>
                    <div>
                      <label className={label}>Şifre</label>
                      <input className={input} type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="••••••••" />
                    </div>
                  </div>
                  <div>
                    <label className={label}>Gönderen Adresi</label>
                    <input className={input} value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder="noreply@siteniz.com" />
                  </div>
                </div>
              )}

              {emailProvider === 'brevo' && (
                <div className="space-y-4 rounded-md border border-stroke p-4 dark:border-strokedark">
                  <div>
                    <label className={label}>Brevo API Anahtarı</label>
                    <input className={input} type="password" value={brevoKey} onChange={(e) => setBrevoKey(e.target.value)} placeholder="xkeysib-..." />
                  </div>
                  <div>
                    <label className={label}>Gönderen Adı</label>
                    <input className={input} value={brevoSender} onChange={(e) => setBrevoSender(e.target.value)} placeholder="Mağaza adınız" />
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Not: Ödeme (İyzico) anahtarları güvenlik gereği sunucudaki <code>.env</code> dosyasından yapılandırılır.
              </p>
            </div>
          )}

          {/* Adım 4 — Özet */}
          {step === 4 && (
            <div className="space-y-3 text-sm">
              <Row k="Admin e-posta" v={adminEmail} />
              <Row k="Ad Soyad" v={`${firstName} ${lastName}`.trim() || '—'} />
              <Row k="Mağaza adı" v={storeName} />
              <Row k="İletişim e-posta" v={storeEmail || '—'} />
              <Row k="Telefon" v={storePhone || '—'} />
              <Row k="E-posta sağlayıcı" v={emailProvider === 'none' ? 'Yok' : emailProvider.toUpperCase()} />
              <p className="pt-2 text-xs text-gray-500">
                Onayladığınızda admin hesabınız oluşturulur ve giriş ekranına yönlendirilirsiniz.
              </p>
            </div>
          )}
        </div>

        {/* Alt butonlar */}
        <div className="flex items-center justify-between border-t border-stroke px-8 py-5 dark:border-strokedark">
          <button
            onClick={back}
            disabled={step === 1 || saving}
            className="rounded-md border border-stroke px-5 py-2.5 text-sm font-medium text-black transition hover:bg-gray-1 disabled:opacity-40 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
          >
            Geri
          </button>
          {step < 4 ? (
            <button onClick={next} className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90">
              Devam
            </button>
          ) : (
            <button onClick={submit} disabled={saving} className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:opacity-60">
              {saving ? 'Kaydediliyor...' : 'Kurulumu Tamamla'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-stroke py-2 dark:border-strokedark">
      <span className="text-gray-500">{k}</span>
      <span className="font-medium text-black dark:text-white">{v}</span>
    </div>
  );
}

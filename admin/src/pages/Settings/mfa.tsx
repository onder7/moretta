import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export default function MFATab() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // MFA durumu admin'in veritabanında saklanır
  useEffect(() => {
    setLoading(true);
    api.get<{ success: boolean; data: { mfaEnabled: boolean } }>('/mfa/status')
      .then(res => {
        if (res.data) {
          setMfaEnabled(res.data.mfaEnabled);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  const handleEnableMFA = async () => {
    setError('');
    setLoading(true);
    try {
      const setupRes = await api.post('/mfa/setup', {});

      // Veriyi direkt al
      const secretVal = setupRes.data?.secret || setupRes.secret;
      const qrCodeVal = setupRes.data?.qrCode || setupRes.qrCode;
      const backupCodesVal = setupRes.data?.backupCodes || setupRes.backupCodes || [];

      if (secretVal && qrCodeVal) {
        setQrCode(qrCodeVal);
        setSecret(secretVal);
        setBackupCodes(backupCodesVal);
        setSetupMode(true);
      } else {
        setError('QR Code veya Secret alınamadı');
      }
    } catch (err: any) {
      setError(err.message || 'MFA setup başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMFA = async () => {
    setError('');
    if (!token.trim()) {
      setError('Doğrulama kodunu girin');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/mfa/enable', {
        secret,
        token,
        backupCodes,
      });

      if (res.success) {
        setSuccess('MFA başarıyla etkinleştirildi!');
        setMfaEnabled(true);
        setSetupMode(false);
        setToken('');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'MFA etkinleştirme başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!confirm('MFA\'yı devre dışı bırakmak istediğinizden emin misiniz?')) return;

    setError('');
    setLoading(true);
    try {
      const res = await api.post('/mfa/disable', {});
      if (res.success) {
        setSuccess('MFA başarıyla devre dışı bırakıldı');
        setMfaEnabled(false);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'MFA devre dışı bırakma başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSetup = () => {
    setSetupMode(false);
    setQrCode('');
    setSecret('');
    setBackupCodes([]);
    setToken('');
    setError('');
  };

  if (setupMode) {
    return (
      <div className="space-y-6">
        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h3 className="mb-5 text-xl font-semibold text-black dark:text-white">
            İki Faktörlü Kimlik Doğrulamayı Kurulum
          </h3>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* QR Code */}
          {qrCode && (
            <div className="mb-6 flex flex-col items-center">
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Authenticator uygulamanızla (Google Authenticator, Authy, vb.) tarayın:
              </p>
              <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                veya manuel girin:
              </p>
              <code className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-sm">
                {secret}
              </code>
            </div>
          )}

          {/* Doğrulama Kodu */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-black dark:text-white mb-2">
              Doğrulama Kodunu Girin
            </label>
            <input
              type="text"
              placeholder="000000"
              maxLength="6"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-2 border border-stroke rounded bg-transparent text-black dark:border-strokedark dark:text-white outline-none focus:border-primary"
            />
          </div>

          {/* Yedek Kodlar */}
          {backupCodes.length > 0 && (
            <div className="mb-6">
              <p className="mb-3 text-sm font-medium text-black dark:text-white">
                ⚠️ Yedek Kodları Kaydet (güvenli bir yere saklayın):
              </p>
              <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded">
                {backupCodes.map((code, i) => (
                  <code key={i} className="font-mono text-sm">
                    {code}
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Butonlar */}
          <div className="flex gap-3">
            <button
              onClick={handleConfirmMFA}
              disabled={loading || token.length < 6}
              className="px-6 py-2 bg-primary text-white rounded hover:bg-opacity-90 disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'MFA\'yı Etkinleştir'}
            </button>
            <button
              onClick={handleCancelSetup}
              disabled={loading}
              className="px-6 py-2 border border-stroke rounded hover:bg-gray-50 dark:border-strokedark dark:hover:bg-gray-800"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h3 className="mb-5 text-xl font-semibold text-black dark:text-white">
          İki Faktörlü Kimlik Doğrulama (MFA)
        </h3>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
            {success}
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {mfaEnabled
              ? 'İki Faktörlü Kimlik Doğrulama etkin. Her giriş sırasında ek bir kod girmeniz gerekecektir.'
              : 'Hesabınızı korumak için İki Faktörlü Kimlik Doğrulama etkinleştirebilirsiniz.'}
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <div
                className={`h-3 w-3 rounded-full ${
                  mfaEnabled ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span className="ml-2 text-sm font-medium text-black dark:text-white">
                {mfaEnabled ? 'Etkin' : 'Pasif'}
              </span>
            </div>

            {mfaEnabled ? (
              <button
                onClick={handleDisableMFA}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'İşlem yapılıyor...' : 'Kapat'}
              </button>
            ) : (
              <button
                onClick={handleEnableMFA}
                disabled={loading}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-opacity-90 disabled:opacity-50"
              >
                {loading ? 'Yükleniyor...' : 'Etkinleştir'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

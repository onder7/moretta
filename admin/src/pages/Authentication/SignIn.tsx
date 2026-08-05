import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../lib/api';
import { useStoreName } from '../../lib/useStoreName';

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [setupDone] = useState(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('setup') === 'success',
  );
  const storeName = useStoreName();

  // MFA states
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const response = await res.json();

      if (response?.mfaRequired && response?.tempToken) {
        setMfaToken(response.tempToken);
        setMfaRequired(true);
      } else if (response?.data?.accessToken) {
        // Yalnızca ADMIN rolü panele girebilir
        if (response.data.user?.role !== 'ADMIN') {
          setError('Bu panele erişim için yönetici (admin) yetkisi gereklidir.');
          return;
        }
        localStorage.setItem('admin_token', response.data.accessToken);
        localStorage.setItem('admin_user', JSON.stringify(response.data.user));
        if (response.data.refreshToken) {
          localStorage.setItem('admin_refresh_token', response.data.refreshToken);
        }
        navigate('/');
      } else {
        setError(response?.error || 'Giriş başarısız');
      }
    } catch (err: any) {
      setError(err?.message || 'Giriş başarısız');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMFASubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!mfaCode || mfaCode.length !== 6) {
      setError('6 haneli kod girin');
      return;
    }

    setMfaLoading(true);
    try {
      const res = await fetch(`${API_BASE}/mfa/login-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: mfaToken,
          mfaToken: mfaCode,
        }),
      });

      const response = await res.json();

      if (response?.data?.accessToken) {
        if (response.data.user?.role !== 'ADMIN') {
          setError('Bu panele erişim için yönetici (admin) yetkisi gereklidir.');
          handleBackToPassword();
          return;
        }
        localStorage.setItem('admin_token', response.data.accessToken);
        localStorage.setItem('admin_user', JSON.stringify(response.data.user));
        if (response.data.refreshToken) {
          localStorage.setItem('admin_refresh_token', response.data.refreshToken);
        }
        navigate('/');
      } else {
        setError(response?.error || 'MFA doğrulaması başarısız');
      }
    } catch (err: any) {
      setError(err?.message || 'MFA doğrulaması başarısız');
    } finally {
      setMfaLoading(false);
    }
  }

  function handleBackToPassword() {
    setMfaRequired(false);
    setMfaCode('');
    setMfaToken('');
  }

  // MFA ekranı
  if (mfaRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-2 dark:bg-boxdark-2 px-4">
        <div className="w-full max-w-md rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-8">
          <div className="mb-8 text-center">
            <div className="text-4xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-black dark:text-white">İki Faktörlü Kimlik Doğrulama</h1>
            <p className="mt-2 text-sm text-body dark:text-bodydark2">Authenticator uygulamasındaki 6 haneli kodu girin</p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-meta-1/10 dark:border-meta-1 dark:text-meta-1">
              {error}
            </div>
          )}

          <form onSubmit={handleMFASubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                6 Haneli Kod
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-2xl tracking-widest rounded-lg border border-stroke bg-transparent py-3 px-4 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={mfaLoading || mfaCode.length !== 6}
              className="w-full rounded-lg bg-primary py-3 px-4 text-white font-medium transition hover:bg-opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {mfaLoading ? 'Doğrulanıyor...' : 'Doğrula'}
            </button>

            <button
              type="button"
              onClick={handleBackToPassword}
              className="w-full rounded-lg border border-stroke bg-transparent py-3 px-4 text-sm font-medium text-black transition hover:bg-gray-1 dark:border-strokedark dark:text-white dark:hover:bg-boxdark-2"
            >
              Geri Dön
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-2 dark:bg-boxdark-2 px-4">
      <div className="w-full max-w-md rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-black dark:text-white">{storeName} Admin</h1>
          <p className="mt-1 text-sm text-body dark:text-bodydark2">Yönetim paneline giriş yapın</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-meta-1/10 dark:border-meta-1 dark:text-meta-1">
            {error}
          </div>
        )}

        {setupDone && (
          <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
            ✓ Kurulum tamamlandı. Belirlediğiniz admin bilgileriyle giriş yapın.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">
              E-posta
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full rounded-lg border border-stroke bg-transparent py-3 px-4 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">
              Şifre
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-stroke bg-transparent py-3 px-4 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary py-3 px-4 text-white font-medium transition hover:bg-opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignIn;

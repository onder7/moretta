import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/authApi';
import { cartApi } from '@/services/cartApi';
import { useCartStore } from '@/store/cartStore';
import type { User } from '@/types';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Eye, EyeOff, Mail, Lock, User as UserIcon, CheckCircle,
  AlertCircle, ArrowRight, Coffee,
} from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { ConsentCheckboxes, type ConsentValue } from '@/components/auth/ConsentCheckboxes';

type Mode = 'login' | 'signup';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore();
  const { sessionId, setCart, clearSession } = useCartStore();
  const from = (location.state as { from?: string })?.from ?? '/hesabim';
  const initMode = (location.state as { mode?: string })?.mode === 'signup' ? 'signup' : 'login';

  const [mode, setMode] = useState<Mode>(initMode);
  const [form, setForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [guestForm, setGuestForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [guestConsent, setGuestConsent] = useState<ConsentValue>({ emailConsent: true, smsConsent: true, acceptTerms: false });
  const [signupConsent, setSignupConsent] = useState<ConsentValue>({ emailConsent: true, smsConsent: true, acceptTerms: false });
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  // Ödeme sayfasından gelince misafir sekmesi
  const [activeTab, setActiveTab] = useState<'member' | 'guest'>(from === '/odeme' ? 'guest' : 'member');

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setSuccessMsg('');
    setUnverified(false);
  };

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(form);
      const { accessToken, user } = res.data.data;
      setUser(user as User, accessToken);
      try {
        const mergeRes = await cartApi.merge(sessionId);
        setCart(mergeRes.data.data);
        clearSession();
      } catch {}
      toast.success('Giriş başarılı!');
      navigate(from === '/odeme' ? '/odeme' : '/hesabim', { replace: true });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; error?: string; code?: string } } }).response?.data;
      if (data?.code === 'EMAIL_NOT_VERIFIED') { setUnverified(true); return; }
      setError(data?.message ?? data?.error ?? 'Giriş yapılamadı');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!signupConsent.acceptTerms) { setError('Üyelik koşullarını kabul etmelisiniz.'); return; }
    const pw = signupForm.password;
    if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) {
      setError('Şifre en az 8 karakter, 1 büyük harf ve 1 rakam içermelidir.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({
        firstName: signupForm.firstName,
        lastName: signupForm.lastName,
        email: signupForm.email,
        password: signupForm.password,
        marketingConsent: signupConsent.emailConsent,
        smsConsent: signupConsent.smsConsent,
        acceptTerms: signupConsent.acceptTerms,
      });
      if (res.data.data.verificationRequired) {
        setSuccessMsg('Hesabınız oluşturuldu! E-postanızı doğrulayın.');
        switchMode('login');
        return;
      }
      const { accessToken } = res.data.data;
      useAuthStore.getState().setTokens(accessToken!);
      const meRes = await authApi.me();
      setUser(meRes.data.data as User, accessToken!);
      toast.success('Kayıt başarılı! Hoş geldiniz.');
      navigate('/hesabim', { replace: true });
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { message?: string; error?: string } } }).response?.data;
      setError(resp?.message ?? resp?.error ?? 'Kayıt yapılamadı');
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guestConsent.acceptTerms) { toast.error('Üyelik koşullarını kabul etmelisiniz.'); return; }
    setLoading(true);
    try {
      const res = await authApi.guestLogin({
        ...guestForm,
        marketingConsent: guestConsent.emailConsent,
        smsConsent: guestConsent.smsConsent,
        acceptTerms: guestConsent.acceptTerms,
      });
      const { accessToken, user } = res.data.data;
      setUser(user as User, accessToken);
      try {
        const mergeRes = await cartApi.merge(sessionId);
        setCart(mergeRes.data.data);
        clearSession();
      } catch {}
      toast.success('Ödemeye yönlendiriliyorsunuz...');
      navigate('/odeme', { replace: true });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; error?: string } } }).response?.data;
      toast.error(data?.message ?? data?.error ?? 'İşlem gerçekleştirilemedi');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setResending(true);
    try {
      await authApi.resendVerification(form.email);
      toast.success('Doğrulama linki e-posta adresinize yeniden gönderildi.');
    } catch {
      toast.error('E-posta gönderilemedi. Lütfen biraz sonra tekrar deneyin.');
    } finally {
      setResending(false);
    }
  }

  const handleGoogleCredential = async (idToken: string) => {
    try {
      const res = await fetch('/api/auth/oauth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data.user as User, data.data.accessToken);
        try {
          const mergeRes = await cartApi.merge(sessionId);
          setCart(mergeRes.data.data);
          clearSession();
        } catch {}
        toast.success('Google ile giriş başarılı!');
        navigate('/hesabim', { replace: true });
      } else {
        toast.error(data.error || 'Giriş başarısız');
      }
    } catch {
      toast.error('Google ile giriş başarısız');
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-full bg-espresso-700 flex items-center justify-center">
              <Coffee className="w-6 h-6 text-caramel-400" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-espresso-800 dark:text-cream-50">
            {mode === 'login' ? 'Hesabınıza Giriş Yapın' : 'Aramıza Katılın'}
          </h1>
          <p className="text-sm text-espresso-500 dark:text-espresso-300 mt-1">
            {mode === 'login' ? 'Kahve yolculuğunuza devam edin' : 'Taze kahve dünyasına adım atın'}
          </p>
        </div>

        {/* Ödeme sayfasından gelince: Üye Girişi / Misafir sekmeleri */}
        {from === '/odeme' && (
          <div className="flex border-b border-espresso-100 dark:border-espresso-700 mb-6">
            {(['member', 'guest'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === t
                    ? 'border-caramel-400 text-caramel-600'
                    : 'border-transparent text-espresso-400 hover:text-espresso-600'
                }`}
              >
                {t === 'member' ? 'Üye Girişi' : 'Üye Olmadan Devam Et'}
              </button>
            ))}
          </div>
        )}

        {/* Normal: Giriş / Üye Ol sekmeleri */}
        {from !== '/odeme' && (
          <div className="flex bg-cream-100 dark:bg-espresso-800 rounded-xl p-1 mb-6">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  mode === m
                    ? 'bg-white dark:bg-espresso-700 text-espresso-800 dark:text-cream-50 shadow-sm'
                    : 'text-espresso-400 hover:text-espresso-600'
                }`}
              >
                {m === 'login' ? 'Giriş Yap' : 'Üye Ol'}
              </button>
            ))}
          </div>
        )}

        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-ember-500/10 text-ember-600 text-sm mb-4"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-green-50 text-green-700 text-sm mb-4"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              {successMsg}
            </motion.div>
          )}
          {unverified && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"
            >
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Hesabınız henüz doğrulanmamış
              </p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                E-posta adresinize gönderilen aktivasyon linkine tıklayın.
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                className="mt-3 text-sm font-medium text-amber-900 underline hover:no-underline disabled:opacity-50 dark:text-amber-200"
              >
                {resending ? 'Gönderiliyor…' : 'Doğrulama linkini tekrar gönder'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Giriş Formu */}
        {(from !== '/odeme' ? mode === 'login' : activeTab === 'member') && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-espresso-600 dark:text-espresso-300 mb-1.5 block">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-espresso-300" />
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="ornek@email.com"
                  className="h-12 pl-11 pr-4 rounded-xl border-espresso-200 focus:border-caramel-400"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-espresso-600 dark:text-espresso-300 mb-1.5 block">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-espresso-300" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Şifreniz"
                  className="h-12 pl-11 pr-12 rounded-xl border-espresso-200 focus:border-caramel-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-espresso-300 hover:text-espresso-500 transition-colors"
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-espresso-500">
                <input type="checkbox" className="w-4 h-4 rounded border-espresso-300 text-caramel-500 focus:ring-caramel-400" />
                Beni hatırla
              </label>
              <Link to="/sifremi-unuttum" className="text-sm text-caramel-600 hover:text-caramel-700 transition-colors">
                Şifremi unuttum
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-caramel-400 hover:bg-caramel-500 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Giriş Yap</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>

            {/* Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-espresso-100 dark:border-espresso-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-espresso-400">Veya</span>
              </div>
            </div>

            <GoogleSignInButton text="signin_with" onCredential={handleGoogleCredential} />

            <p className="text-center text-sm text-espresso-400 mt-4">
              Hesabınız yok mu?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-caramel-600 font-semibold hover:text-caramel-700 transition-colors"
              >
                Üye ol
              </button>
            </p>
          </form>
        )}

        {/* Üye Ol Formu */}
        {(from !== '/odeme' ? mode === 'signup' : false) && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-espresso-600 dark:text-espresso-300 mb-1.5 block">Ad</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-espresso-300" />
                  <Input
                    type="text"
                    required
                    minLength={2}
                    value={signupForm.firstName}
                    onChange={(e) => setSignupForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="Adınız"
                    className="h-12 pl-11 rounded-xl border-espresso-200 focus:border-caramel-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-espresso-600 dark:text-espresso-300 mb-1.5 block">Soyad</label>
                <Input
                  type="text"
                  required
                  minLength={2}
                  value={signupForm.lastName}
                  onChange={(e) => setSignupForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Soyadınız"
                  className="h-12 px-4 rounded-xl border-espresso-200 focus:border-caramel-400"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-espresso-600 dark:text-espresso-300 mb-1.5 block">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-espresso-300" />
                <Input
                  type="email"
                  required
                  value={signupForm.email}
                  onChange={(e) => setSignupForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="ornek@email.com"
                  className="h-12 pl-11 rounded-xl border-espresso-200 focus:border-caramel-400"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-espresso-600 dark:text-espresso-300 mb-1.5 block">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-espresso-300" />
                <Input
                  type={showSignupPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={signupForm.password}
                  onChange={(e) => setSignupForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="En az 8 karakter"
                  className="h-12 pl-11 pr-12 rounded-xl border-espresso-200 focus:border-caramel-400"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-espresso-300 hover:text-espresso-500 transition-colors"
                  aria-label={showSignupPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showSignupPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-[11px] text-espresso-400 mt-1">En az 8 karakter, 1 büyük harf ve 1 rakam</p>
            </div>

            <ConsentCheckboxes value={signupConsent} onChange={(p) => setSignupConsent((c) => ({ ...c, ...p }))} />

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-caramel-400 hover:bg-caramel-500 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Hesap Oluştur</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>

            {/* Üye avantajları */}
            <div className="mt-2 p-4 rounded-xl bg-cream-50 dark:bg-espresso-800 border border-espresso-100 dark:border-espresso-700">
              <p className="text-xs font-semibold text-espresso-600 dark:text-cream-300 mb-2">Üye Avantajları</p>
              <ul className="space-y-1.5">
                {[
                  'İlk siparişe özel %10 indirim',
                  'Sipariş takibi ve hızlı ödeme',
                  'Kişiselleştirilmiş kahve önerileri',
                  'Özel kampanyalardan öncelikli haberdar olma',
                ].map((b) => (
                  <li key={b} className="flex items-center gap-2 text-xs text-espresso-500 dark:text-espresso-300">
                    <CheckCircle className="w-3.5 h-3.5 text-caramel-500 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-center text-sm text-espresso-400 mt-2">
              Zaten hesabınız var mı?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-caramel-600 font-semibold hover:text-caramel-700 transition-colors"
              >
                Giriş yap
              </button>
            </p>
          </form>
        )}

        {/* Misafir Formu (ödeme sayfasından) */}
        {from === '/odeme' && activeTab === 'guest' && (
          <form onSubmit={handleGuestSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-espresso-600 dark:text-espresso-300 mb-1.5 block">Ad</label>
                <Input
                  placeholder="Adınız"
                  required
                  value={guestForm.firstName}
                  onChange={(e) => setGuestForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="h-12 px-4 rounded-xl border-espresso-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-espresso-600 dark:text-espresso-300 mb-1.5 block">Soyad</label>
                <Input
                  placeholder="Soyadınız"
                  required
                  value={guestForm.lastName}
                  onChange={(e) => setGuestForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="h-12 px-4 rounded-xl border-espresso-200"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-espresso-600 dark:text-espresso-300 mb-1.5 block">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-espresso-300" />
                <Input
                  type="email"
                  required
                  value={guestForm.email}
                  onChange={(e) => setGuestForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="ornek@email.com"
                  className="h-12 pl-11 rounded-xl border-espresso-200"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-espresso-600 dark:text-espresso-300 mb-1.5 block">Telefon (Opsiyonel)</label>
              <Input
                type="tel"
                placeholder="05XX XXX XX XX"
                value={guestForm.phone}
                onChange={(e) => setGuestForm((f) => ({ ...f, phone: e.target.value }))}
                className="h-12 px-4 rounded-xl border-espresso-200"
              />
            </div>
            <ConsentCheckboxes value={guestConsent} onChange={(p) => setGuestConsent((c) => ({ ...c, ...p }))} />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-caramel-400 hover:bg-caramel-500 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'ÖDEMEYE DEVAM ET'
              }
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

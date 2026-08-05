import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await signUp(email, password);
      setLoading(false);
      if (error) {
        setError(error);
      } else {
        setSuccess('Hesabınız oluşturuldu! Giriş yapabilirsiniz.');
        setMode('login');
        setName('');
        setPassword('');
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        setError(error);
      } else {
        navigate('/account');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-full bg-espresso-700 flex items-center justify-center">
              <Coffee className="w-6 h-6 text-caramel-400" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-espresso-800">
            {mode === 'login' ? 'Hesabınıza Giriş Yapın' : 'Aramıza Katılın'}
          </h1>
          <p className="text-sm text-espresso-500 mt-1">
            {mode === 'login'
              ? 'Kahve yolculuğunuza devam edin'
              : 'Taze kahve dünyasına adım atın'}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-cream-100 rounded-xl p-1 mb-6">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                mode === m ? 'bg-white text-espresso-800 shadow-sm' : 'text-espresso-400 hover:text-espresso-600'
              }`}
            >
              {m === 'login' ? 'Giriş Yap' : 'Üye Ol'}
            </button>
          ))}
        </div>

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
          {success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-green-50 text-green-700 text-sm mb-4"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="text-sm font-medium text-espresso-600 mb-1.5 block">Ad Soyad</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-espresso-300" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Adınız Soyadınız"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-espresso-200 bg-white text-sm text-espresso-700 placeholder:text-espresso-300 focus:outline-none focus:border-caramel-400 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-espresso-600 mb-1.5 block">E-posta</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-espresso-300" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-espresso-200 bg-white text-sm text-espresso-700 placeholder:text-espresso-300 focus:outline-none focus:border-caramel-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-espresso-600 mb-1.5 block">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-espresso-300" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'En az 6 karakter' : 'Şifreniz'}
                className="w-full h-12 pl-11 pr-12 rounded-xl border border-espresso-200 bg-white text-sm text-espresso-700 placeholder:text-espresso-300 focus:outline-none focus:border-caramel-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-espresso-300 hover:text-espresso-500 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mode === 'login' && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-espresso-500">
                <input type="checkbox" className="w-4 h-4 rounded border-espresso-300 text-caramel-500 focus:ring-caramel-400" />
                Beni hatırla
              </label>
              <button type="button" className="text-sm text-caramel-600 hover:text-caramel-700 transition-colors">
                Şifremi unuttum
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-caramel-400 hover:bg-caramel-500 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Benefits */}
        {mode === 'signup' && (
          <div className="mt-6 p-4 rounded-xl bg-cream-50 border border-espresso-50">
            <p className="text-xs font-semibold text-espresso-600 mb-2">Üye Avantajları</p>
            <ul className="space-y-1.5">
              {[
                'İlk siparişe özel %10 indirim',
                'Sipariş takibi ve hızlı ödeme',
                'Kişiselleştirilmiş kahve önerileri',
                'Özel kampanyalardan öncelikli haberdar olma',
              ].map((b) => (
                <li key={b} className="flex items-center gap-2 text-xs text-espresso-500">
                  <CheckCircle className="w-3.5 h-3.5 text-caramel-500 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-center text-sm text-espresso-400 mt-6">
          {mode === 'login' ? 'Hesabınız yok mu? ' : 'Zaten hesabınız var mı? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
            className="text-caramel-600 font-semibold hover:text-caramel-700 transition-colors"
          >
            {mode === 'login' ? 'Üye ol' : 'Giriş yap'}
          </button>
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/services/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { useStoreInfo } from '@/hooks/useStoreInfo';

export function ResetPassword() {
  const { name: storeName } = useStoreInfo();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [viewPassword, setViewPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error('Geçersiz veya eksik sıfırlama bağlantısı.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, form.password);
      toast.success('Şifreniz güncellendi. Giriş yapabilirsiniz.');
      navigate('/giris', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } }).response?.data?.message ??
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Bağlantının süresi dolmuş olabilir. Lütfen tekrar deneyin.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-2 min-h-screen bg-background">
      <div className="flex flex-col justify-center items-center px-4 sm:px-6 py-8 sm:py-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md flex flex-col justify-between min-h-[85vh]">
          {/* Logo */}
          <div className="mb-8 sm:mb-12">
            <Link to="/" className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              {storeName}
            </Link>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-xl sm:text-2xl font-bold mb-2">Yeni Şifre Belirle</h1>
            <p className="text-sm text-muted-foreground mb-6 sm:mb-8">
              En az 8 karakter, bir büyük harf ve bir rakam içermelidir.
            </p>

            {!token ? (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                Sıfırlama bağlantısı geçersiz. Lütfen{' '}
                <Link to="/sifremi-unuttum" className="font-bold underline">yeni bir bağlantı isteyin</Link>.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 w-full">
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-bold text-sm text-foreground">
                    Yeni Şifre
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={viewPassword ? 'text' : 'password'}
                      placeholder="Yeni şifre"
                      className="h-12 pl-4 pr-12 rounded-md border border-input focus:border-primary w-full"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setViewPassword(!viewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      aria-label={viewPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {viewPassword ? <EyeOff className="h-5 w-5 stroke-[1.5]" /> : <Eye className="h-5 w-5 stroke-[1.5]" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-bold text-sm text-foreground">
                    Yeni Şifre Tekrar
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={viewPassword ? 'text' : 'password'}
                    placeholder="Yeni şifre tekrar"
                    className="h-12 px-4 rounded-md border border-input focus:border-primary w-full"
                    value={form.confirmPassword}
                    onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full text-sm font-bold uppercase tracking-wider rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {loading ? 'Güncelleniyor...' : 'ŞİFREYİ GÜNCELLE'}
                </Button>
              </form>
            )}

            <div className="mt-8 text-center">
              <Link to="/giris" className="font-bold text-primary hover:underline text-sm">
                Giriş ekranına dön
              </Link>
            </div>
          </div>

          {/* Footer Linkleri */}
          <footer className="mt-8 sm:mt-16 flex gap-2 sm:gap-4 justify-center text-[10px] sm:text-xs font-bold text-muted-foreground flex-wrap">
            <Link to="/sozlesmeler" className="hover:text-foreground transition-colors">
              Kullanım Koşulları
            </Link>
            <Link to="/kvkk" className="hover:text-foreground transition-colors">
              Gizlilik Politikası
            </Link>
          </footer>
        </div>
      </div>

      <div className="hidden lg:block h-full w-full bg-gradient-to-br from-cream-100 to-caramel-100" />
    </main>
  );
}

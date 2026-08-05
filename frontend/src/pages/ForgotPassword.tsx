import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/services/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MailCheck } from 'lucide-react';
import { useStoreInfo } from '@/hooks/useStoreInfo';

export function ForgotPassword() {
  const { name: storeName } = useStoreInfo();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch {
      // Güvenlik için backend e-posta var/yok bilgisini sızdırmaz; yine de başarı göster
      setSent(true);
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
            {!sent ? (
              <>
                <h1 className="text-xl sm:text-2xl font-bold mb-2">Şifremi Unuttum</h1>
                <p className="text-sm text-muted-foreground mb-6 sm:mb-8">
                  Hesabınızın e-posta adresini girin; şifre sıfırlama bağlantısını size gönderelim.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6 w-full">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-bold text-sm text-foreground">
                      E-posta
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="E-posta"
                      className="h-12 px-4 rounded-md border border-input focus:border-primary w-full"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full text-sm font-bold uppercase tracking-wider rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {loading ? 'Gönderiliyor...' : 'SIFIRLAMA BAĞLANTISI GÖNDER'}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <MailCheck className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold mb-2">E-postanızı kontrol edin</h1>
                <p className="text-sm text-muted-foreground">
                  Eğer <span className="font-semibold text-foreground">{email}</span> adresine kayıtlı bir hesap
                  varsa, şifre sıfırlama bağlantısı gönderildi. Bağlantı 1 saat geçerlidir.
                </p>
              </div>
            )}

            <div className="mt-8 text-center">
              <Link to="/giris" className="font-bold text-primary hover:underline text-sm">
                Giriş ekranına dön
              </Link>
            </div>
          </div>

        </div>
      </div>

      <div className="hidden lg:block h-full w-full bg-gradient-to-br from-cream-100 to-caramel-100" />
    </main>
  );
}

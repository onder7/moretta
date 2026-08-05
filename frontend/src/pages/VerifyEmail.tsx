import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/services/authApi';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Durum = 'kontrol' | 'basarili' | 'hata';

/**
 * İşlenmiş token'lar — modül seviyesinde tutulur çünkü bileşen ref'i remount'ta
 * sıfırlanır. React StrictMode geliştirmede mount→unmount→remount yaptığı için
 * tek kullanımlık token ikinci çağrıda reddediliyor ve kullanıcı doğrulanmış
 * olmasına rağmen "geçersiz link" görüyordu.
 */
const islenenTokenlar = new Set<string>();

/**
 * Aktivasyon linkinin açtığı sayfa: /e-posta-dogrula?token=...
 * Token geçerliyse hesap aktifleşir ve oturum açılır.
 */
export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const [durum, setDurum] = useState<Durum>('kontrol');
  const [mesaj, setMesaj] = useState('');
  const [email, setEmail] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    // Aynı token için ikinci çağrıyı engelle (remount / StrictMode)
    if (token && islenenTokenlar.has(token)) return;
    if (token) islenenTokenlar.add(token);

    if (!token) {
      setDurum('hata');
      setMesaj('Doğrulama linki eksik veya hatalı. Lütfen e-postanızdaki linke tekrar tıklayın.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then((res) => {
        // Kullanıcıyı yanıttan alıyoruz; ayrıca me() çağırmak yanlış sıraya yol
        // açıyordu (token store'a yazılmadan istek atılıp 401 alınıyordu).
        const { accessToken, user } = res.data.data;
        setUser(user as User, accessToken);
        setDurum('basarili');
        setMesaj(res.data.message ?? 'E-posta adresiniz doğrulandı.');
      })
      .catch((err) => {
        // Kullanıcı sayfayı yenilediyse token çoktan tüketilmiş olabilir.
        // Oturumu açıksa doğrulama zaten başarılı olmuştur; hata göstermeyelim.
        if (useAuthStore.getState().isAuthenticated) {
          setDurum('basarili');
          setMesaj('E-posta adresiniz zaten doğrulanmış.');
          return;
        }
        setDurum('hata');
        setMesaj(
          err?.response?.data?.error ??
            'Doğrulama linki geçersiz veya süresi dolmuş. Yeni bir link isteyebilirsiniz.',
        );
      });
  }, [token, setUser]);

  async function tekrarGonder() {
    if (!email.trim()) {
      toast.error('E-posta adresinizi girin.');
      return;
    }
    setGonderiliyor(true);
    try {
      await authApi.resendVerification(email.trim());
      toast.success('Hesabınız doğrulanmamışsa yeni bir link gönderildi.');
    } catch {
      toast.error('Gönderilemedi. Lütfen biraz sonra tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg text-center">
        {durum === 'kontrol' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h1 className="mt-6 text-2xl font-bold text-foreground">Doğrulanıyor…</h1>
            <p className="mt-2 text-muted-foreground">Lütfen bekleyin.</p>
          </>
        )}

        {durum === 'basarili' && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Hesabınız aktif!</h1>
            <p className="mt-4 text-muted-foreground">{mesaj}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/', { replace: true })}>Alışverişe Başla</Button>
              <Button variant="outline" render={<Link to="/hesabim" />}>
                Hesabıma Git
              </Button>
            </div>
          </>
        )}

        {durum === 'hata' && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Doğrulanamadı</h1>
            <p className="mt-4 text-muted-foreground">{mesaj}</p>

            <div className="mt-8 rounded-xl border border-stroke dark:border-strokedark p-5 text-left">
              <p className="text-sm font-semibold text-foreground">Yeni doğrulama linki isteyin</p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kayit@ornek.com"
                  className="flex-1"
                />
                <Button onClick={tekrarGonder} disabled={gonderiliyor}>
                  {gonderiliyor ? 'Gönderiliyor…' : 'Gönder'}
                </Button>
              </div>
            </div>

            <div className="mt-6">
              <Link to="/giris" className="text-sm text-primary hover:underline">
                Giriş sayfasına dön
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default VerifyEmail;

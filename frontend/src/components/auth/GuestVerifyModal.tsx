import { useEffect, useState } from 'react';
import { authApi } from '@/services/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  email: string;
  /** Doğrulama başarılı olduğunda çağrılır — çağıran taraf işlemi tekrar dener */
  onVerified: () => void;
  onClose: () => void;
}

/**
 * Misafir siparişlerinde e-posta doğrulaması.
 * Sunucu GUEST_EMAIL_NOT_VERIFIED döndüğünde açılır; kod doğrulanınca
 * kullanıcı ödeme akışına kaldığı yerden devam eder (sepet korunur).
 */
export function GuestVerifyModal({ email, onVerified, onClose }: Props) {
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sentOnce, setSentOnce] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Açılır açılmaz kodu gönder
  useEffect(() => {
    void sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function sendCode() {
    setSending(true);
    try {
      await authApi.sendGuestCode();
      setSentOnce(true);
      setCountdown(60);
      toast.success('Doğrulama kodu e-posta adresinize gönderildi.');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Kod gönderilemedi. Lütfen tekrar deneyin.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error('6 haneli kodu girin.');
      return;
    }
    setVerifying(true);
    try {
      await authApi.verifyGuestCode(code.trim());
      toast.success('E-posta adresiniz doğrulandı.');
      onVerified();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Kod doğrulanamadı.';
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Kapat">
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="mt-4 text-xl font-bold text-foreground">E-postanızı doğrulayın</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Siparişinizi tamamlayabilmek için <strong className="text-foreground break-all">{email}</strong>{' '}
          adresine gönderdiğimiz 6 haneli kodu girin.
        </p>

        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="mt-5 text-center text-2xl font-bold tracking-[0.5em]"
        />

        <Button onClick={verify} disabled={verifying || code.length !== 6} className="mt-4 w-full">
          {verifying ? 'Doğrulanıyor…' : 'Doğrula ve Devam Et'}
        </Button>

        <div className="mt-4 text-center">
          <button
            onClick={sendCode}
            disabled={sending || countdown > 0}
            className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            {countdown > 0
              ? `Tekrar göndermek için ${countdown} sn`
              : sending
                ? 'Gönderiliyor…'
                : sentOnce
                  ? 'Kodu tekrar gönder'
                  : 'Kod gönder'}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Kod 10 dakika geçerlidir. E-postayı göremiyorsanız spam klasörünü kontrol edin.
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, LogIn, X, Loader2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { authApi } from '@/services/authApi';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';
import type { User as UserType } from '@/types';

const schema = z.object({
  email: z.string().email('Geçerli bir e-posta giriniz'),
  firstName: z.string().min(2, 'Ad en az 2 karakter').max(50),
  lastName: z.string().min(2, 'Soyad en az 2 karakter').max(50),
  phone: z.string().optional(),
  acceptTerms: z.literal(true, 'Devam edebilmek için koşulları kabul etmelisiniz'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
  /** Misafir girişi tamamlandığında çağrılır; kullanıcı ödeme adımına geçer */
  onSuccess: () => void;
}

/**
 * Checkout'a giriş yapmadan geçmek isteyen kullanıcılar için.
 * Ad/soyad/e-posta alır, guest-login endpoint'ini çağırır ve token set eder.
 * Misafir sepeti otomatik birleştirilir (mergeGuestCart).
 */
export function GuestCheckoutModal({ onClose, onSuccess }: Props) {
  const { setUser } = useAuthStore();
  const { sessionId, clearSession } = useCartStore();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const res = await authApi.guestLogin({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        acceptTerms: true,
      });

      const { accessToken, user } = res.data.data;
      setUser(user as UserType, accessToken);

      // Misafir sepetini kayıtlı hesaba aktar
      if (sessionId) {
        try {
          const { api } = await import('@/services/api');
          await api.post('/cart/merge', { sessionId });
        } catch {
          // Birleştirme hataları sessiz geçsin; sepet zaten DB'de
        }
      }
      clearSession();

      toast.success('Devam edebilirsiniz!');
      onSuccess();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string; message?: string } } }).response?.data
          ?.error ??
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Bir hata oluştu. Lütfen tekrar deneyin.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 px-6 pt-6 pb-5 border-b">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold text-foreground">Ödeme için devam et</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bir seçenek belirleyin
          </p>
        </div>

        {/* Üye giriş yönlendirmesi */}
        <div className="px-6 pt-5">
          <Link
            to="/giris"
            state={{ from: '/odeme' }}
            className="flex items-center gap-3 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 p-4 transition-all group"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <LogIn className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">Üye Girişi Yap</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hesabınız varsa giriş yapın — siparişlerinizi takip edin
              </p>
            </div>
          </Link>
        </div>

        {/* Ayırıcı */}
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">veya</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Misafir formu */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-semibold text-sm text-foreground">Misafir olarak devam et</p>
          </div>

          <div>
            <Label htmlFor="guest-email">E-posta *</Label>
            <Input
              id="guest-email"
              type="email"
              placeholder="ornek@eposta.com"
              className="mt-1"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="guest-firstName">Ad *</Label>
              <Input
                id="guest-firstName"
                placeholder="Adınız"
                className="mt-1"
                {...register('firstName')}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="guest-lastName">Soyad *</Label>
              <Input
                id="guest-lastName"
                placeholder="Soyadınız"
                className="mt-1"
                {...register('lastName')}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="guest-phone">Telefon (opsiyonel)</Label>
            <Input
              id="guest-phone"
              type="tel"
              placeholder="05XX XXX XX XX"
              className="mt-1"
              {...register('phone')}
            />
          </div>

          {/* KVKK / Koşullar */}
          <div className="flex items-start gap-2">
            <input
              id="guest-terms"
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary flex-shrink-0"
              {...register('acceptTerms')}
            />
            <label htmlFor="guest-terms" className="text-xs text-muted-foreground leading-relaxed">
              <Link to="/gizlilik" className="text-primary hover:underline" target="_blank">
                Gizlilik Politikası
              </Link>
              'nı ve{' '}
              <Link to="/kullanim-kosullari" className="text-primary hover:underline" target="_blank">
                Kullanım Koşulları
              </Link>
              'nı okudum, kabul ediyorum.
            </label>
          </div>
          {errors.acceptTerms && (
            <p className="text-xs text-destructive -mt-2">{errors.acceptTerms.message}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserCheck className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Devam ediliyor…' : 'Misafir Olarak Devam Et'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Sipariş sonrası şifre belirleyerek tam üye olabilirsiniz.
          </p>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore, selectIsGuest } from '@/store/authStore';
import { authApi } from '@/services/authApi';
import { toast } from 'sonner';
import type { User } from '@/types';

export function GuestActivationCard() {
  const { setUser, user } = useAuthStore();
  const isGuest = useAuthStore(selectIsGuest);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!isGuest || done) return null;

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Şifre en az 8 karakter olmalı');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      toast.error('Şifre en az bir büyük harf içermeli');
      return;
    }
    if (!/[0-9]/.test(password)) {
      toast.error('Şifre en az bir rakam içermeli');
      return;
    }
    if (password !== confirm) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.activateGuest(password);
      setUser(res.data.data.user as User, res.data.data.accessToken);
      setDone(true);
      toast.success('🎉 Hesabınız aktifleştirildi! Artık tam üyesiniz.');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string; message?: string } } }).response?.data
          ?.error ??
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Bir hata oluştu.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-5 mb-6 text-left space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/15">
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-bold text-foreground">Hesabınızı Aktifleştirin</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Siparişlerinizi takip edin, iade/iptal yönetin ve daha hızlı alışveriş yapın.
            Tüm verileriniz korunur.
          </p>
          {user?.email && (
            <p className="text-xs text-muted-foreground mt-1">
              Hesap e-postası: <strong className="text-foreground">{user.email}</strong>
            </p>
          )}
        </div>
      </div>

      <form onSubmit={activate} className="space-y-3">
        <div>
          <Label htmlFor="activate-pw" className="text-sm">Şifre belirle</Label>
          <div className="relative mt-1">
            <Input
              id="activate-pw"
              type={showPw ? 'text' : 'password'}
              placeholder="En az 8 karakter, 1 büyük harf, 1 rakam"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPw ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <Label htmlFor="activate-pw-confirm" className="text-sm">Şifre tekrar</Label>
          <Input
            id="activate-pw-confirm"
            type={showPw ? 'text' : 'password'}
            placeholder="Şifrenizi tekrar girin"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1"
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <UserPlus className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Aktifleştiriliyor…' : 'Hesabı Aktifleştir →'}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Şu an istemiyorsanız atlayabilirsiniz — bu seçenek daha sonra
        &ldquo;Hesabım → Profil&rdquo; bölümünde de bulunur.
      </p>
    </div>
  );
}

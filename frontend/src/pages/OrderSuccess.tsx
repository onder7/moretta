import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Package, ShoppingBag, Banknote, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { checkoutApi } from '@/services/checkoutApi';
import { useCartStore } from '@/store/cartStore';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { GuestActivationCard } from '@/components/auth/GuestActivationCard';

function formatPrice(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

interface HavaleState {
  bankName?: string;
  iban?: string;
  accountName?: string;
  description?: string;
  orderNumber?: string;
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} kopyalandı`)).catch(() => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    toast.success(`${label} kopyalandı`);
  });
}

export function OrderSuccess() {
  const [params] = useSearchParams();
  const location = useLocation();
  const havale = (location.state as { havale?: HavaleState } | null)?.havale;
  // Havale açıklamasında sipariş numarası garanti olsun (yoksa ekle)
  const havaleAciklama = (() => {
    if (!havale) return '';
    const base = havale.description ?? '';
    const tag = havale.orderNumber ? `#${havale.orderNumber}` : '';
    if (!tag) return base;
    return base.includes(tag) ? base : `${base} ${tag}`.trim();
  })();
  const orderId = params.get('orderId');
  const { setCart, setAppliedCoupon } = useCartStore();

  // Clear cart + applied coupon in store after successful order
  useEffect(() => { setCart(null); setAppliedCoupon(null); }, [setCart, setAppliedCoupon]);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const res = await checkoutApi.getOrder(orderId);
      return res.data.data;
    },
    enabled: !!orderId,
  });

  if (!orderId) {
    return (
      <main className="container mx-auto px-4 py-24 text-center">
        <p className="text-muted-foreground">Geçersiz sayfa.</p>
        <Button render={<Link to="/" />} className="mt-4">Ana Sayfaya Dön</Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-16 max-w-lg text-center">
      <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-2">Siparişiniz Alındı!</h1>
      <p className="text-muted-foreground mb-1">
        Sipariş No: <strong className="text-foreground">#{orderId.slice(-8).toUpperCase()}</strong>
      </p>
      <p className="text-sm text-muted-foreground mb-8">
        Sipariş onayı e-posta adresinize gönderildi.
      </p>

      {havale && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4 space-y-3 mb-6 text-left">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Havale / EFT Bilgileri
          </p>
          <div className="space-y-2 text-sm">
            {havale.orderNumber && (
              <div className="flex justify-between items-center rounded-md bg-blue-100 dark:bg-blue-900/30 px-3 py-2 -mx-1">
                <span className="text-blue-800 dark:text-blue-200 font-semibold">Sipariş No</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-900 dark:text-blue-100">#{havale.orderNumber}</span>
                  <button type="button" onClick={() => copyToClipboard(havale.orderNumber!, 'Sipariş numarası')} className="p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                    <Copy className="h-3.5 w-3.5 text-blue-600" />
                  </button>
                </div>
              </div>
            )}
            {havale.bankName && (
              <div className="flex justify-between"><span className="text-muted-foreground">Banka</span><span className="font-medium">{havale.bankName}</span></div>
            )}
            {havale.accountName && (
              <div className="flex justify-between"><span className="text-muted-foreground">Hesap Sahibi</span><span className="font-medium">{havale.accountName}</span></div>
            )}
            {havale.iban && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground flex-shrink-0">IBAN</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-xs tracking-wider">{havale.iban}</span>
                  <button type="button" onClick={() => copyToClipboard(havale.iban!.replace(/\s/g, ''), 'IBAN')} className="p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                    <Copy className="h-3.5 w-3.5 text-blue-600" />
                  </button>
                </div>
              </div>
            )}
            {havaleAciklama && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground flex-shrink-0">Açıklama</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold">{havaleAciklama}</span>
                  <button type="button" onClick={() => copyToClipboard(havaleAciklama, 'Açıklama')} className="p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                    <Copy className="h-3.5 w-3.5 text-blue-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3 text-left border rounded-lg p-4 mb-6">
          {[1, 2].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
        </div>
      ) : order ? (
        <div className="border rounded-lg p-4 mb-6 text-left space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4 text-primary" />
            Sipariş Detayı
          </div>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {(item.variant as { product: { name: string } }).product.name} × {item.quantity}
              </span>
              <span>{formatPrice(Number(item.unitPrice) * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t pt-3 flex justify-between font-semibold">
            <span>Toplam</span>
            <span>{formatPrice(Number(order.total))}</span>
          </div>
        </div>
      ) : null}

      {/* Misafir kullanıcıya hesap aktivasyon kartı */}
      <GuestActivationCard />

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button render={<Link to="/hesabim/siparisler" />}>

          <Package className="h-4 w-4 mr-2" />
          Siparişlerim
        </Button>
        <Button variant="outline" render={<Link to="/" />}>
          <ShoppingBag className="h-4 w-4 mr-2" />
          Alışverişe Devam
        </Button>
      </div>
    </main>
  );
}

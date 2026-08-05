import { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MapPin, Plus, ChevronRight, ShoppingBag, CreditCard,
  Loader2, Check, Banknote, Truck, Copy, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { checkoutApi, type PaymentMethodsResponse, type BillingInfo } from '@/services/checkoutApi';
import { productApi } from '@/services/productApi';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import type { Address, CheckoutInitResponse } from '@/types';
import { toast } from 'sonner';
import { GuestVerifyModal } from '@/components/auth/GuestVerifyModal';
import { GuestCheckoutModal } from '@/components/auth/GuestCheckoutModal';

type InitData = CheckoutInitResponse;
type PayMethod = 'card' | 'cod' | 'havale';

// ─── Validation ───────────────────────────────────────────────────────────────

const addressSchema = z.object({
  title: z.string().min(1, 'Adres başlığı zorunlu').max(50),
  firstName: z.string().min(2, 'Ad en az 2 karakter').max(50),
  lastName: z.string().min(2, 'Soyad en az 2 karakter').max(50),
  phone: z.string().min(10, 'Geçerli telefon numarası girin').max(15),
  city: z.string().min(2, 'Şehir zorunlu').max(50),
  district: z.string().min(2, 'İlçe zorunlu').max(50),
  postalCode: z.string().max(10).optional(),
  address: z.string().min(10, 'Adres en az 10 karakter olmalı').max(250),
});

type AddressFormValues = z.infer<typeof addressSchema>;

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

// ─── Step indicators ──────────────────────────────────────────────────────────

const STEPS = ['Adres', 'Özet & Ödeme', 'Tamamlandı'];

function StepBar({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center flex-1 last:flex-none">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold border-2 transition-colors
              ${i < current ? 'bg-primary border-primary text-white' : ''}
              ${i === current ? 'border-primary text-primary' : ''}
              ${i > current ? 'border-muted-foreground text-muted-foreground' : ''}`}
          >
            {i < current ? <Check className="h-4 w-4" /> : i + 1}
          </div>
          <span className={`ml-2 text-sm font-medium ${i === current ? 'text-primary' : 'text-muted-foreground'}`}>
            {label}
          </span>
          {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground flex-shrink-0" />}
        </li>
      ))}
    </ol>
  );
}

// ─── Address form ─────────────────────────────────────────────────────────────

function AddressForm({ onSaved }: { onSaved: (addr: Address) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
  });

  const mut = useMutation({
    mutationFn: (data: AddressFormValues) =>
      checkoutApi.createAddress({ ...data, type: 'SHIPPING', isDefault: true }),
    onSuccess: (res) => onSaved(res.data.data),
    onError: () => toast.error('Adres kaydedilemedi'),
  });

  const field = (id: keyof AddressFormValues, label: string, placeholder = '', fullWidth = false) => (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} placeholder={placeholder} className="mt-1" {...register(id)} />
      {errors[id] && <p className="text-xs text-destructive mt-1">{errors[id]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {field('title', 'Adres Başlığı', 'Ev, İş...')}
        {field('phone', 'Telefon', '05XX XXX XX XX')}
        {field('firstName', 'Ad')}
        {field('lastName', 'Soyad')}
        {field('city', 'Şehir', 'İstanbul')}
        {field('district', 'İlçe', 'Kadıköy')}
        {field('postalCode', 'Posta Kodu (opsiyonel)', '34XXX')}
        <div></div>
        {field('address', 'Adres', 'Cadde, sokak, bina no, daire...', true)}
      </div>
      <Button type="submit" disabled={mut.isPending} className="w-full sm:w-auto">
        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
        Adresi Kaydet
      </Button>
    </form>
  );
}

// ─── Payment Method Selector ──────────────────────────────────────────────────

function PayMethodCard({
  selected, onSelect, icon, title, subtitle, badge,
}: {
  id?: PayMethod;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-all ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground'
      }`}
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
        selected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{title}</p>
          {badge && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        selected ? 'border-primary bg-primary' : 'border-muted-foreground'
      }`}>
        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}

// ─── Havale Info ──────────────────────────────────────────────────────────────

function HavaleInfo({ info, noteOnly = false }: { info: NonNullable<{ bankName: string; iban: string; accountName: string; description: string; orderNumber?: string }>; noteOnly?: boolean }) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} kopyalandı`)).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      toast.success(`${label} kopyalandı`);
    });
  };

  // Checkout'ta yalnızca bilgilendirme notu — banka bilgileri sonraki adımda
  if (noteOnly) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2 mb-2">
          <Banknote className="h-4 w-4" />
          Havale / EFT ile Ödeme
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          Siparişinizi tamamladıktan sonra açılacak ekranda <strong>banka hesap bilgilerimiz</strong> ve size özel
          <strong> Sipariş Numaranız</strong> görüntülenecektir. Lütfen havale/EFT işlemini gerçekleştirirken açıklama
          kısmına <strong>Sipariş Numaranızı</strong> yazınız. Ödemeniz doğrulandıktan sonra siparişiniz işleme alınacaktır.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4 space-y-3">
      <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
        <Banknote className="h-4 w-4" />
        Havale / EFT Bilgileri
      </p>
      <div className="space-y-2 text-sm">
        {info.orderNumber && (
          <div className="flex justify-between items-center rounded-md bg-blue-100 dark:bg-blue-900/30 px-3 py-2 -mx-1">
            <span className="text-blue-800 dark:text-blue-200 font-semibold">Sipariş No</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-blue-900 dark:text-blue-100">#{info.orderNumber}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(info.orderNumber!, 'Sipariş numarası')}
                className="p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                title="Sipariş numarasını kopyala"
              >
                <Copy className="h-3.5 w-3.5 text-blue-600" />
              </button>
            </div>
          </div>
        )}
        {info.bankName && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Banka</span>
            <span className="font-medium">{info.bankName}</span>
          </div>
        )}
        {info.accountName && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Hesap Sahibi</span>
            <span className="font-medium">{info.accountName}</span>
          </div>
        )}
        {info.iban && (
          <div className="flex justify-between items-start gap-2">
            <span className="text-muted-foreground flex-shrink-0">IBAN</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-xs tracking-wider">{info.iban}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(info.iban.replace(/\s/g, ''), 'IBAN')}
                className="p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                title="IBAN'ı kopyala"
              >
                <Copy className="h-3.5 w-3.5 text-blue-600" />
              </button>
            </div>
          </div>
        )}
        {info.description && (
          <div className="flex justify-between items-start gap-2">
            <span className="text-muted-foreground flex-shrink-0">Açıklama</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold">{info.description}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(info.description, 'Açıklama')}
                className="p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                title="Açıklamayı kopyala"
              >
                <Copy className="h-3.5 w-3.5 text-blue-600" />
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed border-t border-blue-200 dark:border-blue-700 pt-3">
        Siparişi tamamladığınızda size bir <strong>sipariş numarası</strong> verilir; havale/EFT
        açıklamasına bu numarayı yazın. Ödemeniz tarafımıza ulaştıktan sonra siparişiniz hazırlanmaya başlar.
      </p>
    </div>
  );
}

// ─── Main Checkout ─────────────────────────────────────────────────────────────

export function Checkout() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { cart, setCart, appliedCoupon, setAppliedCoupon } = useCartStore();
  const [step, setStep] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [initData, setInitData] = useState<InitData | null>(null);
  // Sunucu e-posta doğrulaması isterse hangi işlemin tekrarlanacağını tutar
  const [pendingAction, setPendingAction] = useState<'init' | 'place' | null>(null);
  const lastPayloadRef = useRef<{ addressId: string; billing?: BillingInfo } | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  // Fatura bilgileri (e-Fatura/e-Arşiv için)
  const [billingType, setBillingType] = useState<'individual' | 'corporate'>('individual');
  const [billing, setBilling] = useState({ billingName: '', taxNumber: '', identityNo: '', taxOffice: '' });
  const paymentDivRef = useRef<HTMLDivElement>(null);
  // Misafir girişi: giriş yapılmamış kullanıcıya seçenek sunar
  const [guestModalOpen, setGuestModalOpen] = useState(!isAuthenticated);

  if (!cart || cart.items.length === 0) return <Navigate to="/sepet" replace />;

  // Kullanıcı hâlâ giriş yapmadıysa (misafir modalı kapandıysa login'e yönlendir)
  if (!isAuthenticated && !guestModalOpen) return <Navigate to="/giris" state={{ from: '/odeme' }} replace />;

  const { data: addrData, isLoading: addrLoading, refetch: refetchAddr } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => (await checkoutApi.listAddresses()).data.data,
  });

  const { data: methodsData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => (await checkoutApi.getPaymentMethods()).data.data,
  });

  const { data: shippingConfig } = useQuery({
    queryKey: ['shipping-config'],
    queryFn: () => productApi.shippingConfig().then((r) => r.data.data),
  });

  const methods: PaymentMethodsResponse = methodsData ?? {
    card: { enabled: true },
    cod: { enabled: false, fee: 0 },
    havale: { enabled: false, bankName: '', iban: '', accountName: '', description: '' },
  };

  const addresses = addrData ?? [];

  useEffect(() => {
    if (!selectedAddress && addresses.length > 0) {
      setSelectedAddress(addresses.find((a) => a.isDefault) ?? addresses[0]);
    }
  }, [addresses]);

  // Auto-select first available method
  useEffect(() => {
    if (!methodsData) return;
    if (methods.card.enabled) setPayMethod('card');
    else if (methods.cod.enabled) setPayMethod('cod');
    else if (methods.havale.enabled) setPayMethod('havale');
  }, [methodsData]);

  // iyzico initialize
  const initMut = useMutation({
    mutationFn: (vars: { addressId: string; billing?: BillingInfo }) =>
      checkoutApi.initialize(vars.addressId, appliedCoupon?.code, vars.billing),
    onSuccess: (res) => {
      setInitData(res.data.data as InitData);
      setStep(2);
    },
    onError: (err: { response?: { data?: { message?: string; error?: string; code?: string } } }) => {
      // E-posta doğrulaması gerekiyorsa hata yerine doğrulama penceresini aç
      if (err.response?.data?.code === 'GUEST_EMAIL_NOT_VERIFIED') {
        setPendingAction('init');
        return;
      }
      toast.error(err.response?.data?.message ?? err.response?.data?.error ?? 'Ödeme başlatılamadı');
    },
  });

  // COD / Havale place order
  const placeOrderMut = useMutation({
    mutationFn: ({ addressId, method, billing }: { addressId: string; method: 'cod' | 'havale' | 'free'; billing?: BillingInfo }) =>
      checkoutApi.placeOrder(addressId, method, appliedCoupon?.code, billing),
    onSuccess: (res) => {
      setCart(null);
      setAppliedCoupon(null);
      const orderId = res.data.data.orderId;
      if (payMethod === 'havale' && res.data.data.havale) {
        // Pass havale info via state to success page
        navigate(`/siparis-tamamlandi?orderId=${orderId}`, {
          state: { havale: res.data.data.havale, orderNumber: res.data.data.havale?.orderNumber },
        });
      } else {
        navigate(`/siparis-tamamlandi?orderId=${orderId}`);
      }
    },
    onError: (err: { response?: { data?: { error?: string; code?: string } } }) => {
      if (err.response?.data?.code === 'GUEST_EMAIL_NOT_VERIFIED') {
        setPendingAction('place');
        return;
      }
      toast.error(err.response?.data?.error ?? 'Sipariş oluşturulamadı');
    },
  });

  // Inject iyzico form
  useEffect(() => {
    if (initData?.checkoutFormContent && paymentDivRef.current) {
      paymentDivRef.current.innerHTML = initData.checkoutFormContent;
      paymentDivRef.current.querySelectorAll('script').forEach((old) => {
        const s = document.createElement('script');
        s.textContent = old.textContent;
        old.replaceWith(s);
      });
    }
  }, [initData, step]);

  const subtotal = cart.items.reduce((s, i) => s + i.priceAtAdd * i.quantity, 0);
  const codFee = payMethod === 'cod' ? (methods.cod.fee ?? 0) : 0;
  const SHIPPING_FEE = shippingConfig?.shippingFee ?? 95;
  const FREE_THRESHOLD = shippingConfig?.freeShippingThreshold ?? 500;
  const shippingFee = initData?.shippingFee ?? (subtotal >= FREE_THRESHOLD ? 0 : SHIPPING_FEE);

  // Kupon indirimi (net ara toplam üzerinden) — server ile aynı mantık
  const discount = initData?.discount ?? (appliedCoupon
    ? Math.min(
        appliedCoupon.type === 'PERCENT'
          ? Math.round((subtotal * appliedCoupon.value) / 100 * 100) / 100
          : appliedCoupon.value,
        subtotal,
      )
    : 0);

  // Fiyatlar KDV dahil — ekstra KDV eklenmez
  const total = initData?.total ?? (subtotal - discount + shippingFee + codFee);

  const handleProceed = () => {
    if (!selectedAddress) return;

    // Fatura bilgisi doğrulama
    if (billingType === 'corporate') {
      if (!billing.billingName.trim() || !/^\d{10}$/.test(billing.taxNumber.trim()) || !billing.taxOffice.trim()) {
        toast.error('Kurumsal fatura için ünvan, 10 haneli VKN ve vergi dairesi zorunludur');
        return;
      }
    } else if (billing.identityNo.trim() && !/^\d{11}$/.test(billing.identityNo.trim())) {
      toast.error('TC Kimlik No 11 haneli olmalıdır');
      return;
    }

    const billingPayload: BillingInfo =
      billingType === 'corporate'
        ? {
            isCorporate: true,
            billingName: billing.billingName.trim(),
            taxNumber: billing.taxNumber.trim(),
            taxOffice: billing.taxOffice.trim(),
          }
        : { isCorporate: false, ...(billing.identityNo.trim() ? { identityNo: billing.identityNo.trim() } : {}) };

    lastPayloadRef.current = { addressId: selectedAddress.id, billing: billingPayload };

    if (total <= 0) {
      placeOrderMut.mutate({ addressId: selectedAddress.id, method: 'free', billing: billingPayload });
    } else if (payMethod === 'card') {
      initMut.mutate({ addressId: selectedAddress.id, billing: billingPayload });
    } else {
      placeOrderMut.mutate({ addressId: selectedAddress.id, method: payMethod, billing: billingPayload });
    }
  };

  // Doğrulama tamamlandıktan sonra yarım kalan işlemi aynı verilerle tekrarla
  const handleVerified = () => {
    const payload = lastPayloadRef.current;
    const action = pendingAction;
    setPendingAction(null);
    if (!payload || !action) return;
    if (action === 'init') {
      initMut.mutate(payload);
    } else {
      placeOrderMut.mutate({ ...payload, method: total <= 0 ? 'free' : payMethod as 'cod' | 'havale' });
    }
  };

  const isProcessing = initMut.isPending || placeOrderMut.isPending;

  // ─── Step 0: Address ────────────────────────────────────────────────────────

  const stepAddress = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        Teslimat Adresi
      </h2>

      {addrLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <button
              key={addr.id}
              onClick={() => { setSelectedAddress(addr); setShowNewForm(false); }}
              className={`w-full text-left border rounded-lg p-4 transition-colors ${
                selectedAddress?.id === addr.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{addr.title}</span>
                {addr.isDefault && <Badge variant="secondary">Varsayılan</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {addr.firstName} {addr.lastName} — {addr.phone}
              </p>
              <p className="text-sm text-muted-foreground">
                {addr.address}, {addr.district} / {addr.city}
              </p>
            </button>
          ))}
        </div>
      )}

      {!showNewForm && (
        <Button variant="outline" size="sm" onClick={() => setShowNewForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Adres Ekle
        </Button>
      )}

      {showNewForm && (
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-medium">Yeni Adres</h3>
          <AddressForm
            onSaved={(addr) => {
              setSelectedAddress(addr);
              setShowNewForm(false);
              refetchAddr();
            }}
          />
        </div>
      )}

      <Button className="w-full" disabled={!selectedAddress} onClick={() => setStep(1)}>
        Devam Et
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );

  // ─── Step 1: Summary + Payment Method ──────────────────────────────────────

  const stepSummary = () => (
    <div className="space-y-5">
      {/* Order items */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Sipariş Özeti
        </h2>

        <div className="border rounded-lg divide-y">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3">
              <div className="w-12 h-12 rounded-lg bg-cream-50 dark:bg-espresso-800 flex-shrink-0 overflow-hidden">
                {item.variant.product.images?.[0] ? (
                  <img
                    src={item.variant.product.images[0].url}
                    alt={item.variant.product.name}
                    className="w-full h-full object-cover"
                  />
                ) : <div className="w-full h-full bg-cream-100 dark:bg-espresso-700" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-1">{item.variant.product.name}</p>
                <p className="text-xs text-muted-foreground">x{item.quantity}</p>
              </div>
              <p className="text-sm font-medium">{formatPrice(item.priceAtAdd * item.quantity)}</p>
            </div>
          ))}
        </div>

        {selectedAddress && (
          <div className="border rounded-lg p-4 mt-3">
            <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Teslimat Adresi
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedAddress.firstName} {selectedAddress.lastName}, {selectedAddress.address},{' '}
              {selectedAddress.district} / {selectedAddress.city}
            </p>
          </div>
        )}
      </div>

      {/* Payment method selection — toplam ₺0 ise ödeme gerekmez */}
      {total > 0 ? (
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <CreditCard className="h-5 w-5 text-primary" />
            Ödeme Yöntemi
          </h2>

          <div className="space-y-2">
            {methods.card.enabled && (
              <PayMethodCard
                id="card"
                selected={payMethod === 'card'}
                onSelect={() => setPayMethod('card')}
                icon={<CreditCard className="h-5 w-5" />}
                title="Kredi / Banka Kartı"
                subtitle="Güvenli ödeme altyapısı ile online ödeme"
              />
            )}
            {methods.cod.enabled && (
              <PayMethodCard
                id="cod"
                selected={payMethod === 'cod'}
                onSelect={() => setPayMethod('cod')}
                icon={<Truck className="h-5 w-5" />}
                title="Kapıda Ödeme"
                subtitle="Sipariş tesliminde nakit veya kartla ödeyin"
                badge={methods.cod.fee > 0 ? `+${formatPrice(methods.cod.fee)}` : undefined}
              />
            )}
            {methods.havale.enabled && (
              <PayMethodCard
                id="havale"
                selected={payMethod === 'havale'}
                onSelect={() => setPayMethod('havale')}
                icon={<Banknote className="h-5 w-5" />}
                title="Havale / EFT"
                subtitle="Banka havalesi veya EFT ile ödeme yapın"
              />
            )}
          </div>

          {/* Havale bilgilendirme notu — banka bilgileri sonraki adımda gösterilir */}
          {payMethod === 'havale' && (
            <div className="mt-3">
              <HavaleInfo info={methods.havale} noteOnly />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4">
          <p className="text-sm font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
            <Check className="h-4 w-4" />
            Ödeme Gerekmiyor
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            İndirim kuponu sayesinde sipariş tutarınız ₺0 olmuştur. Ödeme yapmanıza gerek yoktur.
          </p>
        </div>
      )}

      {/* Fatura bilgileri (e-Fatura / e-Arşiv) */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-primary" />
          Fatura Bilgileri
        </h2>

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setBillingType('individual')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              billingType === 'individual' ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground'
            }`}
          >
            Bireysel
          </button>
          <button
            type="button"
            onClick={() => setBillingType('corporate')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              billingType === 'corporate' ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground'
            }`}
          >
            Kurumsal
          </button>
        </div>

        {billingType === 'individual' ? (
          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={11}
              value={billing.identityNo}
              onChange={(e) => setBilling((b) => ({ ...b, identityNo: e.target.value.replace(/\D/g, '') }))}
              placeholder="TC Kimlik No (opsiyonel)"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Bireysel müşteriler için e-Arşiv fatura kesilir. TCKN girilmesi zorunlu değildir.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={billing.billingName}
              onChange={(e) => setBilling((b) => ({ ...b, billingName: e.target.value }))}
              placeholder="Firma Ünvanı *"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={billing.taxNumber}
                onChange={(e) => setBilling((b) => ({ ...b, taxNumber: e.target.value.replace(/\D/g, '') }))}
                placeholder="Vergi No (VKN) *"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={billing.taxOffice}
                onChange={(e) => setBilling((b) => ({ ...b, taxOffice: e.target.value }))}
                placeholder="Vergi Dairesi *"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Vergi mükellefi kurumlar için e-Fatura kesilir. Tüm alanlar zorunludur.
            </p>
          </div>
        )}
      </div>

      {/* Price breakdown */}
      <div className="border rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Ara Toplam</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-700">
            <span>İndirim {appliedCoupon ? `(${appliedCoupon.code})` : ''}</span>
            <span>−{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span>Kargo</span>
          <span>{shippingFee === 0 ? 'Ücretsiz' : formatPrice(shippingFee)}</span>
        </div>
        {payMethod === 'cod' && methods.cod.fee > 0 && (
          <div className="flex justify-between text-sm text-amber-700">
            <span>Kapıda Ödeme Ücreti</span>
            <span>{formatPrice(methods.cod.fee)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold border-t pt-2">
          <span>Toplam (KDV Dahil)</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Geri</Button>
        <Button
          className="flex-1"
          disabled={isProcessing}
          onClick={handleProceed}
        >
          {isProcessing ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />İşleniyor...</>
          ) : total <= 0 ? (
            <><Check className="h-4 w-4 mr-2" />Siparişi Tamamla</>
          ) : payMethod === 'card' ? (
            <><CreditCard className="h-4 w-4 mr-2" />Kartla Öde</>
          ) : payMethod === 'cod' ? (
            <><Truck className="h-4 w-4 mr-2" />Siparişi Tamamla</>
          ) : (
            <><Banknote className="h-4 w-4 mr-2" />Siparişi Tamamla</>
          )}
        </Button>
      </div>
    </div>
  );

  // ─── Step 2: Payment (iyzico form only — COD/Havale redirect directly) ──────

  const stepPayment = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        Kart Bilgileri
      </h2>

      {initData && (
        <div className="border rounded-lg p-4 text-sm text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Toplam Tutar</span>
            <span className="font-semibold text-foreground">{formatPrice(initData.total)}</span>
          </div>
        </div>
      )}

      <div ref={paymentDivRef} className="min-h-[200px]" />

      <Button variant="outline" onClick={() => setStep(1)} className="w-full">
        ← Özete Dön
      </Button>
    </div>
  );

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Giriş yapılmamış kullanıcıya: misafir veya üye girişi seçeneği */}
      {guestModalOpen && !isAuthenticated && (
        <GuestCheckoutModal
          onClose={() => setGuestModalOpen(false)}
          onSuccess={() => setGuestModalOpen(false)}
        />
      )}

      {pendingAction && (
        <GuestVerifyModal
          email={user?.email ?? ''}
          onVerified={handleVerified}
          onClose={() => setPendingAction(null)}
        />
      )}
      <h1 className="text-2xl font-bold mb-6">Ödeme</h1>
      <StepBar current={step} />

      {step === 0 && stepAddress()}
      {step === 1 && stepSummary()}
      {step === 2 && stepPayment()}
    </main>
  );
}

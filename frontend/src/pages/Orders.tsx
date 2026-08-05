import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, ChevronRight, Clock, Truck, CheckCircle, XCircle, RefreshCw, AlertCircle, Printer, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { checkoutApi } from '@/services/checkoutApi';
import { api } from '@/services/api';
import { CancellationModal } from '@/components/order/CancellationModal';
import { CancellationStatus } from '@/components/order/CancellationStatus';
import { ReturnModal } from '@/components/order/ReturnModal';
import { ReturnStatus } from '@/components/order/ReturnStatus';
import type { Order } from '@/types';

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return Number(n).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  PENDING:    { label: 'Beklemede',  variant: 'secondary',    icon: <Clock className="h-3 w-3" /> },
  PROCESSING: { label: 'Hazırlanıyor', variant: 'default',   icon: <RefreshCw className="h-3 w-3" /> },
  SHIPPED:    { label: 'Kargoda',    variant: 'outline',      icon: <Truck className="h-3 w-3" /> },
  DELIVERED:  { label: 'Teslim Edildi', variant: 'default',  icon: <CheckCircle className="h-3 w-3" /> },
  CANCELLED:  { label: 'İptal Edildi', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  REFUNDED:   { label: 'İade Edildi', variant: 'outline',    icon: <RefreshCw className="h-3 w-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, variant: 'outline' as const, icon: null };
  return (
    <Badge variant={meta.variant} className="flex items-center gap-1 w-fit">
      {meta.icon}
      {meta.label}
    </Badge>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const firstItem = order.items[0];
  const productName = (firstItem?.variant as { product?: { name: string } } | undefined)?.product?.name ?? '—';
  const extraCount = order.items.length - 1;

  return (
    <Link
      to={`/hesabim/siparisler/${order.id}`}
      className="block border rounded-lg p-4 hover:border-primary transition-colors group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground font-mono">
              #{order.id.slice(-8).toUpperCase()}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <p className="font-medium truncate">
            {productName}
            {extraCount > 0 && (
              <span className="text-muted-foreground text-sm"> +{extraCount} ürün</span>
            )}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{formatDate(order.createdAt)}</p>

          {/* Shipping Info */}
          {order.shipping && (
            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-1">
              {order.shipping.carrier && (
                <p>🚚 <span className="font-medium">{order.shipping.carrier}</span></p>
              )}
              {order.shipping.trackingNumber && (
                <p>Takip: <span className="font-mono">{order.shipping.trackingNumber}</span></p>
              )}
              {order.shipping.estimatedAt && (
                <p>Tahmini: {formatDate(order.shipping.estimatedAt)}</p>
              )}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="space-y-1">
            {Number(order.discount) > 0 && (
              <>
                <p className="text-sm text-muted-foreground line-through">{formatPrice(order.subtotal + order.shippingFee)}</p>
                <p className="text-green-600 text-sm font-medium">−{formatPrice(order.discount)}</p>
              </>
            )}
            <p className="font-semibold">{formatPrice(order.total)}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground mt-2 ml-auto group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

// ─── Orders List ──────────────────────────────────────────────────────────────

export function Orders() {
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => (await checkoutApi.listOrders()).data.data,
  });

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Package className="h-6 w-6" />
        Siparişlerim
      </h1>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : !orders?.length ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Henüz siparişiniz yok</h2>
          <p className="text-muted-foreground mb-6">İlk siparişinizi vermek için alışverişe başlayın.</p>
          <Button render={<Link to="/ara" />}>Alışverişe Başla</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => <OrderCard key={order.id} order={order} />)}
        </div>
      )}
    </main>
  );
}

// ─── Order Detail ─────────────────────────────────────────────────────────────

export function OrderDetail() {
  const { id: orderId = '' } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnVersion, setReturnVersion] = useState(0);
  const [invoiceSending, setInvoiceSending] = useState(false);
  const [invoiceOk, setInvoiceOk] = useState(false);
  const [invoiceErr, setInvoiceErr] = useState('');

  async function handleResendInvoice() {
    setInvoiceSending(true);
    setInvoiceErr('');
    try {
      await api.post(`/checkout/orders/${orderId}/resend-invoice`, {});
      setInvoiceOk(true);
      setTimeout(() => setInvoiceOk(false), 5000);
    } catch {
      setInvoiceErr('E-posta gönderilemedi, lütfen tekrar deneyin.');
      setTimeout(() => setInvoiceErr(''), 5000);
    } finally {
      setInvoiceSending(false);
    }
  }

  async function handlePrintInvoice() {
    if (!order) return;

    const esc = (s: unknown) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    let company: { name: string; legalName: string; address: string; city: string; phone: string; email: string; taxOffice: string; taxNumber: string; logoUrl: string; } =
      { name: '', legalName: '', address: '', city: '', phone: '', email: '', taxOffice: '', taxNumber: '', logoUrl: '' };
    try {
      const r = await api.get<{ success: boolean; data: typeof company }>('/company-info');
      company = (r as any)?.data?.data ?? company;
    } catch (e) { console.warn('company-info', e); }

    // Göreceli logo URL'sini absolute yap (print penceresi about:blank'tan açılıyor)
    if (company.logoUrl && company.logoUrl.startsWith('/')) {
      company.logoUrl = `${window.location.origin}${company.logoUrl}`;
    }

    // KDV oranı (global) — fiyatlar KDV dahil, sadece toplam etiketinde gösterilir
    let vatRate = 20;
    try {
      const tr = await api.get<{ success: boolean; data: { taxRate: number } }>('/tax-config');
      const rate = Number((tr as any)?.data?.data?.taxRate);
      if (Number.isFinite(rate) && rate >= 0) vatRate = rate;
    } catch (e) { console.warn('tax-config', e); }

    const orderRef = `TR-${order.id.slice(-8).toUpperCase()}`;
    const orderDate = new Date(order.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const discountN = Number(order.discount);          // iskonto (düz tutar)
    const shippingN = Number(order.shippingFee ?? 0);  // kargo ucreti
    const totalN    = Number(order.total);             // indirimli toplam (KDV dahil brüt)
    const divN      = 1 + vatRate / 100;
    const netTotalN = totalN / divN;                   // Ara Toplam = indirimli toplamın KDV'siz (net) hali
    const kdvN      = Math.max(0, totalN - netTotalN); // KDV tutarı
    const fmtN      = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

    const addr = order.address as any;
    const addrBlock = [
      addr ? esc(`${addr.firstName ?? ''} ${addr.lastName ?? ''}`.trim()) : '',
      esc(addr?.phone ?? ''),
      esc(addr?.address ?? ''),
      [esc(addr?.neighborhood ?? ''), esc(addr?.district ?? '')].filter(Boolean).join(', '),
      [esc(addr?.city ?? ''), esc(addr?.postalCode ?? '')].filter(Boolean).join(' '),
    ].filter(Boolean).join('<br>');

    const companyBlock = [
      esc(company.address), esc(company.city),
      company.phone ? `Tel: ${esc(company.phone)}` : '',
      company.email ? `E: ${esc(company.email)}` : '',
      company.taxOffice ? `Vergi Dairesi: ${esc(company.taxOffice)}` : '',
      company.taxNumber ? `Vergi No: ${esc(company.taxNumber)}` : '',
    ].filter(Boolean).join('<br>');

    const logoHtml = company.logoUrl
      ? `<img src="${esc(company.logoUrl)}" alt="logo" style="max-height:70px;max-width:160px;object-fit:contain;display:block;margin-bottom:6px">`
      : '';

    const itemRows = order.items.map((item: any, i: number) => {
      const product = item.variant?.product ?? {};
      const attrs = Object.entries(item.variant?.attributes ?? {}).map(([k, v]: any) => `${esc(k)}: ${esc(v)}`).join(' / ');
      const lineTotal = Number(item.unitPrice) * item.quantity;
      const bg = i % 2 === 1 ? 'background:#f9f9f9;' : '';
      return `<tr style="${bg}">
        <td style="padding:8px 10px;border-bottom:1px solid #ddd">
          <strong>${esc(product.name ?? '—')}</strong>
          ${attrs ? `<br><small style="color:#666">${attrs}</small>` : ''}
          ${item.variant?.sku ? `<br><small style="color:#aaa;font-family:monospace">${esc(item.variant.sku)}</small>` : ''}
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:center">${item.quantity}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:right">${fmtN(Number(item.unitPrice))}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:right"><strong>${fmtN(lineTotal)}</strong></td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><title>Fatura ${orderRef}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;background:#fff}
@page{size:A4;margin:12mm 15mm}
.page{width:100%;max-width:780px;margin:0 auto;padding:20px}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:3px solid #111;margin-bottom:20px}
.title{font-size:28px;font-weight:900;letter-spacing:1px;line-height:1.1;margin-top:2px}
.header-right{text-align:right}
.company-name{font-size:15px;font-weight:700;letter-spacing:.3px;margin-bottom:4px}
.company-addr{font-size:11px;color:#444;line-height:1.7}
.info-grid{display:flex;gap:0;margin-bottom:24px}
.info-left{flex:1}
.info-right{flex:1;border-left:2px solid #111;padding-left:20px}
.info-row{display:flex;align-items:baseline;gap:8px;margin-bottom:5px}
.lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#555;min-width:120px}
.val{font-size:12px;font-weight:600;color:#111}
table{width:100%;border-collapse:collapse}
thead tr{background:#111;color:#fff}
thead th{padding:9px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px}
thead th:nth-child(2){text-align:center}
thead th:nth-child(3),thead th:nth-child(4){text-align:right}
.totals-row{display:flex;justify-content:flex-end;border-top:2px solid #111}
.totals-table{width:280px;border-collapse:collapse}
.totals-table td{padding:6px 10px;font-size:12px;border-bottom:1px solid #eee}
.totals-table .total-row td{font-size:14px;font-weight:700;border-bottom:none;border-top:2px solid #111;padding-top:8px}
.footer{margin-top:30px;padding-top:14px;border-top:2px solid #111;display:flex;justify-content:space-between;font-size:10px;color:#666}
.sign-line{width:140px;height:1px;background:#111;margin:30px 0 4px auto}
</style></head><body>
<div class="page">
  <div class="header">
    <div class="header-left">${logoHtml}<div class="title">İrsaliye Fatura</div></div>
    <div class="header-right">
      <div class="company-name">${company.legalName || company.name || 'Şirket Adı'}</div>
      ${companyBlock ? `<div class="company-addr">${companyBlock}</div>` : ''}
    </div>
  </div>
  <div class="info-grid">
    <div class="info-left">
      <div class="info-row"><span class="lbl">SAYIN</span><span class="val">${addr ? esc(`${addr.firstName ?? ''} ${addr.lastName ?? ''}`.trim()) : '—'}</span></div>
      <div style="margin-top:10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin-bottom:5px">TESLİMAT ADRESİ</div>
      <div style="font-size:11px;color:#333;line-height:1.8">${addrBlock}</div>
    </div>
    <div class="info-right">
      <div class="info-row"><span class="lbl">FATURA NUMARASI</span><span class="val">${orderRef}</span></div>
      <div class="info-row"><span class="lbl">FATURA TARİHİ</span><span class="val">${orderDate}</span></div>
    </div>
  </div>
  <table>
    <thead><tr><th style="width:50%">ÜRÜN</th><th style="width:12%">ADET</th><th style="width:19%">BİRİM FİYAT</th><th style="width:19%">TOPLAM</th></tr></thead>
    <tbody>${itemRows}${discountN > 0 ? `<tr><td colspan="3" style="padding:8px 10px;border-bottom:1px solid #ddd;color:#16a34a;font-weight:bold">İskonto</td><td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:right;color:#16a34a;font-weight:bold">−${fmtN(discountN)}</td></tr>` : ''}${shippingN > 0 ? `<tr><td colspan="3" style="padding:8px 10px;border-bottom:1px solid #ddd;font-weight:bold">Kargo</td><td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:right;font-weight:bold">${fmtN(shippingN)}</td></tr>` : ''}</tbody>
  </table>
  <div class="totals-row">
    <table class="totals-table">
      <tr><td><strong>Toplam</strong></td><td style="text-align:right"><strong>${fmtN(totalN)}</strong></td></tr>
      <tr><td colspan="2" style="height:10px;border:none"></td></tr>
      <tr><td>Ara Toplam</td><td style="text-align:right">${fmtN(netTotalN)}</td></tr>
      <tr><td>KDV${vatRate > 0 ? ` (%${vatRate})` : ''}</td><td style="text-align:right">${fmtN(kdvN)}</td></tr>
      <tr class="total-row"><td><strong>Genel Toplam</strong></td><td style="text-align:right"><strong>${fmtN(totalN)}</strong></td></tr>
    </table>
  </div>
  <div class="footer">
    <div>${esc(company.legalName || company.name || 'Şirket Adı')}${company.taxOffice ? `<br>Vergi Dairesi: ${esc(company.taxOffice)}` : ''}${company.taxNumber ? `<br>Vergi No: ${esc(company.taxNumber)}` : ''}<br>Bu belge bilgi amaçlıdır.</div>
    <div style="text-align:right"><div class="sign-line"></div><div>Kaşe / İmza</div></div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=1100,scrollbars=yes');
    if (!win) { alert('Lütfen tarayıcı popup engelini devre dışı bırakın.'); return; }
    win.document.write(html);
    win.document.close();
  }
  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => (await checkoutApi.getOrder(orderId)).data.data,
    enabled: !!orderId,
  });
  const { data: cancellation } = useQuery({
    queryKey: ['order-cancellation', orderId],
    queryFn: async () => {
      try {
        const res = await (await import('@/services/api')).api.get<{ success: boolean; data: any }>(
          `/checkout/orders/${orderId}/cancellation`
        );
        return res.data.success ? res.data.data : null;
      } catch {
        return null;
      }
    },
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </main>
    );
  }

  if (isError || !order) {
    return (
      <main className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Sipariş bulunamadı.</p>
        <Button render={<Link to="/hesabim/siparisler" />} variant="outline">Geri Dön</Button>
      </main>
    );
  }

  const addr = order.address as { firstName: string; lastName: string; address: string; district: string; city: string } | undefined;

  // İskonto düşülmüş toplam KDV dahil; Ara Toplam = netin (total/1+oran), KDV = fark
  const orderDiscount = Number(order.discount);    // iskonto (düz tutar)
  const orderTotal = Number(order.total);          // indirimli toplam (KDV dahil)

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link to="/hesabim/siparisler" className="hover:text-foreground">Siparişlerim</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">#{order.id.slice(-8).toUpperCase()}</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Sipariş #{order.id.slice(-8).toUpperCase()}</h1>
        <StatusBadge status={order.status} />
      </div>

      {/* Items */}
      <div className="border rounded-lg divide-y mb-8">
        {order.items.map((item) => {
          const product = (item.variant as { product: { name: string; slug: string; images?: { url: string }[] } }).product;
          const img = product.images?.[0];
          return (
            <div key={item.id} className="flex items-center gap-3 p-4">
              <div className="w-16 h-16 rounded bg-cream-50 flex-shrink-0 overflow-hidden">
                {img ? (
                  <img src={img.url} alt={product.name} className="w-full h-full object-cover" />
                ) : <div className="w-full h-full bg-cream-100" />}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/urun/${product.slug}`} className="font-medium hover:text-primary line-clamp-1">
                  {product.name}
                </Link>
                <p className="text-sm text-muted-foreground">Adet: {item.quantity}</p>
              </div>
              <p className="font-medium">{formatPrice(Number(item.unitPrice) * item.quantity)}</p>
            </div>
          );
        })}
      </div>

      {/* 4 Column Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Sipariş Özeti */}
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-sm font-semibold mb-4">Sipariş Özeti</p>
          <div className="space-y-3 text-sm">
            {orderDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="text-muted-foreground">İskonto</span>
                <span className="font-medium">−{formatPrice(orderDiscount)}</span>
              </div>
            )}
            {Number(order.shippingFee) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kargo</span>
                <span className="font-medium">{formatPrice(Number(order.shippingFee))}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ara Toplam (KDV Dahil)</span>
              <span className="font-medium">{formatPrice(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between border-t pt-3 font-semibold">
              <span>Genel Toplam</span>
              <span>{formatPrice(orderTotal)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Teslimat Adresi */}
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-sm font-semibold mb-4">Teslimat Adresi</p>
          {addr ? (
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">{addr.firstName} {addr.lastName}</p>
              <p>{addr.address}</p>
              <p>{addr.district} / {addr.city}</p>
              <div className="pt-2 border-t text-xs mt-3">
                <p className="text-muted-foreground">Sipariş Tarihi</p>
                <p className="font-medium text-foreground">{formatDate(order.createdAt)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Adres bilgisi yok</p>
          )}
        </div>

        {/* Card 3: Kargo Bilgileri */}
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Kargo Bilgileri</p>
          </div>
          {order.shipping ? (
            <div className="text-sm text-muted-foreground space-y-2">
              {order.shipping.carrier && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Kargo Firması</p>
                  <p className="font-medium text-foreground">{order.shipping.carrier}</p>
                </div>
              )}
              {order.shipping.trackingNumber ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Takip No</p>
                  <p className="font-mono font-medium text-foreground">{order.shipping.trackingNumber}</p>
                </div>
              ) : (
                <p className="text-xs italic">Takip numarası henüz girilmedi.</p>
              )}
              {order.shipping.estimatedAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tahmini Teslimat</p>
                  <p className="font-medium text-foreground">{formatDate(order.shipping.estimatedAt)}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Kargo bilgisi henüz yok</p>
          )}
        </div>

        {/* Card 4: Sipariş Geçmişi */}
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-sm font-semibold mb-4">Sipariş Geçmişi</p>
          {(order as unknown as { statusHistory?: Array<{ id: string; status: string; note?: string; createdAt: string }> }).statusHistory && (
            <div className="text-sm space-y-2">
              {((order as unknown as { statusHistory: Array<{ id: string; status: string; note?: string; createdAt: string }> }).statusHistory).slice(-3).map((log, i) => (
                <div key={log.id}>
                  <div className="flex items-center justify-between mb-1">
                    <StatusBadge status={log.status} />
                    <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                  </div>
                  {log.note && <p className="text-xs text-muted-foreground ml-0">{log.note}</p>}
                  {i < 2 && <div className="h-px bg-border mt-2" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Status */}
      {cancellation && (
        <div className="mb-8">
          <CancellationStatus
            status={cancellation.status}
            reason={cancellation.reason}
            adminNotes={cancellation.adminNotes}
          />
        </div>
      )}

      {/* Cancel Request Button */}
      {!cancellation && ['PENDING', 'PROCESSING'].includes(order.status) && (
        <div className="border rounded-lg p-4 mb-8 bg-blue-50 border-blue-200 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900">Siparişi İptal Edebilirsiniz</p>
              <p className="text-sm text-blue-800 mt-1">Kargo gitmeden önce siparişinizi iptal edebilirsiniz. Ödemeniz 1-7 iş günü içinde iade edilecektir.</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsCancellationModalOpen(true)}
            className="ml-4 flex-shrink-0"
          >
            İptal Et
          </Button>
        </div>
      )}

      {/* İade Durumu (varsa) */}
      <div className="mb-8">
        <ReturnStatus orderId={orderId!} version={returnVersion} />
      </div>

      {/* İade Talebi Butonu — kargolanmış/teslim edilmiş siparişler */}
      {['SHIPPED', 'DELIVERED'].includes(order.status) && (
        <div className="border rounded-lg p-4 mb-8 bg-cream-50 border-espresso-200 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <RefreshCw className="h-5 w-5 text-espresso-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-espresso-900">Ürün İadesi</p>
              <p className="text-sm text-espresso-600 mt-1">Ürünlerin tamamını veya bir kısmını iade edebilirsiniz. Onaylandığında tutar iade edilir.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setIsReturnModalOpen(true)} className="ml-4 flex-shrink-0">
            İade Talebi Oluştur
          </Button>
        </div>
      )}

      {/* Invoice actions */}
      {invoiceOk && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
          Fatura e-postanıza gönderildi.
        </div>
      )}
      {invoiceErr && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {invoiceErr}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="outline" render={<Link to="/hesabim/siparisler" />}>← Siparişlerim</Button>
        <Button render={<Link to="/ara" />}>Alışverişe Devam</Button>
        <Button
          variant="outline"
          onClick={handlePrintInvoice}
          className="flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Fatura Yazdır
        </Button>
        <Button
          variant="outline"
          onClick={handleResendInvoice}
          disabled={invoiceSending}
          className="flex items-center gap-2"
        >
          <Mail className="h-4 w-4" />
          {invoiceSending ? 'Gönderiliyor…' : 'Fatura E-postası Gönder'}
        </Button>
      </div>

      {/* Cancellation Modal */}
      <CancellationModal
        orderId={orderId}
        isOpen={isCancellationModalOpen}
        onClose={() => setIsCancellationModalOpen(false)}
        onSuccess={() => {
          refetch();
          qc.invalidateQueries({ queryKey: ['order-cancellation', orderId] });
        }}
      />

      <ReturnModal
        orderId={orderId!}
        items={(order.items ?? []) as any}
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onSuccess={() => setReturnVersion((v) => v + 1)}
      />
    </main>
  );
}

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ReactApexChart from '../../lib/react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { api } from '../../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface KPI {
  revenue: number;
  revenueChange: number | null;
  orders: number;
  ordersChange: number | null;
  aov: number;
  activeShippings: number;
}
interface DayPoint    { day: string; revenue: number; count: number }
interface UserDayPoint{ day: string; count: number }
interface CityPoint   { city: string; count: number; revenue: number }
interface CarrierPoint{ carrier: string; total: number; delivered: number; avgDays: number | null }
interface TopProduct  { id: string; name: string; sku: string; qty: number; revenue: number }

interface AnalyticsData {
  kpi: KPI;
  salesByDay: DayPoint[];
  newUsersByDay: UserDayPoint[];
  cityData: CityPoint[];
  carrierData: CarrierPoint[];
  topProducts: TopProduct[];
}

interface OrderRow {
  id: string;
  createdAt: string;
  status: string;
  total: number;
  subtotal: number;
  shippingFee: number;
  user: { email: string; profile?: { firstName?: string; lastName?: string } | null };
  items: { quantity: number; unitPrice: number }[];
  address: { city: string; district: string };
  payment?: { status: string } | null;
  shipping?: { carrier?: string | null; trackingNumber?: string | null } | null;
}

interface ListData {
  orders: OrderRow[];
  total: number;
  page: number;
  totalPages: number;
}

interface FilterOption { id: string; name: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

function pct(n: number | null) {
  if (n === null) return null;
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function customerName(o: OrderRow) {
  return o.user.profile?.firstName
    ? `${o.user.profile.firstName} ${o.user.profile.lastName ?? ''}`.trim()
    : o.user.email;
}

function totalItems(o: OrderRow) {
  return o.items.reduce((s, i) => s + i.quantity, 0);
}

/** Convert a RANGES key to startDate ISO string */
function rangeToStartDate(range: string): string {
  const now = new Date();
  switch (range) {
    case 'today':  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    case '7d':     return new Date(now.getTime() - 7  * 86400000).toISOString();
    case 'month':  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    case '90d':    return new Date(now.getTime() - 90 * 86400000).toISOString();
    default:       return new Date(now.getTime() - 30 * 86400000).toISOString();
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGES = [
  { key: 'today', label: 'Bugün' },
  { key: '7d',   label: 'Son 7 Gün' },
  { key: '30d',  label: 'Son 30 Gün' },
  { key: 'month',label: 'Bu Ay' },
  { key: '90d',  label: 'Son 90 Gün' },
];

const STATUSES = ['', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Bekliyor',     color: 'bg-yellow-100 text-yellow-800' },
  PROCESSING: { label: 'Hazırlanıyor', color: 'bg-blue-100 text-blue-800' },
  SHIPPED:    { label: 'Kargoda',      color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED:  { label: 'Teslim',       color: 'bg-green-100 text-green-800' },
  CANCELLED:  { label: 'İptal',        color: 'bg-red-100 text-red-800' },
  REFUNDED:   { label: 'İade',         color: 'bg-gray-100 text-gray-600' },
};
const PAYMENT_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'Bekliyor',  color: 'bg-yellow-100 text-yellow-800' },
  SUCCESS:  { label: 'Ödendi',    color: 'bg-green-100 text-green-800' },
  FAILED:   { label: 'Başarısız', color: 'bg-red-100 text-red-800' },
  REFUNDED: { label: 'İade',      color: 'bg-gray-100 text-gray-600' },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function KPICard({
  title, value, change, sub, icon,
}: {
  title: string; value: string; change?: number | null; sub?: string; icon: React.ReactNode;
}) {
  const changeLabel = pct(change ?? null);
  const isUp = (change ?? 0) >= 0;
  return (
    <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
          {icon}
        </div>
        {changeLabel && (
          <span className={`flex items-center gap-1 text-sm font-medium ${isUp ? 'text-meta-3' : 'text-meta-1'}`}>
            {isUp ? (
              <svg width="10" height="11" viewBox="0 0 10 11" fill="none">
                <path d="M4.35716 2.47737L0.908974 5.82987L5.0443e-07 4.94612L5 0.0848689L10 4.94612L9.09103 5.82987L5.64284 2.47737L5.64284 10.0849L4.35716 10.0849L4.35716 2.47737Z" fill="currentColor"/>
              </svg>
            ) : (
              <svg width="10" height="11" viewBox="0 0 10 11" fill="none">
                <path d="M5.64284 7.69237L9.09102 4.33987L10 5.22362L5 10.0849L0 5.22362L0.908973 4.33987L4.35716 7.69237L4.35716 0.0848689L5.64284 0.0848689L5.64284 7.69237Z" fill="currentColor"/>
              </svg>
            )}
            {changeLabel}
          </span>
        )}
      </div>
      <div className="mt-4">
        <h4 className="text-2xl font-bold text-black dark:text-white">{value}</h4>
        <span className="text-sm font-medium text-black dark:text-white">{title}</span>
        {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="px-5 py-4 border-b border-stroke dark:border-strokedark">
        <h3 className="text-base font-semibold text-black dark:text-white">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Chart Configs ────────────────────────────────────────────────────────────

function buildSalesChartOptions(labels: string[]): ApexOptions {
  return {
    chart: { type: 'line', height: 300, toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { width: [2, 0], curve: 'smooth' },
    fill: {
      type: ['gradient', 'solid'],
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.02, stops: [0, 100] },
    },
    dataLabels: { enabled: false },
    xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { rotate: -30, style: { fontSize: '11px' } } },
    yaxis: [
      { labels: { formatter: (v) => fmt(v) }, title: { text: 'Ciro', style: { fontSize: '11px', fontWeight: 400 } } },
      { opposite: true, labels: { formatter: (v) => String(Math.round(v)) }, title: { text: 'Sipariş', style: { fontSize: '11px', fontWeight: 400 } } },
    ],
    legend: { position: 'top', horizontalAlign: 'left' },
    colors: ['#3C50E0', '#80CAEE'],
    grid: { borderColor: '#e7e7e7', strokeDashArray: 4 },
    tooltip: { y: [{ formatter: (v) => fmt(v) }, { formatter: (v) => String(Math.round(v)) + ' sipariş' }] },
  };
}

function buildUsersChartOptions(labels: string[]): ApexOptions {
  return {
    chart: { type: 'bar', height: 300, toolbar: { show: false } },
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '55%' } },
    xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { rotate: -30, style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (v) => String(Math.round(v)) } },
    colors: ['#10B981'],
    grid: { borderColor: '#e7e7e7', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => String(Math.round(v)) + ' kullanıcı' } },
  };
}

function buildCityDonutOptions(labels: string[]): ApexOptions {
  return {
    chart: { type: 'donut', height: 280 },
    labels,
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: false },
    colors: ['#3C50E0', '#80CAEE', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'],
    plotOptions: { pie: { donut: { size: '65%', labels: { show: false } } } },
    tooltip: { y: { formatter: (v) => String(Math.round(v)) + ' sipariş' } },
  };
}

function buildCarrierChartOptions(labels: string[]): ApexOptions {
  return {
    chart: { type: 'bar', height: 280, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: labels, labels: { style: { fontSize: '12px' } } },
    colors: ['#3C50E0', '#80CAEE'],
    legend: { position: 'top' },
    grid: { borderColor: '#e7e7e7', strokeDashArray: 4 },
    tooltip: {
      y: [
        { formatter: (v) => String(Math.round(v)) + ' kargo' },
        { formatter: (v) => String(Math.round(v)) + ' teslim' },
      ],
    },
  };
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCSV(rows: OrderRow[], rangeLabel: string) {
  const headers = [
    'Sipariş No', 'Tarih', 'Müşteri', 'E-posta',
    'Ürün Adedi', 'Tutar (TL)', 'Sipariş Durumu',
    'Ödeme Durumu', 'Şehir', 'Kargo Firması', 'Takip No',
  ];
  const escape = (v: string | number) =>
    `"${String(v).replace(/"/g, '""')}"`;

  const csvRows = rows.map((o) => [
    '#' + o.id.slice(-8).toUpperCase(),
    new Date(o.createdAt).toLocaleDateString('tr-TR'),
    customerName(o),
    o.user.email,
    totalItems(o),
    Number(o.total).toFixed(2),
    STATUS_LABEL[o.status]?.label ?? o.status,
    o.payment ? (PAYMENT_LABEL[o.payment.status]?.label ?? o.payment.status) : '',
    o.address.city,
    o.shipping?.carrier ?? '',
    o.shipping?.trackingNumber ?? '',
  ].map(escape).join(','));

  const content = '﻿' + [headers.map(escape).join(','), ...csvRows].join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `siparisler_${rangeLabel}_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── List Tab ─────────────────────────────────────────────────────────────────

function ListTab({ range }: { range: string }) {
  const [listData, setListData] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const buildParams = useCallback((overrides?: Record<string, string>) => {
    const p = new URLSearchParams({ page: String(page), limit: '25' });
    if (statusFilter) p.set('status', statusFilter);
    if (search) p.set('search', search);
    p.set('startDate', rangeToStartDate(range));
    if (overrides) Object.entries(overrides).forEach(([k, v]) => p.set(k, v));
    return p;
  }, [page, statusFilter, search, range]);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ success: boolean; data: ListData }>(`/admin/orders?${buildParams()}`)
      .then((r) => setListData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [buildParams]);

  // Reset to page 1 when range/filter changes (except page itself)
  useEffect(() => { setPage(1); }, [range, statusFilter, search]);

  async function handleExcelExport() {
    setExporting(true);
    try {
      const params = buildParams({ all: 'true' });
      const r = await api.get<{ success: boolean; data: ListData }>(`/admin/orders?${params}`);
      exportCSV(r.data.orders, RANGES.find((x) => x.key === range)?.label ?? range);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export hatası');
    } finally {
      setExporting(false);
    }
  }

  function handlePdfExport() {
    window.print();
  }

  const rangeLabel = RANGES.find((x) => x.key === range)?.label ?? range;

  return (
    <div>
      {/* Filter + Export bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 print-hide">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark dark:text-white"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s ? STATUS_LABEL[s]?.label : 'Tüm Durumlar'}</option>
          ))}
        </select>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
          placeholder="Sipariş ID veya e-posta..."
          className="rounded border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark dark:text-white w-56"
        />
        <button
          onClick={() => setSearch(searchInput)}
          className="rounded bg-primary px-4 py-2 text-sm text-white hover:bg-opacity-90"
        >
          Ara
        </button>
        {(statusFilter || search) && (
          <button
            onClick={() => { setStatusFilter(''); setSearch(''); setSearchInput(''); }}
            className="rounded border border-stroke px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-meta-4"
          >
            Temizle
          </button>
        )}

        <div className="ml-auto flex gap-2">
          <button
            onClick={handleExcelExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded border border-stroke bg-white px-3.5 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4 disabled:opacity-50 transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12l2.5 3L14 9"/>
            </svg>
            {exporting ? 'Hazırlanıyor...' : 'Excel İndir'}
          </button>
          <button
            onClick={handlePdfExport}
            className="inline-flex items-center gap-1.5 rounded border border-stroke bg-white px-3.5 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4 transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            PDF Yazdır
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        ref={printRef}
        id="analytics-list-print"
        className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark"
      >
        {/* Print header (only visible on print) */}
        <div className="print-only px-4 pt-4 pb-2">
          <h2 className="text-xl font-bold">Sipariş Listesi — {rangeLabel}</h2>
          <p className="text-sm text-gray-500">
            Oluşturulma: {new Date().toLocaleString('tr-TR')}
            {statusFilter ? ` · Durum: ${STATUS_LABEL[statusFilter]?.label}` : ''}
            {search ? ` · Arama: "${search}"` : ''}
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark bg-gray-2 dark:bg-meta-4">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">Sipariş No</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">Tarih</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Müşteri</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Ürün</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Tutar</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Durum</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Ödeme</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Şehir</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Kargo</th>
                  <th className="px-4 py-3 print-hide" />
                </tr>
              </thead>
              <tbody>
                {listData?.orders.map((o) => {
                  const st  = STATUS_LABEL[o.status]  ?? { label: o.status,           color: 'bg-gray-100 text-gray-600' };
                  const pay = o.payment ? (PAYMENT_LABEL[o.payment.status] ?? { label: o.payment.status, color: 'bg-gray-100 text-gray-600' }) : null;
                  return (
                    <tr key={o.id} className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/30">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                        #{o.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(o.createdAt).toLocaleDateString('tr-TR')}
                        <div className="text-gray-400">
                          {new Date(o.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-black dark:text-white max-w-[150px] truncate">{customerName(o)}</div>
                        <div className="text-xs text-gray-500 max-w-[150px] truncate">{o.user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{totalItems(o)}</td>
                      <td className="px-4 py-3 text-right font-medium text-black dark:text-white whitespace-nowrap">
                        {fmt(o.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {pay ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${pay.color}`}>
                            {pay.label}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{o.address.city}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {o.shipping?.carrier ? (
                          <div>
                            <div className="font-medium text-black dark:text-white">{o.shipping.carrier}</div>
                            {o.shipping.trackingNumber && (
                              <div className="font-mono text-gray-400">{o.shipping.trackingNumber}</div>
                            )}
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 print-hide">
                        <Link
                          to={`/orders/${o.id}`}
                          className="px-3 py-1 rounded bg-primary/10 text-primary text-xs hover:bg-primary/20 transition whitespace-nowrap"
                        >
                          Detay
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {listData?.orders.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-400">Sipariş bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {listData && listData.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-stroke dark:border-strokedark print-hide">
            <span className="text-sm text-gray-500">{listData.total} kayıt</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-stroke text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Önceki
              </button>
              <span className="px-3 py-1 text-sm">{page} / {listData.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(listData.totalPages, p + 1))}
                disabled={page === listData.totalPages}
                className="px-3 py-1 rounded border border-stroke text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
        {listData && (
          <div className="print-only px-4 py-2 text-xs text-gray-500 border-t border-stroke">
            Toplam {listData.total} kayıt · Sayfa {page} / {listData.totalPages || 1}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Charts Tab ───────────────────────────────────────────────────────────────

function ChartsTab({ range, categories }: { range: string; categories: FilterOption[] }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ range });
    api
      .get<{ success: boolean; data: AnalyticsData }>(`/admin/analytics?${params}`)
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!data) return <p className="text-center text-gray-400 py-20">Veriler yüklenemedi.</p>;

  const dayLabels      = data.salesByDay.map((d) => new Date(d.day).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
  const userDayLabels  = data.newUsersByDay.map((d) => new Date(d.day).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
  const salesSeries    = [
    { name: 'Ciro', type: 'area', data: data.salesByDay.map((d) => d.revenue) },
    { name: 'Sipariş', type: 'bar', data: data.salesByDay.map((d) => d.count) },
  ];
  const usersSeries    = [{ name: 'Yeni Kullanıcı', data: data.newUsersByDay.map((d) => d.count) }];
  const cityLabels     = data.cityData.map((c) => c.city);
  const cityValues     = data.cityData.map((c) => c.count);
  const carrierLabels  = data.carrierData.map((c) => c.carrier);
  const carrierSeries  = [
    { name: 'Toplam', data: data.carrierData.map((c) => c.total) },
    { name: 'Teslim', data: data.carrierData.map((c) => c.delivered) },
  ];

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <KPICard
          title="Toplam Ciro" value={fmt(data.kpi.revenue)}
          change={data.kpi.revenueChange} sub="Önceki döneme göre"
          icon={<svg className="fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" fill="currentColor"/></svg>}
        />
        <KPICard
          title="Toplam Sipariş" value={String(data.kpi.orders)}
          change={data.kpi.ordersChange} sub="Önceki döneme göre"
          icon={<svg className="fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor"/></svg>}
        />
        <KPICard
          title="Ortalama Sepet Tutarı" value={fmt(data.kpi.aov)}
          sub="AOV (sipariş başına)"
          icon={<svg className="fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.17 14.75L7.2 14.6l.9-1.6H17c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0021.46 4H5.21L4.27 2H1v2h2l3.6 7.59L5.25 14c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.13 0-.25-.11-.25-.21z" fill="currentColor"/></svg>}
        />
        <KPICard
          title="Aktif Kargo" value={String(data.kpi.activeShippings)}
          sub="Hazırlanıyor + Yolda"
          icon={<svg className="fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 24 24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor"/></svg>}
        />
      </div>

      {/* Sales + City */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-4">
        <div className="xl:col-span-2">
          <Card title="Satış Trendi — Ciro & Sipariş Adedi">
            {data.salesByDay.length > 0 ? (
              <ReactApexChart options={buildSalesChartOptions(dayLabels)} series={salesSeries} type="line" height={300} />
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Bu dönemde veri yok.</div>
            )}
          </Card>
        </div>
        <div>
          <Card title="En Çok Sipariş Veren Şehirler">
            {cityValues.length > 0 ? (
              <>
                <ReactApexChart options={buildCityDonutOptions(cityLabels)} series={cityValues} type="donut" height={280} />
                <div className="mt-2 space-y-1.5">
                  {data.cityData.slice(0, 5).map((c) => (
                    <div key={c.city} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{c.city}</span>
                      <span className="font-medium text-black dark:text-white">{c.count} sipariş</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Veri yok.</div>
            )}
          </Card>
        </div>
      </div>

      {/* Users + Carrier + Top products */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-4">
        <div>
          <Card title="Yeni Kayıt Olan Kullanıcılar">
            {data.newUsersByDay.length > 0 ? (
              <ReactApexChart options={buildUsersChartOptions(userDayLabels)} series={usersSeries} type="bar" height={280} />
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Veri yok.</div>
            )}
          </Card>
        </div>
        <div>
          <Card title="Kargo Firması Performansı">
            {data.carrierData.length > 0 ? (
              <>
                <ReactApexChart options={buildCarrierChartOptions(carrierLabels)} series={carrierSeries} type="bar" height={200} />
                <table className="w-full text-xs mt-2">
                  <thead>
                    <tr className="text-gray-500 border-b border-stroke dark:border-strokedark">
                      <th className="pb-1.5 text-left font-medium">Firma</th>
                      <th className="pb-1.5 text-right font-medium">Toplam</th>
                      <th className="pb-1.5 text-right font-medium">Teslim</th>
                      <th className="pb-1.5 text-right font-medium">Ort. Gün</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.carrierData.map((c) => {
                      const rate = c.total > 0 ? Math.round((c.delivered / c.total) * 100) : 0;
                      return (
                        <tr key={c.carrier} className="border-b border-stroke dark:border-strokedark">
                          <td className="py-2 font-medium text-black dark:text-white truncate max-w-[90px]">{c.carrier}</td>
                          <td className="py-2 text-right text-gray-600">{c.total}</td>
                          <td className="py-2 text-right">
                            <span className={`font-medium ${rate >= 80 ? 'text-meta-3' : rate >= 50 ? 'text-yellow-600' : 'text-meta-1'}`}>
                              {c.delivered} ({rate}%)
                            </span>
                          </td>
                          <td className="py-2 text-right text-gray-600">{c.avgDays !== null ? c.avgDays.toFixed(1) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Bu dönemde kargo verisi yok.</div>
            )}
          </Card>
        </div>
        <div>
          <Card title="En Çok Satan Ürünler">
            {data.topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-stroke dark:border-strokedark">
                      <th className="pb-2 text-left font-medium">Ürün</th>
                      <th className="pb-2 text-right font-medium">Adet</th>
                      <th className="pb-2 text-right font-medium">Gelir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p, i) => (
                      <tr key={p.id + p.sku} className="border-b border-stroke dark:border-strokedark last:border-0">
                        <td className="py-2">
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 dark:bg-meta-4 flex items-center justify-center text-gray-500 text-[10px] font-bold">{i + 1}</span>
                            <div>
                              <p className="font-medium text-black dark:text-white leading-tight truncate max-w-[140px]">{p.name}</p>
                              <p className="text-gray-400 font-mono">{p.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 text-right font-medium text-black dark:text-white">{p.qty}</td>
                        <td className="py-2 text-right font-medium text-meta-3">{fmt(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Veri yok.</div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<'charts' | 'list'>('charts');
  const [range, setRange] = useState('30d');
  const [categories, setCategories] = useState<FilterOption[]>([]);

  useEffect(() => {
    api
      .get<{ success: boolean; data: FilterOption[] }>('/admin/categories')
      .then((r) => setCategories(r.data ?? []))
      .catch(console.error);
  }, []);

  return (
    <div>
      {/* ── Page header ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print-hide">
        <div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            Satış & Kargo Raporları
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Satış, kullanıcı ve lojistik performans analizi</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-5 border-b border-stroke dark:border-strokedark print-hide">
        <nav className="-mb-px flex gap-0">
          {([['charts', 'Grafikler'], ['list', 'Liste Görünümü']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Shared range filter ── */}
      <div className="mb-5 flex flex-wrap items-center gap-2 print-hide">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              range === r.key
                ? 'bg-primary text-white shadow-sm'
                : 'border border-stroke bg-white text-black hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'charts' ? (
        <ChartsTab range={range} categories={categories} />
      ) : (
        <ListTab range={range} />
      )}

      {/* ── Global print styles ── */}
      <style>{`
        .print-only { display: none; }

        @media print {
          /* Hide the entire page */
          body * { visibility: hidden; }

          /* Reveal only the list table */
          #analytics-list-print,
          #analytics-list-print * { visibility: visible; }

          /* Reveal the print-only header that sits just above the table */
          .print-only,
          .print-only * { display: block !important; visibility: visible !important; }

          /* Anchor table to the top-left */
          #analytics-list-print {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            box-shadow: none;
            border: none;
          }

          /* Strip action columns and interactive badges */
          .print-hide { display: none !important; }

          /* Cleaner table for paper */
          table { font-size: 11px; }
        }
      `}</style>
    </div>
  );
}

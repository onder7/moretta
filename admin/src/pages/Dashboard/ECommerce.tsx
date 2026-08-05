import React, { useEffect, useState } from 'react';
import CardDataStats from '../../components/CardDataStats';
import { api } from '../../lib/api';
import ReactApexChart from '../../lib/react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface Stats {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  monthRevenue: number;
  totalCustomers: number;
  newCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  recentOrders: RecentOrder[];
  salesByDay: { day: string; revenue: number; count: number }[];
}

interface RecentOrder {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  user: { email: string; profile?: { firstName?: string; lastName?: string } };
  items: { quantity: number; unitPrice: number }[];
}

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Bekliyor',    color: 'bg-yellow-100 text-yellow-800' },
  PROCESSING: { label: 'Hazırlanıyor', color: 'bg-blue-100 text-blue-800' },
  SHIPPED:    { label: 'Kargoda',     color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED:  { label: 'Teslim',      color: 'bg-green-100 text-green-800' },
  CANCELLED:  { label: 'İptal',       color: 'bg-red-100 text-red-800' },
  REFUNDED:   { label: 'İade',        color: 'bg-gray-100 text-gray-800' },
};

const ECommerce: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; data: Stats }>('/admin/stats')
      .then((r) => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const chartOptions: ApexOptions = {
    chart: { type: 'area', height: 280, toolbar: { show: false }, zoom: { enabled: false } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      categories: stats?.salesByDay.map((d) =>
        new Date(d.day).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
      ) ?? [],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (v) => fmt(v) } },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05 } },
    tooltip: { y: { formatter: (v) => fmt(v) } },
    colors: ['#3C50E0'],
    grid: { borderColor: '#e7e7e7', strokeDashArray: 4 },
  };

  const chartSeries = [
    { name: 'Gelir', data: stats?.salesByDay.map((d) => d.revenue) ?? [] },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) return <p className="text-center text-gray-500 py-20">Veriler yüklenemedi.</p>;

  return (
    <>
      {/* KPI Kartları */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <CardDataStats
          title="Toplam Gelir"
          total={fmt(stats.totalRevenue)}
          rate={fmt(stats.monthRevenue) + ' (30g)'}
          levelUp
        >
          <svg className="fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-4H9l3-3 3 3h-2v4z" fill="currentColor"/>
          </svg>
        </CardDataStats>

        <CardDataStats
          title="Toplam Sipariş"
          total={String(stats.totalOrders)}
          rate={`Bugün: ${stats.todayOrders}`}
          levelUp
        >
          <svg className="fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" fill="currentColor"/>
          </svg>
        </CardDataStats>

        <CardDataStats
          title="Müşteriler"
          total={String(stats.totalCustomers)}
          rate={`Yeni: ${stats.newCustomers}`}
          levelUp
        >
          <svg className="fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/>
          </svg>
        </CardDataStats>

        <CardDataStats
          title="Bekleyen Sipariş"
          total={String(stats.pendingOrders)}
          rate={`Toplam ürün: ${stats.totalProducts}`}
          levelDown={stats.pendingOrders > 10}
          levelUp={stats.pendingOrders === 0}
        >
          <svg className="fill-primary dark:fill-white" width="20" height="20" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/>
          </svg>
        </CardDataStats>
      </div>

      {/* Grafik */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6 p-6">
        <h3 className="text-xl font-semibold text-black dark:text-white mb-4">Son 30 Gün Satışları</h3>
        {stats.salesByDay.length > 0 ? (
          <ReactApexChart options={chartOptions} series={chartSeries} type="area" height={280} />
        ) : (
          <p className="text-center text-gray-400 py-10">Henüz satış verisi yok.</p>
        )}
      </div>

      {/* Son Siparişler */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
        <h3 className="text-xl font-semibold text-black dark:text-white mb-4">Son Siparişler</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stroke dark:border-strokedark">
                <th className="pb-3 text-left font-medium text-gray-500">Sipariş No</th>
                <th className="pb-3 text-left font-medium text-gray-500">Müşteri</th>
                <th className="pb-3 text-left font-medium text-gray-500">Tutar</th>
                <th className="pb-3 text-left font-medium text-gray-500">Durum</th>
                <th className="pb-3 text-left font-medium text-gray-500">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order) => {
                const status = STATUS_LABEL[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-800' };
                const name = order.user.profile?.firstName
                  ? `${order.user.profile.firstName} ${order.user.profile.lastName ?? ''}`.trim()
                  : order.user.email;
                return (
                  <tr key={order.id} className="border-b border-stroke dark:border-strokedark">
                    <td className="py-3 font-mono text-xs text-gray-600">#{order.id.slice(-8).toUpperCase()}</td>
                    <td className="py-3">{name}</td>
                    <td className="py-3 font-medium">{fmt(order.total)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ECommerce;

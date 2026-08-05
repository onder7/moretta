import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/services/api';
import { ProductGrid } from '@/components/product/ProductGrid';
import { SeoHead } from '@/components/seo/SeoHead';
import { Zap, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  discountText: string;
  discountAmount?: number;
  color: string;
  displayType: string;
  imageUrl?: string;
  ctaLink?: string;
  endDate: string;
  products: Array<{
    product: {
      id: string;
      name: string;
      slug: string;
      variants: Array<{ price: number; stockQty: number }>;
      images: Array<{ url: string; isPrimary: boolean }>;
    };
  }>;
}

const COLOR_STYLES: Record<string, { bg: string; gradient: string }> = {
  primary: { bg: 'bg-indigo-600', gradient: 'from-indigo-600 to-indigo-700' },
  red: { bg: 'bg-red-600', gradient: 'from-red-600 to-red-700' },
  orange: { bg: 'bg-orange-500', gradient: 'from-orange-500 to-orange-600' },
  purple: { bg: 'bg-violet-600', gradient: 'from-violet-600 to-violet-700' },
  green: { bg: 'bg-green-600', gradient: 'from-green-600 to-green-700' },
  navy: { bg: 'bg-blue-800', gradient: 'from-blue-800 to-blue-900' },
};

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchCampaign = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/campaigns/${id}`);
        const data = res.data?.data || res.data;
        setCampaign(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Kampanya yüklenemedi');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-cream-50/50 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
      </main>
    );
  }

  if (error || !campaign) {
    return (
      <main className="min-h-screen bg-cream-50/50 py-12">
        <div className="container mx-auto px-4">
          <Link to="/" className="flex items-center gap-2 text-primary mb-6 hover:underline">
            <ArrowLeft size={18} /> Ana sayfaya dön
          </Link>
          <div className="rounded-lg border border-stroke bg-white p-6 text-center dark:border-strokedark dark:bg-boxdark">
            <p className="text-espresso-400">{error || 'Kampanya bulunamadı'}</p>
          </div>
        </div>
      </main>
    );
  }

  const colors = COLOR_STYLES[campaign.color] || COLOR_STYLES.primary;
  const products = campaign.products.map((cp) => cp.product).filter(Boolean);
  const daysLeft = Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <main className="min-h-screen bg-cream-50/50 pb-16">
      <SeoHead
        title={campaign.name}
        description={campaign.description || `${campaign.discountText} kampanyası`}
      />

      <div className="container mx-auto px-4 py-8">
        <Link to="/" className="flex items-center gap-2 text-primary mb-6 hover:underline">
          <ArrowLeft size={18} /> Ana sayfaya dön
        </Link>

        {/* Banner */}
        <div
          className={`bg-gradient-to-r ${colors.gradient} text-white p-8 sm:p-12 rounded-lg mb-12 relative overflow-hidden`}
          style={campaign.imageUrl ? { backgroundImage: `url(${campaign.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
          {campaign.imageUrl && <div className="absolute inset-0 bg-black/40" />}

          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white rounded-full" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={24} />
              <h1 className="text-4xl sm:text-5xl font-black uppercase">{campaign.name}</h1>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{campaign.discountText}</h2>
            {campaign.description && (
              <p className="text-lg opacity-90 mb-6">{campaign.description}</p>
            )}

            <div className="flex flex-wrap gap-4 items-center">
              {daysLeft > 0 && (
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <p className="text-sm opacity-90">Kalan zaman: {daysLeft} gün</p>
                </div>
              )}
              {campaign.ctaLink && (
                <a
                  href={campaign.ctaLink}
                  className="inline-block px-6 py-3 bg-white/20 hover:bg-white/30 border border-white/40 rounded text-base font-bold transition-colors"
                >
                  Ürünleri Gör
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Products */}
        <div>
          <h2 className="text-2xl font-bold text-espresso-700 mb-6">
            Kampanya Ürünleri ({products.length})
          </h2>

          {products.length > 0 ? (
            <ProductGrid products={products as any} loading={false} cols={4} />
          ) : (
            <div className="rounded-lg border border-stroke bg-white p-6 text-center dark:border-strokedark dark:bg-boxdark">
              <p className="text-espresso-400">Bu kampanyada ürün bulunmamaktadır.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

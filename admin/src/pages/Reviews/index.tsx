import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { BsStarFill, BsCheckLg, BsXLg, BsTrash } from 'react-icons/bs';

interface Review {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  isApproved: boolean;
  createdAt: string;
  product: { id: string; name: string; slug: string };
  user: {
    id: string;
    email: string;
    profile?: { firstName?: string; lastName?: string } | null;
  };
}

type Filter = 'pending' | 'approved' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'pending', label: 'Onay Bekleyenler' },
  { key: 'approved', label: 'Onaylananlar' },
  { key: 'all', label: 'Tümü' },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-yellow-400">
      {[1, 2, 3, 4, 5].map((s) => (
        <BsStarFill key={s} className={s <= rating ? 'text-yellow-400' : 'text-gray-300'} size={14} />
      ))}
    </span>
  );
}

export default function Reviews() {
  const [filter, setFilter] = useState<Filter>('pending');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Review[] }>(`/admin/reviews?status=${filter}`);
      setReviews(res.data || []);
    } catch (err: any) {
      alert(err.message || 'Değerlendirmeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await api.put(`/admin/reviews/${id}/approve`, {});
      await load();
    } catch (err: any) {
      alert(err.message || 'Onaylanamadı');
    } finally {
      setBusyId(null);
    }
  }

  async function unapprove(id: string) {
    setBusyId(id);
    try {
      await api.put(`/admin/reviews/${id}/unapprove`, {});
      await load();
    } catch (err: any) {
      alert(err.message || 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Bu değerlendirmeyi kalıcı olarak silmek istediğinize emin misiniz?')) return;
    setBusyId(id);
    try {
      await api.delete(`/admin/reviews/${id}`);
      await load();
    } catch (err: any) {
      alert(err.message || 'Silinemedi');
    } finally {
      setBusyId(null);
    }
  }

  const fullName = (u: Review['user']) =>
    [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(' ') || u.email;

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-title-md2 font-semibold text-black dark:text-white">Değerlendirmeler</h2>
      </div>

      {/* Filtre sekmeleri */}
      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-meta-4 dark:text-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {filter === 'pending' ? 'Onay bekleyen değerlendirme yok.' : 'Değerlendirme bulunamadı.'}
          </div>
        ) : (
          <div className="divide-y divide-stroke dark:divide-strokedark">
            {reviews.map((r) => (
              <div key={r.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Stars rating={r.rating} />
                    <span className="font-medium text-black dark:text-white">{r.product.name}</span>
                    {r.isApproved ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Onaylı
                      </span>
                    ) : (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        Onay Bekliyor
                      </span>
                    )}
                  </div>
                  {r.title && <p className="font-medium text-black dark:text-white">{r.title}</p>}
                  {r.body && <p className="text-sm text-gray-600 dark:text-gray-300">{r.body}</p>}
                  <p className="mt-1 text-xs text-gray-400">
                    {fullName(r.user)} · {new Date(r.createdAt).toLocaleDateString('tr-TR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {!r.isApproved ? (
                    <button
                      onClick={() => approve(r.id)}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <BsCheckLg /> Onayla
                    </button>
                  ) : (
                    <button
                      onClick={() => unapprove(r.id)}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1 rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
                    >
                      <BsXLg /> Onayı Kaldır
                    </button>
                  )}
                  <button
                    onClick={() => remove(r.id)}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <BsTrash /> Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

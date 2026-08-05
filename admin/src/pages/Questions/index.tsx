import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { BsCheckLg, BsXLg, BsTrash, BsChatDots, BsReplyFill } from 'react-icons/bs';

interface Answer {
  id: string;
  body: string;
  createdAt: string;
  user: {
    id: string;
    role?: string;
    profile?: { firstName?: string; lastName?: string } | null;
  };
}

interface Question {
  id: string;
  body: string;
  guestName?: string | null;
  isAnswered: boolean;
  isApproved: boolean;
  createdAt: string;
  product: { id: string; name: string; slug: string };
  user?: {
    id: string;
    email: string;
    profile?: { firstName?: string; lastName?: string } | null;
  } | null;
  answers: Answer[];
}

type Filter = 'pending' | 'approved' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'pending', label: 'Onay Bekleyenler' },
  { key: 'approved', label: 'Onaylananlar' },
  { key: 'all', label: 'Tümü' },
];

export default function Questions() {
  const [filter, setFilter] = useState<Filter>('pending');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerBody, setAnswerBody] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Question[] }>(`/admin/questions?status=${filter}`);
      setQuestions(res.data || []);
    } catch (err: any) {
      alert(err.message || 'Sorular yüklenemedi');
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
      await api.put(`/admin/questions/${id}/approve`, {});
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
      await api.put(`/admin/questions/${id}/unapprove`, {});
      await load();
    } catch (err: any) {
      alert(err.message || 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Bu soruyu kalıcı olarak silmek istediğinize emin misiniz?')) return;
    setBusyId(id);
    try {
      await api.delete(`/admin/questions/${id}`);
      await load();
    } catch (err: any) {
      alert(err.message || 'Silinemedi');
    } finally {
      setBusyId(null);
    }
  }

  async function submitAnswer(questionId: string) {
    if (!answerBody.trim()) return;
    setBusyId(questionId);
    try {
      await api.post(`/admin/questions/${questionId}/answer`, { body: answerBody });
      setAnsweringId(null);
      setAnswerBody('');
      await load();
    } catch (err: any) {
      alert(err.message || 'Cevap gönderilemedi');
    } finally {
      setBusyId(null);
    }
  }

  const fullName = (u: Question['user']) => {
    if (!u) return 'Misafir';
    return [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(' ') || u.email;
  };

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-title-md2 font-semibold text-black dark:text-white">Soru & Cevap</h2>
      </div>

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
        ) : questions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {filter === 'pending' ? 'Onay bekleyen soru yok.' : 'Soru bulunamadı.'}
          </div>
        ) : (
          <div className="divide-y divide-stroke dark:divide-strokedark">
            {questions.map((q) => (
              <div key={q.id} className="p-4 space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <BsChatDots className="text-blue-500" size={16} />
                      <span className="font-medium text-black dark:text-white">{q.product.name}</span>
                      {q.isApproved ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Onaylı
                        </span>
                      ) : (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                          Onay Bekliyor
                        </span>
                      )}
                      {q.isAnswered && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                          Cevaplandı
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{q.body}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {q.guestName || fullName(q.user)} · {new Date(q.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!q.isApproved ? (
                      <button
                        onClick={() => approve(q.id)}
                        disabled={busyId === q.id}
                        className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <BsCheckLg /> Onayla
                      </button>
                    ) : (
                      <button
                        onClick={() => unapprove(q.id)}
                        disabled={busyId === q.id}
                        className="inline-flex items-center gap-1 rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
                      >
                        <BsXLg /> Onayı Kaldır
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setAnsweringId(answeringId === q.id ? null : q.id);
                        setAnswerBody('');
                      }}
                      disabled={busyId === q.id}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <BsReplyFill /> Cevapla
                    </button>
                    <button
                      onClick={() => remove(q.id)}
                      disabled={busyId === q.id}
                      className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <BsTrash /> Sil
                    </button>
                  </div>
                </div>

                {/* Mevcut cevaplar */}
                {q.answers.length > 0 && (
                  <div className="ml-6 space-y-2 border-l-2 border-blue-200 pl-4">
                    {q.answers.map((ans) => {
                      const aName = ans.user.profile?.firstName
                        ? `${ans.user.profile.firstName} ${ans.user.profile.lastName ?? ''}`.trim()
                        : 'Ekip';
                      return (
                        <div key={ans.id} className="text-sm">
                          <span className="font-medium text-blue-700 dark:text-blue-400">
                            {ans.user.role === 'ADMIN' ? '✓ Satıcı' : aName}:
                          </span>{' '}
                          <span className="text-gray-700 dark:text-gray-300">{ans.body}</span>
                          <span className="ml-2 text-xs text-gray-400">
                            {new Date(ans.createdAt).toLocaleDateString('tr-TR', {
                              day: 'numeric', month: 'long', year: 'numeric',
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Cevap formu */}
                {answeringId === q.id && (
                  <div className="ml-6 flex gap-2">
                    <textarea
                      rows={2}
                      className="flex-1 rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-strokedark focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      placeholder="Cevabınızı yazın..."
                      value={answerBody}
                      onChange={(e) => setAnswerBody(e.target.value)}
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => submitAnswer(q.id)}
                        disabled={!answerBody.trim() || busyId === q.id}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Gönder
                      </button>
                      <button
                        onClick={() => { setAnsweringId(null); setAnswerBody(''); }}
                        className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300 dark:bg-meta-4 dark:text-gray-300"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

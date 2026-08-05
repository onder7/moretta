import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { qaApi, type ProductQuestion } from '@/services/qaApi';
import { useAuthStore } from '@/store/authStore';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Props {
  productId: string;
}

function QuestionCard({
  question,
  productId,
  isAdmin,
}: {
  question: ProductQuestion;
  productId: string;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { name: storeName } = useStoreInfo();
  const [expanded, setExpanded] = useState(false);
  const [answerBody, setAnswerBody] = useState('');

  const name =
    question.user?.profile?.firstName
      ? `${question.user.profile.firstName} ${question.user.profile.lastName ?? ''}`.trim()
      : question.guestName ?? 'Anonim';

  const date = new Date(question.createdAt).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const answerMut = useMutation({
    mutationFn: () => qaApi.addAnswer(productId, question.id, { body: answerBody }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions', productId] });
      toast.success('Cevabınız eklendi');
      setAnswerBody('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Bir hata oluştu');
    },
  });

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Soru başlığı */}
      <button
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <MessageCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{question.body}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {name} · {date}
            {question.isAnswered && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Cevaplandı
              </span>
            )}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        )}
      </button>

      {/* Cevaplar */}
      {expanded && (
        <div className="border-t bg-muted/20 px-4 pb-4 pt-3 space-y-3">
          {question.answers.length === 0 ? (
            <p className="text-xs text-muted-foreground">Henüz cevap yok.</p>
          ) : (
            question.answers.map((ans) => {
              const aName = ans.user.profile?.firstName
                ? `${ans.user.profile.firstName} ${ans.user.profile.lastName ?? ''}`.trim()
                : 'Ekip';
              const aDate = new Date(ans.createdAt).toLocaleDateString('tr-TR', {
                day: 'numeric', month: 'long', year: 'numeric',
              });
              return (
                <div key={ans.id} className="flex gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                    {ans.user.role === 'ADMIN' ? '✓' : aName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">
                      {ans.user.role === 'ADMIN' ? (storeName || 'Satıcı') : aName}
                    </p>
                    <p className="text-sm text-muted-foreground leading-snug">{ans.body}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{aDate}</p>
                  </div>
                </div>
              );
            })
          )}

          {/* Admin cevap formu */}
          {isAuthenticated && isAdmin && (
            <div className="pt-2 space-y-2">
              <textarea
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                placeholder="Cevabınızı yazın..."
                value={answerBody}
                onChange={(e) => setAnswerBody(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => answerMut.mutate()}
                disabled={!answerBody.trim() || answerMut.isPending}
              >
                {answerMut.isPending ? 'Gönderiliyor...' : 'Cevapla'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddQuestionForm({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [body, setBody] = useState('');
  const [guestName, setGuestName] = useState('');
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: () =>
      qaApi.addQuestion(productId, { body, guestName: isAuthenticated ? undefined : guestName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions', productId] });
      toast.success('Sorunuz iletildi! Yönetici onayından sonra yayınlanacaktır.');
      setBody('');
      setGuestName('');
      setOpen(false);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Bir hata oluştu');
    },
  });

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline" className="w-full sm:w-auto">
        <MessageCircle className="h-4 w-4 mr-2" />
        Soru Sor
      </Button>
    );
  }

  return (
    <div className="border rounded-xl p-5 bg-card space-y-4">
      <h4 className="font-semibold text-sm">Soru Sor</h4>
      {!isAuthenticated && (
        <div className="space-y-1">
          <Label htmlFor="qa-guest-name" className="text-sm">Adınız *</Label>
          <Input
            id="qa-guest-name"
            placeholder="Adınız"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
          />
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="qa-body" className="text-sm">Sorunuz *</Label>
        <textarea
          id="qa-body"
          rows={3}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
          placeholder="Ürün hakkında merak ettiğiniz bir şey var mı?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
        <Button
          onClick={() => mut.mutate()}
          disabled={!body.trim() || (!isAuthenticated && !guestName.trim()) || mut.isPending}
        >
          {mut.isPending ? 'Gönderiliyor...' : 'Gönder'}
        </Button>
      </div>
    </div>
  );
}

export function ProductQA({ productId }: Props) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['questions', productId],
    queryFn: () => qaApi.list(productId),
    enabled: !!productId,
  });

  const questions = data?.data?.data ?? [];

  return (
    <div className="space-y-5">
      <AddQuestionForm productId={productId} />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl border animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Henüz soru sorulmamış. İlk soruyu siz sorun!
        </p>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} productId={productId} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}

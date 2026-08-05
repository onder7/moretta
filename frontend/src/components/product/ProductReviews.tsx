import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, ThumbsUp, Trash2 } from 'lucide-react';
import { reviewApi, type Review } from '@/services/reviewApi';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Props {
  productId: string;
}

function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const active = hovered || value;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${sz} transition-colors ${
            s <= active ? 'fill-yellow-400 text-yellow-400' : 'text-espresso-200'
          } ${!readOnly ? 'cursor-pointer hover:scale-110' : ''}`}
          onMouseEnter={() => !readOnly && setHovered(s)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          onClick={() => !readOnly && onChange?.(s)}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review, productId, canDelete }: { review: Review; productId: string; canDelete: boolean }) {
  const qc = useQueryClient();
  const deleteMut = useMutation({
    mutationFn: () => reviewApi.remove(productId, review.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', productId] });
      toast.success('Değerlendirme silindi');
    },
  });

  const name = review.user.profile?.firstName
    ? `${review.user.profile.firstName} ${review.user.profile.lastName ?? ''}`.trim()
    : 'Anonim Kullanıcı';

  const date = new Date(review.createdAt).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="border rounded-xl p-5 space-y-3 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm">{name}</p>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StarRating value={review.rating} readOnly size="sm" />
          {canDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => deleteMut.mutate()}
              disabled={deleteMut.isPending}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {review.title && <p className="font-semibold text-sm">{review.title}</p>}
      {review.body && <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>}
    </div>
  );
}

function AddReviewForm({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: () => reviewApi.add(productId, { rating, title, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', productId] });
      toast.success('Değerlendirmeniz eklendi!');
      setRating(0);
      setTitle('');
      setBody('');
      setOpen(false);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Bir hata oluştu');
    },
  });

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline" className="w-full sm:w-auto">
        <Star className="h-4 w-4 mr-2" />
        Değerlendirme Yaz
      </Button>
    );
  }

  return (
    <div className="border rounded-xl p-6 bg-card space-y-4">
      <h4 className="font-semibold">Değerlendirme Yaz</h4>
      <div className="space-y-1">
        <Label className="text-sm">Puanınız *</Label>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="review-title" className="text-sm">Başlık</Label>
        <Input
          id="review-title"
          placeholder="Değerlendirme başlığı (isteğe bağlı)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="review-body" className="text-sm">Yorumunuz</Label>
        <textarea
          id="review-body"
          rows={4}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring resize-none"
          placeholder="Ürün hakkındaki düşüncelerinizi paylaşın..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
        <Button
          onClick={() => mut.mutate()}
          disabled={rating === 0 || mut.isPending}
        >
          {mut.isPending ? 'Gönderiliyor...' : 'Gönder'}
        </Button>
      </div>
    </div>
  );
}

export function ProductReviews({ productId }: Props) {
  const { isAuthenticated, user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => reviewApi.list(productId),
    enabled: !!productId,
  });

  const reviewsData = data?.data?.data;

  return (
    <div className="space-y-6">
      {/* Özet */}
      {reviewsData && reviewsData.total > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 p-6 rounded-xl bg-muted/40 border">
          {/* Ortalama */}
          <div className="flex flex-col items-center justify-center sm:border-r sm:pr-6 gap-1">
            <span className="text-5xl font-bold">{reviewsData.avgRating.toFixed(1)}</span>
            <StarRating value={Math.round(reviewsData.avgRating)} readOnly size="md" />
            <span className="text-sm text-muted-foreground">{reviewsData.total} değerlendirme</span>
          </div>
          {/* Dağılım */}
          <div className="flex-1 space-y-1.5">
            {reviewsData.distribution.map(({ star, count }) => {
              const pct = reviewsData.total > 0 ? (count / reviewsData.total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right text-muted-foreground">{star}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-5 text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Yorum ekleme formu */}
      {isAuthenticated ? (
        <AddReviewForm productId={productId} />
      ) : (
        <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
          <ThumbsUp className="h-6 w-6 mx-auto mb-2 opacity-40" />
          Değerlendirme yazabilmek için{' '}
          <a href="/giris" className="text-primary font-medium hover:underline">
            giriş yapın
          </a>
        </div>
      )}

      {/* Yorumlar */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl border animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : reviewsData?.reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Henüz değerlendirme yok. İlk değerlendiren siz olun!
        </p>
      ) : (
        <div className="space-y-3">
          {reviewsData?.reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              productId={productId}
              canDelete={isAuthenticated && (user?.id === review.userId || user?.role === 'ADMIN')}
            />
          ))}
        </div>
      )}
    </div>
  );
}

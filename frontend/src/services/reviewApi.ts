import { api } from './api';

export interface ReviewUser {
  id: string;
  profile?: { firstName?: string | null; lastName?: string | null } | null;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  isApproved: boolean;
  createdAt: string;
  user: ReviewUser;
}

export interface ReviewsData {
  reviews: Review[];
  total: number;
  avgRating: number;
  distribution: { star: number; count: number }[];
}

export const reviewApi = {
  list: (productId: string) =>
    api.get<{ success: boolean; data: ReviewsData }>(`/products/${productId}/reviews`),

  add: (productId: string, data: { rating: number; title?: string; body?: string }) =>
    api.post<{ success: boolean; data: Review }>(`/products/${productId}/reviews`, data),

  remove: (productId: string, reviewId: string) =>
    api.delete(`/products/${productId}/reviews/${reviewId}`),
};

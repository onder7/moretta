import { api } from './api';

export interface QAUser {
  id: string;
  role?: string;
  profile?: { firstName?: string | null; lastName?: string | null } | null;
}

export interface ProductAnswer {
  id: string;
  questionId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: QAUser;
}

export interface ProductQuestion {
  id: string;
  productId: string;
  userId?: string | null;
  guestName?: string | null;
  body: string;
  isAnswered: boolean;
  createdAt: string;
  user?: QAUser | null;
  answers: ProductAnswer[];
}

export const qaApi = {
  list: (productId: string) =>
    api.get<{ success: boolean; data: ProductQuestion[] }>(`/products/${productId}/questions`),

  addQuestion: (productId: string, data: { body: string; guestName?: string }) =>
    api.post<{ success: boolean; data: ProductQuestion }>(`/products/${productId}/questions`, data),

  addAnswer: (productId: string, questionId: string, data: { body: string }) =>
    api.post<{ success: boolean; data: ProductAnswer }>(
      `/products/${productId}/questions/${questionId}/answers`,
      data
    ),
};

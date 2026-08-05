import { api } from './api';
import type { User } from '@/types';

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  marketingConsent?: boolean; // e-posta izni
  smsConsent?: boolean;
  acceptTerms?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface GuestLoginPayload {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  marketingConsent?: boolean;
  smsConsent?: boolean;
  acceptTerms?: boolean;
}

export const authApi = {
  // Doğrulama açıkken accessToken yerine verificationRequired döner
  register: (data: RegisterPayload) =>
    api.post<{
      success: boolean;
      message?: string;
      data: {
        accessToken?: string;
        verificationRequired?: boolean;
        email?: string;
        emailSent?: boolean;
      };
    }>('/auth/register', data),

  login: (data: LoginPayload) =>
    api.post<{ success: boolean; data: { accessToken: string; user: User } }>('/auth/login', data),

  guestLogin: (data: GuestLoginPayload) =>
    api.post<{ success: boolean; data: { accessToken: string; user: User } }>('/auth/guest-login', data),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<{ success: boolean; data: User }>('/auth/me'),

  refreshToken: () =>
    api.post<{ success: boolean; data: { accessToken: string } }>('/auth/refresh-token'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),

  setPassword: (newPassword: string) =>
    api.post<{ success: boolean; message?: string }>('/auth/set-password', { newPassword }),

  forgotPassword: (email: string) =>
    api.post<{ success: boolean; message?: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<{ success: boolean; message?: string }>('/auth/reset-password', { token, newPassword }),

  // ─── E-posta doğrulama ─────────────────────────────────────────────────────

  /** Doğrulama zorunlu mu — kayıt/ödeme ekranları buna göre davranır */
  verificationStatus: () =>
    api.get<{ success: boolean; data: { required: boolean } }>('/auth/verification-status'),

  /** Aktivasyon linkindeki token'ı doğrular; başarılı olursa oturum açılır */
  verifyEmail: (token: string) =>
    api.post<{ success: boolean; message?: string; data: { accessToken: string; user: User } }>(
      '/auth/verify-email',
      { token },
    ),

  resendVerification: (email: string) =>
    api.post<{ success: boolean; message?: string }>('/auth/resend-verification', { email }),

  // ─── Misafir doğrulama kodu ────────────────────────────────────────────────

  sendGuestCode: () =>
    api.post<{ success: boolean; message?: string }>('/auth/guest/send-code'),

  verifyGuestCode: (code: string) =>
    api.post<{ success: boolean; message?: string }>('/auth/guest/verify-code', { code }),

  // ─── Misafir aktivasyonu ───────────────────────────────────────────────────

  /** Misafir kullanıcı şifre belirleyerek gerçek üyeye dönüşür */
  activateGuest: (newPassword: string) =>
    api.post<{ success: boolean; message?: string; data: { accessToken: string; user: User } }>(
      '/auth/activate-guest',
      { newPassword },
    ),
};


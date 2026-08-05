import { api } from './api';
import type { Address, Order } from '@/types';

export interface CheckoutInitResponse {
  checkoutFormContent: string;
  token: string;
  conversationId: string;
  subtotal: number;
  discount?: number;
  tax?: number;
  shippingFee: number;
  total: number;
}

export interface PaymentMethodsResponse {
  card:   { enabled: boolean };
  cod:    { enabled: boolean; fee: number };
  havale: { enabled: boolean; bankName: string; iban: string; accountName: string; description: string };
}

export interface BillingInfo {
  isCorporate: boolean;
  billingName?: string;
  taxNumber?: string; // VKN
  identityNo?: string; // TCKN
  taxOffice?: string;
}

export interface PlaceOrderResponse {
  orderId: string;
  havale?: {
    bankName: string;
    iban: string;
    accountName: string;
    description: string;
    orderNumber?: string;
  };
}

export const checkoutApi = {
  // Address CRUD
  listAddresses: () =>
    api.get<{ success: boolean; data: Address[] }>('/addresses'),

  createAddress: (data: Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean }) =>
    api.post<{ success: boolean; data: Address }>('/addresses', data),

  updateAddress: (id: string, data: Partial<Address>) =>
    api.put<{ success: boolean; data: Address }>(`/addresses/${id}`, data),

  deleteAddress: (id: string) =>
    api.delete<{ success: boolean }>(`/addresses/${id}`),

  setDefaultAddress: (id: string) =>
    api.patch<{ success: boolean; data: Address }>(`/addresses/${id}/default`),

  // Payment methods (public)
  getPaymentMethods: () =>
    api.get<{ success: boolean; data: PaymentMethodsResponse }>('/checkout/payment-methods'),

  // Checkout
  initialize: (addressId: string, couponCode?: string, billing?: BillingInfo) =>
    api.post<{ success: boolean; data: CheckoutInitResponse }>('/checkout/initialize', { addressId, couponCode, billing }),

  placeOrder: (addressId: string, method: 'cod' | 'havale' | 'free', couponCode?: string, billing?: BillingInfo) =>
    api.post<{ success: boolean; data: PlaceOrderResponse }>('/checkout/place-order', { addressId, method, couponCode, billing }),

  // Orders
  listOrders: () =>
    api.get<{ success: boolean; data: Order[] }>('/checkout/orders'),

  getOrder: (id: string) =>
    api.get<{ success: boolean; data: Order }>(`/checkout/orders/${id}`),

  // Cancellation
  getOrderCancellation: (orderId: string) =>
    api.get<{ success: boolean; data: any }>(`/checkout/orders/${orderId}/cancellation`),

  // İade (Return)
  getOrderReturns: (orderId: string) =>
    api.get<{ success: boolean; data: Array<{
      id: string;
      status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
      reason: string;
      description: string | null;
      refundAmount: number | null;
      adminNotes: string | null;
      requestedAt: string;
      items: Array<{ orderItemId: string; quantity: number }>;
    }> }>(`/checkout/orders/${orderId}/returns`),

  requestReturn: (orderId: string, payload: {
    reason: string;
    description?: string;
    items: Array<{ orderItemId: string; quantity: number }>;
  }) =>
    api.post<{ success: boolean; data: any }>(`/checkout/orders/${orderId}/return-request`, payload),

  // Kullanıcının kişiye özel kuponları (gelecek alışverişte kullanılabilir)
  getMyCoupons: () =>
    api.get<{ success: boolean; data: Array<{
      code: string;
      value: number;
      type: 'PERCENT' | 'FIXED';
      minOrder: number | null;
      expiresAt: string | null;
      sourceOrderId: string | null;
      description: string | null;
      used: boolean;
      expired: boolean;
      usable: boolean;
    }> }>('/checkout/my-coupons'),
};

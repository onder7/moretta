export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface User {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  isGuest?: boolean;
  hasPassword?: boolean;
  profile?: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  imageUrl?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

export interface AttributeValueItem {
  id: string;
  value: string;
  colorHex?: string | null;
  sortOrder: number;
  attribute: { id: string; name: string; slug: string; inputType: string; sortOrder: number };
}

export interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  compareAt?: number;
  stockQty: number;
  desi?: number | null;
  attributeValues: { attributeValue: AttributeValueItem }[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isFeatured?: boolean;
  vatRate: number;
  vatIncluded: boolean;
  intensity?: number;
  category: Category;
  brand?: Brand;
  variants: ProductVariant[];
  images: { id: string; url: string; altText?: string; isPrimary: boolean }[];
  tags: { tag: string }[];
  reviews?: { rating: number }[];
  _count?: { reviews?: number };
}

export interface CartItem {
  id: string;
  variantId: string;
  quantity: number;
  priceAtAdd: number;
  createdAt: string;
  variant: ProductVariant & { product: Pick<Product, 'id' | 'name' | 'slug' | 'images'> };
}

export interface Cart {
  id: string;
  items: CartItem[];
}

export interface OrderShipping {
  carrier?: string | null;
  trackingNumber?: string | null;
  status: string;
  estimatedAt?: string | null;
}

export interface Order {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  createdAt: string;
  address?: Address;
  shipping?: OrderShipping | null;
  paymentMethod?: string;
  paymentId?: string;
  items: { id: string; quantity: number; unitPrice: number; variant: ProductVariant & { product: Pick<Product, 'name' | 'slug' | 'images'> } }[];
  statusHistory?: { id: string; status: string; note?: string; createdAt: string }[];
}

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

export interface Address {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  isDefault: boolean;
  type: 'BILLING' | 'SHIPPING';
}

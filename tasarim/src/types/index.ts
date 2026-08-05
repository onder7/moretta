export type CoffeeType = 'Arabica' | 'Robusta' | 'Blend';
export type RoastLevel = 'Açık' | 'Orta' | 'Koyu' | 'Orta-Koyu' | 'Açık-Orta';
export type GrindOption = 'Çekirdek' | 'V60' | 'Espresso' | 'French Press' | 'Moka Pot';

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number;
  image: string;
  hoverImage: string;
  category: string;
  type: CoffeeType;
  roast: RoastLevel;
  origin: string;
  flavorNotes: string[];
  intensity: 1 | 2 | 3 | 4 | 5;
  grindOptions: GrindOption[];
  rating: number;
  reviewCount: number;
  inStock: boolean;
  badge?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  grind: GrindOption;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  helpful: number;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  subcategories: string[];
}

export interface Address {
  id: string;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  detail: string;
  isDefault?: boolean;
}

export interface Order {
  id: string;
  date: string;
  status: 'Hazırlanıyor' | 'Kargoda' | 'Teslim Edildi' | 'İptal Edildi';
  total: number;
  itemCount: number;
  items: { name: string; quantity: number; grind: string; price: number }[];
}

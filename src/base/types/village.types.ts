export interface Variant {
  name: string;
  price: number;
  mrp: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  nameTE: string;
  weight: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  variants?: Variant[];
}

export interface Category {
  id: string;
  name: string;
  nameTE: string;
  emoji: string;
  bgClass: string;
  textClass: string;
}

export type CartRecord = Record<string, number>;

export interface CartLineItem {
  key: string;
  product: Product;
  variantIndex: number | null;
  name: string;
  weight: string;
  price: number;
  mrp: number;
  count: number;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
}

export interface Bill {
  itemTotal: number;
  mrpTotal: number;
  itemDiscount: number;
  deliveryFee: number;
  platformFee: number;
  couponDiscount: number;
  grandTotal: number;
  totalSavings: number;
  totalCount: number;
}

export type SortKey = 'popular' | 'price_asc' | 'price_desc' | 'rating';

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  nameTE: string;
  emoji: string;
  weight: string;
  price: number;
  mrp: number;
  quantity: number;
}

export interface Order {
  id: string;
  placedAt: string;        // ISO 8601 timestamp
  status: OrderStatus;
  items: OrderItem[];
  bill: Bill;
  deliveryAddress: string;
  paymentMethod: 'cod' | 'upi';
}

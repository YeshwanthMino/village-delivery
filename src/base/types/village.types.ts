export interface Variant {
  name: string;
  price: number;
  mrp: number;
  stock?: number;
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
  emoji?: string;
  gradientFrom?: string;
  gradientTo?: string;
  // API products use images instead of emojis
  image?: string;
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

/**
 * Self-contained snapshot of a product captured at add-to-cart time. Works for
 * both static catalog products (emoji + gradient) and API products (imageUrl),
 * so the cart never has to re-resolve an id against any catalog.
 *
 * Prices are stored in catalog "units" (display multiplies by 20 via `rupees`).
 * API products, whose `price` is in real rupees, are divided by 20 on capture.
 */
export interface CartSnapshot {
  key: string;
  productId: string;
  variantIndex: number | null;
  name: string;
  nameTE?: string;
  weight: string;
  price: number;
  mrp: number;
  emoji?: string;
  gradientFrom?: string;
  gradientTo?: string;
  imageUrl?: string;
}

export type CartSnapshotRecord = Record<string, CartSnapshot>;

export interface CartLineItem extends CartSnapshot {
  count: number;
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
  /** Product thumbnail URL when the API provides one; empty/absent falls back to emoji. */
  image?: string;
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

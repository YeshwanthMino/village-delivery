export interface Variant {
  id?: string;
  name: string;
  nameTE?: string;
  slug?: string;
  description?: string;
  price: number;
  mrp: number;
  listPrice?: number;
  dealPrice?: number;
  stock?: number;
  /** The variant's own landing image, verbatim from the API. Prefer `image`
   *  for display — that one already falls back to the first gallery image. */
  landingImage?: string;
  image?: string;
  images?: string[];
  taxType?: string;
  taxRate?: number;
  hasFreeItem?: boolean;
  hsn?: string;
  active?: boolean;
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
  images?: string[];
  description?: string;
  manufacturerId?: string;
  brandId?: string;
  stock?: number;
  /** Human-readable category name, e.g. "Pulses". */
  categoryName?: string;
  /** Backend category path, e.g. "_Pulses". */
  categoryPath?: string;
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
 *
 * When a variant is selected, includes full variant data (images, pricing tiers,
 * tax info) to preserve the exact product state at add-to-cart time.
 */
export interface CartSnapshot {
  key: string;
  productId: string;
  variantIndex: number | null;
  variantId?: string;
  name: string;
  nameTE?: string;
  weight: string;
  price: number;
  mrp: number;
  listPrice?: number;
  dealPrice?: number;
  emoji?: string;
  gradientFrom?: string;
  gradientTo?: string;
  imageUrl?: string;
  images?: string[];
  taxType?: string;
  taxRate?: number;
  hasFreeItem?: boolean;
  hsn?: string;
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
  /** The order's minimum required value (internal units) to be eligible for checkout. */
  minOrderValue: number;
  /** True when grandTotal is under minOrderValue. */
  belowMinimum: boolean;
  /** Shortfall (internal units) to reach minOrderValue; 0 when not belowMinimum. */
  amountToMinimum: number;
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

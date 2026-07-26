// src/features/cart/domain/bill.ts
//
// Cart line-item resolution and the bill engine.
//
// These previously lived inside villageData.ts, the static demo catalog, which
// meant the money math for every real order sat in a mock-data file and any
// component needing them imported the whole demo dataset. They are domain logic
// and belong next to checkoutState.
//
// All amounts are in internal units (see shared/utils/currency).

import {
  Bill,
  CartLineItem,
  CartRecord,
  CartSnapshot,
  CartSnapshotRecord,
  Product,
} from '@/src/base/types/village.types';
import { ALL_PRODUCTS } from '@/src/features/home/data/static/villageData';
import { UNITS_PER_RUPEE } from '@/src/shared/utils/currency';
import { parseCartKey } from './cartKey';

/**
 * Build a self-contained cart snapshot from a product. Pass a variant index
 * for variant lines (key `${id}-v${i}`), or null for the base product.
 * Captures full variant data to preserve the exact product state at add-to-cart time.
 */
export function productSnapshot(
  product: Product,
  variantIndex: number | null
): CartSnapshot {
  if (variantIndex !== null && product.variants?.[variantIndex]) {
    const variant = product.variants[variantIndex];
    return {
      key: `${product.id}-v${variantIndex}`,
      productId: product.id,
      variantIndex,
      variantId: variant.id,
      name: product.name,
      nameTE: product.nameTE,
      weight: variant.name,
      price: variant.price,
      mrp: variant.mrp,
      listPrice: variant.listPrice,
      dealPrice: variant.dealPrice,
      emoji: product.emoji,
      gradientFrom: product.gradientFrom,
      gradientTo: product.gradientTo,
      imageUrl: variant.image,
      images: variant.images,
      taxType: variant.taxType,
      taxRate: variant.taxRate,
      hasFreeItem: variant.hasFreeItem,
      hsn: variant.hsn,
    };
  }
  return {
    key: product.id,
    productId: product.id,
    variantIndex: null,
    name: product.name,
    nameTE: product.nameTE,
    weight: product.weight,
    price: product.price,
    mrp: product.mrp,
    emoji: product.emoji,
    gradientFrom: product.gradientFrom,
    gradientTo: product.gradientTo,
    imageUrl: product.image,
    images: product.images,
  };
}

export function getCartItems(
  cart: CartRecord,
  snapshots: CartSnapshotRecord = {}
): CartLineItem[] {
  const items: CartLineItem[] = [];
  for (const [key, count] of Object.entries(cart)) {
    if (count <= 0) continue;

    // Prefer the snapshot captured at add-time — works for API products too.
    const snapshot = snapshots[key];
    if (snapshot) {
      items.push({ ...snapshot, count });
      continue;
    }

    // Legacy fallback: resolve against the static catalog (e.g. reorder).
    const { productId, variantIndex } = parseCartKey(key);
    const product = ALL_PRODUCTS.find(p => p.id === productId);
    if (!product) continue;
    if (variantIndex !== null && !product.variants?.[variantIndex]) continue;
    items.push({ ...productSnapshot(product, variantIndex), count });
  }
  return items;
}

/** Maximum rupee value of the percentage coupon. */
const COUPON_CAP_RUPEES = 40;

/** Minimum order value, in rupees, required to place an order. */
const MIN_ORDER_VALUE_RUPEES = 199;

export function computeBill(
  items: CartLineItem[],
  opts?: { couponApplied?: boolean }
): Bill {
  let itemTotal = 0;
  let mrpTotal = 0;
  let totalCount = 0;

  for (const item of items) {
    itemTotal += item.price * item.count;
    mrpTotal += item.mrp * item.count;
    totalCount += item.count;
  }

  const itemDiscount = mrpTotal - itemTotal;
  const deliveryFee = 0;                           // delivery fee removed
  const platformFee = 0;
  const couponDiscount = opts?.couponApplied
    ? Math.min(itemTotal * 0.1, COUPON_CAP_RUPEES / UNITS_PER_RUPEE)
    : 0;
  const grandTotal = itemTotal + deliveryFee + platformFee - couponDiscount;
  const totalSavings = itemDiscount + couponDiscount;

  const minOrderValue = MIN_ORDER_VALUE_RUPEES / UNITS_PER_RUPEE;
  const belowMinimum = grandTotal < minOrderValue;
  const amountToMinimum = belowMinimum ? minOrderValue - grandTotal : 0;

  return {
    itemTotal, mrpTotal, itemDiscount, deliveryFee, platformFee, couponDiscount,
    grandTotal, totalSavings, totalCount, minOrderValue, belowMinimum, amountToMinimum,
  };
}

import type { CartSnapshot, OrderItem } from '@/src/base/types/village.types';

/**
 * Build a cart snapshot from a past order's line.
 *
 * Reorder previously called `addToCart(productId)` with no snapshot, which left
 * `getCartItems` to resolve the id against the static demo catalog. Order lines
 * come from the API and are not in that catalog, so every line was silently
 * dropped and "Reorder" produced an empty cart.
 *
 * The order line already carries everything a snapshot needs, including prices
 * that `ordersApi` has converted to internal units — so the line reappears at
 * what the customer originally paid.
 */
export function orderItemSnapshot(item: OrderItem): CartSnapshot {
  return {
    key: item.productId,
    productId: item.productId,
    variantIndex: null,
    name: item.name,
    nameTE: item.nameTE,
    weight: item.weight,
    price: item.price,
    mrp: item.mrp,
    emoji: item.emoji,
    imageUrl: item.image,
  };
}

import type { CartLineItem } from '@/src/base/types/village.types';
import type { CheckStockItem } from '../data/stockApi';

/**
 * Project cart lines onto the shape the stock-check endpoint expects.
 *
 * `variantId` is omitted rather than sent as undefined, because the key is what
 * the response is addressed by (see `stockKey`) and a variant line must not be
 * conflated with the plain product line.
 */
export function buildStockCheckItems(items: CartLineItem[]): CheckStockItem[] {
  return items.map(item => ({
    productId: item.productId,
    ...(item.variantId ? { variantId: item.variantId } : {}),
    quantity: item.count,
  }));
}

// src/features/cart/domain/stockConflicts.ts
//
// Which cart lines the proactive stock check (useCartStockStore) says cannot
// be fulfilled as currently quantified — either no stock at all, or less than
// the quantity already sitting in the cart. Drives the same "ask to remove or
// adjust" prompt (OrderModificationSheet) that a conflict returned by
// POST /app/orders itself already uses, so a customer is stopped before
// placing a doomed order rather than after.
//
// Fails open throughout: a line the check hasn't reached yet, or whose check
// errored, is never treated as a conflict — the same policy the check itself
// follows on a timeout (see stockApi.ts).

import { stockKey } from '@/src/core/store/useCartStockStore';
import type { StockInfo } from '@/src/shared/components';

export interface StockConflictLine {
  productId: string;
  variantId?: string;
  count: number;
}

export interface StockConflictStatus {
  inStock: boolean;
  availableQuantity?: number;
}

export type StockConflictStatusMap = Record<string, StockConflictStatus>;

/** Cart lines that cannot be fulfilled as quantified, in OrderModificationSheet's shape. */
export function buildStockConflicts(
  items: StockConflictLine[],
  stockStatus: StockConflictStatusMap,
): StockInfo[] {
  const conflicts: StockInfo[] = [];
  for (const item of items) {
    const status = stockStatus[stockKey(item)];
    if (!status) continue; // not checked yet
    const shortOfStock =
      !status.inStock ||
      (status.availableQuantity !== undefined && status.availableQuantity < item.count);
    if (!shortOfStock) continue;
    conflicts.push({ productId: item.productId, availableStock: status.availableQuantity ?? 0 });
  }
  return conflicts;
}

/**
 * True only once every line has been checked and every single one of them has
 * zero stock — a partial shortfall (some stock, just less than the cart holds)
 * does not count: the customer can still complete an order by adjusting it.
 */
export function isEveryLineOutOfStock(
  items: StockConflictLine[],
  stockStatus: StockConflictStatusMap,
): boolean {
  if (items.length === 0) return false;
  return items.every(item => stockStatus[stockKey(item)]?.inStock === false);
}

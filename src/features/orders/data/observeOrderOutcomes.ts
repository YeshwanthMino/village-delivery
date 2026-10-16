import type { Order } from '@/src/base/types/village.types';
import { analytics } from '@/src/base/services/analytics';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';

const TERMINAL = new Set<Order['status']>(['delivered', 'cancelled', 'refunded']);
const MAX_SAVED = 40;
let pending = Promise.resolve();

/**
 * The app only sees orders when its API is fetched. Record a terminal status
 * once per signed-in customer/device, including its product lines. Server-side
 * order webhooks remain the source for complete, timely lifecycle data.
 */
export function observeOrderOutcomes(orders: Order[], userId: string | null): Promise<void> {
  if (!userId) return Promise.resolve();
  const terminal = orders.filter(order => TERMINAL.has(order.status));
  if (terminal.length === 0) return Promise.resolve();
  pending = pending.then(async () => {
    if (!(await analytics.isAvailable())) return;
    // Expo SecureStore keys allow only letters, numbers, '.', '-' and '_'.
    const safeUserId = userId.replace(/[^a-zA-Z0-9.-]/g, char => `_${char.charCodeAt(0).toString(16)}_`);
    const key = `analytics_order_outcomes_${safeUserId}`;
    const saved = await StoredPrefs.getCustomData<Record<string, Order['status']>>(key);
    const observed = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    let changed = false;
    for (const order of terminal) {
      if (observed[order.id] === order.status) continue;
      const status = order.status as 'delivered' | 'cancelled' | 'refunded';
      observed[order.id] = status;
      changed = true;
      analytics.track('order_outcome_observed', {
        order_id: order.id, status, item_count: order.items.reduce((total, item) => total + item.quantity, 0),
      });
      for (const item of order.items) {
        if (!item.productId || item.quantity <= 0) continue;
        analytics.track('product_outcome_observed', {
          order_id: order.id, product_id: item.productId, quantity: item.quantity, status,
        });
      }
    }
    if (changed) {
      const recent = Object.entries(observed).slice(-MAX_SAVED);
      await StoredPrefs.setCustomData(key, Object.fromEntries(recent));
    }
  }).catch(() => {});
  return pending;
}

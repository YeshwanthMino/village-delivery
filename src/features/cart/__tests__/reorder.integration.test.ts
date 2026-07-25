// Reordering a past order must reproduce that order in the cart. Order items
// come from the API, so they are not in the static catalog — anything relying on
// that catalog to resolve them silently drops the line.

import { getCartItems } from '@/src/features/cart/domain/bill';
import { orderItemSnapshot } from '@/src/features/cart/domain/reorder';
import { rupees } from '@/src/shared/utils/currency';
import type { OrderItem } from '@/src/base/types/village.types';

// price/mrp arrive already converted to units by ordersApi.toUnits.
const API_ORDER_ITEM: OrderItem = {
  productId: '69f2c9520469cfb86fcdd71a',
  name: 'Farm Fresh Eggs',
  nameTE: '',
  emoji: '🥚',
  image: 'https://img/eggs.png',
  weight: '6 pc',
  price: 45 / 20,
  mrp: 50 / 20,
  quantity: 3,
};

describe('reorder', () => {
  test('keeps an API-sourced line in the cart', () => {
    const snapshot = orderItemSnapshot(API_ORDER_ITEM);
    const items = getCartItems(
      { [snapshot.key]: API_ORDER_ITEM.quantity },
      { [snapshot.key]: snapshot },
    );

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Farm Fresh Eggs');
    expect(items[0].count).toBe(3);
  });

  test('carries the price the customer originally paid', () => {
    const snapshot = orderItemSnapshot(API_ORDER_ITEM);
    const items = getCartItems({ [snapshot.key]: 3 }, { [snapshot.key]: snapshot });

    expect(rupees(items[0].price)).toBe('₹45');
    expect(rupees(items[0].mrp)).toBe('₹50');
  });

  test('a line with no snapshot is dropped, which is why one is required', () => {
    // The regression this guards: reorder used to call addToCart(productId)
    // with no snapshot, leaving getCartItems to resolve the id against the
    // static demo catalog. API ids are not in it, so the cart came up empty.
    expect(getCartItems({ [API_ORDER_ITEM.productId]: 3 }, {})).toEqual([]);
  });
});

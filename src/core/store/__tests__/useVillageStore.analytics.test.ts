const mockTrack = jest.fn();
const mockStoredCart = new Map<string, unknown>();

jest.mock('@/src/base/services/analytics', () => ({
  analytics: { track: (...args: unknown[]) => mockTrack(...args) },
}));

jest.mock('@/src/base/services/remote/storage/StoredPrefs', () => ({
  StoredPrefs: {
    getCustomData: jest.fn(async (key: string) => mockStoredCart.get(key) ?? null),
    setCustomData: jest.fn(async (key: string, value: unknown) => { mockStoredCart.set(key, value); }),
  },
}));

import { StorageKeys } from '@/src/base/constants/AppConstants';
import { useVillageStore } from '../useVillageStore';

const line = {
  key: 'product-v0',
  productId: 'product',
  variantIndex: 0,
  variantId: 'variant',
  name: 'Product',
  weight: '1 pack',
  price: 10,
  mrp: 12,
};

beforeEach(() => {
  useVillageStore.setState({
    cart: {}, cartSnapshots: {}, cartAttribution: {}, lastVariantKey: {}, favs: {}, vipAddedInCart: false,
  });
  mockStoredCart.clear();
  mockTrack.mockClear();
});

test('keeps last catalog placement with a cart line until that line is removed', async () => {
  const store = useVillageStore.getState();
  const context = { source: 'similar_products', list_id: 'similar:p0', position: 2, recommendation_id: 'request-1' };
  store.addToCart(line.key, line, 3, context);
  expect(useVillageStore.getState().cartAttribution[line.key]).toEqual(context);
  expect(mockTrack).toHaveBeenCalledWith('cart_item_added', expect.objectContaining(context));

  await useVillageStore.getState().hydrateCart();
  expect(useVillageStore.getState().cartAttribution[line.key]).toEqual(context);
  useVillageStore.getState().setQuantity(line.key, 0);
  expect(useVillageStore.getState().cartAttribution[line.key]).toBeUndefined();
});

test('tracks accepted cart changes and ignores rejected or unchanged writes', () => {
  const store = useVillageStore.getState();
  store.addToCart(line.key, line, 1);
  store.addToCart(line.key, line, 1); // stock cap: rejected
  store.setQuantity(line.key, 1); // unchanged
  store.setQuantity(line.key, 3, 2); // actual quantity becomes 2
  store.decFromCart(line.key);
  store.clearCart(); // order completion: no fake item-removal event

  expect(mockTrack.mock.calls).toEqual([
    ['cart_item_added', { product_id: 'product', variant_id: 'variant', quantity: 1, cart_quantity: 1 }],
    ['cart_quantity_changed', { product_id: 'product', variant_id: 'variant', quantity_before: 1, quantity_after: 2 }],
    ['cart_item_removed', { product_id: 'product', variant_id: 'variant', quantity: 1, cart_quantity: 1 }],
  ]);
});

test('cart hydration does not look like customer activity', async () => {
  mockStoredCart.set(StorageKeys.CART, {
    cart: { [line.key]: 2 },
    cartSnapshots: { [line.key]: line },
  });

  await useVillageStore.getState().hydrateCart();

  expect(useVillageStore.getState().cart[line.key]).toBe(2);
  expect(mockTrack).not.toHaveBeenCalled();
});

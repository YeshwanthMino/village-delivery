import { StorageKeys } from '@/src/base/constants/AppConstants';
import * as cartKeyModule from '@/src/features/cart/domain/cartKey';

// In-memory stand-in for StoredPrefs' custom-data bucket. jest.mock factories
// may only close over vars prefixed "mock".
const mockStore = new Map<string, unknown>();
jest.mock('@/src/base/services/remote/storage/StoredPrefs', () => ({
  StoredPrefs: {
    getCustomData: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setCustomData: jest.fn(async (k: string, v: unknown) => { mockStore.set(k, v); }),
    removeCustomData: jest.fn(async (k: string) => { mockStore.delete(k); }),
  },
}));

import {
  useVillageStore,
  selectCartCount,
  selectLastVariantSnapshot,
  selectProductCartCount,
} from '../useVillageStore';

const reset = () => useVillageStore.setState({ cart: {}, cartSnapshots: {}, lastVariantKey: {} });

// Persistence is fire-and-forget so mutations stay synchronous; let the
// microtask queue drain before asserting on what was written.
const flushPersist = () => new Promise(resolve => setImmediate(resolve));

const snapshot = (key: string) => ({
  key,
  productId: key,
  variantIndex: null,
  name: key,
  nameTE: '',
  weight: '',
  price: 10,
  mrp: 20,
});

describe('selectCartCount', () => {
  beforeEach(reset);

  test('totals the quantities across lines', () => {
    const { addToCart } = useVillageStore.getState();
    addToCart('apple', snapshot('apple'));
    addToCart('apple', snapshot('apple'));
    addToCart('banana', snapshot('banana'));

    expect(selectCartCount(useVillageStore.getState())).toBe(3);
  });

  test('does not recompute when an unrelated slice changes', () => {
    useVillageStore.getState().addToCart('apple', snapshot('apple'));
    const state = useVillageStore.getState();
    expect(selectCartCount(state)).toBe(1);

    // Toggling a favourite touches no cart state, but seven view models run this
    // selector on every store notification — so it must be a cache hit, not a
    // fresh reduce.
    const spy = jest.spyOn(Object, 'values');
    useVillageStore.getState().toggleFav('apple');
    selectCartCount(useVillageStore.getState());
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('recomputes once the cart itself changes', () => {
    useVillageStore.getState().addToCart('apple', snapshot('apple'));
    expect(selectCartCount(useVillageStore.getState())).toBe(1);

    useVillageStore.getState().addToCart('banana', snapshot('banana'));
    expect(selectCartCount(useVillageStore.getState())).toBe(2);
  });
});

describe('cart persistence', () => {
  beforeEach(() => {
    reset();
    mockStore.clear();
    jest.clearAllMocks();
  });

  test('persists the cart and its snapshots after a mutation', async () => {
    useVillageStore.getState().addToCart('apple', snapshot('apple'));
    await flushPersist();

    const saved = mockStore.get(StorageKeys.CART);
    expect(saved).toEqual({
      cart: { apple: 1 },
      cartSnapshots: { apple: expect.objectContaining({ key: 'apple' }) },
      lastVariantKey: { apple: 'apple' },
    });
  });

  test('restores a persisted cart on hydrate', async () => {
    mockStore.set(StorageKeys.CART, {
      cart: { apple: 3 },
      cartSnapshots: { apple: snapshot('apple') },
    });

    await useVillageStore.getState().hydrateCart();

    expect(useVillageStore.getState().cart).toEqual({ apple: 3 });
    expect(useVillageStore.getState().cartSnapshots.apple).toBeDefined();
  });

  test('leaves the cart empty when nothing is persisted', async () => {
    await useVillageStore.getState().hydrateCart();

    expect(useVillageStore.getState().cart).toEqual({});
  });

  test('survives a corrupt persisted payload rather than throwing', async () => {
    mockStore.set(StorageKeys.CART, { nonsense: true });

    await expect(useVillageStore.getState().hydrateCart()).resolves.toBeUndefined();
    expect(useVillageStore.getState().cart).toEqual({});
  });

  test('clearing the cart clears what is persisted', async () => {
    useVillageStore.getState().addToCart('apple', snapshot('apple'));
    await flushPersist();

    useVillageStore.getState().clearCart();
    await flushPersist();

    expect(mockStore.get(StorageKeys.CART)).toEqual({ cart: {}, cartSnapshots: {}, lastVariantKey: {} });
  });
});

describe('useVillageStore.setQuantity', () => {
  beforeEach(reset);

  test('sets a line to an exact quantity in one store write', () => {
    const { addToCart } = useVillageStore.getState();
    addToCart('apple', snapshot('apple'));

    let writes = 0;
    const unsubscribe = useVillageStore.subscribe(() => { writes += 1; });
    useVillageStore.getState().setQuantity('apple', 8);
    unsubscribe();

    expect(useVillageStore.getState().cart['apple']).toBe(8);
    // The old code looped addToCart per unit, so raising 1 -> 8 fired seven
    // separate notifications and seven render passes across every subscriber.
    expect(writes).toBe(1);
  });

  test('removes the line and its snapshot at quantity 0', () => {
    const { addToCart } = useVillageStore.getState();
    addToCart('apple', snapshot('apple'));

    useVillageStore.getState().setQuantity('apple', 0);

    expect(useVillageStore.getState().cart['apple']).toBeUndefined();
    expect(useVillageStore.getState().cartSnapshots['apple']).toBeUndefined();
  });

  test('treats a negative quantity as removal', () => {
    useVillageStore.getState().addToCart('apple', snapshot('apple'));

    useVillageStore.getState().setQuantity('apple', -3);

    expect(useVillageStore.getState().cart['apple']).toBeUndefined();
  });

  test('caps at maxQuantity when one is supplied', () => {
    useVillageStore.getState().addToCart('apple', snapshot('apple'));

    useVillageStore.getState().setQuantity('apple', 10, 4);

    expect(useVillageStore.getState().cart['apple']).toBe(4);
  });

  test('leaves other lines untouched', () => {
    const { addToCart } = useVillageStore.getState();
    addToCart('apple', snapshot('apple'));
    addToCart('banana', snapshot('banana'));

    useVillageStore.getState().setQuantity('apple', 5);

    expect(useVillageStore.getState().cart['banana']).toBe(1);
    expect(useVillageStore.getState().cartSnapshots['banana']).toBeDefined();
  });
});

const variantSnapshot = (productId: string, index: number, price: number) => ({
  key: `${productId}-v${index}`,
  productId,
  variantIndex: index,
  name: 'Figaro Extra Virgin Olive Oil',
  nameTE: '',
  weight: index === 0 ? '1 pc (250 ml)' : '1 pc (1 L)',
  price,
  mrp: price * 2,
});

describe('lastVariantKey', () => {
  beforeEach(reset);

  test('points at the most recently added variant of a product', () => {
    const { addToCart } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    addToCart('p1-v1', variantSnapshot('p1', 1, 58.25));

    expect(selectLastVariantSnapshot('p1')(useVillageStore.getState())?.weight).toBe('1 pc (1 L)');
  });

  test('a decrement counts as a touch', () => {
    const { addToCart, decFromCart } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    addToCart('p1-v1', variantSnapshot('p1', 1, 58.25));
    decFromCart('p1-v0');

    expect(selectLastVariantSnapshot('p1')(useVillageStore.getState())?.weight).toBe('1 pc (250 ml)');
  });

  test('falls back to another line of the same product when the pointed-at line leaves', () => {
    const { addToCart, decFromCart } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    addToCart('p1-v1', variantSnapshot('p1', 1, 58.25));
    decFromCart('p1-v1');

    expect(selectLastVariantSnapshot('p1')(useVillageStore.getState())?.weight).toBe('1 pc (250 ml)');
  });

  test('clears the entry once the product has no lines left', () => {
    const { addToCart, decFromCart } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    decFromCart('p1-v0');

    expect(useVillageStore.getState().lastVariantKey.p1).toBeUndefined();
    expect(selectLastVariantSnapshot('p1')(useVillageStore.getState())).toBeUndefined();
  });

  test('setQuantity to zero releases the entry too', () => {
    const { addToCart, setQuantity } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    setQuantity('p1-v0', 0);

    expect(useVillageStore.getState().lastVariantKey.p1).toBeUndefined();
  });

  test('survives a persistence round-trip', async () => {
    const { addToCart } = useVillageStore.getState();
    addToCart('p1-v1', variantSnapshot('p1', 1, 58.25));
    await flushPersist();
    // The reset below is itself a store mutation, so it fires the persist
    // subscriber too — capture what was actually flushed first, then put it
    // back afterwards so the simulated "app restart" doesn't clobber it.
    const persisted = mockStore.get(StorageKeys.CART);

    useVillageStore.setState({ cart: {}, cartSnapshots: {}, lastVariantKey: {} });
    mockStore.set(StorageKeys.CART, persisted);
    await useVillageStore.getState().hydrateCart();

    expect(useVillageStore.getState().lastVariantKey.p1).toBe('p1-v1');
  });

  test('backfills the pointer for a cart persisted before this field existed', async () => {
    // Reset first: setState fires the persist subscriber too, and doing the
    // reset before seeding the mock keeps that write from overwriting the
    // pre-migration payload this test cares about.
    useVillageStore.setState({ cart: {}, cartSnapshots: {}, lastVariantKey: {} });
    mockStore.set(StorageKeys.CART, { cart: { 'p1-v0': 1 }, cartSnapshots: {} });
    await useVillageStore.getState().hydrateCart();

    expect(useVillageStore.getState().cart['p1-v0']).toBe(1);
    // Without a backfill, every existing install would hydrate a variant cart
    // with no pointer at all and the card would show the wrong price/pack on
    // first launch after the update, until the user touched that product again.
    expect(useVillageStore.getState().lastVariantKey).toEqual({ p1: 'p1-v0' });
  });

  test('replaces a pointer that names a key no longer in the cart', async () => {
    useVillageStore.setState({ cart: {}, cartSnapshots: {}, lastVariantKey: {} });
    mockStore.set(StorageKeys.CART, {
      cart: { 'p1-v0': 1 },
      cartSnapshots: {},
      // A stale pointer: some earlier session touched v1 last, but that line
      // has since left the cart (e.g. removed on another device).
      lastVariantKey: { p1: 'p1-v1' },
    });
    await useVillageStore.getState().hydrateCart();

    expect(useVillageStore.getState().lastVariantKey).toEqual({ p1: 'p1-v0' });
  });

  test('clearCart drops every entry', () => {
    const { addToCart, clearCart } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    clearCart();

    expect(useVillageStore.getState().lastVariantKey).toEqual({});
  });

  test('sets the pointer even when addToCart is called without a snapshot', () => {
    // setQuantity/addToCart on a key with no snapshot on file (e.g. a line
    // added by key alone) must still move the pointer — it can't rely on a
    // cartSnapshots lookup the way the old per-action productId derivation did.
    useVillageStore.getState().addToCart('p1-v0');

    expect(useVillageStore.getState().lastVariantKey.p1).toBe('p1-v0');
  });

  test('addToCart blocked by the stock cap does not move the pointer', () => {
    const { addToCart } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5), 1);
    addToCart('p1-v1', variantSnapshot('p1', 1, 58.25));
    // v0 is already at its cap of 1, so this add is rejected outright.
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5), 1);

    expect(useVillageStore.getState().lastVariantKey.p1).toBe('p1-v1');
  });

  test('falls back to the first remaining line in cart order when several remain', () => {
    const { addToCart, decFromCart } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    addToCart('p1-v1', variantSnapshot('p1', 1, 58.25));
    addToCart('p1-v2', variantSnapshot('p1', 2, 100));
    decFromCart('p1-v2');

    expect(useVillageStore.getState().lastVariantKey.p1).toBe('p1-v0');
  });

  test('a decrement below zero is a no-op, not a fresh notification', () => {
    let writes = 0;
    const unsubscribe = useVillageStore.subscribe(() => { writes += 1; });
    useVillageStore.getState().decFromCart('nonexistent');
    unsubscribe();

    expect(writes).toBe(0);
  });

  test('selectLastVariantSnapshot is reference-stable across an unrelated notification', () => {
    const { addToCart, toggleFav } = useVillageStore.getState();
    addToCart('p1-v1', variantSnapshot('p1', 1, 58.25));
    const first = selectLastVariantSnapshot('p1')(useVillageStore.getState());

    toggleFav('unrelated-product');
    const second = selectLastVariantSnapshot('p1')(useVillageStore.getState());

    expect(second).toBe(first);
  });
});

describe('selectProductCartCount', () => {
  beforeEach(reset);

  test('sums every variant line of one product and ignores others', () => {
    const { addToCart } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    addToCart('p1-v1', variantSnapshot('p1', 1, 58.25));
    addToCart('p2-v0', variantSnapshot('p2', 0, 10));

    expect(selectProductCartCount('p1')(useVillageStore.getState())).toBe(3);
  });

  test('does not recompute when an unrelated slice changes', () => {
    const { addToCart, toggleFav } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    const state = useVillageStore.getState();
    expect(selectProductCartCount('p1')(state)).toBe(1);

    // Dozens of product cards mount this selector in a category grid, so a
    // notification that touches no cart state — toggling a favourite — must
    // be a cache hit, not a fresh group-by over the whole cart.
    const spy = jest.spyOn(cartKeyModule, 'parseCartKey');
    toggleFav('p1');
    selectProductCartCount('p1')(useVillageStore.getState());
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('counts a variant-less line keyed by the product id', () => {
    useVillageStore.getState().addToCart('p3', snapshot('p3'));
    expect(selectProductCartCount('p3')(useVillageStore.getState())).toBe(1);
  });

  test('does not count a different product whose id shares a prefix', () => {
    const { addToCart } = useVillageStore.getState();
    addToCart('p1-v0', variantSnapshot('p1', 0, 15.5));
    addToCart('p10-v0', variantSnapshot('p10', 0, 20));

    expect(selectProductCartCount('p1')(useVillageStore.getState())).toBe(1);
  });
});

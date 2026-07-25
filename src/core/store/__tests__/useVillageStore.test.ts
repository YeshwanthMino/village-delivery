import { StorageKeys } from '@/src/base/constants/AppConstants';

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

import { useVillageStore } from '../useVillageStore';

const reset = () => useVillageStore.setState({ cart: {}, cartSnapshots: {} });

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

    expect(mockStore.get(StorageKeys.CART)).toEqual({ cart: {}, cartSnapshots: {} });
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

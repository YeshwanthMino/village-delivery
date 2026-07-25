import { useVillageStore } from '../useVillageStore';

const reset = () => useVillageStore.setState({ cart: {}, cartSnapshots: {} });

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

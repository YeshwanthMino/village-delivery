import { renderHook, act } from '@testing-library/react-native';

// Same in-memory stand-in useVillageStore.test.ts uses — the store subscribes
// to StoredPrefs on every cart mutation, so it needs a mock to avoid touching
// real storage during the test.
const mockStore = new Map<string, unknown>();
jest.mock('@/src/base/services/remote/storage/StoredPrefs', () => ({
  StoredPrefs: {
    getCustomData: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setCustomData: jest.fn(async (k: string, v: unknown) => { mockStore.set(k, v); }),
    removeCustomData: jest.fn(async (k: string) => { mockStore.delete(k); }),
  },
}));

import { CartSnapshot, Variant } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { useVariantCardView } from '../useVariantCardView';

const reset = () => useVillageStore.setState({ cart: {}, cartSnapshots: {}, lastVariantKey: {} });

const variants: Variant[] = [
  { id: 'v0', name: '1 pc (250 ml)', price: 15.5, mrp: 29.95, stock: 4 },
  { id: 'v1', name: '1 pc (1 L)', price: 58.25, mrp: 99.95, stock: 2 },
];

const variantSnapshot = (index: number): CartSnapshot => ({
  key: `p1-v${index}`,
  productId: 'p1',
  variantIndex: index,
  name: 'Figaro Extra Virgin Olive Oil',
  weight: variants[index].name,
  price: variants[index].price,
  mrp: variants[index].mrp,
});

const baseProduct = { id: 'p1', price: 15.5, mrp: 29.95, weight: undefined, variants, hasVariants: true };

describe('useVariantCardView', () => {
  beforeEach(reset);

  it('offers the default variant when nothing is in the cart', () => {
    const { result } = renderHook(() => useVariantCardView(baseProduct));
    expect(result.current.mode).toBe('add');
    expect(result.current.price).toBe(15.5);
    expect(result.current.packLabel).toBe('1 pc (250 ml)');
    expect(result.current.count).toBe(0);
  });

  it('switches to a stepper with the total count once the product is in the cart', () => {
    const { result } = renderHook(() => useVariantCardView(baseProduct));

    act(() => {
      useVillageStore.getState().addToCart('p1-v0', variantSnapshot(0));
    });

    expect(result.current.mode).toBe('stepper');
    expect(result.current.count).toBe(1);
    expect(result.current.packLabel).toBe('1 pc (250 ml)');
  });

  it('mirrors the last-touched variant after a second, different variant is added', () => {
    const { result } = renderHook(() => useVariantCardView(baseProduct));

    act(() => {
      useVillageStore.getState().addToCart('p1-v0', variantSnapshot(0));
      useVillageStore.getState().addToCart('p1-v1', variantSnapshot(1));
    });

    expect(result.current.count).toBe(2);
    expect(result.current.price).toBe(58.25);
    expect(result.current.packLabel).toBe('1 pc (1 L)');
  });

  it('forces the sheet open when flagged multi-variant but the variants are missing', () => {
    const { result } = renderHook(() => useVariantCardView({
      id: 'p1', price: 15.5, mrp: 29.95, weight: undefined, variants: undefined, hasVariants: true,
    }));

    expect(result.current.opensSheet).toBe(true);
  });

  it('falls back to the product weight for the pack label when there are no variants', () => {
    const { result } = renderHook(() => useVariantCardView({
      id: 'p2', price: 18, mrp: 25, weight: '500 g', variants: undefined, hasVariants: false,
    }));

    expect(result.current.packLabel).toBe('500 g');
  });
});

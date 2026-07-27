import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

// Same in-memory stand-in useVariantCardView.test.ts uses — the store subscribes
// to StoredPrefs on every cart mutation, so it needs a mock to avoid touching
// real storage (and logging ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG noise)
// during the test.
const mockStore = new Map<string, unknown>();
jest.mock('@/src/base/services/remote/storage/StoredPrefs', () => ({
  StoredPrefs: {
    getCustomData: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setCustomData: jest.fn(async (k: string, v: unknown) => { mockStore.set(k, v); }),
    removeCustomData: jest.fn(async (k: string) => { mockStore.delete(k); }),
  },
}));

import { DynamicProductCard } from '../DynamicProductCard';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';
import { HomeProduct } from '../../../../data/homeLayout.types';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const multi: HomeProduct = {
  id: 'p1',
  title: 'Figaro Extra Virgin Olive Oil',
  image: 'https://cdn/p1.jpg',
  mrp: 29.95,
  price: 15.5,
  discountPct: 48,
  inStock: true,
  stock: 6,
  hasVariants: true,
  variants: [
    { id: 'v0', name: '1 pc (250 ml)', price: 15.5, mrp: 29.95, stock: 4 },
    { id: 'v1', name: '1 pc (1 L)', price: 58.25, mrp: 99.95, stock: 2 },
  ],
};

const plain: HomeProduct = {
  id: 'p2',
  title: 'Tata Simply Better Groundnut Oil',
  image: 'https://cdn/p2.jpg',
  mrp: 25,
  price: 18,
  discountPct: 28,
  inStock: true,
  stock: 5,
};

// Some catalog products come from the backend with their single variant's
// title copied verbatim from the product title (rather than a real pack
// descriptor like "40 G"), which previously showed the product name twice.
const duplicateNamedVariant: HomeProduct = {
  id: 'p3',
  title: 'GOPURAM Kumkum (Red) - 40 G',
  image: 'https://cdn/p3.jpg',
  mrp: 12,
  price: 9,
  discountPct: 25,
  inStock: true,
  stock: 5,
  hasVariants: false,
  variants: [
    { id: 'v0', name: 'GOPURAM Kumkum (Red) - 40 G', price: 9, mrp: 12, stock: 5 },
  ],
};

beforeEach(() => useVillageStore.setState({ cart: {}, cartSnapshots: {}, lastVariantKey: {} }));
beforeEach(() => useSnackbarStore.setState({ message: null, key: 0, bottomOffset: 0 }));

describe('DynamicProductCard, multi-variant', () => {
  it('labels the button with the option count and shows the default pack', () => {
    render(<DynamicProductCard product={multi} onOpenVariants={jest.fn()} />);

    expect(screen.getByText('2 options')).toBeTruthy();
    expect(screen.getByText('1 pc (250 ml)')).toBeTruthy();
    expect(screen.getByText('₹310')).toBeTruthy();
  });

  it('opens the sheet instead of adding to the cart, and forwards the variants it already has', () => {
    const onOpenVariants = jest.fn();
    render(<DynamicProductCard product={multi} onOpenVariants={onOpenVariants} />);

    fireEvent.press(screen.getByText('ADD'));

    expect(onOpenVariants).toHaveBeenCalledTimes(1);
    expect(onOpenVariants.mock.calls[0][0]).toMatchObject({ id: 'p1', variants: multi.variants });
    expect(useVillageStore.getState().cart).toEqual({});
  });

  it('shows the total across variants and mirrors the last-touched one', () => {
    const { addToCart } = useVillageStore.getState();
    addToCart('p1-v0', {
      key: 'p1-v0', productId: 'p1', variantIndex: 0, name: multi.title,
      weight: '1 pc (250 ml)', price: 15.5, mrp: 29.95,
    });
    addToCart('p1-v1', {
      key: 'p1-v1', productId: 'p1', variantIndex: 1, name: multi.title,
      weight: '1 pc (1 L)', price: 58.25, mrp: 99.95,
    });
    addToCart('p1-v1', {
      key: 'p1-v1', productId: 'p1', variantIndex: 1, name: multi.title,
      weight: '1 pc (1 L)', price: 58.25, mrp: 99.95,
    });

    render(<DynamicProductCard product={multi} onOpenVariants={jest.fn()} />);

    expect(screen.getByText('3')).toBeTruthy();          // 1 + 2
    expect(screen.getByText('1 pc (1 L)')).toBeTruthy(); // last touched
    expect(screen.getByText('₹1165')).toBeTruthy();
    // Badge mirrors the last-touched variant's own discount (42%), not the
    // product's default-variant discountPct (48%).
    expect(screen.getByText('42% OFF')).toBeTruthy();
  });

  it('reopens the sheet from the stepper rather than editing the cart', () => {
    const onOpenVariants = jest.fn();
    useVillageStore.getState().addToCart('p1-v1', {
      key: 'p1-v1', productId: 'p1', variantIndex: 1, name: multi.title,
      weight: '1 pc (1 L)', price: 58.25, mrp: 99.95,
    });

    render(<DynamicProductCard product={multi} onOpenVariants={onOpenVariants} />);
    fireEvent.press(screen.getByTestId('variant-stepper-inc'));
    fireEvent.press(screen.getByTestId('variant-stepper-dec'));

    expect(onOpenVariants).toHaveBeenCalledTimes(2);
    expect(useVillageStore.getState().cart['p1-v1']).toBe(1);
  });
});

describe('DynamicProductCard, no variants', () => {
  it('adds straight to the cart and steps in place', () => {
    render(<DynamicProductCard product={plain} onOpenVariants={jest.fn()} />);

    fireEvent.press(screen.getByText('ADD'));
    expect(useVillageStore.getState().cart.p2).toBe(1);

    fireEvent.press(screen.getByTestId('stepper-inc'));
    expect(useVillageStore.getState().cart.p2).toBe(2);
  });

  it('shows no options label and no pack line', () => {
    render(<DynamicProductCard product={plain} onOpenVariants={jest.fn()} />);
    expect(screen.queryByText(/options/)).toBeNull();
  });

  it('hides the pack line rather than repeating the title when the variant name duplicates it', () => {
    render(<DynamicProductCard product={duplicateNamedVariant} onOpenVariants={jest.fn()} />);
    expect(screen.getAllByText('GOPURAM Kumkum (Red) - 40 G')).toHaveLength(1);
  });

  it('ignores a phantom variant-keyed cart line for a product this card treats as plain', () => {
    // Simulates the known cross-page inconsistency: ProductCard opens its sheet
    // for variants.length >= 1 while this card only does so for > 1, so a
    // product this card renders as "plain" can still carry a `${id}-v0` cart
    // line from being added on another screen. The plain stepper's own buttons
    // only ever touch the bare `p2` key, so its display and gating — including
    // which mode it renders in — must ignore that phantom line rather than
    // folding it into the total (a stepper stuck at "0" with a dead "-" is the
    // same symptom as the original bug, just relocated).
    useVillageStore.setState({ cart: { 'p2-v0': 2 }, cartSnapshots: {}, lastVariantKey: {} });

    render(<DynamicProductCard product={plain} onOpenVariants={jest.fn()} />);

    // No bare-key line for p2 exists yet, so this renders ADD, not a stepper
    // showing the phantom line's total.
    expect(screen.getByText('ADD')).toBeTruthy();

    fireEvent.press(screen.getByText('ADD'));
    expect(useVillageStore.getState().cart.p2).toBe(1);
    expect(useVillageStore.getState().cart['p2-v0']).toBe(2); // untouched
    expect(screen.getByText('1')).toBeTruthy();

    fireEvent.press(screen.getByTestId('stepper-dec'));
    expect(useVillageStore.getState().cart.p2).toBeUndefined();
    expect(useVillageStore.getState().cart['p2-v0']).toBe(2); // still untouched
  });
});

describe('DynamicProductCard, stock cap', () => {
  it('shows the stock-limit snackbar instead of adding once ownCount reaches stock', () => {
    useVillageStore.setState({ cart: { p2: 5 }, cartSnapshots: {}, lastVariantKey: {} });

    render(<DynamicProductCard product={plain} onOpenVariants={jest.fn()} />);
    fireEvent.press(screen.getByTestId('stepper-inc'));

    expect(useVillageStore.getState().cart.p2).toBe(5); // unchanged
    expect(useSnackbarStore.getState().message).toBe('We only have 5 left in stock');
  });
});

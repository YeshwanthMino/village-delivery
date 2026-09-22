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

// The more common real-world shape of the same underlying bug: the variant's
// title isn't identical to the product's, it's the product title with the
// size tacked on ("<title> ( 30 ml )") — a prefix duplicate, not an exact
// one. Shown as-is this still reads as the product name printed twice.
const sizeSuffixedVariant: HomeProduct = {
  id: 'p4',
  title: 'Sri padmavathi Dheepam Oil Packet',
  image: 'https://cdn/p4.jpg',
  mrp: 10,
  price: 10,
  discountPct: 0,
  inStock: true,
  stock: 60,
  hasVariants: false,
  variants: [
    { id: 'v0', name: 'Sri padmavathi Dheepam Oil Packet ( 30 ml )', price: 10, mrp: 10, stock: 60 },
  ],
};

// Some catalog records have no populated variant and no product-level price
// field either — real examples seen from the backend carry only id/title/
// image, an empty `variants: []`, and nothing priced. mapProduct's fallback
// chain (variant price → dealPrice → listPrice → mrp) has nothing to find,
// so price/mrp both come out 0. Always out of stock (stock is summed from
// variants too), but a shopper must never see that rendered as "₹0".
const noPriceData: HomeProduct = {
  id: 'p5',
  title: 'Pesala Pappu - 30 Kg',
  image: 'https://cdn/p5.jpg',
  mrp: 0,
  price: 0,
  discountPct: 0,
  inStock: false,
  stock: 0,
};

beforeEach(() => useVillageStore.setState({ cart: {}, cartSnapshots: {}, lastVariantKey: {} }));
beforeEach(() => useSnackbarStore.setState({ message: null, key: 0, bottomOffset: 0 }));

describe('DynamicProductCard, multi-variant', () => {
  it('shows the default pack, and "N options" under ADD in the button', () => {
    render(<DynamicProductCard product={multi} onOpenVariants={jest.fn()} />);

    // Matches the reference competitor layout: a multi-variant card's button
    // carries its own "N options" line under "ADD" (button grows a line
    // taller for these cards only — single-variant/plain cards are unaffected).
    // No chevron next to the pack label — the button's own "N options" line
    // is the only "this opens a picker" signal now; a second one was redundant.
    expect(screen.getByText('1 pc (250 ml)')).toBeTruthy();
    expect(screen.queryByTestId('variant-options-indicator')).toBeNull();
    expect(screen.getByText('ADD')).toBeTruthy();
    expect(screen.getByTestId('add-button-options-count')).toHaveTextContent('2 options');
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

  it('shows no options label, no pack line, and no variant chevron', () => {
    render(<DynamicProductCard product={plain} onOpenVariants={jest.fn()} />);
    expect(screen.queryByText(/options/)).toBeNull();
    expect(screen.queryByTestId('variant-options-indicator')).toBeNull();
  });

  it('hides the pack line rather than repeating the title when the variant name duplicates it', () => {
    render(<DynamicProductCard product={duplicateNamedVariant} onOpenVariants={jest.fn()} />);
    expect(screen.getAllByText('GOPURAM Kumkum (Red) - 40 G')).toHaveLength(1);
  });

  // Regression: the more common real shape of the same bug — the variant
  // name is the product title with " ( 30 ml )" tacked on, not an exact
  // duplicate. The title should render once, and the pack line should show
  // only the size, bracket-free ("30 ml"), not the full "<title> ( 30 ml )"
  // string or a parenthesized "( 30 ml )".
  it('strips the repeated title and wrapping parens from a size-suffixed variant name', () => {
    render(<DynamicProductCard product={sizeSuffixedVariant} onOpenVariants={jest.fn()} />);
    expect(screen.getAllByText('Sri padmavathi Dheepam Oil Packet')).toHaveLength(1);
    expect(screen.getByText('30 ml')).toBeTruthy();
    expect(screen.queryByText(/\(\s*30 ml\s*\)/)).toBeNull();
    // Single variant: no chevron implying more options to pick.
    expect(screen.queryByTestId('variant-options-indicator')).toBeNull();
  });

  it('hides the price row instead of showing a false "₹0" when no price data exists', () => {
    render(<DynamicProductCard product={noPriceData} onOpenVariants={jest.fn()} />);
    expect(screen.getByText('Pesala Pappu - 30 Kg')).toBeTruthy();
    expect(screen.getByText('Out of Stock')).toBeTruthy();
    expect(screen.queryByText('₹0')).toBeNull();
  });

  // Regression: a product with exactly one real variant never opens the
  // sheet (see useVariantCardView's isMulti), so it adds via this plain
  // path. That path used to build a variant-less snapshot (variantId
  // omitted), even though the product's real backend record has a variant
  // document with its own id, price, tax and HSN — the same id the order
  // and stock-check APIs need to identify the line. Losing it made two
  // different single-variant products, or a single-variant product added
  // alongside a multi-variant line, indistinguishable to the backend.
  it('carries the sole variant id into the cart snapshot on plain add', () => {
    render(<DynamicProductCard product={duplicateNamedVariant} onOpenVariants={jest.fn()} />);

    fireEvent.press(screen.getByText('ADD'));

    expect(useVillageStore.getState().cartSnapshots.p3?.variantId).toBe('v0');
  });

  it('does not invent a variantId for a genuinely variant-less product', () => {
    render(<DynamicProductCard product={plain} onOpenVariants={jest.fn()} />);

    fireEvent.press(screen.getByText('ADD'));

    expect(useVillageStore.getState().cartSnapshots.p2?.variantId).toBeUndefined();
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

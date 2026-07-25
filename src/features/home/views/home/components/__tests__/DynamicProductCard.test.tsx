import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { DynamicProductCard } from '../DynamicProductCard';
import { useVillageStore } from '@/src/core/store/useVillageStore';
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

beforeEach(() => useVillageStore.setState({ cart: {}, cartSnapshots: {}, lastVariantKey: {} }));

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
});

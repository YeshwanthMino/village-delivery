import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Modal } from 'react-native';
import { ProductCarouselRow } from '../ProductCarouselRow';
import type { ProductCarouselSection } from '@/src/features/home/data/homeLayout.types';

jest.mock('../DynamicProductCard', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    DynamicProductCard: ({ product, onOpenVariants }: { product: { id: string; title: string }; onOpenVariants: (product: unknown) => void }) => (
      <Pressable onPress={() => onOpenVariants(product)}><Text>{product.title}</Text></Pressable>
    ),
  };
});

it('uses the Home screen’s single variant-sheet controller for every row', () => {
  const open = jest.fn();
  const section: ProductCarouselSection = {
    kind: 'productCarousel', id: 'deals', title: 'Deals', hideTitle: false,
    products: [{ id: 'rice', title: 'Rice', image: '', mrp: 40, price: 35, discountPct: 13, inStock: true }],
  };
  const { getByText, UNSAFE_queryByType } = render(<ProductCarouselRow section={section} onOpenVariants={open} />);
  expect(UNSAFE_queryByType(Modal)).toBeNull();
  fireEvent.press(getByText('Rice'));
  expect(open).toHaveBeenCalledWith(section.products[0]);
});

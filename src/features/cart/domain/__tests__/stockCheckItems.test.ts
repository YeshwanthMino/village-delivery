import { buildStockCheckItems } from '../stockCheckItems';
import type { CartLineItem } from '@/src/base/types/village.types';

const line = (over: Partial<CartLineItem>): CartLineItem => ({
  key: 'k',
  productId: 'prod1',
  variantIndex: null,
  name: 'Item',
  nameTE: '',
  weight: '',
  price: 10,
  mrp: 20,
  count: 1,
  ...over,
} as CartLineItem);

describe('buildStockCheckItems', () => {
  test('carries productId and quantity for a plain line', () => {
    expect(buildStockCheckItems([line({ productId: 'prod1', count: 3 })])).toEqual([
      { productId: 'prod1', quantity: 3 },
    ]);
  });

  test('includes variantId when the line has one', () => {
    expect(
      buildStockCheckItems([line({ productId: 'prod1', variantId: 'var1', count: 2 })]),
    ).toEqual([{ productId: 'prod1', variantId: 'var1', quantity: 2 }]);
  });

  test('omits variantId entirely rather than sending undefined', () => {
    const [item] = buildStockCheckItems([line({})]);
    expect('variantId' in item).toBe(false);
  });

  test('keeps two variants of one product as separate entries', () => {
    const result = buildStockCheckItems([
      line({ key: 'p-v0', productId: 'prod1', variantId: 'var-500g', count: 1 }),
      line({ key: 'p-v1', productId: 'prod1', variantId: 'var-1kg', count: 2 }),
    ]);

    expect(result).toEqual([
      { productId: 'prod1', variantId: 'var-500g', quantity: 1 },
      { productId: 'prod1', variantId: 'var-1kg', quantity: 2 },
    ]);
  });

  test('maps an empty cart to an empty list', () => {
    expect(buildStockCheckItems([])).toEqual([]);
  });
});

import { buildStockConflicts, isEveryLineOutOfStock } from '../stockConflicts';

const line = (over: Partial<{ productId: string; variantId?: string; count: number }>) => ({
  productId: 'prod1',
  count: 1,
  ...over,
});

describe('buildStockConflicts', () => {
  test('a fully out-of-stock line is a conflict at 0 available', () => {
    const items = [line({ productId: 'p1', count: 2 })];
    const status = { p1: { inStock: false, availableQuantity: 0 } };
    expect(buildStockConflicts(items, status)).toEqual([{ productId: 'p1', availableStock: 0 }]);
  });

  test('a line with less stock than the cart quantity is also a conflict', () => {
    const items = [line({ productId: 'p1', count: 5 })];
    const status = { p1: { inStock: true, availableQuantity: 2 } };
    expect(buildStockConflicts(items, status)).toEqual([{ productId: 'p1', availableStock: 2 }]);
  });

  test('a line with enough stock for the cart quantity is not a conflict', () => {
    const items = [line({ productId: 'p1', count: 2 })];
    const status = { p1: { inStock: true, availableQuantity: 2 } };
    expect(buildStockConflicts(items, status)).toEqual([]);
  });

  test('a line not yet checked is not a conflict — fails open', () => {
    expect(buildStockConflicts([line({ productId: 'p1', count: 2 })], {})).toEqual([]);
  });

  test('in stock with no known quantity is not a conflict — nothing to compare against', () => {
    const items = [line({ productId: 'p1', count: 5 })];
    const status = { p1: { inStock: true } };
    expect(buildStockConflicts(items, status)).toEqual([]);
  });

  test('keeps two variants of the same product distinct', () => {
    const items = [
      line({ productId: 'p1', variantId: 'v500g', count: 3 }),
      line({ productId: 'p1', variantId: 'v1kg', count: 1 }),
    ];
    const status = {
      v500g: { inStock: true, availableQuantity: 1 },
      v1kg: { inStock: true, availableQuantity: 1 },
    };
    expect(buildStockConflicts(items, status)).toEqual([
      { productId: 'p1', variantId: 'v500g', availableStock: 1 },
    ]);
  });

  test('an empty cart yields no conflicts', () => {
    expect(buildStockConflicts([], {})).toEqual([]);
  });
});

describe('isEveryLineOutOfStock', () => {
  test('false for an empty cart', () => {
    expect(isEveryLineOutOfStock([], {})).toBe(false);
  });

  test('false when any line has not been checked yet', () => {
    const items = [line({ productId: 'p1' }), line({ productId: 'p2' })];
    const status = { p1: { inStock: false, availableQuantity: 0 } };
    expect(isEveryLineOutOfStock(items, status)).toBe(false);
  });

  test('false when only some lines are out of stock', () => {
    const items = [line({ productId: 'p1' }), line({ productId: 'p2' })];
    const status = {
      p1: { inStock: false, availableQuantity: 0 },
      p2: { inStock: true, availableQuantity: 5 },
    };
    expect(isEveryLineOutOfStock(items, status)).toBe(false);
  });

  test('false when a line is merely short of stock rather than at zero', () => {
    const items = [line({ productId: 'p1', count: 5 })];
    const status = { p1: { inStock: true, availableQuantity: 1 } };
    expect(isEveryLineOutOfStock(items, status)).toBe(false);
  });

  test('true when every line has been checked and every one has zero stock', () => {
    const items = [line({ productId: 'p1' }), line({ productId: 'p2' })];
    const status = {
      p1: { inStock: false, availableQuantity: 0 },
      p2: { inStock: false },
    };
    expect(isEveryLineOutOfStock(items, status)).toBe(true);
  });
});

import { cartLimit, orderLimit } from '../orderLimit';

describe('orderLimit', () => {
  test('maxOrderQuantity 0 means no limit: stock alone decides', () => {
    // e.g. Rusk (50 gm): stock 19980, maxOrderQuantity 0
    expect(orderLimit(19980, 0)).toBe(19980);
  });

  test('a missing maxOrderQuantity means no limit', () => {
    expect(orderLimit(12, undefined)).toBe(12);
  });

  test('a positive maxOrderQuantity tightens the stock limit', () => {
    expect(orderLimit(19980, 5)).toBe(5);
  });

  test('never exceeds stock, even when the cap is higher', () => {
    expect(orderLimit(3, 10)).toBe(3);
  });

  test('out of stock stays out of stock', () => {
    expect(orderLimit(0, 5)).toBe(0);
    expect(orderLimit(undefined, 5)).toBe(0);
  });

  test('ignores a negative cap', () => {
    expect(orderLimit(8, -1)).toBe(8);
  });
});

describe('cartLimit', () => {
  test('no stock check yet and no cap: unlimited', () => {
    expect(cartLimit(undefined, 0)).toBeUndefined();
    expect(cartLimit(undefined, undefined)).toBeUndefined();
  });

  test('no stock check yet: the per-order cap still applies', () => {
    expect(cartLimit(undefined, 4)).toBe(4);
  });

  test('takes the tighter of live stock and the cap', () => {
    expect(cartLimit(10, 4)).toBe(4);
    expect(cartLimit(2, 4)).toBe(2);
  });

  test('cap 0 leaves the live stock limit alone', () => {
    expect(cartLimit(10, 0)).toBe(10);
  });
});

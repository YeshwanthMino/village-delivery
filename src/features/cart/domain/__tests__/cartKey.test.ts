import { cartKeyFor, parseCartKey } from '../cartKey';

describe('cartKey', () => {
  test('a plain product key parses back to itself', () => {
    expect(parseCartKey('prod1')).toEqual({ productId: 'prod1', variantIndex: null });
  });

  test('a variant key yields the product id and index', () => {
    expect(parseCartKey('prod1-v2')).toEqual({ productId: 'prod1', variantIndex: 2 });
  });

  test('round-trips through cartKeyFor', () => {
    expect(parseCartKey(cartKeyFor('prod1', 0))).toEqual({ productId: 'prod1', variantIndex: 0 });
    expect(parseCartKey(cartKeyFor('prod1', null))).toEqual({ productId: 'prod1', variantIndex: null });
  });

  test('resolves against the last -v segment when the id contains one', () => {
    // Mongo ids will not do this, but the greedy capture is the behaviour both
    // previous implementations had, and it must not silently change.
    expect(parseCartKey('prod-v1-v3')).toEqual({ productId: 'prod-v1', variantIndex: 3 });
  });

  test('does not treat a non-numeric suffix as a variant', () => {
    expect(parseCartKey('prod-vlarge')).toEqual({ productId: 'prod-vlarge', variantIndex: null });
  });
});

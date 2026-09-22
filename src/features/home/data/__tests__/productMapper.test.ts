// src/features/home/data/__tests__/productMapper.test.ts
import { mapApiProduct, mapVariants } from '../productMapper';

describe('mapVariants', () => {
  it('drops unpopulated ObjectId refs', () => {
    const raw = { variantIds: ['60f0a0a0a0a0a0a0a0a0a0a0'] };
    expect(mapVariants(raw)).toEqual([]);
  });

  // Regression: a populated variant object without `_id` used to map to
  // `Variant.id: ''`, which threads through productSnapshot as an empty
  // variantId — indistinguishable from "no variant" downstream. Adding two
  // such variants of one product to the cart collapsed them into a single
  // unaddressable line instead of two distinct ones.
  it('drops populated variant objects missing _id', () => {
    const raw = {
      variants: [
        { title: '500ml', mrp: 100, dealPrice: 90 },
        { _id: 'v1', title: '1ltr', mrp: 180, dealPrice: 160 },
      ],
    };
    const variants = mapVariants(raw);
    expect(variants).toHaveLength(1);
    expect(variants[0].id).toBe('v1');
  });

  it('keeps every variant when each carries an _id', () => {
    const raw = {
      variants: [
        { _id: 'v1', title: '500ml', mrp: 100, dealPrice: 90 },
        { _id: 'v2', title: '1ltr', mrp: 180, dealPrice: 160 },
      ],
    };
    expect(mapVariants(raw).map((v) => v.id)).toEqual(['v1', 'v2']);
  });
});

describe('mapApiProduct', () => {
  it('excludes id-less variants from the mapped product', () => {
    const raw = {
      _id: 'p1',
      title: 'Dheepam Oil',
      variants: [
        { _id: 'v1', title: '500ml', mrp: 100, dealPrice: 90 },
        { title: '1ltr (malformed)', mrp: 180, dealPrice: 160 },
      ],
    };
    const product = mapApiProduct(raw);
    expect(product.variants).toHaveLength(1);
    expect(product.variants?.[0].id).toBe('v1');
  });
});

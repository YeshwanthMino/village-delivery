// src/features/home/data/__tests__/homeLayoutMapper.test.ts
import { isCategoryActive, isProductActive, mapHomeLayout, mapProduct, mapProductWithVariants } from '../homeLayoutMapper';
import { mapApiProduct } from '../productMapper';
import { rupees } from '@/src/shared/utils/currency';

describe('isProductActive', () => {
  it('treats active:false as inactive', () => {
    expect(isProductActive({ active: false })).toBe(false);
  });
  it('treats missing or true active as active', () => {
    expect(isProductActive({})).toBe(true);
    expect(isProductActive({ active: true })).toBe(true);
  });
});

describe('mapHomeLayout product filtering', () => {
  it('drops inactive products from a product carousel', () => {
    const raw = {
      _id: 'l1',
      productCarousels: [
        {
          _id: 'pc1',
          title: 'Deals',
          products: [
            { _id: 'a', title: 'Active', active: true, stock: 5, mrp: 10, dealPrice: 8 },
            { _id: 'b', title: 'Inactive', active: false, stock: 5, mrp: 10, dealPrice: 8 },
          ],
        },
      ],
      components: [{ collection: 'ProductCarousel', component: 'pc1' }],
    };
    const layout = mapHomeLayout(raw);
    const section = layout.sections.find((sec) => sec.kind === 'productCarousel') as any;
    expect(section.products.map((p: any) => p.id)).toEqual(['a']);
  });
});

describe('isCategoryActive', () => {
  it('treats active:false as inactive', () => {
    expect(isCategoryActive({ active: false })).toBe(false);
  });
  it('treats missing or true active as active', () => {
    expect(isCategoryActive({})).toBe(true);
    expect(isCategoryActive({ active: true })).toBe(true);
  });
});

describe('mapHomeLayout category filtering', () => {
  it('drops inactive menu items from a category section', () => {
    const raw = {
      _id: 'l1',
      featuredMenus: [
        {
          _id: 'm1',
          title: 'Shop by category',
          menuItems: [
            { docId: 'c-a', title: 'Active Cat', active: true, imageUrl: 'a.png' },
            { docId: 'c-b', title: 'Inactive Cat', active: false, imageUrl: 'b.png' },
            { docId: 'c-c', title: 'No Flag Cat', imageUrl: 'c.png' },
          ],
        },
      ],
      components: [{ collection: 'FeaturedMenu', component: 'm1' }],
    };
    const layout = mapHomeLayout(raw);
    const section = layout.sections.find((sec) => sec.kind === 'category') as any;
    expect(section.items.map((i: any) => i.id)).toEqual(['c-a', 'c-c']);
  });

  it('drops a whole category section when the menu is inactive', () => {
    const raw = {
      _id: 'l1',
      featuredMenus: [
        {
          _id: 'm1',
          title: 'Hidden menu',
          active: false,
          menuItems: [{ docId: 'c-a', title: 'Active Cat', active: true, imageUrl: 'a.png' }],
        },
      ],
      components: [{ collection: 'FeaturedMenu', component: 'm1' }],
    };
    const layout = mapHomeLayout(raw);
    expect(layout.sections.find((sec) => sec.kind === 'category')).toBeUndefined();
  });
});

describe('mapProduct variants', () => {
  const raw = {
    _id: 'p1',
    title: 'Figaro Extra Virgin Olive Oil',
    variantIds: [
      {
        _id: 'v1',
        title: '1 pc (250 ml)',
        mrp: 599,
        dealPrice: 310,
        stockId: { stock: 4 },
        landingImage: 'https://cdn/250.jpg',
      },
      {
        _id: 'v2',
        title: '1 pc (1 L)',
        mrp: 1999,
        dealPrice: 1165,
        stock: 2,
        images: ['https://cdn/1l.jpg'],
      },
    ],
  };

  it('keeps every variant on the mapped product, in rupee-to-unit terms', () => {
    const product = mapProduct(raw);
    expect(product.variants).toHaveLength(2);
    const first = product.variants?.[0];
    expect(first?.id).toBe('v1');
    expect(first?.name).toBe('1 pc (250 ml)');
    expect(rupees(first!.price)).toBe('₹310');
    expect(rupees(first!.mrp)).toBe('₹599');
    expect(first?.stock).toBe(4);
    expect(first?.image).toBe('https://cdn/250.jpg');
  });

  it('falls back to the first gallery image when there is no landingImage', () => {
    expect(mapProduct(raw).variants?.[1].image).toBe('https://cdn/1l.jpg');
  });

  it('keeps the raw landingImage alongside the resolved image', () => {
    const variants = mapProduct(raw).variants!;
    // v1 has a landingImage; v2 has only a gallery image.
    expect(variants[0].landingImage).toBe('https://cdn/250.jpg');
    expect(variants[0].image).toBe('https://cdn/250.jpg');
    expect(variants[1].landingImage).toBeUndefined();
    expect(variants[1].image).toBe('https://cdn/1l.jpg');
  });

  it('treats a variant with no active flag as active, like every other active check', () => {
    const variants = mapProduct(raw).variants!;
    expect(variants[0].active).toBe(true); // fixture sets no active flag
    const explicit = mapProduct({
      ...raw,
      variantIds: [{ ...raw.variantIds[0], active: false }],
    });
    expect(explicit.variants![0].active).toBe(false);
  });

  it('still flags hasVariants only when there is more than one', () => {
    expect(mapProduct(raw).hasVariants).toBe(true);
    const single = { ...raw, variantIds: [raw.variantIds[0]] };
    expect(mapProduct(single).hasVariants).toBe(false);
    expect(mapProduct(single).variants).toHaveLength(1);
  });

  it('leaves variants undefined when the response has none', () => {
    expect(mapProduct({ _id: 'p2', title: 'Loose rice', mrp: 100 }).variants).toBeUndefined();
  });

  // The variant sheet's ADD button reads tax/free-item fields off these
  // variants (bill.ts productSnapshot); a card mapper that silently strips
  // them would submit an incomplete order. mapProduct and mapApiProduct must
  // agree on every field, not just price and stock.
  it('agrees field-for-field with mapApiProduct (the source of truth for variant shape)', () => {
    expect(mapProduct(raw).variants).toEqual(mapApiProduct(raw).variants);
  });

  it('preserves variant order — cart keys are ${productId}-v${index}', () => {
    expect(mapProduct(raw).variants!.map((v) => v.id)).toEqual(['v1', 'v2']);
  });

  it('keeps the card price in sync with the first variant', () => {
    const product = mapProduct(raw);
    expect(product.price).toBe(product.variants![0].price);
  });

  it('coerces a string stockId.stock to a number', () => {
    const withStringStock = {
      _id: 'p3',
      title: 'Ghee',
      variantIds: [{ _id: 'v1', title: '500 g', mrp: 500, dealPrice: 450, stockId: { stock: '4' } }],
    };
    const stock = mapProduct(withStringStock).variants?.[0].stock;
    expect(stock).toBe(4);
    expect(typeof stock).toBe('number');
  });

  it('drops unpopulated variant refs (raw ObjectId strings) instead of mapping a nameless row', () => {
    const withUnpopulatedRef = {
      _id: 'p4',
      title: 'Rice',
      variantIds: ['64f0000000000000000000aa', raw.variantIds[0]],
    };
    const product = mapProduct(withUnpopulatedRef);
    expect(product.variants).toHaveLength(1);
    expect(product.variants?.[0].id).toBe('v1');
    // hasVariants and the card image must read the same (filtered) array —
    // a single real variant behind a dropped ref is not "has variants", and
    // the image must come from the populated entry, not the unpopulated one.
    expect(product.hasVariants).toBe(false);
    expect(product.image).toBe('https://cdn/250.jpg');
    expect(product.variants).toEqual(mapApiProduct(withUnpopulatedRef).variants);
  });

  it('falls back to product-level stock when every variant ref is unpopulated', () => {
    const allUnpopulated = {
      _id: 'p5',
      title: 'Salt',
      stock: 7,
      variantIds: ['64f0000000000000000000aa', '64f0000000000000000000bb'],
    };
    const product = mapProduct(allUnpopulated);
    expect(product.variants).toBeUndefined();
    expect(product.hasVariants).toBe(false);
    expect(product.stock).toBe(7);
    expect(product.inStock).toBe(true);
  });
});

describe('mapProductWithVariants price units', () => {
  it('converts the variant-less fallback price and mrp to units, like every other mapper', () => {
    // No variantIds, so productPrice/productMrp fall back to the raw-JSON
    // rupee values — those must go through toUnits() same as everywhere else,
    // or rupees() double-converts them (the c60933e class of bug).
    const product = mapProductWithVariants({ _id: 'p1', title: 'Loose Rice', mrp: 100, dealPrice: 80 });
    expect(rupees(product.price)).toBe('₹80');
    expect(rupees(product.mrp)).toBe('₹100');
  });
});

describe('variants arriving under the new `variants` key', () => {
  const newShape = {
    _id: 'p9',
    title: 'Kandhi Pappu',
    variants: [
      { _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 100, landingImage: 'https://cdn/kp.webp' },
      { _id: 'v2', title: '250 gm', mrp: 30, dealPrice: 28, stock: 0 },
    ],
  };

  it('maps them through mapProduct', () => {
    const product = mapProduct(newShape);
    expect(product.variants).toHaveLength(2);
    expect(product.variants![0].id).toBe('v1');
    expect(rupees(product.price)).toBe('₹200');
    expect(rupees(product.mrp)).toBe('₹220');
    expect(product.stock).toBe(100);
    expect(product.inStock).toBe(true);
    expect(product.hasVariants).toBe(true);
    expect(product.image).toBe('https://cdn/kp.webp');
  });

  it('maps them through mapApiProduct, agreeing field-for-field with mapProduct', () => {
    expect(mapApiProduct(newShape).variants).toEqual(mapProduct(newShape).variants);
    expect(mapApiProduct(newShape).stock).toBe(100);
  });

  it('maps them through mapProductWithVariants', () => {
    const product = mapProductWithVariants(newShape);
    expect(product.variants).toHaveLength(2);
    expect(rupees(product.price)).toBe('₹200');
    // product.image is asserted in a later task, which fixes its fallback chain.
  });

  it('prefers `variants` when a response carries both keys', () => {
    const both = {
      ...newShape,
      variantIds: [{ _id: 'old', title: 'stale', mrp: 999, dealPrice: 999, stock: 1 }],
    };
    expect(mapProduct(both).variants!.map((v) => v.id)).toEqual(['v1', 'v2']);
    expect(mapProductWithVariants(both).variants!.map((v) => v.id)).toEqual(['v1', 'v2']);
    expect(mapApiProduct(both).variants!.map((v) => v.id)).toEqual(['v1', 'v2']);
  });

  it('still drops unpopulated refs under the new key', () => {
    const withRef = { ...newShape, variants: ['64f0000000000000000000aa', newShape.variants[0]] };
    const product = mapProduct(withRef);
    expect(product.variants).toHaveLength(1);
    expect(product.variants![0].id).toBe('v1');
    expect(product.hasVariants).toBe(false);
  });
});

describe('categoryId shapes', () => {
  const bare = { _id: 'p1', title: 'Kandhi Pappu', categoryId: '68a57d05701cbce1ebb1e924' };
  const populated = { _id: 'p1', title: 'Kandhi Pappu', categoryId: { _id: 'c1', title: 'Pulses' } };

  it('reads a bare id string', () => {
    expect(mapApiProduct(bare).categoryId).toBe('68a57d05701cbce1ebb1e924');
    expect(mapProductWithVariants(bare).categoryId).toBe('68a57d05701cbce1ebb1e924');
    expect(mapProduct(bare).categoryId).toBe('68a57d05701cbce1ebb1e924');
  });

  it('reads a populated categoryId object', () => {
    expect(mapApiProduct(populated).categoryId).toBe('c1');
    expect(mapProductWithVariants(populated).categoryId).toBe('c1');
    expect(mapProduct(populated).categoryId).toBe('c1');
  });

  it('yields no categoryId when the field is absent', () => {
    expect(mapApiProduct({ _id: 'p1', title: 'x' }).categoryId).toBe('');
    expect(mapProduct({ _id: 'p1', title: 'x' }).categoryId).toBeUndefined();
  });
});

describe('category name and path', () => {
  const raw = {
    _id: 'p1',
    title: 'Kandhi Pappu',
    categoryId: '68a57d05701cbce1ebb1e924',
    category: 'Pulses',
    categoryPath: '_Pulses',
  };

  it('maps both fields on every product mapper', () => {
    expect(mapApiProduct(raw).categoryName).toBe('Pulses');
    expect(mapApiProduct(raw).categoryPath).toBe('_Pulses');
    expect(mapProductWithVariants(raw).categoryName).toBe('Pulses');
    expect(mapProductWithVariants(raw).categoryPath).toBe('_Pulses');
    expect(mapProduct(raw).categoryName).toBe('Pulses');
    expect(mapProduct(raw).categoryPath).toBe('_Pulses');
  });

  it('leaves them undefined when absent or empty', () => {
    const without = { _id: 'p2', title: 'Rice', category: '', categoryPath: '' };
    expect(mapApiProduct(without).categoryName).toBeUndefined();
    expect(mapApiProduct(without).categoryPath).toBeUndefined();
    expect(mapProduct({ _id: 'p3', title: 'Salt' }).categoryName).toBeUndefined();
  });
});

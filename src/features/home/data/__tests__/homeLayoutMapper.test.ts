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
    expect(product.image).toBe('https://cdn/kp.webp');
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

describe('mapApiProduct image fallback', () => {
  it('falls back to the product landingImage when no variant has an image', () => {
    const raw = {
      _id: 'p1',
      title: 'Kandhi Pappu',
      landingImage: 'https://cdn/product.webp',
      variants: [{ _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 5 }],
    };
    expect(mapApiProduct(raw).image).toBe('https://cdn/product.webp');
  });

  it('falls back to the first product gallery image after that', () => {
    const raw = {
      _id: 'p2',
      title: 'Kandhi Pappu',
      images: ['https://cdn/gallery.webp'],
      variants: [{ _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 5 }],
    };
    expect(mapApiProduct(raw).image).toBe('https://cdn/gallery.webp');
  });

  it('still prefers the variant image when there is one', () => {
    const raw = {
      _id: 'p3',
      title: 'Kandhi Pappu',
      landingImage: 'https://cdn/product.webp',
      variants: [
        { _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 5, landingImage: 'https://cdn/variant.webp' },
      ],
    };
    expect(mapApiProduct(raw).image).toBe('https://cdn/variant.webp');
  });

  it('falls through to the product image when a variant image stringifies to empty', () => {
    // landingImage: [] is truthy, so mapVariant's guard passes it through to
    // String([]) === '' — the chain must not treat that as a real image.
    const raw = {
      _id: 'p4',
      title: 'Kandhi Pappu',
      landingImage: 'https://cdn/product.webp',
      variants: [{ _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 5, landingImage: [] }],
    };
    expect(mapApiProduct(raw).image).toBe('https://cdn/product.webp');
  });

  it('leaves image undefined when nothing has one', () => {
    const raw = {
      _id: 'p5',
      title: 'Salt',
      variants: [{ _id: 'v1', title: '1 kg', mrp: 20, dealPrice: 20, stock: 5 }],
    };
    expect(mapApiProduct(raw).image).toBeUndefined();
  });
});

describe('mapProductWithVariants image fallback', () => {
  const noProductImage = {
    _id: 'p1',
    title: 'Kandhi Pappu',
    variants: [{ _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 5, landingImage: 'https://cdn/kp.webp' }],
  };

  it("uses the variant's landingImage when the variant has no gallery array", () => {
    expect(mapProductWithVariants(noProductImage).image).toBe('https://cdn/kp.webp');
  });

  it("uses the variant's first gallery image when it has no landingImage", () => {
    const galleryOnly = {
      ...noProductImage,
      variants: [{ _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 5, images: ['https://cdn/gal.webp'] }],
    };
    expect(mapProductWithVariants(galleryOnly).image).toBe('https://cdn/gal.webp');
  });

  it('still prefers the product-level landingImage over the variant', () => {
    const withProductImage = { ...noProductImage, landingImage: 'https://cdn/product.webp' };
    expect(mapProductWithVariants(withProductImage).image).toBe('https://cdn/product.webp');
  });

  it('maps to an empty string when nothing has an image', () => {
    const nothing = { _id: 'p2', title: 'Salt', variants: [{ _id: 'v1', title: '1 kg', mrp: 20, dealPrice: 20, stock: 5 }] };
    expect(mapProductWithVariants(nothing).image).toBe('');
  });
});

// A real /app/product response, trimmed to three of its six variants (one
// per stock condition: plentiful, plentiful, out of stock). Prices are the
// payload's real rupee values, so every assertion goes through rupees().
const KANDHI_PAPPU = {
  _id: '6a69e3c4fcbaf7b551f79ab0',
  title: 'కంది పప్పు | Kandhi Pappu (Toor Dal)',
  description: '',
  teluguTitle: 'కంది పప్పు',
  landingImage: 'https://ik.imagekit.io/mf/Kandi_pappu.webp',
  categoryId: '68a57d05701cbce1ebb1e924',
  rating: 0,
  reviews: 0,
  manufacturerId: '68a5af6ae286fe170cd176af',
  category: 'Pulses',
  categoryPath: '_Pulses',
  variants: [
    {
      _id: '6a6a3284fcbaf7b551f79ac2',
      active: true,
      title: 'కంది పప్పు | Kandhi Pappu (Toor Dal) - 1 kg - Normal Quality',
      slug: 'or-kandhi-pappu-toor-dal-1-kg-normal-quality',
      teluguTitle: 'కంది పప్పు - 1 kg - Normal Quality',
      description: '',
      mrp: 220,
      listPrice: 200,
      dealPrice: 200,
      taxType: 'NIL',
      taxRate: 0,
      hasFreeItem: true,
      landingImage: 'https://ik.imagekit.io/mf/Kandi_pappu.webp',
      images: ['https://ik.imagekit.io/mf/Kandi_pappu.webp'],
      stock: 100,
    },
    {
      _id: '6a6a329afcbaf7b551f79acb',
      active: true,
      title: 'కంది పప్పు | Kandhi Pappu (Toor Dal) - 1 kg - Top Quality',
      slug: 'or-kandhi-pappu-toor-dal-1-kg-top-quality',
      teluguTitle: 'కంది పప్పు - 1 kg - Top Quality',
      description: '',
      mrp: 110,
      listPrice: 100,
      dealPrice: 100,
      taxType: 'NIL',
      taxRate: 0,
      hasFreeItem: true,
      landingImage: 'https://ik.imagekit.io/mf/Kandi_pappu.webp',
      images: ['https://ik.imagekit.io/mf/Kandi_pappu.webp'],
      stock: 90,
    },
    {
      _id: '6a6a3284fcbaf7b551f79ac1',
      active: true,
      title: 'కంది పప్పు | Kandhi Pappu (Toor Dal) - 250 gm - Top Quality',
      slug: 'or-kandhi-pappu-toor-dal-250-gm-top-quality',
      teluguTitle: 'కంది పప్పు - 250 gm - Top Quality',
      description: '',
      mrp: 30,
      listPrice: 28,
      dealPrice: 28,
      taxType: 'NIL',
      taxRate: 0,
      hasFreeItem: true,
      landingImage: 'https://ik.imagekit.io/mf/Kandi_pappu.webp',
      images: ['https://ik.imagekit.io/mf/Kandi_pappu.webp'],
      stock: 0,
    },
  ],
};

describe('the real Kandhi Pappu payload', () => {
  it('maps every product-level field through mapApiProduct', () => {
    const product = mapApiProduct(KANDHI_PAPPU);
    expect(product.id).toBe('6a69e3c4fcbaf7b551f79ab0');
    expect(product.name).toBe('కంది పప్పు | Kandhi Pappu (Toor Dal)');
    expect(product.nameTE).toBe('కంది పప్పు');
    expect(product.categoryId).toBe('68a57d05701cbce1ebb1e924');
    expect(product.categoryName).toBe('Pulses');
    expect(product.categoryPath).toBe('_Pulses');
    expect(product.manufacturerId).toBe('68a5af6ae286fe170cd176af');
    expect(product.image).toBe('https://ik.imagekit.io/mf/Kandi_pappu.webp');
    expect(product.stock).toBe(190); // 100 + 90 + 0
    expect(rupees(product.price)).toBe('₹200');
    expect(rupees(product.mrp)).toBe('₹220');
  });

  it('maps every variant field onto the Variant dataclass', () => {
    const first = mapApiProduct(KANDHI_PAPPU).variants![0];
    expect(first).toEqual({
      id: '6a6a3284fcbaf7b551f79ac2',
      name: 'కంది పప్పు | Kandhi Pappu (Toor Dal) - 1 kg - Normal Quality',
      nameTE: 'కంది పప్పు - 1 kg - Normal Quality',
      slug: 'or-kandhi-pappu-toor-dal-1-kg-normal-quality',
      description: '',
      price: 10, // ₹200 in units
      mrp: 11, // ₹220 in units
      listPrice: 10,
      dealPrice: 10,
      stock: 100,
      landingImage: 'https://ik.imagekit.io/mf/Kandi_pappu.webp',
      image: 'https://ik.imagekit.io/mf/Kandi_pappu.webp',
      images: ['https://ik.imagekit.io/mf/Kandi_pappu.webp'],
      taxType: 'NIL',
      taxRate: 0,
      hasFreeItem: true,
      hsn: '',
      active: true,
    });
  });

  it('maps identically on the card path', () => {
    const card = mapProduct(KANDHI_PAPPU);
    expect(card.variants).toEqual(mapApiProduct(KANDHI_PAPPU).variants);
    expect(card.hasVariants).toBe(true);
    expect(card.stock).toBe(190);
    expect(card.inStock).toBe(true);
    expect(rupees(card.price)).toBe('₹200');
    expect(card.discountPct).toBe(9); // (220-200)/220 = 9.09% -> 9
    expect(card.categoryName).toBe('Pulses');
  });

  it('keeps the out-of-stock variant in the list rather than dropping it', () => {
    // The variant sheet must show it, disabled — silently omitting a variant
    // would renumber the ${productId}-v${index} cart keys.
    const variants = mapProduct(KANDHI_PAPPU).variants!;
    expect(variants).toHaveLength(3);
    expect(variants[2].stock).toBe(0);
  });

  it('collapses to product-level stock when every variant ref is unpopulated', () => {
    // Same guarantee the old `variantIds` key had, now under `variants`.
    const allUnpopulated = {
      ...KANDHI_PAPPU,
      stock: 7,
      variants: ['64f0000000000000000000aa', '64f0000000000000000000bb'],
    };
    const card = mapProduct(allUnpopulated);
    expect(card.variants).toBeUndefined();
    expect(card.hasVariants).toBe(false);
    expect(card.stock).toBe(7);
    expect(card.inStock).toBe(true);
  });
});

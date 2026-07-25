// src/features/home/data/__tests__/homeLayoutMapper.test.ts
import { isCategoryActive, isProductActive, mapHomeLayout, mapProduct } from '../homeLayoutMapper';

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
    expect(product.variants?.[0]).toMatchObject({
      id: 'v1',
      name: '1 pc (250 ml)',
      price: 310 / 20,
      mrp: 599 / 20,
      stock: 4,
      image: 'https://cdn/250.jpg',
    });
  });

  it('falls back to the first gallery image when there is no landingImage', () => {
    expect(mapProduct(raw).variants?.[1].image).toBe('https://cdn/1l.jpg');
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
});

// src/features/product/data/__tests__/productDetailApi.test.ts
import { mapProductDetail } from '../productDetailApi';
import { rupees } from '@/src/shared/utils/currency';

const RAW = {
  _id: '69f2c9520469cfb86fcdd71a',
  title: 'Natu Kodi gudlu',
  description: '',
  mrp: 25,
  listPrice: 20,
  dealPrice: 20,
  landingImage: 'https://img/land.png',
  images: ['https://img/land.png'],
  categoryId: { _id: 'c1', title: 'Dairy & Eggs', path: '_Dairy-&-Eggs' },
  similarProducts: [],
};

describe('mapProductDetail', () => {
  it('maps core fields and computes discount from mrp vs price', () => {
    const d = mapProductDetail(RAW);
    expect(d.id).toBe('69f2c9520469cfb86fcdd71a');
    expect(d.title).toBe('Natu Kodi gudlu');
    // The mapper converts rupees to internal units at the boundary, so assert
    // through rupees(): the payload said 20/25 and the customer must read 20/25.
    expect(rupees(d.price)).toBe('₹20');
    expect(rupees(d.mrp)).toBe('₹25');
    expect(d.discountPct).toBe(20); // (25-20)/25 = 20%, unaffected by scaling
    expect(d.categoryTitle).toBe('Dairy & Eggs');
  });

  it('falls back images to [landingImage] when images is empty', () => {
    const d = mapProductDetail({ ...RAW, images: [] });
    expect(d.images).toEqual(['https://img/land.png']);
  });

  it('prefers dealPrice, then listPrice, then mrp for price', () => {
    expect(rupees(mapProductDetail({ ...RAW, dealPrice: undefined }).price)).toBe('₹20'); // listPrice
    expect(rupees(mapProductDetail({ ...RAW, dealPrice: undefined, listPrice: undefined }).price)).toBe('₹25'); // mrp
  });

  it('reports 0 discount when fallback price equals mrp', () => {
    const d = mapProductDetail({ ...RAW, dealPrice: undefined, listPrice: undefined });
    expect(rupees(d.price)).toBe('₹25');
    expect(d.discountPct).toBe(0);
  });

  it('yields empty image and images when both landingImage and images are absent', () => {
    const d = mapProductDetail({ ...RAW, images: [], landingImage: undefined });
    expect(d.image).toBe('');
    expect(d.images).toEqual([]);
  });

  it('maps active similar products via mapProduct, dropping inactive ones', () => {
    const d = mapProductDetail({
      ...RAW,
      similarProducts: [
        { _id: 's1', title: 'Sim A', active: true, mrp: 10, dealPrice: 8, landingImage: 'a.png' },
        { _id: 's2', title: 'Sim B', active: false, mrp: 10, dealPrice: 8, landingImage: 'b.png' },
      ],
    });
    expect(d.similarProducts).toHaveLength(1);
    expect(d.similarProducts[0].id).toBe('s1');
  });

  it('defaults discountPct to 0 when there is no discount', () => {
    const d = mapProductDetail({ ...RAW, mrp: 20, listPrice: 20, dealPrice: 20 });
    expect(d.discountPct).toBe(0);
  });

  it('treats absent stock as in-stock and active by default', () => {
    const d = mapProductDetail(RAW);
    expect(d.inStock).toBe(true);
    expect(d.active).toBe(true);
  });

  it('maps inStock from stock count', () => {
    expect(mapProductDetail({ ...RAW, stock: 0 }).inStock).toBe(false);
    expect(mapProductDetail({ ...RAW, stock: 3 }).inStock).toBe(true);
  });

  it('maps active:false to inactive', () => {
    expect(mapProductDetail({ ...RAW, active: false }).active).toBe(false);
  });

  it('falls back to the top-level category name when categoryId is a bare string', () => {
    const d = mapProductDetail({
      ...RAW,
      categoryId: '68a57d05701cbce1ebb1e924',
      category: 'Pulses',
    });
    expect(d.categoryTitle).toBe('Pulses');
  });

  it('still prefers the populated categoryId.title', () => {
    const d = mapProductDetail({ ...RAW, category: 'Ignored' });
    expect(d.categoryTitle).toBe('Dairy & Eggs');
  });

  it('takes stock from the variants when the product has them', () => {
    const withVariants = {
      ...RAW,
      stock: 99, // product-level value must be ignored once variants exist
      variantIds: [
        { _id: 'v1', title: '6 pc', mrp: 25, dealPrice: 20, stock: 2 },
        { _id: 'v2', title: '12 pc', mrp: 45, dealPrice: 40, stock: 3 },
      ],
    };
    const d = mapProductDetail(withVariants);
    expect(d.stock).toBe(5);
    expect(d.inStock).toBe(true);
  });

  it('is out of stock when every variant is out of stock', () => {
    const allEmpty = {
      ...RAW,
      stock: 99,
      variantIds: [
        { _id: 'v1', title: '6 pc', mrp: 25, dealPrice: 20, stock: 0 },
        { _id: 'v2', title: '12 pc', mrp: 45, dealPrice: 40, stock: 0 },
      ],
    };
    const d = mapProductDetail(allEmpty);
    expect(d.stock).toBe(0);
    expect(d.inStock).toBe(false);
  });

  it('reads variant stock from stockId.stock when present', () => {
    const d = mapProductDetail({
      ...RAW,
      variantIds: [{ _id: 'v1', title: '6 pc', mrp: 25, dealPrice: 20, stockId: { stock: 7 } }],
    });
    expect(d.stock).toBe(7);
    expect(d.inStock).toBe(true);
  });

  it('maps variants arriving under the new `variants` key', () => {
    const d = mapProductDetail({
      ...RAW,
      stock: 99, // product-level value must be ignored once variants exist
      variants: [
        { _id: 'v1', title: '1 kg', mrp: 220, dealPrice: 200, stock: 100 },
        { _id: 'v2', title: '250 gm', mrp: 30, dealPrice: 28, stock: 0 },
      ],
    });
    expect(d.variants).toHaveLength(2);
    expect(d.variants![0].id).toBe('v1');
    expect(rupees(d.price)).toBe('₹200');
    expect(rupees(d.mrp)).toBe('₹220');
    expect(d.stock).toBe(100);
    expect(d.inStock).toBe(true);
  });
});

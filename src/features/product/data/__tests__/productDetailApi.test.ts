// src/features/product/data/__tests__/productDetailApi.test.ts
import { mapProductDetail } from '../productDetailApi';

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
    expect(d.price).toBe(20);
    expect(d.mrp).toBe(25);
    expect(d.discountPct).toBe(20); // (25-20)/25 = 20%
    expect(d.categoryTitle).toBe('Dairy & Eggs');
  });

  it('falls back images to [landingImage] when images is empty', () => {
    const d = mapProductDetail({ ...RAW, images: [] });
    expect(d.images).toEqual(['https://img/land.png']);
  });

  it('prefers dealPrice, then listPrice, then mrp for price', () => {
    expect(mapProductDetail({ ...RAW, dealPrice: undefined }).price).toBe(20); // listPrice
    expect(mapProductDetail({ ...RAW, dealPrice: undefined, listPrice: undefined }).price).toBe(25); // mrp
  });

  it('reports 0 discount when fallback price equals mrp', () => {
    const d = mapProductDetail({ ...RAW, dealPrice: undefined, listPrice: undefined });
    expect(d.price).toBe(25);
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
});

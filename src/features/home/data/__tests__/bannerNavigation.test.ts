import { getCategoryId, getSaleSlug } from '../bannerNavigation';
import { mapHomeLayout } from '../homeLayoutMapper';

describe('getSaleSlug', () => {
  it('returns the slug for a Sale slide', () => {
    expect(getSaleSlug({ collectionName: 'Sale', doc: { id: 'd', slug: 'diwal-sales-2027' } })).toBe('diwal-sales-2027');
  });
  it('ignores other collections', () => {
    expect(getSaleSlug({ collectionName: 'Category', doc: { id: 'd', slug: 'x' } })).toBeUndefined();
  });
  it('falls back to the /sale/<slug> link', () => {
    expect(getSaleSlug({ collectionName: 'Sale', link: '/sale/diwal-sales-2027' })).toBe('diwal-sales-2027');
  });
  it('returns undefined for a missing or blank slug', () => {
    expect(getSaleSlug({ collectionName: 'Sale' })).toBeUndefined();
    expect(getSaleSlug({ collectionName: 'Sale', doc: { id: 'd', slug: '  ' } })).toBeUndefined();
  });
});

describe('getCategoryId', () => {
  it('returns the docId for a Category slide', () => {
    expect(getCategoryId({ collectionName: 'Category', doc: { id: 'c1' } })).toBe('c1');
  });
  it('ignores other collections and missing docs', () => {
    expect(getCategoryId({ collectionName: 'Sale', doc: { id: 'c1' } })).toBeUndefined();
    expect(getCategoryId({ collectionName: 'Category' })).toBeUndefined();
  });
});

describe('mapHomeLayout banner slides', () => {
  const layout = (slides: unknown[]) =>
    mapHomeLayout({
      bannerCarousels: [{ _id: 'b1', slides }],
      components: [{ collection: 'BannerCarousel', component: 'b1' }],
    });

  it('extracts collectionName and docId.slug', () => {
    const s: any = layout([
      { _id: 's1', collectionName: 'Sale', docId: { _id: 'd', slug: 'diwal-sales-2027' }, link: '/sale/diwal-sales-2027' },
    ]).sections[0];
    expect(s.slides[0]).toMatchObject({ collectionName: 'Sale', doc: { id: 'd', slug: 'diwal-sales-2027' } });
  });

  it('tolerates null docId and keeps a bare-id docId', () => {
    const s: any = layout([
      { _id: 's1', collectionName: 'Sale', docId: null },
      { _id: 's2', collectionName: 'Sale', docId: 'abc123' },
    ]).sections[0];
    expect(s.slides.map((x: any) => x.doc)).toEqual([undefined, { id: 'abc123' }]);
  });
});

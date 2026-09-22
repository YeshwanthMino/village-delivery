import { KNOWN_ROOT_ROUTES, isKnownRoute, rootSegment } from '../knownRoutes';

describe('rootSegment', () => {
  it('extracts the root segment from a bare path', () => {
    expect(rootSegment('/cart')).toBe('cart');
  });

  it('extracts the root segment ignoring a query string', () => {
    expect(rootSegment('/order-detail?orderId=123')).toBe('order-detail');
  });

  it('extracts the root segment from a nested path', () => {
    expect(rootSegment('/location/search')).toBe('location');
  });

  it('extracts a group segment unchanged', () => {
    expect(rootSegment('/(dashboard)/home')).toBe('(dashboard)');
  });

  it('returns an empty string for an empty or root-only path', () => {
    expect(rootSegment('')).toBe('');
    expect(rootSegment('/')).toBe('');
  });
});

describe('isKnownRoute', () => {
  it('accepts every route in the known list', () => {
    for (const root of KNOWN_ROOT_ROUTES) {
      expect(isKnownRoute(`/${root}`)).toBe(true);
    }
  });

  it('accepts a known root with a nested path and query string', () => {
    expect(isKnownRoute('/order-detail?orderId=123')).toBe(true);
  });

  it('rejects an unknown route', () => {
    expect(isKnownRoute('/not-a-real-route')).toBe(false);
  });

  it('rejects an empty path', () => {
    expect(isKnownRoute('')).toBe(false);
  });
});

import { deriveCheckoutState } from '../checkoutState';

const base = { isAuthenticated: true, hasAddress: true, belowMinimum: false, outOfStock: false };

describe('deriveCheckoutState', () => {
  it('returns "out_of_stock" when every line is out of stock, overriding every other gate', () => {
    expect(deriveCheckoutState({ ...base, outOfStock: true })).toBe('out_of_stock');
    expect(deriveCheckoutState({ isAuthenticated: false, hasAddress: false, belowMinimum: true, outOfStock: true })).toBe('out_of_stock');
  });

  it('returns "below_minimum" when the cart is under the minimum order value, regardless of auth/address', () => {
    expect(deriveCheckoutState({ isAuthenticated: false, hasAddress: false, belowMinimum: true, outOfStock: false })).toBe('below_minimum');
    expect(deriveCheckoutState({ isAuthenticated: true, hasAddress: true, belowMinimum: true, outOfStock: false })).toBe('below_minimum');
  });

  it('returns "login" when not authenticated and the cart meets the minimum', () => {
    expect(deriveCheckoutState({ isAuthenticated: false, hasAddress: false, belowMinimum: false, outOfStock: false })).toBe('login');
    // auth is the first gate regardless of address
    expect(deriveCheckoutState({ isAuthenticated: false, hasAddress: true, belowMinimum: false, outOfStock: false })).toBe('login');
  });

  it('returns "address" when authenticated but no address', () => {
    expect(deriveCheckoutState({ isAuthenticated: true, hasAddress: false, belowMinimum: false, outOfStock: false })).toBe('address');
  });

  it('returns "place" when authenticated, an address is selected, and the cart meets the minimum', () => {
    expect(deriveCheckoutState({ ...base })).toBe('place');
  });
});

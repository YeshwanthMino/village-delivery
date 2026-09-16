import { deriveCheckoutState } from '../checkoutState';

describe('deriveCheckoutState', () => {
  it('returns "below_minimum" when the cart is under the minimum order value, regardless of auth/address', () => {
    expect(deriveCheckoutState({ isAuthenticated: false, hasAddress: false, belowMinimum: true })).toBe('below_minimum');
    expect(deriveCheckoutState({ isAuthenticated: true, hasAddress: true, belowMinimum: true })).toBe('below_minimum');
  });

  it('returns "login" when not authenticated and the cart meets the minimum', () => {
    expect(deriveCheckoutState({ isAuthenticated: false, hasAddress: false, belowMinimum: false })).toBe('login');
    // auth is the first gate regardless of address
    expect(deriveCheckoutState({ isAuthenticated: false, hasAddress: true, belowMinimum: false })).toBe('login');
  });

  it('returns "address" when authenticated but no address', () => {
    expect(deriveCheckoutState({ isAuthenticated: true, hasAddress: false, belowMinimum: false })).toBe('address');
  });

  it('returns "place" when authenticated, an address is selected, and the cart meets the minimum', () => {
    expect(deriveCheckoutState({ isAuthenticated: true, hasAddress: true, belowMinimum: false })).toBe('place');
  });
});

import { deriveCheckoutState } from '../checkoutState';

describe('deriveCheckoutState', () => {
  it('returns "login" when not authenticated', () => {
    expect(deriveCheckoutState({ isAuthenticated: false, hasAddress: false })).toBe('login');
    // auth is the first gate regardless of address
    expect(deriveCheckoutState({ isAuthenticated: false, hasAddress: true })).toBe('login');
  });

  it('returns "address" when authenticated but no address', () => {
    expect(deriveCheckoutState({ isAuthenticated: true, hasAddress: false })).toBe('address');
  });

  it('returns "place" when authenticated and an address is selected', () => {
    expect(deriveCheckoutState({ isAuthenticated: true, hasAddress: true })).toBe('place');
  });
});

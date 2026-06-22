import { deriveCheckoutState } from '../checkoutState';

describe('deriveCheckoutState', () => {
  it('returns "login" when not authenticated', () => {
    expect(
      deriveCheckoutState({ isAuthenticated: false, hasAddress: false, paymentMethod: null })
    ).toBe('login');
    // auth is the first gate regardless of other inputs
    expect(
      deriveCheckoutState({ isAuthenticated: false, hasAddress: true, paymentMethod: 'cod' })
    ).toBe('login');
  });

  it('returns "address" when authenticated but no address', () => {
    expect(
      deriveCheckoutState({ isAuthenticated: true, hasAddress: false, paymentMethod: null })
    ).toBe('address');
    expect(
      deriveCheckoutState({ isAuthenticated: true, hasAddress: false, paymentMethod: 'upi' })
    ).toBe('address');
  });

  it('returns "payment" when authed + address but no payment method', () => {
    expect(
      deriveCheckoutState({ isAuthenticated: true, hasAddress: true, paymentMethod: null })
    ).toBe('payment');
  });

  it('returns "place" when authed + address + payment method', () => {
    expect(
      deriveCheckoutState({ isAuthenticated: true, hasAddress: true, paymentMethod: 'cod' })
    ).toBe('place');
    expect(
      deriveCheckoutState({ isAuthenticated: true, hasAddress: true, paymentMethod: 'upi' })
    ).toBe('place');
  });
});

// Pure derivation of the Cart bottom-bar state from cart eligibility + auth + address.
// No React, no store access — unit-testable in isolation.
//
// Payment is always preselected (Cash on delivery by default) and chosen via
// the inline section below the bill summary, so it is not a gate here: once the
// cart clears the minimum order value and the user is authenticated with a
// delivery address, the bar is ready to place the order.

export type CheckoutState = 'below_minimum' | 'login' | 'address' | 'place';

export interface CheckoutInputs {
  isAuthenticated: boolean;
  hasAddress: boolean;
  belowMinimum: boolean;
}

export function deriveCheckoutState({
  isAuthenticated,
  hasAddress,
  belowMinimum,
}: CheckoutInputs): CheckoutState {
  if (belowMinimum) return 'below_minimum';
  if (!isAuthenticated) return 'login';
  if (!hasAddress) return 'address';
  return 'place';
}

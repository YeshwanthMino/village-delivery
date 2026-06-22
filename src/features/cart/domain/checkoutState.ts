// Pure derivation of the Cart bottom-bar state from auth + address.
// No React, no store access — unit-testable in isolation.
//
// Payment is always preselected (Cash on delivery by default) and chosen via
// the inline section below the bill summary, so it is not a gate here: once the
// user is authenticated and has a delivery address, the bar is ready to place
// the order.

export type CheckoutState = 'login' | 'address' | 'place';

export interface CheckoutInputs {
  isAuthenticated: boolean;
  hasAddress: boolean;
}

export function deriveCheckoutState({
  isAuthenticated,
  hasAddress,
}: CheckoutInputs): CheckoutState {
  if (!isAuthenticated) return 'login';
  if (!hasAddress) return 'address';
  return 'place';
}

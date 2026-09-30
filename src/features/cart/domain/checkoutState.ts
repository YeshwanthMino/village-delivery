// Pure derivation of the Cart bottom-bar state from cart eligibility + auth + address.
// No React, no store access — unit-testable in isolation.
//
// Payment is always preselected (Cash on delivery by default) and chosen via
// the inline section below the bill summary, so it is not a gate here: once the
// cart clears the minimum order value and the user is authenticated with a
// delivery address, the bar is ready to place the order.

export type CheckoutState = 'out_of_stock' | 'below_minimum' | 'login' | 'address' | 'place';

export interface CheckoutInputs {
  isAuthenticated: boolean;
  hasAddress: boolean;
  belowMinimum: boolean;
  /** True when any checked cart line is out of stock or has less available than
   *  the cart holds — an unchecked or failed stock check must never set this: the
   *  cart fails open, same as the stock check itself (see stockApi.ts). */
  outOfStock: boolean;
}

export function deriveCheckoutState({
  isAuthenticated,
  hasAddress,
  belowMinimum,
  outOfStock,
}: CheckoutInputs): CheckoutState {
  // Checked first: nothing else matters while the cart holds a line that
  // cannot be delivered as quantified.
  if (outOfStock) return 'out_of_stock';
  if (belowMinimum) return 'below_minimum';
  if (!isAuthenticated) return 'login';
  if (!hasAddress) return 'address';
  return 'place';
}

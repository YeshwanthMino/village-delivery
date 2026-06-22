// Pure derivation of the Cart bottom-bar state from auth + address + payment.
// No React, no store access — unit-testable in isolation.

import type { PaymentMethod } from '@/src/shared/components/PaymentMethodSection';

export type CheckoutState = 'login' | 'address' | 'payment' | 'place';

export interface CheckoutInputs {
  isAuthenticated: boolean;
  hasAddress: boolean;
  paymentMethod: PaymentMethod;
}

export function deriveCheckoutState({
  isAuthenticated,
  hasAddress,
  paymentMethod,
}: CheckoutInputs): CheckoutState {
  if (!isAuthenticated) return 'login';
  if (!hasAddress) return 'address';
  if (!paymentMethod) return 'payment';
  return 'place';
}

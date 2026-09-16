// src/features/cart/viewmodel/useCartAddressViewModel.ts
//
// Resolves the delivery address shown on the Cart. Loads saved addresses when
// authenticated (via the address-book VM) and derives the selected one.

import { useAuthStore } from '@/src/core/store/useAuthStore';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { useAddressBookViewModel } from '@/src/features/location/viewmodel/useAddressBookViewModel';
import { deriveSelectedAddress } from '@/src/features/location/domain/addressSelection';

export function useCartAddressViewModel() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addresses = useLocationStore((s) => s.savedAddresses);
  const selectedAddressId = useLocationStore((s) => s.selectedAddressId);
  const book = useAddressBookViewModel(); // auto-loads addresses when authenticated

  const selectedAddress = deriveSelectedAddress(addresses, selectedAddressId);

  return { isAuthenticated, selectedAddress, loading: book.loading };
}

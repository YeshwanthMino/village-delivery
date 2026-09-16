// src/features/location/domain/addressSelection.ts
//
// Pure helpers for resolving the user's selected delivery address. No React /
// RN / IO dependencies so they are trivially unit-testable.
//
// NOTE: the Cart shows a delivery address only when the user has *explicitly*
// chosen one (in the Home location flow or the Cart's address screen). The
// `isDefault` flag is intentionally NOT used to auto-select an address here —
// removing that fallback is deliberate, not a regression.

import type { Address, Village } from './models';

/** Address whose id matches, else null (null id → null). */
export function findAddressById(addresses: Address[], id: string | null): Address | null {
  if (!id) return null;
  return addresses.find((a) => a.id === id) ?? null;
}

/**
 * The address the Cart should display: only the explicitly selected one when it
 * still exists. Never falls back to the server default.
 */
export function deriveSelectedAddress(
  addresses: Address[],
  selectedId: string | null,
): Address | null {
  return findAddressById(addresses, selectedId);
}

/**
 * Reconcile a persisted selection against a freshly loaded address list: keep
 * the current selection id only when an address with that id still exists,
 * otherwise clear it. Never seeds from `isDefault`.
 */
export function reconcileSelectedId(
  addresses: Address[],
  currentSelectedId: string | null,
): string | null {
  return findAddressById(addresses, currentSelectedId)?.id ?? null;
}

/**
 * Build a serviceable Village straight from a saved address. Returns null when
 * the address carries no storeId (the home feed is keyed on storeId, so such an
 * address cannot switch the active store without a find-by-location fallback).
 */
export function villageFromAddress(address: Address): Village | null {
  if (!address.storeId) return null;
  return {
    id: address.villageId || address.storeId,
    name: address.villageName,
    storeId: address.storeId,
    pincode: address.pincode,
    latitude: address.latitude,
    longitude: address.longitude,
  };
}

/**
 * The full-address label the Home toolbar should show for the selected address
 * ("addressLine, village"). Returns null when there is no selection, no active
 * village, or the selection belongs to a different store than the active village
 * (e.g. the user later switched location via GPS/search without re-selecting an
 * address) — in which case the toolbar falls back to the village name.
 */
export function selectedAddressLabel(
  address: Address | null,
  village: Village | null,
): string | null {
  if (!address || !village) return null;
  if (address.storeId && village.storeId && address.storeId !== village.storeId) return null;
  const label = [address.addressLine1, address.villageName].filter(Boolean).join(', ');
  return label || null;
}

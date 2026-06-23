// src/features/location/domain/addressSelection.ts
//
// Pure helpers for resolving the user's selected delivery address. No React /
// RN / IO dependencies so they are trivially unit-testable.
//
// NOTE: the Cart shows a delivery address only when the user has *explicitly*
// chosen one (in the Home location flow or the Cart's address screen). The
// `isDefault` flag is intentionally NOT used to auto-select an address here —
// removing that fallback is deliberate, not a regression.

import type { Address } from './models';

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

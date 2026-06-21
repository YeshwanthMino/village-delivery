// src/features/location/domain/addressSelection.ts
//
// Pure helpers for resolving the user's selected delivery address. No React /
// RN / IO dependencies so they are trivially unit-testable.

import type { Address } from './models';

/** First address flagged isDefault; if several are, the first wins. Else null. */
export function pickDefaultAddress(addresses: Address[]): Address | null {
  return addresses.find((a) => a.isDefault) ?? null;
}

/** Address whose id matches, else null (null id → null). */
export function findAddressById(addresses: Address[], id: string | null): Address | null {
  if (!id) return null;
  return addresses.find((a) => a.id === id) ?? null;
}

/**
 * The address the Cart should display: the explicitly selected one when it
 * still exists, otherwise the server default (seeding), otherwise null.
 */
export function deriveSelectedAddress(
  addresses: Address[],
  selectedId: string | null,
): Address | null {
  return findAddressById(addresses, selectedId) ?? pickDefaultAddress(addresses);
}

/**
 * Persisted-selection seeding: keep an existing selection id; when none is set,
 * adopt the server default's id. Returns the id to store (may be null).
 */
export function seedSelectedId(
  addresses: Address[],
  currentSelectedId: string | null,
): string | null {
  if (currentSelectedId) return currentSelectedId;
  return pickDefaultAddress(addresses)?.id ?? null;
}

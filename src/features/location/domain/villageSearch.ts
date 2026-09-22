// src/features/location/domain/villageSearch.ts
//
// Pure helpers for the map-search flow. No React / RN / IO dependencies so they
// are trivially unit-testable.

import type { Village } from './models';

/** A Village the map can actually point its camera at. */
export type LocatedVillage = Village & { latitude: number; longitude: number };

function isValidCoord(value: unknown, max: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max;
}

/**
 * True when the village carries a usable lat/lng pair. `latitude`/`longitude`
 * are optional on Village (the directory API only fills them from
 * `defaultLocation`), and the API has been seen to send nulls — so this checks
 * for real finite numbers in range rather than truthiness, which would wrongly
 * reject the equator / prime meridian.
 */
export function hasCoordinates(village: Village): village is LocatedVillage {
  return isValidCoord(village.latitude, 90) && isValidCoord(village.longitude, 180);
}

/**
 * Village-search results reduced to the ones the map picker can recenter to.
 * Used only by the map's search screen — the standalone /location screen still
 * lists every result, since selecting there commits the village directly and
 * never needs coordinates.
 */
export function withCoordinates(villages: Village[]): LocatedVillage[] {
  return villages.filter(hasCoordinates);
}

// src/features/location/data/mappers.ts

import { Address, AddressTag, Village } from '../domain/models';

const TAG_VALUES: AddressTag[] = ['home', 'work', 'other'];

/** Pick the first defined value among candidate keys on an object. */
function pick(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

/** Map an arbitrary village-shaped API object into the domain Village. */
export function mapVillage(raw: any): Village | null {
  const data = raw?.data ?? raw;
  if (!data || typeof data !== 'object') return null;

  const node = Array.isArray(data) ? data[0] : data;
  if (!node) return null;

  const id = pick(node, ['_id', 'id', 'villageId']);
  // find-by-location returns the village name in `title`.
  const name = pick(node, ['title', 'name', 'villageName', 'village']);
  if (!id && !name) return null;

  const def =
    node.defaultLocation && typeof node.defaultLocation === 'object' ? node.defaultLocation : null;

  const secondaryName = pick(node, ['subtitle', 'locality', 'mandal', 'district', 'area']);

  return {
    id: id ? String(id) : 'unknown',
    name: name ? String(name) : 'Your location',
    secondaryName: secondaryName ? String(secondaryName) : undefined,
    pincode: pick(node, ['pincode', 'pinCode', 'postalCode']),
    latitude: pick(node, ['latitude', 'lat']) ?? def?.latitude,
    longitude: pick(node, ['longitude', 'lng', 'long']) ?? def?.longitude,
    storeId: pick(node, ['storeId', 'store']),
  };
}

/** Map the server's `label` (e.g. "Home") to our lowercase tag union. */
export function labelToTag(label?: string): AddressTag {
  const l = (label ?? '').trim().toLowerCase();
  return (TAG_VALUES as string[]).includes(l) ? (l as AddressTag) : 'other';
}

/**
 * Map an address API object into the domain Address. The /app/address API uses
 * `label` (tag), a single `addressLine` string, and a nested `location`.
 */
export function mapAddress(raw: any): Address {
  const node = raw?.data ?? raw;
  const villageRaw = pick(node, ['village']);
  const villageObj = villageRaw && typeof villageRaw === 'object' ? villageRaw : null;
  const villageStr = typeof villageRaw === 'string' ? villageRaw : undefined;
  const loc = node?.location && typeof node.location === 'object' ? node.location : null;
  return {
    id: String(pick(node, ['_id', 'id']) ?? ''),
    villageId: String(pick(node, ['villageId']) ?? villageObj?._id ?? villageStr ?? ''),
    villageName: String(
      pick(node, ['villageName']) ?? villageObj?.name ?? villageObj?.title ?? villageStr ?? pick(node, ['name']) ?? '',
    ),
    addressLine1: String(pick(node, ['addressLine', 'addressLine1']) ?? ''),
    landmark: pick(node, ['landmark']),
    pincode: pick(node, ['pincode']),
    latitude: pick(node, ['latitude', 'lat']) ?? loc?.latitude,
    longitude: pick(node, ['longitude', 'lng', 'long']) ?? loc?.longitude,
    tag: labelToTag(pick(node, ['label'])),
    isDefault: Boolean(pick(node, ['isDefault'])),
  };
}

/** Map an array (or wrapped array) of address objects. */
export function mapAddressList(raw: any): Address[] {
  const data = raw?.data ?? raw;
  const arr = Array.isArray(data) ? data : data?.items ?? data?.results ?? [];
  return Array.isArray(arr) ? arr.map(mapAddress) : [];
}

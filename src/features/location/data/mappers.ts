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
  // Some APIs wrap payloads in { data: ... }
  const data = raw?.data ?? raw;
  if (!data || typeof data !== 'object') return null;

  // Response may be a single object or an array; take the first.
  const node = Array.isArray(data) ? data[0] : data;
  if (!node) return null;

  const id = pick(node, ['_id', 'id', 'villageId']);
  // find-by-location returns the village name in `title`.
  const name = pick(node, ['title', 'name', 'villageName', 'village']);
  if (!id && !name) return null;

  // Coordinates may be top-level or nested under `defaultLocation`.
  const def =
    node.defaultLocation && typeof node.defaultLocation === 'object' ? node.defaultLocation : null;

  return {
    id: id ? String(id) : 'unknown',
    name: name ? String(name) : 'Your location',
    pincode: pick(node, ['pincode', 'pinCode', 'postalCode']),
    latitude: pick(node, ['latitude', 'lat']) ?? def?.latitude,
    longitude: pick(node, ['longitude', 'lng', 'long']) ?? def?.longitude,
    storeId: pick(node, ['storeId', 'store']),
  };
}

/** Encode the local-only tag as a prefix on addressLine2 so it round-trips. */
export function encodeTag(tag: AddressTag, addressLine2?: string): string {
  const rest = addressLine2?.trim() ?? '';
  return rest ? `[${tag}] ${rest}` : `[${tag}]`;
}

/** Extract { tag, addressLine2 } from a possibly tag-prefixed addressLine2. */
export function decodeTag(addressLine2?: string): { tag: AddressTag; addressLine2?: string } {
  if (!addressLine2) return { tag: 'home' };
  const match = addressLine2.match(/^\[(home|work|other)\]\s?(.*)$/i);
  if (match) {
    const tag = match[1].toLowerCase() as AddressTag;
    const rest = match[2]?.trim();
    return { tag: TAG_VALUES.includes(tag) ? tag : 'other', addressLine2: rest || undefined };
  }
  return { tag: 'home', addressLine2 };
}

/** Map an address API object into the domain Address. */
export function mapAddress(raw: any): Address {
  const node = raw?.data ?? raw;
  const { tag, addressLine2 } = decodeTag(pick(node, ['addressLine2']));
  // `village` may be a populated object, an id string, or absent.
  const villageRaw = pick(node, ['village']);
  const villageObj = villageRaw && typeof villageRaw === 'object' ? villageRaw : null;
  const villageStr = typeof villageRaw === 'string' ? villageRaw : undefined;
  return {
    id: String(pick(node, ['_id', 'id']) ?? ''),
    villageId: String(pick(node, ['villageId']) ?? villageObj?._id ?? villageStr ?? ''),
    villageName: String(pick(node, ['villageName']) ?? villageObj?.name ?? villageStr ?? pick(node, ['name']) ?? ''),
    addressLine1: String(pick(node, ['addressLine1']) ?? ''),
    addressLine2,
    landmark: pick(node, ['landmark']),
    pincode: pick(node, ['pincode']),
    latitude: pick(node, ['latitude', 'lat']),
    longitude: pick(node, ['longitude', 'lng']),
    tag,
    isDefault: Boolean(pick(node, ['isDefault'])),
  };
}

/** Map an array (or wrapped array) of address objects. */
export function mapAddressList(raw: any): Address[] {
  const data = raw?.data ?? raw;
  const arr = Array.isArray(data) ? data : data?.items ?? data?.results ?? [];
  return Array.isArray(arr) ? arr.map(mapAddress) : [];
}

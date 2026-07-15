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
 * Map an address API object into the domain Address. The /app/addresses API nests
 * the village as an object under `villageId` (with `_id`, `title`, `storeId`,
 * `defaultLocation`, `pincode`), and carries a top-level `storeId` plus a
 * `location` object. Older/flat shapes (a `village` key, or string ids) still
 * parse via fallbacks.
 */
export function mapAddress(raw: any): Address {
  const node = raw?.data ?? raw;
  const villageIdRaw = pick(node, ['villageId']);
  const villageKeyRaw = pick(node, ['village']);
  const villageObj =
    villageIdRaw && typeof villageIdRaw === 'object'
      ? villageIdRaw
      : villageKeyRaw && typeof villageKeyRaw === 'object'
        ? villageKeyRaw
        : null;
  const villageStr =
    typeof villageIdRaw === 'string'
      ? villageIdRaw
      : typeof villageKeyRaw === 'string'
        ? villageKeyRaw
        : undefined;
  const loc = node?.location && typeof node.location === 'object' ? node.location : null;
  const def =
    villageObj?.defaultLocation && typeof villageObj.defaultLocation === 'object'
      ? villageObj.defaultLocation
      : null;
  const storeId = pick(node, ['storeId']) ?? villageObj?.storeId;
  return {
    id: String(pick(node, ['_id', 'id']) ?? ''),
    villageId: String(villageObj?._id ?? villageStr ?? ''),
    villageName: String(
      villageObj?.title ?? villageObj?.name ?? pick(node, ['villageName']) ?? villageStr ?? pick(node, ['name']) ?? '',
    ),
    storeId: storeId != null ? String(storeId) : undefined,
    addressLine1: String(pick(node, ['addressLine', 'addressLine1']) ?? ''),
    landmark: pick(node, ['landmark']),
    pincode: pick(node, ['pincode']) ?? villageObj?.pincode,
    latitude: pick(node, ['latitude', 'lat']) ?? loc?.latitude ?? def?.latitude,
    longitude: pick(node, ['longitude', 'lng', 'long']) ?? loc?.longitude ?? def?.longitude,
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

/** Map an array (or wrapped array) of village-shaped objects, dropping nulls. */
export function mapVillageList(raw: any): Village[] {
  const data = raw?.data ?? raw;
  const arr = Array.isArray(data) ? data : data?.items ?? data?.results ?? [];
  if (!Array.isArray(arr)) return [];
  return arr.map(mapVillage).filter((v): v is Village => v !== null);
}

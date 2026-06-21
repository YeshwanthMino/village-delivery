// src/features/location/data/locationApi.ts

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService, StorageKeys } from '@/src/base/constants/AppConstants';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { LatLng, ServiceabilityResult, Address, AddressTag } from '../domain/models';
import { mapVillage, mapAddressList, mapAddress } from './mappers';

const BASE = WebService.villageBaseURL;

/**
 * The village API is multi-tenant: authed endpoints need the active store's
 * `x-store-id` header (same requirement as the AppAuth endpoints). Read it from
 * the persisted serviceable village. Returns undefined when none is set.
 */
async function storeOpts(): Promise<{ headers: Record<string, string> } | undefined> {
  const village = await StoredPrefs.getCustomData<{ storeId?: string }>(StorageKeys.SERVICEABLE_VILLAGE);
  return village?.storeId ? { headers: { 'x-store-id': village.storeId } } : undefined;
}

export interface CreateAddressInput {
  villageId: string;
  addressLine1: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  tag: AddressTag;
  mobileNumber: string;
}

function tagToLabel(tag: AddressTag): string {
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

/**
 * The /app/address API wants a single `addressLine`, a `label` (tag), the
 * customer's `mobileNumber`, and a nested `location`.
 */
function toDto(input: CreateAddressInput) {
  const addressLine = [input.addressLine1, input.landmark]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(', ');
  const dto: Record<string, any> = {
    label: tagToLabel(input.tag),
    addressLine,
    villageId: input.villageId,
    isDefault: input.isDefault,
    mobileNumber: input.mobileNumber,
  };
  if (input.latitude != null && input.longitude != null) {
    dto.location = { latitude: input.latitude, longitude: input.longitude };
  }
  return dto;
}

/** True when the find-by-location body carries a non-empty `title`. */
function hasTitle(raw: any): boolean {
  const data = raw?.data ?? raw;
  const node = Array.isArray(data) ? data[0] : data;
  return Boolean(node && typeof node === 'object' && typeof node.title === 'string' && node.title.trim());
}

/**
 * Serviceability check. Serviceable only when find-by-location returns 2xx AND
 * the body contains a `title`. A 2xx without `title` → not serviceable; a 4xx →
 * not serviceable; network/5xx throws so the caller can surface a retryable error.
 */
export async function findByLocation(coords: LatLng): Promise<ServiceabilityResult> {
  try {
    console.log('[LOC] findByLocation: POST', `${BASE}/villages/find-by-location`, coords);
    const data = await apiClient.postWithoutAuth<any>(`${BASE}/villages/find-by-location`, {
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    console.log('[LOC] findByLocation: response', JSON.stringify(data)?.slice(0, 500));
    if (hasTitle(data)) {
      return { serviceable: true, village: mapVillage(data) };
    }
    console.log('[LOC] findByLocation: no title → not serviceable');
    return { serviceable: false, village: null };
  } catch (err: any) {
    console.log('[LOC] findByLocation: ERROR status=', err?.statusCode, 'msg=', err?.message ?? err);
    const status = err?.statusCode;
    if (status && status >= 400 && status < 500) {
      return { serviceable: false, village: null };
    }
    throw err;
  }
}

export async function listAddresses(): Promise<Address[]> {
  const data = await apiClient.get<any>(`${BASE}/app/address`, await storeOpts());
  return mapAddressList(data);
}

export async function createAddress(input: CreateAddressInput): Promise<Address> {
  const data = await apiClient.post<any>(`${BASE}/app/address`, toDto(input), await storeOpts());
  return mapAddress(data);
}

export async function updateAddress(id: string, input: CreateAddressInput): Promise<Address> {
  const data = await apiClient.patch<any>(`${BASE}/app/address/${id}`, toDto(input), await storeOpts());
  return mapAddress(data);
}

export async function deleteAddress(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/app/address/${id}`, await storeOpts());
}

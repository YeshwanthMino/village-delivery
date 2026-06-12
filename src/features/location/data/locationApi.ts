// src/features/location/data/locationApi.ts

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';
import { LatLng, ServiceabilityResult, Address, AddressTag } from '../domain/models';
import { mapVillage, mapAddressList, mapAddress, encodeTag } from './mappers';

const BASE = WebService.villageBaseURL;

export interface CreateAddressInput {
  villageId: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  tag: AddressTag;
}

function toDto(input: CreateAddressInput) {
  return {
    villageId: input.villageId,
    addressLine1: input.addressLine1,
    addressLine2: encodeTag(input.tag, input.addressLine2),
    landmark: input.landmark,
    pincode: input.pincode,
    latitude: input.latitude,
    longitude: input.longitude,
    isDefault: input.isDefault,
  };
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
    const data = await apiClient.postWithoutAuth<any>(`${BASE}/villages/find-by-location`, {
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    if (hasTitle(data)) {
      return { serviceable: true, village: mapVillage(data) };
    }
    return { serviceable: false, village: null };
  } catch (err: any) {
    const status = err?.statusCode;
    if (status && status >= 400 && status < 500) {
      return { serviceable: false, village: null };
    }
    throw err;
  }
}

export async function listAddresses(): Promise<Address[]> {
  const data = await apiClient.get<any>(`${BASE}/address?limit=50&sort=_id:desc`);
  return mapAddressList(data);
}

export async function createAddress(input: CreateAddressInput): Promise<Address> {
  const data = await apiClient.post<any>(`${BASE}/address`, toDto(input));
  return mapAddress(data);
}

export async function updateAddress(id: string, input: CreateAddressInput): Promise<Address> {
  const data = await apiClient.patch<any>(`${BASE}/address/${id}`, toDto(input));
  return mapAddress(data);
}

export async function deleteAddress(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/address/${id}`);
}

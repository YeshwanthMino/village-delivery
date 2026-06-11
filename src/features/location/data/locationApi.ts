// src/features/location/data/locationApi.ts

import axios, { AxiosInstance } from 'axios';
import { WebService } from '@/src/base/constants/AppConstants';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { LatLng, ServiceabilityResult, Address, AddressTag } from '../domain/models';
import { mapVillage, mapAddressList, mapAddress, encodeTag } from './mappers';

const client: AxiosInstance = axios.create({
  baseURL: WebService.villageBaseURL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// Attach bearer token for authed endpoints when available.
client.interceptors.request.use(async (config) => {
  const token = await StoredPrefs.getAccessToken();
  const type = (await StoredPrefs.getTokenType()) || 'Bearer';
  if (token && config.headers) {
    config.headers.Authorization = `${type} ${token}`;
  }
  return config;
});

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
 * Serviceability check. Serviceable only when the response is 200 AND the body
 * contains a `title`. Any non-200, or a 200 without `title`, → not serviceable.
 * Network/5xx throws so the caller can surface a retryable error.
 */
export async function findByLocation(coords: LatLng): Promise<ServiceabilityResult> {
  try {
    const res = await client.post('/villages/find-by-location', {
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    // Serviceable requires 200 + a `title` in the body.
    if (res.status === 200 && hasTitle(res.data)) {
      return { serviceable: true, village: mapVillage(res.data) };
    }
    // 2xx without title (or any other non-200 2xx) → not serviceable.
    return { serviceable: false, village: null };
  } catch (err: any) {
    const status = err?.response?.status;
    if (status && status >= 400 && status < 500) {
      // 4xx (incl. not-found) → genuinely not serviceable.
      return { serviceable: false, village: null };
    }
    // Network error / 5xx → rethrow as retryable.
    throw err;
  }
}

export async function listAddresses(): Promise<Address[]> {
  const res = await client.get('/address', { params: { limit: 50, sort: '_id:desc' } });
  return mapAddressList(res.data);
}

export async function createAddress(input: CreateAddressInput): Promise<Address> {
  const res = await client.post('/address', toDto(input));
  return mapAddress(res.data);
}

export async function updateAddress(id: string, input: CreateAddressInput): Promise<Address> {
  const res = await client.patch(`/address/${id}`, toDto(input));
  return mapAddress(res.data);
}

export async function deleteAddress(id: string): Promise<void> {
  await client.delete(`/address/${id}`);
}

export async function setDefaultAddress(id: string, input: CreateAddressInput): Promise<Address> {
  const res = await client.patch(`/address/${id}`, { ...toDto(input), isDefault: true });
  return mapAddress(res.data);
}

// src/features/location/domain/models.ts

export type AddressTag = 'home' | 'work' | 'other';

export type ServiceabilityStatus =
  | 'idle'           // no location resolved yet
  | 'locating'       // requesting permission / reading GPS
  | 'checking'       // calling find-by-location
  | 'serviceable'    // 2xx — app unlocked
  | 'not_serviceable'// non-2xx / empty
  | 'error';         // network / 5xx

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Village {
  id: string;
  name: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  storeId?: string; // x-store-id for the dynamic home page-layout API
}

export interface Address {
  id: string;            // backend _id
  villageId: string;
  villageName: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  tag: AddressTag;       // local-only (no backend field) — derived/stored in addressLine2 prefix on read
  isDefault: boolean;
}

export interface ServiceabilityResult {
  serviceable: boolean;
  village: Village | null;
}

// src/features/location/domain/models.ts

export type AddressTag = 'home' | 'work' | 'other';

export type ServiceabilityStatus =
  | 'idle'            // no location resolved yet
  | 'locating'        // requesting permission / reading GPS
  | 'checking'        // calling find-by-location
  | 'serviceable'     // 2xx — app unlocked
  | 'not_serviceable' // non-2xx / empty
  | 'error';          // network / 5xx

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Village {
  id: string;
  name: string;
  secondaryName?: string; // optional finer label (locality/mandal/district) from backend
  pincode?: string;
  latitude?: number;
  longitude?: number;
  storeId?: string; // x-store-id for the dynamic home page-layout API
}

export interface Address {
  id: string;
  villageId: string;
  villageName: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  tag: AddressTag;
  isDefault: boolean;
}

export interface ServiceabilityResult {
  serviceable: boolean;
  village: Village | null;
}

/** A previously-resolved serviceable location, persisted locally for quick re-select. */
export interface RecentLocation {
  storeId: string;
  villageName: string;
  latitude: number;
  longitude: number;
  label: string;
  savedAt: number;
}

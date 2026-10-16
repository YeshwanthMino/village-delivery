// src/features/storeConfig/data/storeConfigApi.ts
//
// GET /app/store-config — the store's details/timings and the cashback
// programme settings. Called once on app start (see useStoreConfigStore).
//
// The endpoint answers for the store in the `x-store-id` header, which
// apiClient attaches from EXPO_PUBLIC_DEFAULT_STORE_ID, and works whether or
// not a customer is signed in.

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';
import {
  WEEKDAYS,
  type CashbackSettings,
  type CashbackTier,
  type DayTimings,
  type StoreInfo,
  type Weekday,
  type WeeklyStoreTimings,
} from './storeConfig.types';

const BASE = WebService.villageBaseURL;

/** Startup path: fail fast rather than hold the fallback config hostage. */
const STORE_CONFIG_TIMEOUT = 8000;

/**
 * What the mapper could make of a payload. Either half can be null — a
 * response missing `cashbackSettings` must leave the bundled defaults in
 * place rather than blank the programme out.
 */
export interface MappedStoreConfig {
  store: StoreInfo | null;
  cashbackSettings: CashbackSettings | null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function mapDayTimings(raw: any): DayTimings | null {
  if (!raw || typeof raw !== 'object') return null;
  const open = asString(raw.open);
  const close = asString(raw.close);
  const isClosed = raw.isClosed === true;
  // A day with no usable hours is only meaningful when it is flagged closed;
  // otherwise the entry tells us nothing and is dropped.
  if (!isClosed && (!open || !close)) return null;
  return { open, close, isClosed };
}

function mapTimings(raw: any): WeeklyStoreTimings | null {
  if (!raw || typeof raw !== 'object') return null;
  const timings = {} as WeeklyStoreTimings;
  for (const day of WEEKDAYS) {
    const mapped = mapDayTimings(raw[day]);
    // Any missing day makes "is the store open right now?" unanswerable for
    // that day, so treat a partial week as no week at all.
    if (!mapped) return null;
    timings[day as Weekday] = mapped;
  }
  return timings;
}

function mapStore(raw: any): StoreInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = asString(raw._id ?? raw.id);
  if (!id) return null;

  return {
    id,
    title: asString(raw.title),
    domain: asString(raw.domain),
    address: {
      addressLine1: asString(raw.address?.addressLine1),
      addressLine2: asString(raw.address?.addressLine2),
      city: asString(raw.address?.city),
      state: asString(raw.address?.state),
      pincode: asString(raw.address?.pincode),
      country: asString(raw.address?.country),
    },
    chargePerKm: asNumber(raw.chargePerKm, 0),
    contactNumbers: Array.isArray(raw.contactNumbers)
      ? raw.contactNumbers.filter((n: unknown): n is string => typeof n === 'string')
      : [],
    logo: asString(raw.logo),
    location: {
      latitude: asNumber(raw.location?.latitude, 0),
      longitude: asNumber(raw.location?.longitude, 0),
    },
    timings: mapTimings(raw.storeTimings) ?? ({} as WeeklyStoreTimings),
  };
}

function mapTiers(raw: unknown): CashbackTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((tier: any) => tier && typeof tier.amount === 'number')
    .map((tier: any) => ({
      amount: tier.amount,
      standardReward: asNumber(tier.standardReward, 0),
      vipReward: asNumber(tier.vipReward, 0),
    }));
}

function mapCashbackSettings(raw: any): CashbackSettings | null {
  if (!raw || typeof raw !== 'object') return null;
  const tiers = mapTiers(raw.tiers);
  return {
    // The payload carries neither flag today. Absent means "running": a
    // response that reached us at all describes a live programme, and
    // defaulting to inactive would silently kill cashback everywhere.
    active: raw.active !== false,
    isDeleted: raw.isDeleted === true,
    minOrderValue: asNumber(raw.minOrderValue, 0),
    vipUpgradeFee: asNumber(raw.vipUpgradeFee, 0),
    monthlyCap: asNumber(raw.monthlyCap, 0),
    activationDelay: asString(raw.activationDelay),
    expiryPeriod: asString(raw.expiryPeriod),
    vipMonthlySpendTarget: asNumber(raw.vipMonthlySpendTarget, 0),
    tiers,
  };
}

/** Normalise a raw payload. Never throws — an unusable half comes back null. */
export function mapStoreConfig(raw: any): MappedStoreConfig {
  // Some village endpoints wrap their payload in `data`, some do not.
  const body = raw?.store || raw?.cashbackSettings ? raw : raw?.data ?? raw;
  return {
    store: mapStore(body?.store),
    cashbackSettings: mapCashbackSettings(body?.cashbackSettings),
  };
}

export async function fetchStoreConfig(): Promise<MappedStoreConfig> {
  const response = await apiClient.get<any>(`${BASE}/app/store-config`, {
    timeout: STORE_CONFIG_TIMEOUT,
  });
  return mapStoreConfig(response);
}

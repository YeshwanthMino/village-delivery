// src/features/storeConfig/data/storeConfig.types.ts
//
// The app-wide store configuration served by GET /app/store-config: the
// store's own details and timings, plus the cashback programme settings.
// Fetched once on app start and held in useStoreConfigStore, which every
// consumer reads from (see that store for the fallback rules).

/** Weekday keys, as the API spells them. */
export const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** One day's opening hours. `open`/`close` are "HH:mm" in store-local time. */
export interface DayTimings {
  open: string;
  close: string;
  isClosed: boolean;
}

export type WeeklyStoreTimings = Record<Weekday, DayTimings>;

export interface StoreAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface StoreLocation {
  latitude: number;
  longitude: number;
}

export interface StoreInfo {
  id: string;
  title: string;
  domain: string;
  address: StoreAddress;
  /** Delivery charge per kilometre, in rupees. */
  chargePerKm: number;
  contactNumbers: string[];
  logo: string;
  location: StoreLocation;
  timings: WeeklyStoreTimings;
}

/** A single cashback milestone. All amounts are in rupees. */
export interface CashbackTier {
  amount: number;
  standardReward: number;
  vipReward: number;
}

/** Cashback programme settings, in rupees, as the API delivers them. */
export interface CashbackSettings {
  /** The payload omits these two today; the mapper defaults them to
   *  active/not-deleted so an unflagged response keeps cashback on. */
  active: boolean;
  isDeleted: boolean;
  minOrderValue: number;
  /** Monthly VIP membership fee — not charged per order. */
  vipUpgradeFee: number;
  monthlyCap: number;
  activationDelay: string;
  expiryPeriod: string;
  vipMonthlySpendTarget: number;
  tiers: CashbackTier[];
}

export interface StoreConfig {
  store: StoreInfo;
  cashbackSettings: CashbackSettings;
}

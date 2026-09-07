// src/features/cart/domain/cashbackConfig.ts
//
// Cashback tiers and store timings, typed to match the real settings
// payload but sourced locally until the backend ships a settings endpoint.
// Every consumer goes through `useCartCashback` (see useCartCashback.ts),
// so swapping this module's exports for a fetched value later touches no
// call site.
//
// See docs/superpowers/specs/2026-09-07-cart-cashback-progress-design.md
// for the full design.

/** A single cashback milestone. All amounts are in rupees. */
export interface CashbackTier {
  amount: number;
  standardReward: number;
  vipReward: number;
}

/** Cashback programme settings, in rupees, as the (future) API delivers them. */
export interface CashbackSettings {
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

export interface StoreTimings {
  opensAt: string;
  closesAt: string;
}

export const CASHBACK_SETTINGS: CashbackSettings = {
  active: true,
  isDeleted: false,
  minOrderValue: 199,
  vipUpgradeFee: 45,
  monthlyCap: 500,
  activationDelay: '1d',
  expiryPeriod: '2mo',
  vipMonthlySpendTarget: 2500,
  tiers: [
    { amount: 750, standardReward: 25, vipReward: 50 },
    { amount: 1500, standardReward: 50, vipReward: 100 },
    { amount: 2250, standardReward: 75, vipReward: 150 },
    { amount: 3000, standardReward: 100, vipReward: 200 },
    { amount: 3750, standardReward: 125, vipReward: 250 },
    { amount: 4500, standardReward: 150, vipReward: 300 },
    { amount: 5250, standardReward: 175, vipReward: 350 },
    { amount: 6000, standardReward: 200, vipReward: 400 },
    { amount: 6750, standardReward: 225, vipReward: 450 },
    { amount: 7500, standardReward: 250, vipReward: 500 },
  ],
};

// Not consumed by any UI yet — reserved for a future closed-store state.
export const STORE_TIMINGS: StoreTimings = {
  opensAt: '07:00',
  closesAt: '20:00',
};

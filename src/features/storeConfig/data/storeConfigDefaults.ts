// src/features/storeConfig/data/storeConfigDefaults.ts
//
// Bundled fallback for the cashback programme, used only until
// GET /app/store-config answers (and if it never does — offline cold start,
// server down). Values mirror the staging payload; the fetched settings
// replace them wholesale, they are never merged field by field.
//
// There is deliberately no fallback for StoreInfo: an invented address,
// phone number or logo would be worse than showing nothing, so the store
// details stay null until the real ones arrive.

import type { CashbackSettings } from './storeConfig.types';

export const DEFAULT_CASHBACK_SETTINGS: CashbackSettings = {
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

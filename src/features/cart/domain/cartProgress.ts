// src/features/cart/domain/cartProgress.ts
//
// Pure derivation of cashback progress + VIP upsell state from a cart's
// grand total. No React, no store access — unit-testable in isolation,
// same convention as checkoutState.ts.
//
// See docs/superpowers/specs/2026-09-07-cart-cashback-progress-design.md
// for the full design, including the copy table and the VIP-fee-is-monthly
// reasoning behind the upsell wording.

import { rupees, rupeesCeil, toUnits } from '@/src/shared/utils/currency';
import type { CashbackSettings, CashbackTier } from './cashbackConfig';

export type CartProgressPhase =
  | 'below_minimum'
  | 'toward_first_tier'
  | 'tier_unlocked'
  | 'max_tier'
  | 'disabled';

export interface CartProgressState {
  phase: CartProgressPhase;
  /** True once the cart clears minOrderValue — independent of tier progress. */
  canPlaceOrder: boolean;
  /** 0..1, segment-relative — resets to 0 at every milestone. */
  progress: number;
  /** Translation key + values for the primary line. Never a finished
   *  sentence — render via `renderTemplateWithBold` or `interpolateVars`. */
  primary: { key: string; vars: Record<string, string> };
  /** Null when the user is VIP, or in `below_minimum` / `disabled` phases. */
  vipUpsell: { key: string; vars: Record<string, string> } | null;
  /** Formatted rupee string for the highest tier already unlocked (e.g.
   *  "₹25"), or null before the first tier is reached. */
  unlockedReward: string | null;
  /** The tier the primary line is counting down to; null in `max_tier`
   *  and `disabled`. */
  nextTier: CashbackTier | null;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function getCartProgressState(
  cartTotalUnits: number,
  isVip: boolean,
  settings: CashbackSettings,
  earnedThisMonthRupees?: number,
): CartProgressState {
  const minOrderValueUnits = toUnits(settings.minOrderValue);
  const canPlaceOrder = cartTotalUnits >= minOrderValueUnits;

  if (!settings.active || settings.isDeleted || settings.tiers.length === 0) {
    return {
      phase: 'disabled',
      canPlaceOrder,
      progress: 0,
      primary: {
        key: 'shop_more_to_place_order',
        vars: { n: rupeesCeil(Math.max(0, minOrderValueUnits - cartTotalUnits)) },
      },
      vipUpsell: null,
      unlockedReward: null,
      nextTier: null,
    };
  }

  // Normalize every rupee figure in `settings` to internal units once, so
  // every comparison and every formatted amount below shares one space —
  // the same rupees-in/units-in-app boundary `currency.ts` documents for
  // API prices.
  const sortedTiers = [...settings.tiers].sort((a, b) => a.amount - b.amount);
  const tiers = sortedTiers.map(raw => ({
    raw,
    amountUnits: toUnits(raw.amount),
    standardRewardUnits: toUnits(raw.standardReward),
    vipRewardUnits: toUnits(raw.vipReward),
  }));
  const feeUnits = toUnits(settings.vipUpgradeFee);
  const capRemainingUnits = earnedThisMonthRupees === undefined
    ? undefined
    : toUnits(Math.max(0, settings.monthlyCap - earnedThisMonthRupees));

  const clamp = (units: number): number =>
    capRemainingUnits === undefined ? units : Math.min(units, capRemainingUnits);
  const rewardUnitsFor = (tier: (typeof tiers)[number]): number =>
    clamp(isVip ? tier.vipRewardUnits : tier.standardRewardUnits);
  const vipUpsellFor = (tier: (typeof tiers)[number]) =>
    isVip ? null : {
      key: 'vip_upsell_double',
      vars: { f: rupees(feeUnits), r: rupees(clamp(tier.vipRewardUnits)) },
    };

  const firstTier = tiers[0];

  if (cartTotalUnits < minOrderValueUnits) {
    return {
      phase: 'below_minimum',
      canPlaceOrder: false,
      progress: clamp01(cartTotalUnits / minOrderValueUnits),
      primary: {
        key: 'shop_more_to_place_order',
        vars: { n: rupeesCeil(minOrderValueUnits - cartTotalUnits) },
      },
      vipUpsell: null,
      unlockedReward: null,
      nextTier: firstTier.raw,
    };
  }

  if (cartTotalUnits < firstTier.amountUnits) {
    return {
      phase: 'toward_first_tier',
      canPlaceOrder: true,
      progress: clamp01(
        (cartTotalUnits - minOrderValueUnits) / (firstTier.amountUnits - minOrderValueUnits)
      ),
      primary: {
        key: 'cashback_shop_more',
        vars: {
          n: rupeesCeil(firstTier.amountUnits - cartTotalUnits),
          r: rupees(rewardUnitsFor(firstTier)),
        },
      },
      vipUpsell: vipUpsellFor(firstTier),
      unlockedReward: null,
      nextTier: firstTier.raw,
    };
  }

  const lastTier = tiers[tiers.length - 1];

  if (cartTotalUnits >= lastTier.amountUnits) {
    return {
      phase: 'max_tier',
      canPlaceOrder: true,
      progress: 1,
      primary: { key: 'cashback_max_unlocked', vars: { r: rupees(rewardUnitsFor(lastTier)) } },
      vipUpsell: vipUpsellFor(lastTier),
      unlockedReward: rupees(rewardUnitsFor(lastTier)),
      nextTier: null,
    };
  }

  let unlockedIdx = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (cartTotalUnits >= tiers[i].amountUnits) unlockedIdx = i;
  }
  const unlockedTier = tiers[unlockedIdx];
  const nextTier = tiers[unlockedIdx + 1];

  return {
    phase: 'tier_unlocked',
    canPlaceOrder: true,
    progress: clamp01(
      (cartTotalUnits - unlockedTier.amountUnits) / (nextTier.amountUnits - unlockedTier.amountUnits)
    ),
    primary: {
      key: 'cashback_shop_more',
      vars: {
        n: rupeesCeil(nextTier.amountUnits - cartTotalUnits),
        r: rupees(rewardUnitsFor(nextTier)),
      },
    },
    vipUpsell: vipUpsellFor(nextTier),
    unlockedReward: rupees(rewardUnitsFor(unlockedTier)),
    nextTier: nextTier.raw,
  };
}

# Cart Cashback Progress & VIP Upsell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show live cashback-tier progress and a VIP-membership upsell on the cart snackbar (`CartSummaryCard`) and the cart screen (`CartScreen` / `BillSummaryCard`), driven by one shared pure helper so the two surfaces cannot drift apart.

**Architecture:** A pure domain function `getCartProgressState()` (no React, same convention as `checkoutState.ts`) computes phase, progress, and copy-key/vars from a cart total, `isVip`, and a settings object. A thin hook `useCartCashback()` wraps it with the auth store and a local config module standing in for a not-yet-built settings API. Three UI call sites — the snackbar, a new cart-screen banner, and a new bill row — all consume the same hook, so behaviour is defined once.

**Tech Stack:** React Native + Expo, TypeScript, Zustand, NativeWind (Tailwind classes) for new screens, `StyleSheet` for the existing snackbar, Jest + `@testing-library/react-native`.

**Spec:** [docs/superpowers/specs/2026-09-07-cart-cashback-progress-design.md](../specs/2026-09-07-cart-cashback-progress-design.md)

## Global Constraints

- Cart money is in **internal units where `toUnits(rupees) = rupees / 20`** (`src/shared/utils/currency.ts`). Cashback settings arrive in **rupees**. Every comparison happens in unit-space after `toUnits()`; every displayed amount is formatted with `rupees()` / `rupeesCeil()`. Never interpolate a raw number into a `₹` string by hand.
- `cashbackSettings` and store timings are **not** fetched from an API yet. They live in a new local config module (`src/features/cart/domain/cashbackConfig.ts`), typed to match the real payload, so swapping in a fetch later is a one-file change. Store timings are typed and stored but **no UI consumes them this pass**.
- `isVip` is read from the auth store's cached profile (`user?.isVip`). **A logged-out user (`user === null`) is treated as non-VIP** — sees standard rewards and the VIP upsell.
- The VIP fee (`vipUpgradeFee`, ₹45) is a **monthly membership fee**, not a per-order charge. Every upsell string says **"₹45/month"**, never "₹45" alone.
- When `isVip` is `true`, **no `standardReward` figure is ever shown** — every reward, everywhere, is `vipReward` and `vipUpsell` is always `null`.
- Cashback is **earned, not a discount** — it never reduces `grandTotal`. The `Bill` interface (`src/base/types/village.types.ts`) and `ordersApi.buildBill` are **not modified**.
- Every new user-facing string needs both `te` and `en` entries in `translations.ts`, following the file's existing key style.
- `getCartProgressState`'s optional 4th parameter (`earnedThisMonthRupees`) exists for a future month-to-date field from the API. No caller passes it this pass — the monthly cap is inert until then, which is intentional, not a gap to fill.

---

### Task 1: Cashback config + the pure progress helper

**Files:**
- Create: `src/features/cart/domain/cashbackConfig.ts`
- Create: `src/features/cart/domain/cartProgress.ts`
- Test: `src/features/cart/domain/__tests__/cartProgress.test.ts`

**Interfaces:**
- Consumes: `toUnits`, `rupees`, `rupeesCeil` from `@/src/shared/utils/currency` (all three already exist, unchanged).
- Produces:
  - `CashbackTier { amount: number; standardReward: number; vipReward: number }`
  - `CashbackSettings { active: boolean; isDeleted: boolean; minOrderValue: number; vipUpgradeFee: number; monthlyCap: number; activationDelay: string; expiryPeriod: string; vipMonthlySpendTarget: number; tiers: CashbackTier[] }`
  - `StoreTimings { opensAt: string; closesAt: string }`
  - `CASHBACK_SETTINGS: CashbackSettings`, `STORE_TIMINGS: StoreTimings` (both from `cashbackConfig.ts`)
  - `CartProgressPhase = 'below_minimum' | 'toward_first_tier' | 'tier_unlocked' | 'max_tier' | 'disabled'`
  - `CartProgressState { phase: CartProgressPhase; canPlaceOrder: boolean; progress: number; primary: { key: string; vars: Record<string, string> }; vipUpsell: { key: string; vars: Record<string, string> } | null; unlockedReward: string | null; nextTier: CashbackTier | null }`
  - `getCartProgressState(cartTotalUnits: number, isVip: boolean, settings: CashbackSettings, earnedThisMonthRupees?: number): CartProgressState` (from `cartProgress.ts`)

- [ ] **Step 1: Write the failing test file**

Create `src/features/cart/domain/__tests__/cartProgress.test.ts`:

```ts
import { getCartProgressState } from '../cartProgress';
import { CASHBACK_SETTINGS, type CashbackSettings } from '../cashbackConfig';
import { toUnits } from '@/src/shared/utils/currency';

describe('getCartProgressState — below the ₹199 minimum', () => {
  test('below_minimum below ₹199, no VIP upsell', () => {
    const state = getCartProgressState(toUnits(50), false, CASHBACK_SETTINGS);

    expect(state.phase).toBe('below_minimum');
    expect(state.canPlaceOrder).toBe(false);
    expect(state.primary).toEqual({ key: 'shop_more_to_place_order', vars: { n: '₹149' } });
    expect(state.vipUpsell).toBeNull();
    expect(state.unlockedReward).toBeNull();
  });

  test('progress is total/minOrderValue, matching the pre-cashback bar', () => {
    const state = getCartProgressState(toUnits(50), false, CASHBACK_SETTINGS);
    expect(state.progress).toBeCloseTo(50 / 199, 3);
  });

  test('is not below_minimum at exactly ₹199', () => {
    const state = getCartProgressState(toUnits(199), false, CASHBACK_SETTINGS);
    expect(state.phase).not.toBe('below_minimum');
  });

  test('fractional shortfall displays ceiled, never ₹0', () => {
    const state = getCartProgressState(toUnits(198.9), false, CASHBACK_SETTINGS);
    expect(state.primary.vars.n).toBe('₹1');
  });
});

describe('getCartProgressState — toward the first tier (₹199 to ₹750)', () => {
  test('shows the shortfall to tier 1 and its standard reward', () => {
    const state = getCartProgressState(toUnits(250), false, CASHBACK_SETTINGS);

    expect(state.phase).toBe('toward_first_tier');
    expect(state.canPlaceOrder).toBe(true);
    expect(state.primary).toEqual({ key: 'cashback_shop_more', vars: { n: '₹500', r: '₹25' } });
  });

  test('VIP upsell doubles the reward and quotes the fee as monthly', () => {
    const state = getCartProgressState(toUnits(250), false, CASHBACK_SETTINGS);
    expect(state.vipUpsell).toEqual({ key: 'vip_upsell_double', vars: { f: '₹45', r: '₹50' } });
  });

  test('a VIP user sees the VIP reward directly and no upsell', () => {
    const state = getCartProgressState(toUnits(250), true, CASHBACK_SETTINGS);
    expect(state.primary.vars.r).toBe('₹50');
    expect(state.vipUpsell).toBeNull();
  });

  test('progress is 0% just above the minimum, resetting for the new segment', () => {
    const state = getCartProgressState(toUnits(199), false, CASHBACK_SETTINGS);
    expect(state.progress).toBeCloseTo(0, 3);
  });

  test('unlockedReward is null before the first tier', () => {
    const state = getCartProgressState(toUnits(250), false, CASHBACK_SETTINGS);
    expect(state.unlockedReward).toBeNull();
  });

  test('is still toward_first_tier just below the ₹750 boundary', () => {
    const state = getCartProgressState(toUnits(749), false, CASHBACK_SETTINGS);
    expect(state.phase).toBe('toward_first_tier');
    expect(state.primary.vars).toEqual({ n: '₹1', r: '₹25' });
  });
});

describe('getCartProgressState — a tier already unlocked', () => {
  test('at ₹800: counts down to tier 2, not tier 1 already achieved', () => {
    const state = getCartProgressState(toUnits(800), false, CASHBACK_SETTINGS);

    expect(state.phase).toBe('tier_unlocked');
    expect(state.primary).toEqual({ key: 'cashback_shop_more', vars: { n: '₹700', r: '₹50' } });
    expect(state.unlockedReward).toBe('₹25');
    expect(state.vipUpsell).toEqual({ key: 'vip_upsell_double', vars: { f: '₹45', r: '₹100' } });
  });

  test('at ₹1600: counts down to tier 3', () => {
    const state = getCartProgressState(toUnits(1600), false, CASHBACK_SETTINGS);

    expect(state.primary).toEqual({ key: 'cashback_shop_more', vars: { n: '₹650', r: '₹75' } });
    expect(state.unlockedReward).toBe('₹50');
    expect(state.vipUpsell).toEqual({ key: 'vip_upsell_double', vars: { f: '₹45', r: '₹150' } });
    expect(state.progress).toBeCloseTo((1600 - 1500) / (2250 - 1500), 3);
  });

  test('is tier_unlocked exactly at a tier boundary (₹750)', () => {
    const state = getCartProgressState(toUnits(750), false, CASHBACK_SETTINGS);
    expect(state.phase).toBe('tier_unlocked');
    expect(state.unlockedReward).toBe('₹25');
  });

  test('is tier_unlocked exactly at the ₹1500 boundary, unlockedReward reflects tier 2', () => {
    const state = getCartProgressState(toUnits(1500), false, CASHBACK_SETTINGS);
    expect(state.phase).toBe('tier_unlocked');
    expect(state.unlockedReward).toBe('₹50');
  });

  test('stays tier_unlocked (not max_tier) just below the ₹7500 boundary', () => {
    const state = getCartProgressState(toUnits(7499), false, CASHBACK_SETTINGS);
    expect(state.phase).toBe('tier_unlocked');
    expect(state.primary).toEqual({ key: 'cashback_shop_more', vars: { n: '₹1', r: '₹250' } });
  });

  test('a VIP at ₹1600 never sees a standardReward figure anywhere', () => {
    const state = getCartProgressState(toUnits(1600), true, CASHBACK_SETTINGS);

    expect(state.primary.vars.r).toBe('₹150'); // tier 3 vipReward, not ₹75
    expect(state.unlockedReward).toBe('₹100'); // tier 2 vipReward, not ₹50
    expect(state.vipUpsell).toBeNull();
  });
});

describe('getCartProgressState — max tier', () => {
  test('at exactly ₹7500: max_tier, 100% progress, still upsells VIP', () => {
    const state = getCartProgressState(toUnits(7500), false, CASHBACK_SETTINGS);

    expect(state.phase).toBe('max_tier');
    expect(state.progress).toBe(1);
    expect(state.primary).toEqual({ key: 'cashback_max_unlocked', vars: { r: '₹250' } });
    expect(state.unlockedReward).toBe('₹250');
    expect(state.vipUpsell).toEqual({ key: 'vip_upsell_double', vars: { f: '₹45', r: '₹500' } });
  });

  test('above ₹7500 stays at max_tier', () => {
    const state = getCartProgressState(toUnits(9000), false, CASHBACK_SETTINGS);
    expect(state.phase).toBe('max_tier');
  });

  test('a VIP at max tier sees the VIP reward and no upsell', () => {
    const state = getCartProgressState(toUnits(7500), true, CASHBACK_SETTINGS);
    expect(state.primary.vars.r).toBe('₹500');
    expect(state.vipUpsell).toBeNull();
  });
});

describe('getCartProgressState — the kill switch', () => {
  const base = CASHBACK_SETTINGS;

  test('active: false disables cashback entirely', () => {
    const settings: CashbackSettings = { ...base, active: false };
    const state = getCartProgressState(toUnits(800), false, settings);
    expect(state.phase).toBe('disabled');
    expect(state.vipUpsell).toBeNull();
  });

  test('isDeleted: true disables cashback entirely', () => {
    const settings: CashbackSettings = { ...base, isDeleted: true };
    const state = getCartProgressState(toUnits(800), false, settings);
    expect(state.phase).toBe('disabled');
  });

  test('an empty tiers array disables cashback entirely', () => {
    const settings: CashbackSettings = { ...base, tiers: [] };
    const state = getCartProgressState(toUnits(800), false, settings);
    expect(state.phase).toBe('disabled');
  });

  test('disabled still reports canPlaceOrder correctly from minOrderValue', () => {
    const settings: CashbackSettings = { ...base, active: false };
    expect(getCartProgressState(toUnits(50), false, settings).canPlaceOrder).toBe(false);
    expect(getCartProgressState(toUnits(800), false, settings).canPlaceOrder).toBe(true);
  });
});

describe('getCartProgressState — unit-conversion regression', () => {
  test('a ₹750 cart passed in internal units unlocks tier 1, not below_minimum', () => {
    // Guards against comparing cartTotalUnits (units) to a raw rupee tier
    // amount without converting — that bug would misclassify this as far
    // below the minimum instead of at tier 1.
    const state = getCartProgressState(toUnits(750), false, CASHBACK_SETTINGS);
    expect(state.phase).toBe('tier_unlocked');
  });
});

describe('getCartProgressState — tiers supplied out of order', () => {
  test('sorts tiers before evaluating', () => {
    const shuffled: CashbackSettings = {
      ...CASHBACK_SETTINGS,
      tiers: [...CASHBACK_SETTINGS.tiers].reverse(),
    };
    const state = getCartProgressState(toUnits(800), false, shuffled);
    expect(state.primary).toEqual({ key: 'cashback_shop_more', vars: { n: '₹700', r: '₹50' } });
  });
});

describe('getCartProgressState — monthly cap clamping', () => {
  test('clamps the shown reward to the remaining cap when earnedThisMonth is supplied', () => {
    // monthlyCap is 500; 480 already earned leaves ₹20 — below the ₹50 the
    // ₹800 cart would otherwise advertise for tier 2.
    const state = getCartProgressState(toUnits(800), false, CASHBACK_SETTINGS, 480);
    expect(state.primary.vars.r).toBe('₹20');
    expect(state.unlockedReward).toBe('₹20');
  });

  test('is unclamped when earnedThisMonth is omitted', () => {
    const state = getCartProgressState(toUnits(800), false, CASHBACK_SETTINGS);
    expect(state.primary.vars.r).toBe('₹50');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/features/cart/domain/__tests__/cartProgress.test.ts`
Expected: FAIL — `Cannot find module '../cartProgress'` (and `'../cashbackConfig'`).

- [ ] **Step 3: Write the config module**

Create `src/features/cart/domain/cashbackConfig.ts`:

```ts
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
```

- [ ] **Step 4: Write the progress helper**

Create `src/features/cart/domain/cartProgress.ts`:

```ts
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/features/cart/domain/__tests__/cartProgress.test.ts`
Expected: PASS — all suites green.

- [ ] **Step 6: Commit**

```bash
git add src/features/cart/domain/cashbackConfig.ts src/features/cart/domain/cartProgress.ts src/features/cart/domain/__tests__/cartProgress.test.ts
git commit -m "feat(cart): add cashback tier config and pure progress helper"
```

---

### Task 2: Copy plumbing — `interpolateVars`, `renderTemplateWithBold`, new translation keys

**Files:**
- Create: `src/shared/utils/richText.tsx`
- Test: `src/shared/utils/__tests__/richText.test.tsx`
- Modify: `src/base/constants/translations.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `interpolateVars(template: string, vars: Record<string, string>): string` (from `translations.ts`, alongside the existing `interpolate`)
  - `renderTemplateWithBold(template: string, vars: Record<string, string>, boldStyle: TextStyle): React.ReactNode[]` (from `richText.tsx`)
  - Translation keys: `cashback_shop_more`, `cashback_max_unlocked`, `vip_upsell_double`, `bill_cashback_earn` (both `te` and `en`)

- [ ] **Step 1: Write the failing test for `renderTemplateWithBold`**

Create `src/shared/utils/__tests__/richText.test.tsx`:

```tsx
import React from 'react';
import { renderTemplateWithBold } from '../richText';

describe('renderTemplateWithBold', () => {
  const bold = { fontWeight: '800' as const };

  test('splits a template into literal strings and bold-styled Text nodes for each substituted token', () => {
    const parts = renderTemplateWithBold(
      'Shop {n} more to get {r} cashback',
      { n: '₹700', r: '₹50' },
      bold,
    );

    expect(parts).toHaveLength(5);
    expect(parts[0]).toBe('Shop ');
    expect(React.isValidElement(parts[1])).toBe(true);
    expect((parts[1] as React.ReactElement<any>).props.children).toBe('₹700');
    expect((parts[1] as React.ReactElement<any>).props.style).toBe(bold);
    expect(parts[2]).toBe(' more to get ');
    expect((parts[3] as React.ReactElement<any>).props.children).toBe('₹50');
    expect(parts[4]).toBe(' cashback');
  });

  test('leaves an unmatched token as literal text when no var is supplied', () => {
    const parts = renderTemplateWithBold('Add VIP for {f}', {}, bold);
    expect(parts).toEqual(['Add VIP for ', '{f}']);
  });

  test('a plain template with no tokens returns a single literal string', () => {
    const parts = renderTemplateWithBold('Ready to place your order!', {}, bold);
    expect(parts).toEqual(['Ready to place your order!']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/shared/utils/__tests__/richText.test.tsx`
Expected: FAIL — `Cannot find module '../richText'`.

- [ ] **Step 3: Write `richText.tsx`**

Create `src/shared/utils/richText.tsx`:

```tsx
// src/shared/utils/richText.tsx
//
// Renders a `{token}` template with each substituted value styled as its
// own bold <Text>, so a sentence like "Shop {n} more to get {r} cashback"
// can highlight both amounts without the caller hand-splitting the string.

import React from 'react';
import { Text, TextStyle } from 'react-native';

export function renderTemplateWithBold(
  template: string,
  vars: Record<string, string>,
  boldStyle: TextStyle,
): React.ReactNode[] {
  const parts = template.split(/(\{\w+\})/g);
  return parts.map((part, index) => {
    const match = part.match(/^\{(\w+)\}$/);
    if (match && vars[match[1]] !== undefined) {
      return (
        <Text key={index} style={boldStyle}>
          {vars[match[1]]}
        </Text>
      );
    }
    return part;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/shared/utils/__tests__/richText.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add `interpolateVars` to `translations.ts`**

In `src/base/constants/translations.ts`, immediately after the existing `interpolate` function (around line 321), add:

```ts
/** Replace every `{token}` in a template with its value from `vars`. */
export function interpolateVars(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, value),
    template,
  );
}
```

- [ ] **Step 6: Add the four new translation keys**

In `src/base/constants/translations.ts`, immediately after the `saved_amount` line (in the "Floating cart pill" section, around line 98), add:

```ts
  // Cashback progress & VIP upsell
  cashback_shop_more:  { te: 'ఇంకా {n} కొంటే {r} క్యాష్‌బ్యాక్',              en: 'Shop {n} more to get {r} cashback' },
  cashback_max_unlocked: { te: 'గరిష్ట క్యాష్‌బ్యాక్ అన్‌లాక్ · {r}',          en: 'Max cashback unlocked · {r}' },
  vip_upsell_double:   { te: 'నెలకు {f}తో VIP అవ్వండి · క్యాష్‌బ్యాక్ {r} అవుతుంది', en: 'Add VIP for {f}/month · double it to {r}' },
  bill_cashback_earn:  { te: 'ఈ ఆర్డర్‌పై {r} క్యాష్‌బ్యాక్ పొందుతారు',        en: "You'll earn {r} cashback on this order" },
```

- [ ] **Step 7: Run the full test suite to confirm nothing else broke**

Run: `npx jest src/base/constants src/shared/utils`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/shared/utils/richText.tsx src/shared/utils/__tests__/richText.test.tsx src/base/constants/translations.ts
git commit -m "feat(i18n): add interpolateVars, renderTemplateWithBold, and cashback copy keys"
```

---

### Task 3: `useCartCashback` hook

**Files:**
- Create: `src/features/cart/domain/useCartCashback.ts`
- Test: `src/features/cart/domain/__tests__/useCartCashback.test.ts`

**Interfaces:**
- Consumes: `useAuthStore` from `@/src/core/store` (existing); `CASHBACK_SETTINGS` from `./cashbackConfig` (Task 1); `getCartProgressState`, `CartProgressState` from `./cartProgress` (Task 1).
- Produces: `useCartCashback(grandTotalUnits: number): CartProgressState`

- [ ] **Step 1: Write the failing test**

Create `src/features/cart/domain/__tests__/useCartCashback.test.ts`:

```ts
import { renderHook } from '@testing-library/react-native';
import { toUnits } from '@/src/shared/utils/currency';

let mockUser: { isVip?: boolean } | null = null;

jest.mock('@/src/core/store', () => ({
  useAuthStore: jest.fn(selector => selector({ user: mockUser })),
}));

import { useCartCashback } from '../useCartCashback';

describe('useCartCashback', () => {
  afterEach(() => {
    mockUser = null;
  });

  test('treats a logged-out user (no profile) as non-VIP', () => {
    mockUser = null;
    const { result } = renderHook(() => useCartCashback(toUnits(800)));

    expect(result.current.vipUpsell).not.toBeNull();
  });

  test('reads isVip from the auth store profile', () => {
    mockUser = { isVip: true };
    const { result } = renderHook(() => useCartCashback(toUnits(800)));

    expect(result.current.vipUpsell).toBeNull();
  });

  test('uses the live CASHBACK_SETTINGS tiers to classify the phase', () => {
    mockUser = { isVip: false };
    const { result } = renderHook(() => useCartCashback(toUnits(800)));

    expect(result.current.phase).toBe('tier_unlocked');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/features/cart/domain/__tests__/useCartCashback.test.ts`
Expected: FAIL — `Cannot find module '../useCartCashback'`.

- [ ] **Step 3: Write the hook**

Create `src/features/cart/domain/useCartCashback.ts`:

```ts
// src/features/cart/domain/useCartCashback.ts
//
// Shared wiring behind the cashback progress shown on both the cart
// snackbar (CartSummaryCard) and the cart screen (CashbackProgressBanner,
// BillSummaryCard) — one hook, so every surface reads the same isVip flag
// and the same settings and cannot drift apart.

import { useAuthStore } from '@/src/core/store';
import { CASHBACK_SETTINGS } from './cashbackConfig';
import { getCartProgressState, type CartProgressState } from './cartProgress';

export function useCartCashback(grandTotalUnits: number): CartProgressState {
  const user = useAuthStore(state => state.user);
  const isVip = Boolean(user?.isVip);
  return getCartProgressState(grandTotalUnits, isVip, CASHBACK_SETTINGS);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/features/cart/domain/__tests__/useCartCashback.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/cart/domain/useCartCashback.ts src/features/cart/domain/__tests__/useCartCashback.test.ts
git commit -m "feat(cart): add useCartCashback hook wiring auth + config to the progress helper"
```

---

### Task 4: Wire the snackbar (`CartSummaryCard`)

**Files:**
- Modify: `src/shared/components/CartSummaryCard.tsx`
- Modify (rewrite): `src/shared/components/__tests__/CartSummaryCard.test.tsx`
- Create: `src/shared/components/__tests__/CartSummaryCard.cashbackDisabled.test.tsx`

**Interfaces:**
- Consumes: `useCartCashback` (Task 3), `renderTemplateWithBold` (Task 2), new translation keys (Task 2).
- Produces: no new exports — `CartSummaryCard`'s public props are unchanged.

- [ ] **Step 1: Write the failing tests (rewrite the main test file)**

Replace the full contents of `src/shared/components/__tests__/CartSummaryCard.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CartSummaryCard } from '../CartSummaryCard';
import { toUnits } from '@/src/shared/utils/currency';
import type { CartRecord, CartSnapshot, CartSnapshotRecord } from '@/src/base/types/village.types';

let mockCart: CartRecord = {};
let mockSnapshots: CartSnapshotRecord = {};
let mockUser: { isVip?: boolean } | null = null;

jest.mock('@/src/core/store', () => ({
  useVillageStore: jest.fn(selector =>
    selector({ cart: mockCart, cartSnapshots: mockSnapshots })
  ),
  useAuthStore: jest.fn(selector => selector({ user: mockUser })),
}));

// jest.mock factories can only reference out-of-scope variables prefixed
// with "mock" (Jest's hoisting rule) — hence the name here.
const mockRawTemplates: Record<string, string> = {
  order_ready_to_place: 'Ready to place your order!',
  shop_more_to_place_order: 'Shop for {n} more to place order',
  saved_amount: 'SAVED {n}',
  cashback_shop_more: 'Shop {n} more to get {r} cashback',
  cashback_max_unlocked: 'Max cashback unlocked · {r}',
  vip_upsell_double: 'Add VIP for {f}/month · double it to {r}',
  view_cart: 'View cart',
};

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string) => mockRawTemplates[key] ?? key,
    tCartSummaryCount: (n: number) => `${n} ITEMS`,
  }),
}));

function snapshot(productId: string, priceRupees: number, overrides: Partial<CartSnapshot> = {}): CartSnapshot {
  return {
    key: productId,
    productId,
    variantIndex: null,
    name: `Product ${productId}`,
    weight: '1 pc',
    price: toUnits(priceRupees),
    mrp: toUnits(priceRupees),
    emoji: '🍪',
    ...overrides,
  };
}

describe('CartSummaryCard', () => {
  afterEach(() => {
    mockCart = {};
    mockSnapshots = {};
    mockUser = null;
  });

  test('renders nothing when the cart is empty', () => {
    const { toJSON } = render(<CartSummaryCard onPress={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  test('below minimum: shows count, total, the nudge message, and the icon', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 100) };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('1 ITEMS')).toBeTruthy();
    expect(screen.getByText('₹100')).toBeTruthy();
    expect(screen.getByText('View cart')).toBeTruthy();
    expect(screen.getByText('₹99')).toBeTruthy();
    expect(screen.getByTestId('cart-summary-icon')).toBeTruthy();
  });

  test('toward first tier: shows cashback progress and the VIP upsell for a non-VIP user', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 250) }; // mrp === price, no MRP savings
    mockUser = { isVip: false };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('1 ITEMS')).toBeTruthy();
    expect(screen.getByText('₹250')).toBeTruthy();
    expect(screen.getByText('₹500')).toBeTruthy(); // shortfall to ₹750
    expect(screen.getByText('₹25')).toBeTruthy(); // tier-1 standard reward
    expect(screen.getByText('₹45')).toBeTruthy(); // VIP fee
    expect(screen.getByText('₹50')).toBeTruthy(); // doubled VIP reward
    expect(screen.queryByText('Ready to place your order!')).toBeNull();
    expect(screen.queryByText(/SAVED/)).toBeNull();
  });

  test('tier unlocked: counts down to the next tier, not the one already achieved', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 800) };
    mockUser = { isVip: false };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('₹700')).toBeTruthy(); // shortfall to ₹1500
    expect(screen.getByText('₹50')).toBeTruthy(); // tier-2 standard reward
    expect(screen.queryByText('₹25')).toBeNull(); // already-unlocked reward not shown here
  });

  test('max tier: shows the max-unlocked line and still upsells VIP', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 8000) };
    mockUser = { isVip: false };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('₹250')).toBeTruthy(); // max standard reward
    expect(screen.getByText('₹500')).toBeTruthy(); // doubled max reward
  });

  test('a VIP user sees only the VIP reward, never the standard one, and no upsell line', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 800) };
    mockUser = { isVip: true };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('₹100')).toBeTruthy(); // tier-2 VIP reward, already doubled
    expect(screen.queryByText('₹50')).toBeNull(); // tier-2's standardReward — must never reach a VIP screen
    expect(screen.queryByText(/Add VIP for/)).toBeNull();
  });

  test('a logged-out user (no profile) is treated as non-VIP and sees the upsell', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 800) };
    mockUser = null;

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText(/Add VIP for/)).toBeTruthy();
  });

  test('a discount with cashback active: cashback replaces the "SAVED" line', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 250, { mrp: toUnits(285) }) }; // saved ₹35
    mockUser = { isVip: false };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.queryByText('SAVED ₹35')).toBeNull();
    expect(screen.getByText(/Add VIP for/)).toBeTruthy();
  });

  test('fans up to 3 distinct products in a deck-of-cards stack', () => {
    mockCart = { p1: 1, p2: 1, p3: 1, p4: 1 };
    mockSnapshots = {
      p1: snapshot('p1', 20, { emoji: '🥛' }),
      p2: snapshot('p2', 20, { emoji: '🍎' }),
      p3: snapshot('p3', 20, { emoji: '🍞' }),
      p4: snapshot('p4', 20, { emoji: '🍪' }),
    };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getAllByTestId('cart-summary-chip')).toHaveLength(3);
    expect(screen.getByText('🍪')).toBeTruthy();
    expect(screen.getByText('🍞')).toBeTruthy();
    expect(screen.getByText('🍎')).toBeTruthy();
    expect(screen.queryByText('🥛')).toBeNull();
  });

  test('falls back to emoji when the item has no image', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 20, { imageUrl: undefined, emoji: '🥛' }) };

    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('🥛')).toBeTruthy();
  });

  test('tapping the card calls onPress', () => {
    mockCart = { p1: 1 };
    mockSnapshots = { p1: snapshot('p1', 250) };
    const onPress = jest.fn();

    render(<CartSummaryCard onPress={onPress} />);
    fireEvent.press(screen.getByTestId('cart-summary-card'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Write the failing test for the disabled-cashback fallback**

Create `src/shared/components/__tests__/CartSummaryCard.cashbackDisabled.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CartSummaryCard } from '../CartSummaryCard';
import { toUnits } from '@/src/shared/utils/currency';
import type { CartRecord, CartSnapshotRecord } from '@/src/base/types/village.types';

let mockCart: CartRecord = { p1: 1 };
let mockSnapshots: CartSnapshotRecord = {
  p1: {
    key: 'p1',
    productId: 'p1',
    variantIndex: null,
    name: 'Product p1',
    weight: '1 pc',
    price: toUnits(250),
    mrp: toUnits(285), // saved ₹35
    emoji: '🍪',
  },
};

jest.mock('@/src/core/store', () => ({
  useVillageStore: jest.fn(selector =>
    selector({ cart: mockCart, cartSnapshots: mockSnapshots })
  ),
  useAuthStore: jest.fn(selector => selector({ user: { isVip: false } })),
}));

// active: false, so getCartProgressState returns phase 'disabled' and the
// card must fall back to its pre-cashback ternary exactly as before.
jest.mock('@/src/features/cart/domain/cashbackConfig', () => ({
  CASHBACK_SETTINGS: {
    active: false,
    isDeleted: false,
    minOrderValue: 199,
    vipUpgradeFee: 45,
    monthlyCap: 500,
    activationDelay: '1d',
    expiryPeriod: '2mo',
    vipMonthlySpendTarget: 2500,
    tiers: [],
  },
  STORE_TIMINGS: { opensAt: '07:00', closesAt: '20:00' },
}));

const mockRawTemplates: Record<string, string> = {
  order_ready_to_place: 'Ready to place your order!',
  shop_more_to_place_order: 'Shop for {n} more to place order',
  saved_amount: 'SAVED {n}',
  view_cart: 'View cart',
};

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string) => mockRawTemplates[key] ?? key,
    tCartSummaryCount: (n: number) => `${n} ITEMS`,
  }),
}));

describe('CartSummaryCard — cashback disabled (kill switch)', () => {
  test('falls back to the pre-cashback savings line, with no VIP upsell', () => {
    render(<CartSummaryCard onPress={jest.fn()} />);

    expect(screen.getByText('SAVED ₹35')).toBeTruthy();
    expect(screen.queryByText(/Add VIP for/)).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest src/shared/components/__tests__/CartSummaryCard`
Expected: FAIL — assertions about `₹500`/`₹25`/upsell text don't match the current component's output (it still renders "Ready to place your order!" / "SAVED ₹35" above the minimum).

- [ ] **Step 4: Rewrite `CartSummaryCard.tsx`**

Replace the full contents of `src/shared/components/CartSummaryCard.tsx`:

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useVillageStore } from '@/src/core/store';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { computeBill, getCartItems } from '@/src/features/cart/domain/bill';
import { useCartCashback } from '@/src/features/cart/domain/useCartCashback';
import { rupees, rupeesCeil } from '@/src/shared/utils/currency';
import { renderTemplateWithBold } from '@/src/shared/utils/richText';
import type { CartLineItem } from '@/src/base/types/village.types';

interface CartSummaryCardProps {
  onPress: () => void;
  bottomOffset?: number;
}

const TAB_BAR_CONTENT_HEIGHT = 64;
const MAX_THUMBNAILS = 3;
const CHIP_SIZE = 32;
const CHIP_OFFSET = 11;

/** Most-recently-added distinct products first, capped at `max`, fanned like
 *  a hand of cards. Cart keys preserve insertion order, so scanning from the
 *  end surfaces recent adds; a product already seen (e.g. a second variant of
 *  the same item) is skipped so the stack never shows the same product twice. */
function distinctRecentItems(items: CartLineItem[], max: number): CartLineItem[] {
  const seenProductIds = new Set<string>();
  const result: CartLineItem[] = [];
  for (let i = items.length - 1; i >= 0 && result.length < max; i--) {
    const item = items[i];
    if (seenProductIds.has(item.productId)) continue;
    seenProductIds.add(item.productId);
    result.push(item);
  }
  return result;
}

export const CartSummaryCard = ({ onPress, bottomOffset }: CartSummaryCardProps) => {
  const cart = useVillageStore(state => state.cart);
  const cartSnapshots = useVillageStore(state => state.cartSnapshots);
  const { t, tCartSummaryCount } = useTranslation();

  // The glowing dot at the progress bar's leading edge blinks continuously —
  // a breathing opacity loop, not a one-shot animation.
  const glowPulse = useSharedValue(1);
  React.useEffect(() => {
    glowPulse.value = withRepeat(
      withTiming(0.35, { duration: 650, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [glowPulse]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowPulse.value }));

  const cartItems = React.useMemo(() => getCartItems(cart, cartSnapshots), [cart, cartSnapshots]);
  const bill = React.useMemo(() => computeBill(cartItems), [cartItems]);
  const cashback = useCartCashback(bill.grandTotal);

  if (bill.totalCount === 0) return null;

  const cardBottom = (bottomOffset ?? TAB_BAR_CONTENT_HEIGHT) + 8;
  // Most-recently-added distinct products, fanned in a deck-of-cards stack —
  // shown regardless of threshold state.
  const recentItems = distinctRecentItems(cartItems, MAX_THUMBNAILS);
  const showCashback = !bill.belowMinimum && cashback.phase !== 'disabled';
  // Below the minimum, the bar tracks progress to the order minimum itself.
  // Once cashback takes over, it tracks the current tier segment instead —
  // see cartProgress.ts for the segment-relative math.
  const progress = showCashback
    ? cashback.progress
    : Math.min(1, Math.max(0, bill.grandTotal / bill.minOrderValue));

  return (
    <TouchableOpacity
      testID="cart-summary-card"
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.card, { marginBottom: cardBottom }]}
    >
      <View style={styles.row}>
        <View style={styles.metaBlock}>
          <View style={styles.countLine}>
            <Text style={styles.count}>{tCartSummaryCount(bill.totalCount)}</Text>
            <Text style={styles.dot}>{'·'}</Text>
            <Text style={styles.total}>{rupees(bill.grandTotal)}</Text>
          </View>
          {bill.belowMinimum ? (
            <Text style={styles.nudge}>
              {renderTemplateWithBold(
                t('shop_more_to_place_order'),
                { n: rupeesCeil(bill.amountToMinimum) },
                styles.nudgeAmount,
              )}
            </Text>
          ) : showCashback ? (
            <>
              <Text style={styles.nudge}>
                {renderTemplateWithBold(t(cashback.primary.key), cashback.primary.vars, styles.nudgeAmount)}
              </Text>
              {cashback.vipUpsell && (
                <Text style={styles.vipUpsell}>
                  {renderTemplateWithBold(t(cashback.vipUpsell.key), cashback.vipUpsell.vars, styles.vipUpsellAmount)}
                </Text>
              )}
            </>
          ) : bill.totalSavings > 0 ? (
            <Text style={styles.saved}>
              {renderTemplateWithBold(t('saved_amount'), { n: rupees(bill.totalSavings) }, styles.savedAmount)}
            </Text>
          ) : (
            <Text style={styles.nudge}>{t('order_ready_to_place')}</Text>
          )}
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={['#86efac', '#ffffff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            >
              <Animated.View style={[styles.progressGlow, glowStyle]} />
            </LinearGradient>
          </View>
        </View>

        <View style={styles.iconColumn}>
          <View
            style={[styles.stack, { width: CHIP_SIZE + (recentItems.length - 1) * CHIP_OFFSET }]}
            testID="cart-summary-icon"
          >
            {recentItems.map((item, index) => (
              <View
                key={item.key}
                testID="cart-summary-chip"
                style={[
                  styles.chip,
                  { left: index * CHIP_OFFSET, top: index * 3, zIndex: recentItems.length - index },
                ]}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.chipImage} contentFit="cover" />
                ) : (
                  <Text style={styles.chipEmoji}>{item.emoji}</Text>
                )}
                {index === 0 && (
                  <View style={styles.chevronBadge}>
                    <ChevronRight size={9} color="#16a34a" strokeWidth={3} />
                  </View>
                )}
              </View>
            ))}
          </View>
          <Text style={styles.viewCartCaption}>{t('view_cart')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 10,
    backgroundColor: '#16a34a',
    borderRadius: 17,
    paddingVertical: 7,
    paddingHorizontal: 14,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaBlock: { flex: 1 },
  countLine: { flexDirection: 'row', alignItems: 'center' },
  count: { color: '#ffffff', fontWeight: '800', fontSize: 16, letterSpacing: 0.4 },
  dot: { color: 'rgba(255,255,255,0.55)', marginHorizontal: 5, fontSize: 16 },
  total: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  nudge: { color: '#d1fae5', fontWeight: '500', fontSize: 12.5, marginTop: 3 },
  nudgeAmount: { color: '#ffffff', fontWeight: '800' },
  vipUpsell: { color: 'rgba(255,255,255,0.75)', fontWeight: '500', fontSize: 10.5, marginTop: 2 },
  vipUpsellAmount: { color: '#ffffff', fontWeight: '800' },
  saved: { color: '#d1fae5', fontWeight: '500', fontSize: 12.5, letterSpacing: 0.5, marginTop: 3 },
  savedAmount: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'visible',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    justifyContent: 'center',
  },
  progressGlow: {
    position: 'absolute',
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  iconColumn: { alignItems: 'center', marginLeft: 10, gap: 3 },
  stack: { height: CHIP_SIZE + 8, marginLeft: 0 },
  chip: {
    position: 'absolute',
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  chipImage: { width: '100%', height: '100%', borderRadius: 6.5 },
  chipEmoji: { fontSize: 13 },
  chevronBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  viewCartCaption: { color: '#ffffff', fontWeight: '700', fontSize: 9.5, letterSpacing: 0.2 },
});
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/shared/components/__tests__/CartSummaryCard`
Expected: PASS — both test files green.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/CartSummaryCard.tsx src/shared/components/__tests__/CartSummaryCard.test.tsx src/shared/components/__tests__/CartSummaryCard.cashbackDisabled.test.tsx
git commit -m "feat(cart): wire cashback progress and VIP upsell into the snackbar"
```

---

### Task 5: Earned-cashback row in the bill (`BillSummaryCard`)

**Files:**
- Modify: `src/shared/components/BillSummaryCard.tsx`
- Create: `src/shared/components/__tests__/BillSummaryCard.test.tsx`

**Interfaces:**
- Consumes: `useCartCashback` (Task 3), `interpolateVars` (Task 2), `bill_cashback_earn` key (Task 2).
- Produces: no new exports — `BillSummaryCard`'s public props are unchanged.

- [ ] **Step 1: Write the failing test**

Create `src/shared/components/__tests__/BillSummaryCard.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BillSummaryCard } from '../BillSummaryCard';
import { toUnits } from '@/src/shared/utils/currency';
import type { Bill } from '@/src/base/types/village.types';

let mockUser: { isVip?: boolean } | null = null;

jest.mock('@/src/core/store', () => ({
  useAuthStore: jest.fn(selector => selector({ user: mockUser })),
}));

const mockRawTemplates: Record<string, string> = {
  bill_summary: 'BILL SUMMARY',
  item_total_mrp: 'Item total (MRP)',
  discount_on_mrp: 'Discount on MRP',
  coupon_label: 'Coupon',
  to_pay: 'To pay',
  you_saved_order: 'You saved {n} on this order',
  bill_cashback_earn: "You'll earn {r} cashback on this order",
};

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => mockRawTemplates[key] ?? key }),
}));

function bill(overrides: Partial<Bill> = {}): Bill {
  return {
    itemTotal: toUnits(800),
    mrpTotal: toUnits(800),
    itemDiscount: 0,
    deliveryFee: 0,
    platformFee: 0,
    couponDiscount: 0,
    grandTotal: toUnits(800),
    totalSavings: 0,
    totalCount: 1,
    minOrderValue: toUnits(199),
    belowMinimum: false,
    amountToMinimum: 0,
    ...overrides,
  };
}

describe('BillSummaryCard', () => {
  afterEach(() => {
    mockUser = null;
  });

  test('shows the earned-cashback row once a tier is unlocked', () => {
    mockUser = { isVip: false };
    render(<BillSummaryCard bill={bill()} couponApplied={false} />);

    expect(screen.getByText("You'll earn ₹25 cashback on this order")).toBeTruthy();
  });

  test('hides the cashback row below the first tier', () => {
    mockUser = { isVip: false };
    const belowTier = bill({ grandTotal: toUnits(250), itemTotal: toUnits(250), mrpTotal: toUnits(250) });

    render(<BillSummaryCard bill={belowTier} couponApplied={false} />);

    expect(screen.queryByText(/cashback on this order/)).toBeNull();
  });

  test('a VIP sees the doubled reward, not the standard one', () => {
    mockUser = { isVip: true };
    render(<BillSummaryCard bill={bill()} couponApplied={false} />);

    expect(screen.getByText("You'll earn ₹50 cashback on this order")).toBeTruthy();
  });

  test('the bill total and MRP rows still render unchanged', () => {
    mockUser = { isVip: false };
    const withDiscount = bill({ mrpTotal: toUnits(900), itemDiscount: toUnits(100) });

    render(<BillSummaryCard bill={withDiscount} couponApplied={false} />);

    expect(screen.getByText('₹900')).toBeTruthy();
    expect(screen.getByText('-₹100')).toBeTruthy();
    expect(screen.getByText('₹800')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/shared/components/__tests__/BillSummaryCard.test.tsx`
Expected: FAIL — no cashback row exists yet.

- [ ] **Step 3: Modify `BillSummaryCard.tsx`**

Replace the full contents of `src/shared/components/BillSummaryCard.tsx`:

```tsx
import { Receipt } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { Bill } from '@/src/base/types/village.types';
import { rupees } from '@/src/shared/utils/currency';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate, interpolateVars } from '@/src/base/constants/translations';
import { useCartCashback } from '@/src/features/cart/domain/useCartCashback';

interface BillRowProps {
  label: string;
  value: string;
  isGreen?: boolean;
  isBold?: boolean;
}

const BillRow = ({ label, value, isGreen, isBold }: BillRowProps) => (
  <View className="flex-row justify-between items-center py-1.5">
    <Text className={`text-sm ${isBold ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>{label}</Text>
    <Text className={`text-sm ${isBold ? 'text-slate-900 font-bold' : ''} ${isGreen ? 'text-green-600 font-medium' : 'text-slate-900'}`}>
      {value}
    </Text>
  </View>
);

interface BillSummaryCardProps {
  bill: Bill;
  couponApplied: boolean;
}

export const BillSummaryCard = ({ bill, couponApplied }: BillSummaryCardProps) => {
  const { t } = useTranslation();
  const cashback = useCartCashback(bill.grandTotal);

  return (
    <View className="bg-white border border-slate-200 rounded-2xl p-4">
      <View className="flex-row items-center gap-2 mb-3">
        <Receipt size={16} color="#64748b" />
        <Text className="text-slate-500 text-xs font-bold tracking-wider">{t('bill_summary')}</Text>
      </View>

      <BillRow label={t('item_total_mrp')} value={rupees(bill.mrpTotal)} />
      {bill.itemDiscount > 0 && (
        <BillRow label={t('discount_on_mrp')} value={`-${rupees(bill.itemDiscount)}`} isGreen />
      )}
      {couponApplied && bill.couponDiscount > 0 && (
        <BillRow label={t('coupon_label')} value={`-${rupees(bill.couponDiscount)}`} isGreen />
      )}

      <View className="border-t border-dashed border-slate-300 my-2" />

      <BillRow label={t('to_pay')} value={rupees(bill.grandTotal)} isBold />

      {bill.totalSavings > 0 && (
        <View className="bg-green-50 rounded-xl px-3 py-2 mt-2">
          <Text className="text-green-700 text-xs font-medium text-center">
            {interpolate(t('you_saved_order'), rupees(bill.totalSavings))}
          </Text>
        </View>
      )}

      {/* Cashback is earned, not a discount — it never touches grandTotal
       *  above. Shown only once a tier is actually unlocked. */}
      {cashback.unlockedReward && (
        <View className="bg-emerald-50 rounded-xl px-3 py-2 mt-2">
          <Text className="text-emerald-700 text-xs font-medium text-center">
            {interpolateVars(t('bill_cashback_earn'), { r: cashback.unlockedReward })}
          </Text>
        </View>
      )}
    </View>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/shared/components/__tests__/BillSummaryCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/BillSummaryCard.tsx src/shared/components/__tests__/BillSummaryCard.test.tsx
git commit -m "feat(cart): show earned cashback as a bill row once a tier unlocks"
```

---

### Task 6: Cart-screen progress banner (`CashbackProgressBanner`)

**Files:**
- Create: `src/shared/components/CashbackProgressBanner.tsx`
- Test: `src/shared/components/__tests__/CashbackProgressBanner.test.tsx`
- Modify: `src/shared/components/index.ts`
- Modify: `src/features/cart/views/CartScreen.tsx`

**Interfaces:**
- Consumes: `useCartCashback` (Task 3), `renderTemplateWithBold` (Task 2).
- Produces: `CashbackProgressBanner({ grandTotal: number }): JSX.Element | null`, exported from `src/shared/components/index.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/shared/components/__tests__/CashbackProgressBanner.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CashbackProgressBanner } from '../CashbackProgressBanner';
import { toUnits } from '@/src/shared/utils/currency';

let mockUser: { isVip?: boolean } | null = null;

jest.mock('@/src/core/store', () => ({
  useAuthStore: jest.fn(selector => selector({ user: mockUser })),
}));

const mockRawTemplates: Record<string, string> = {
  cashback_shop_more: 'Shop {n} more to get {r} cashback',
  cashback_max_unlocked: 'Max cashback unlocked · {r}',
  vip_upsell_double: 'Add VIP for {f}/month · double it to {r}',
};

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => mockRawTemplates[key] ?? key }),
}));

describe('CashbackProgressBanner', () => {
  afterEach(() => {
    mockUser = null;
  });

  test('renders nothing below the minimum order value', () => {
    mockUser = { isVip: false };
    const { toJSON } = render(<CashbackProgressBanner grandTotal={toUnits(50)} />);
    expect(toJSON()).toBeNull();
  });

  test('toward first tier: shows the shortfall, the reward, and the VIP upsell', () => {
    mockUser = { isVip: false };
    render(<CashbackProgressBanner grandTotal={toUnits(250)} />);

    expect(screen.getByText('₹500')).toBeTruthy();
    expect(screen.getByText('₹25')).toBeTruthy();
    expect(screen.getByText('₹45')).toBeTruthy();
  });

  test('tier unlocked: counts down to the next tier only', () => {
    mockUser = { isVip: false };
    render(<CashbackProgressBanner grandTotal={toUnits(800)} />);

    expect(screen.getByText('₹700')).toBeTruthy();
    expect(screen.getByText('₹50')).toBeTruthy();
  });

  test('a VIP user sees no upsell line', () => {
    mockUser = { isVip: true };
    render(<CashbackProgressBanner grandTotal={toUnits(800)} />);

    expect(screen.queryByText(/Add VIP for/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/shared/components/__tests__/CashbackProgressBanner.test.tsx`
Expected: FAIL — `Cannot find module '../CashbackProgressBanner'`.

- [ ] **Step 3: Write the component**

Create `src/shared/components/CashbackProgressBanner.tsx`:

```tsx
// src/shared/components/CashbackProgressBanner.tsx
//
// Cart-screen counterpart to the cashback progress shown in the home-screen
// snackbar (CartSummaryCard) — same rules, same copy keys, via the shared
// `useCartCashback` hook, so the two surfaces cannot drift. Renders nothing
// below the ₹199 minimum (CheckoutBar already carries that message there)
// or when the cashback programme is disabled.

import React from 'react';
import { Text, View } from 'react-native';
import { Gift } from 'lucide-react-native';
import { useCartCashback } from '@/src/features/cart/domain/useCartCashback';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { renderTemplateWithBold } from '@/src/shared/utils/richText';

interface CashbackProgressBannerProps {
  grandTotal: number;
}

const BOLD_STYLE = { fontWeight: '800' as const, color: '#166534' };

export const CashbackProgressBanner = ({ grandTotal }: CashbackProgressBannerProps) => {
  const cashback = useCartCashback(grandTotal);
  const { t } = useTranslation();

  if (cashback.phase === 'disabled' || cashback.phase === 'below_minimum') return null;

  return (
    <View className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 gap-2">
      <View className="flex-row items-center gap-2">
        <Gift size={16} color="#16a34a" />
        <Text className="text-emerald-800 text-sm font-medium flex-1">
          {renderTemplateWithBold(t(cashback.primary.key), cashback.primary.vars, BOLD_STYLE)}
        </Text>
      </View>
      <View className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
        <View
          className="h-full bg-emerald-500 rounded-full"
          style={{ width: `${cashback.progress * 100}%` }}
        />
      </View>
      {cashback.vipUpsell && (
        <Text className="text-emerald-700 text-xs">
          {renderTemplateWithBold(t(cashback.vipUpsell.key), cashback.vipUpsell.vars, BOLD_STYLE)}
        </Text>
      )}
    </View>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/shared/components/__tests__/CashbackProgressBanner.test.tsx`
Expected: PASS.

- [ ] **Step 5: Export it from the shared-components barrel**

In `src/shared/components/index.ts`, add this line immediately after `export { SavingsStrip } from './SavingsStrip';`:

```ts
export { CashbackProgressBanner } from './CashbackProgressBanner';
```

- [ ] **Step 6: Wire it into `CartScreen.tsx`**

In `src/features/cart/views/CartScreen.tsx`, add `CashbackProgressBanner` to the existing import from `@/src/shared/components` (around line 7-16), so the import block reads:

```tsx
import {
  BillSummaryCard,
  CartItemRow,
  CashbackProgressBanner,
  CheckoutBar,
  DeliveryETACard,
  EmptyCart,
  OrderModificationSheet,
  PaymentMethodSection,
  SavingsStrip,
  VariantBottomSheet,
} from '@/src/shared/components';
```

Then, immediately after the existing `<SavingsStrip savings={vm.bill.totalSavings} />` line (around line 281), add:

```tsx
          {/* Cashback progress */}
          <CashbackProgressBanner grandTotal={vm.bill.grandTotal} />
```

- [ ] **Step 7: Run the full cart + shared-components test suite**

Run: `npx jest src/features/cart src/shared/components src/shared/utils`
Expected: PASS — every test across Tasks 1-6.

- [ ] **Step 8: Commit**

```bash
git add src/shared/components/CashbackProgressBanner.tsx src/shared/components/__tests__/CashbackProgressBanner.test.tsx src/shared/components/index.ts src/features/cart/views/CartScreen.tsx
git commit -m "feat(cart): show cashback progress banner on the cart screen"
```

---

## Manual verification (after all tasks)

Since this touches visual, locale-dependent UI, run the app and check by hand before considering the feature done:

```bash
npm run ios
```

or

```bash
npm run android
```

Walk a cart through ₹50 → ₹250 → ₹800 → ₹1,600 → ₹8,000, for both a logged-out session and a session with `user.isVip = true` (temporarily patch `StoredPrefs` or the auth store in dev to test the VIP path, since there is no real VIP upgrade flow yet). Confirm:
- The snackbar and the cart-screen banner never disagree at the same cart total.
- Telugu (`app_locale` set to `te`) doesn't visibly clip or overflow the snackbar's now-4-line layout — this was flagged as a real risk in the spec.
- The bill's earned-cashback row appears/disappears exactly at ₹750.

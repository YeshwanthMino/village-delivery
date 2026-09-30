# Cart Cashback Progress & VIP Upsell — Design

**Date:** 2026-09-07
**Status:** Approved design, pending implementation plan

## Goal

Motivate larger carts by showing live progress toward the next cashback tier, and
upsell VIP membership to non-VIP users, on **two surfaces driven by one shared
rule set**: the home-screen cart snackbar (`CartSummaryCard`) and the cart screen
(`CartScreen` + `BillSummaryCard`).

Today the snackbar only knows about the ₹199 minimum order value and shows a
three-way ternary: below-minimum nudge → savings → "order ready to place".

## Scope

**In scope**
- Pure domain helper computing phase, progress, primary copy, and VIP upsell copy
- Local config module for `cashbackSettings` and store timings (API later)
- Snackbar rewrite to consume the helper
- Cart screen: same cashback progress + VIP upsell messaging
- New earned-cashback row in the bill summary
- Telugu + English copy for every new string

**Out of scope**
- Store-hours UI behaviour. Timings go into config with a typed shape; nothing
  consumes them yet. No closed-store state is designed here.
- Order history / order detail cashback display. Past orders carry no cashback
  data and would render blank.
- The VIP upgrade purchase flow itself. This spec only produces the upsell text.
- Any change to `ordersApi.buildBill` or the `Bill` interface (see "Bill row").

## Data sources

Both `cashbackSettings` and store timings come from a local config module now,
typed to match the real API response so the swap is a one-file change.

```ts
// src/features/cart/domain/cashbackConfig.ts

export interface CashbackTier {
  amount: number;          // rupees
  standardReward: number;  // rupees
  vipReward: number;       // rupees
}

export interface CashbackSettings {
  active: boolean;
  isDeleted: boolean;
  minOrderValue: number;   // rupees
  vipUpgradeFee: number;   // rupees
  monthlyCap: number;      // rupees
  activationDelay: string; // e.g. "1d"
  expiryPeriod: string;    // e.g. "2mo"
  vipMonthlySpendTarget: number;
  tiers: CashbackTier[];
}

export interface StoreTimings {
  opensAt: string;  // "07:00"
  closesAt: string; // "20:00"
}
```

Seeded from the live payload: `minOrderValue: 199`, `vipUpgradeFee: 45`,
`monthlyCap: 500`, `activationDelay: "1d"`, `expiryPeriod: "2mo"`,
`vipMonthlySpendTarget: 2500`, and 10 tiers from ₹750/25/50 through
₹7500/250/500.

`isVip` is read from the auth store profile. **Logged-out users are treated as
non-VIP**, so they see standard rewards and the VIP upsell.

### ⚠️ Units

Cart money is in **internal units where 1 unit = ₹1/20** (see
`src/shared/utils/currency.ts`). Config values are in **rupees**, as the API
delivers them. The helper normalises settings through `toUnits()` on entry and
returns display strings already formatted by `rupees()` / `rupeesCeil()`.

No caller ever converts by hand. Hardcoding `750` as a unit value would silently
mean ₹37.50.

## The helper

```ts
// src/features/cart/domain/cartProgress.ts

export type CartProgressPhase =
  | 'below_minimum'
  | 'toward_first_tier'
  | 'tier_unlocked'
  | 'max_tier'
  | 'disabled';

export interface CartProgressState {
  phase: CartProgressPhase;
  canPlaceOrder: boolean;
  /** 0..1, segment-relative. */
  progress: number;
  primary: { key: string; vars: Record<string, string> };
  vipUpsell: { key: string; vars: Record<string, string> } | null;
  /** Highest tier already achieved — for the cart screen, not the snackbar. */
  unlockedReward: number | null;
  nextTier: CashbackTier | null;
}

export function getCartProgressState(
  cartTotalUnits: number,
  isVip: boolean,
  settings: CashbackSettings,
  earnedThisMonth?: number, // rupees; inert until the API supplies it
): CartProgressState;
```

Returns **translation keys plus formatted amount strings, never finished
sentences** — the snackbar styles the ₹ amount as a bold nested `<Text>` via its
existing `splitOnAmount` helper, so it needs the pieces, and the helper stays
locale-free and trivially testable.

### Reward resolution

A single `reward = isVip ? tier.vipReward : tier.standardReward` is resolved once
at the top; every downstream string reads that one value. There is **no code path
where a standard figure can reach a VIP's screen**.

### Phase rules

| Condition | Phase |
|---|---|
| `!active \|\| isDeleted \|\| tiers` empty | `disabled` |
| `total < minOrderValue` | `below_minimum` |
| `total >= minOrderValue` and below `tiers[0].amount` | `toward_first_tier` |
| At or above `tiers[0].amount`, below the last tier | `tier_unlocked` |
| At or above the last tier's amount | `max_tier` |

A tier unlocks at `>=` its amount. Tiers are sorted ascending defensively.

`disabled` falls back to today's exact behaviour: min-order nudge, savings line,
"order ready to place" — no cashback messaging anywhere.

### Progress bar — segment-relative

`(total − segmentStart) / (segmentEnd − segmentStart)`, clamped to 0..1.

Segments: `0 → minOrderValue`, then `minOrderValue → tiers[0]`, then
`tiers[n] → tiers[n+1]`. `max_tier` is always 1.

The bar refills between every milestone, so each unlock is a visible reset and a
satisfying 100% fill.

### Remaining amount

`nextTier.amount − cartTotal`, recomputed live on every cart change, formatted
with `rupeesCeil` so ₹749.98 reads "₹1 more" rather than "₹0 more".

Evaluated against **`bill.grandTotal`** — the same number displayed beside the
item count and already used for the ₹199 minimum check.

> **Open question for the backend owner:** if the cashback service computes on
> `itemTotal` rather than the post-coupon `grandTotal`, the input needs to
> change. It is a one-line change in the helper and the choice is commented at
> the call site. As specced, applying a coupon can move cashback progress
> backwards — consistent, but only correct if the backend agrees.

### Monthly cap

`earnedThisMonth` is optional. When provided, every reward is clamped to
`monthlyCap − earnedThisMonth`. The API does not send it yet, so behaviour today
is unclamped and identical to having no cap — and there is no signature churn
when the field lands.

This matters: a VIP's top-tier reward is exactly ₹500, the whole monthly cap, so
one ₹7,500 order exhausts their month.

## Copy

`interpolate()` in `translations.ts` only replaces a single `{n}`. A sibling
`interpolateVars(template, vars)` replacing named `{tokens}` will be added,
leaving the existing `interpolate` untouched.

### New keys

| Key | English | Telugu |
|---|---|---|
| `cashback_shop_more` | `Shop {n} more to get {r} cashback` | `ఇంకా {n} కొంటే {r} క్యాష్‌బ్యాక్` |
| `cashback_max_unlocked` | `Max cashback unlocked · {r}` | `గరిష్ట క్యాష్‌బ్యాక్ అన్‌లాక్ · {r}` |
| `vip_upsell_double` | `Add VIP for {f}/month · double it to {r}` | `నెలకు {f}తో VIP అవ్వండి · క్యాష్‌బ్యాక్ {r} అవుతుంది` |
| `bill_cashback_earn` | `You'll earn {r} cashback on this order` | `ఈ ఆర్డర్‌పై {r} క్యాష్‌బ్యాక్ పొందుతారు` |

`shop_more_to_place_order` is reused unchanged for `below_minimum`.

> Telugu strings above are drafts modelled on the existing file's register and
> need a native-speaker review before release.

### Rendered variations

Live settings, standard user (`isVip: false`):

| Cart | Primary | VIP upsell | Bar |
|---|---|---|---|
| ₹50 | Shop for ₹149 more to place order | *(none)* | 25.1% |
| ₹250 | Shop ₹500 more to get ₹25 cashback | Add VIP for ₹45/month · double it to ₹50 | 9.3% |
| ₹800 | Shop ₹700 more to get ₹50 cashback | Add VIP for ₹45/month · double it to ₹100 | 6.7% |
| ₹1,600 | Shop ₹650 more to get ₹75 cashback | Add VIP for ₹45/month · double it to ₹150 | 13.3% |
| ₹7,500+ | Max cashback unlocked · ₹250 | Add VIP for ₹45/month · double it to ₹500 | 100% |

VIP user (`isVip: true`) — `vipUpsell` is `null` at every value, and the subtext
slot collapses rather than reserving empty space:

| Cart | Primary | Bar |
|---|---|---|
| ₹250 | Shop ₹500 more to get ₹50 cashback | 9.3% |
| ₹800 | Shop ₹700 more to get ₹100 cashback | 6.7% |
| ₹7,500+ | Max cashback unlocked · ₹500 | 100% |

No VIP upsell is shown in `below_minimum` — the user has not cleared the order
threshold, and two competing asks in a three-line bar reads as noise.

### VIP fee is monthly, not per-order

`vipUpgradeFee` (₹45) is a **one-time monthly membership fee** — it is not
charged again on each order placed that month. The upsell copy says
**"₹45/month"**, not "₹45", so it cannot read as a per-order charge.

Since `vipReward` is exactly `2 × standardReward`, upgrading gains the user
exactly `standardReward` extra **per order** placed that month, against the
fee paid **once**:

- First ₹750 order in the month: pay ₹45, gain ₹25 → net −₹20 so far
- A second ₹750 order that same month: gain another ₹25, no further fee →
  cumulative net +₹5
- A third: cumulative net +₹30

So break-even within a calendar month is roughly two tier-1 orders, not "tier 2
in a single order" as an earlier draft of this spec assumed before the fee's
monthly nature was confirmed. Every order beyond break-even is pure upside, and
a single large order (tier 2, ₹1,500, and up) clears break-even by itself.

The "double it to ₹X" wording is literally true per order and does not overstate
the programme — it is `vipMonthlySpendTarget: 2500` that the programme is
actually scoped around. Recorded here so the per-order vs. monthly framing is
not re-litigated later.

## Shared wiring

```ts
// src/features/cart/domain/useCartCashback.ts
export function useCartCashback(grandTotal: number): CartProgressState;
```

Gathers config settings, `isVip` from the auth store (false when logged out), and
the passed total. Both surfaces call this, so the wiring exists once and the two
cannot drift.

Rejected alternative: folding cashback into `computeBill`. That puts display
concerns in the bill engine and drags `ordersApi.buildBill` along with it.

## Surfaces

### Snackbar — `CartSummaryCard`

The `belowMinimum ? … : savings ? … : ready` ternary is replaced by helper
output. Above the minimum, **cashback replaces the "You saved ₹X" line**;
savings still appear on the cart screen.

The card gains a subtext row. The layout risk is real: at 12.5px, with Telugu
running ~30% longer, the primary line plus upsell may wrap and crowd the tab bar.
Screenshots at each cart state are part of implementation, not an afterthought.

### Cart screen — `CartScreen`

Shows the same progress line and VIP upsell as the snackbar, from the same hook,
to motivate a larger cart at the point of checkout.

### Bill row — `BillSummaryCard`

**Cashback is earned, not a discount. It must not reduce `grandTotal`.** Doing so
would both misstate "To pay" and, because tiers are evaluated against
`grandTotal`, could drop the cart below the tier that granted the cashback.

The row sits **below** "To pay" as a separate earned-value line, styled like the
existing `you_saved_order` strip rather than like `couponDiscount`:

```
Item total (MRP)     ₹1,850
Discount on MRP       −₹250
─────────────────────────────
To pay               ₹1,600
You'll earn ₹50 cashback on this order
```

The row uses **`unlockedReward`** — what the cart has actually earned right now —
**not** the `nextTier` reward the snackbar advertises. The two figures differ by
design: the snackbar sells what is still reachable, the bill states what is
banked. At a ₹1,600 cart the snackbar reads "Shop ₹650 more to get ₹75 cashback"
while the bill reads "You'll earn ₹50 cashback on this order".

Shown only when a tier is unlocked (`unlockedReward > 0`), so it is absent in
`below_minimum` and `toward_first_tier`. **The `Bill` interface is not extended**
— the row reads from the hook, keeping `ordersApi.buildBill` and order history
untouched.

`activationDelay` and `expiryPeriod` are not returned by the helper (YAGNI —
nothing renders them yet); a future details sheet imports them from the config
module directly.

## Testing

TDD. `cartProgress.test.ts` first:

- Every phase, both `isVip` values
- Exact boundaries: ₹198.99 / ₹199 / ₹749 / ₹750 / ₹1,500 / ₹7,499 / ₹7,500
- **Unit-conversion regression**: a ₹750 cart in internal units unlocks tier 1
- **VIP isolation**: for `isVip: true`, no returned string at any cart value
  contains a `standardReward` amount
- Kill switch: `active: false`, `isDeleted: true`, empty `tiers` → `disabled`
  with today's behaviour
- Segment-relative progress at each boundary, clamped to 0..1
- Monthly cap clamping when `earnedThisMonth` is supplied
- Tier array supplied out of order is sorted correctly

Then update `CartSummaryCard.test.tsx`, whose current above-minimum assertions
break by design.

## Open questions

1. **Which endpoint carries `cashbackSettings`?** Assumed nested in
   `/app/auth/me` because the payload's `storeId` matches the one `getMe` is
   called with — unverified, and nothing in the codebase references it. Only
   affects the later API swap, not this pass.
2. **`grandTotal` vs `itemTotal`** for tier evaluation — see above.
3. **Store-hours behaviour** — data lands in config; no UI consumes it.

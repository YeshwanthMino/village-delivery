# Cart Summary Card Redesign — Design

Date: 2026-07-26
Status: Draft

## Problem

`FloatingCartPill` (`src/shared/components/FloatingCartPill.tsx`) — the "N items
in cart · View cart →" bar shown while browsing on Home, Categories,
CategoryDetails, Search, and TopPicks — is a flat `#16a34a` block with no real
visual identity: a single row of text on a colored rounded rectangle. It carries
no information beyond count and a static CTA.

We're replacing it with a denser summary card, modeled on a reference
screenshot (Zepto-style), that also introduces a real product rule this app
doesn't have today: **a ₹199 minimum order value**, gating checkout, not just a
cosmetic message.

## What already exists (reused, not rebuilt)

- **Cart state** — `useVillageStore` (`src/core/store/useVillageStore.ts`):
  `cart`, `cartSnapshots`, `addToCart`, `decFromCart`, `clearCart`.
- **Line items + bill** — `getCartItems()` and `computeBill()` in
  `src/features/cart/domain/bill.ts`. `computeBill` already derives
  `itemTotal`/`grandTotal`/etc. from line items and holds the existing
  `COUPON_CAP_RUPEES` constant — the new `MIN_ORDER_VALUE` constant follows the
  same pattern (a rupee constant divided by `UNITS_PER_RUPEE` for comparison
  against unit-space totals).
- **Checkout state machine** — `deriveCheckoutState()` in
  `src/features/cart/domain/checkoutState.ts`, a pure function consumed by
  `CartScreen` to drive `CheckoutBar`'s three existing states
  (`login` / `address` / `place`).
- **Currency** — `rupees()` / `UNITS_PER_RUPEE` /`toUnits()` in
  `src/shared/utils/currency.ts`. All money math happens in internal units;
  `rupees()` is the only formatting boundary.
- **Tab bar** — `app/(dashboard)/_layout.tsx`: white, 24px top corner radius,
  floating with shadow, `#28ae61` active tint. The card sits directly above it,
  same as the pill does today (`bottomOffset` prop pattern retained).

## Explicitly out of scope

- **`ProductCartBar`** (`src/features/product/views/components/ProductCartBar.tsx`,
  the add/adjust bar on the product detail page) — **no changes at all**, visual
  or behavioral. It keeps its current `bg-green-600` styling.
- **Inline expandable mini-cart** (tap-to-expand item list with live steppers)
  — considered and deferred. The card is tap-to-navigate only, same interaction
  as today's pill.
- **Per-village/store-configurable minimum order value** — the ₹199 threshold
  is a single fixed constant for now, not sourced from village/store config.
- Reconciling the app's broader color inconsistency (`#16a34a` vs `#28ae61`
  used elsewhere) — unrelated, much larger scope; not touched here.

## Design

### 1. New constant + bill derivation (`bill.ts`)

```ts
/** Minimum order value, in rupees, required to place an order. */
const MIN_ORDER_VALUE_RUPEES = 199;
```

`computeBill` gains two derived fields on `Bill`:

- `belowMinimum: boolean` — `grandTotal < MIN_ORDER_VALUE_RUPEES / UNITS_PER_RUPEE`
- `amountToMinimum: number` — the unit-space shortfall (`0` when not below
  minimum), used to render "Shop for ₹X more".

The gate is evaluated against `grandTotal` (the actual payable amount, post
coupon discount), not `itemTotal`, since that's what "eligible to place this
order" actually means.

### 2. Checkout gate (`checkoutState.ts`)

```ts
export type CheckoutState = 'below_minimum' | 'login' | 'address' | 'place';

export interface CheckoutInputs {
  isAuthenticated: boolean;
  hasAddress: boolean;
  belowMinimum: boolean;
}

export function deriveCheckoutState({ isAuthenticated, hasAddress, belowMinimum }: CheckoutInputs): CheckoutState {
  if (belowMinimum) return 'below_minimum';
  if (!isAuthenticated) return 'login';
  if (!hasAddress) return 'address';
  return 'place';
}
```

`belowMinimum` is checked **first** — a cart that doesn't meet the minimum
isn't ready to check out regardless of auth/address state.

`CartScreen` passes `bill.belowMinimum` into `deriveCheckoutState` alongside
the existing two inputs.

### 3. `CheckoutBar` — new blocked state

A fourth branch alongside the existing `login`/`address` single-button state
and the `place` card:

- Full-width bar, **visually disabled** — muted gray (`#f1f5f9` background,
  `#64748b` text), not the active green used by `login`/`address`/`place`, and
  not tappable (no `onPress`, or a no-op).
- Content: centered two-line stack — `"Shop for ₹{amountToMinimum} more to
  place order"` above a thin (3px) gray progress bar showing progress toward
  ₹199.

### 4. `CartSummaryCard` (new component, replaces `FloatingCartPill`)

`FloatingCartPill.tsx` is deleted; `CartSummaryCard.tsx` takes its place in
`src/shared/components/` and its barrel export. Same call sites as today's
pill: `HomeScreen`, `CategoriesScreen`,
`CategoryDetailsScreen`, `SearchScreen`, `TopPicksScreen`. Same prop shape
(`count`, `onPress`, `bottomOffset`) plus reads `cart`/`cartSnapshots` from
`useVillageStore` directly (like `CartItemRow` does) to compute the bill and
find the last-added item, rather than threading more props through five
screens.

**Shape & color** — a thin rounded card (11px radius), background
`#0f5132` (a deeper, richer shade of the app's practical brand green
`#16a34a` — chosen over the reference's blue specifically so it doesn't clash
with the green used everywhere else in this app), positioned exactly where
the pill sits today (margin ~9px horizontal, sitting just above the tab bar).
Padding is tight (4px vertical / 9px horizontal) — the card's height comes
from its text content, not from padding.

**Two states, driven by `bill.belowMinimum`:**

- **Below ₹199:**
  - Row 1: `"{count} ITEMS · {rupees(grandTotal)}"` — bold, ~13px on-device.
  - Row 2: `"Shop for {rupees(amountToMinimum)} more to place order"` — lighter
    weight, ~12px, mint-tinted white (`#d1fae5`).
  - A 2px hairline progress bar below both rows, fill proportional to
    `grandTotal / (MIN_ORDER_VALUE_RUPEES / UNITS_PER_RUPEE)`.
  - A stacked cluster of up to 3 thumbnails on the right, fanned/overlapping
    (26px tiles, offset ~9px horizontally / 2px vertically each, white
    border, front-to-back = most-to-least recently added distinct product).
    Fewer than 3 distinct products in the cart means fewer tiles — no empty
    placeholders. Each tile falls back to the item's emoji when it has no
    image, matching `CartItemRow`'s existing fallback pattern.
- **At/above ₹199:**
  - Single row: `"{count} ITEMS · {rupees(grandTotal)}"` on the left,
    `"View cart →"` action text on the right. No thumbnail, no progress bar —
    nothing left to nudge toward.

**Interaction** — the entire card is one tap target; tapping anywhere (in
either state) calls `onPress` (navigates to `/cart`), identical to today's
`FloatingCartPill`. No chevron, no expand affordance — a chevron would imply
in-place expansion that this design doesn't build.

**Visibility** — same as today: rendered only when `count > 0` (in the
below-minimum state, the card is still the cart-has-items case, just gated at
checkout — it does not hide the card).

## Testing

- `computeBill`: new unit tests for `belowMinimum`/`amountToMinimum` at
  values below, at, and above `MIN_ORDER_VALUE_RUPEES`, including the
  post-coupon-discount case.
- `deriveCheckoutState`: extend existing tests with `belowMinimum: true`
  cases, confirming it wins over `login`/`address`.
- `CartSummaryCard`: snapshot/render tests for both states (below/at-minimum),
  thumbnail-cluster count (1, 2, 3+ distinct products), thumbnail fallback
  (image vs. emoji), and that tap always fires `onPress`.
- `CheckoutBar`: render test for the new blocked state (non-interactive,
  correct nudge text).

## Assumptions to confirm on review

1. The ₹199 gate compares against **`grandTotal`** (post-coupon), not
   `itemTotal`. If coupons should be excluded from eligibility, this needs to
   change to `itemTotal`.

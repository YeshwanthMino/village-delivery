# Cart Checkout CTA + Inline Payment — Design

Date: 2026-06-22
Status: Draft (pending user review)

## Problem

The Cart's bottom bar (`CheckoutBar`) is static: it always renders a COD/UPI
payment selector plus a "Proceed to checkout" button, regardless of whether the
user is logged in or has chosen a delivery address. Tapping checkout opens the
login sheet unconditionally. This does not match the intended Blinkit/Zepto-style
flow, where the bottom CTA guides the user through a sequence — log in, then
select an address, then pick a payment method, then place the order — and where
payment selection is not surfaced until it is actually relevant.

We need the bottom bar to be a **state machine** driven by auth state, the
selected delivery address, and the chosen payment method; and we need the
payment options moved into the scroll content (below the bill summary) with a
cleaner, selected-as-filled-card treatment.

## What already exists (reused, not rebuilt)

- **Auth** — `useAuthStore.isAuthenticated`; `LoginBottomSheet` with a
  `mode='auth'` path (authenticate then `onComplete`, no order animation) and a
  `'placing'` step for order placement.
- **Address** — `useCartAddressViewModel()` exposes `{ isAuthenticated,
  selectedAddress, loading }`; `DeliveryAddressCard` already renders the
  auth-aware address states. The address screen is at route `/address/add`.
- **Bill** — `useCartViewModel().bill` provides `grandTotal`, `totalSavings`,
  `totalCount`.
- **CheckoutBar** — currently owns the payment selector + checkout button;
  `CartScreen` owns `paymentMethod` state (`'cod' | 'upi' | null`) and
  `handleCheckout`.
- **Icons** — `lucide-react-native` is the project icon set.

## Design

### 1. Bottom-bar state machine (refactored `CheckoutBar`)

The bar derives one of four states from three inputs: `isAuthenticated`,
`hasAddress` (`selectedAddress != null`), and `paymentMethod`.

| State | Condition | Bar contents | Tap action |
|-------|-----------|--------------|------------|
| 1 `login` | `!isAuthenticated` | Full-width green **"Login to proceed ›"** | Open `LoginBottomSheet` (`mode='auth'`). On success the bar re-evaluates to state 2 or 3. |
| 2 `address` | authed, `!hasAddress` | Full-width green **"Select address to proceed ›"** | `router.push('/address/add')`. On return with a selected address → state 3. |
| 3 `payment` | authed, `hasAddress`, `!paymentMethod` | Grey, non-tappable **"Select a payment method"** | none (the inline payment section above is where the user picks) |
| 4 `place` | authed, `hasAddress`, `paymentMethod` | Green bar: left = `₹grandTotal` + `saving ₹savings`; right = **"Place order ›"** | Existing checkout flow (`handleCheckout` → `LoginBottomSheet` `'placing'`). |

The derivation is a **pure function** `deriveCheckoutState({ isAuthenticated,
hasAddress, paymentMethod }) → 'login' | 'address' | 'payment' | 'place'`,
extracted so it can be unit-tested without rendering. `CheckoutBar` becomes
presentational: it receives the derived state (or the three inputs) plus the
bill figures and the relevant callbacks (`onLogin`, `onSelectAddress`,
`onPlaceOrder`), and renders the matching layout. The inline COD/UPI selector
markup is **removed** from `CheckoutBar`.

### 2. Inline payment section (new `PaymentMethodSection`)

A new presentational component rendered in the Cart scroll content **directly
below `BillSummaryCard`**, shown only when `isAuthenticated && hasAddress`
(states 3 and 4). Hidden otherwise so the earlier states match the reference
(just the single full-width CTA).

- Section header: "Payment method".
- Two selectable rows, COD/UPI only:
  - **Cash on delivery** — lucide `Banknote` icon, subtitle "Pay when it
    arrives".
  - **UPI** — lucide `Smartphone` icon, subtitle "GPay, PhonePe, Paytm".
- Each row: a rounded icon tile on the left, name + subtitle, and a trailing
  status icon.
- **Selected** row = filled **brand-green** (`#16a34a`) card, white text/icon,
  lucide `Check` trailing.
- **Unselected** row = plain white card with subtle shadow, slate text, lucide
  `Circle` trailing.
- Props: `selected: PaymentMethod`, `onSelect: (m) => void`.

Selection state stays in `CartScreen` (reuse the existing `paymentMethod`
`useState`). Picking a row sets it, moving the bar from state 3 → 4.

### 3. CartScreen wiring

- Compute `hasAddress = addr.selectedAddress != null` (and the bar can also use
  `addr.isAuthenticated`).
- Render `PaymentMethodSection` after `BillSummaryCard` guarded by
  `addr.isAuthenticated && hasAddress`.
- Pass the three inputs + callbacks to `CheckoutBar`:
  - `onLogin` (state 1) → open a `LoginBottomSheet` with `mode='auth'` whose
    `onComplete` simply closes the sheet. After auth, `isAuthenticated` flips and
    the bar advances on its own to state 2 (or 3 if an address is already
    selected) — no navigation needed. This is the **pure login** path; it does
    **not** reuse the `'placing'`-step checkout sheet.
  - `onSelectAddress` (state 2) → `handleAddressPress` (existing: authed → address
    screen).
  - `onPlaceOrder` (state 4) → `handleCheckout` (existing `'placing'` flow).
- Note there are two distinct sheets: the **auth-mode** sheet used by the state-1
  login CTA and the existing address auth gate, vs. the **placing** sheet used by
  "Place order". Keep them separate.

### 4. Components and responsibilities

- `deriveCheckoutState` (pure helper, e.g. `src/features/cart/domain/`) — maps
  the three inputs to a state string. Unit-tested.
- `CheckoutBar` (refactored, presentational) — renders the bar for the derived
  state; no payment selector, no internal business logic.
- `PaymentMethodSection` (new, presentational) — the two-row COD/UPI selector
  with the filled-selected-card treatment.
- `CartScreen` — owns `paymentMethod`, derives `hasAddress`, composes the
  section + bar, owns the sheets/navigation callbacks.

### 5. Error and loading handling

- Address loading: `addr.loading` is already handled by `DeliveryAddressCard`;
  the payment section simply does not render until `hasAddress` is true.
- Auth errors: handled inside `LoginBottomSheet` (existing).
- No new network calls are introduced (payment is still a local selection feeding
  the existing placing flow).

### 6. Testing

- Unit-test `deriveCheckoutState` across the truth table: unauth → `login`;
  authed+noaddr → `address`; authed+addr+nopay → `payment`; authed+addr+pay →
  `place`.
- Manually verify the four transitions end-to-end:
  1. Logged out cart → "Login to proceed" → auth → bar shows "Select address".
  2. Authed, no address → "Select address to proceed" → add/select address →
     payment section appears, bar shows "Select a payment method".
  3. Pick COD or UPI → row fills green, bar shows "₹… Place order".
  4. "Place order" → existing placing flow runs.
- Match the existing jest patterns used for the address-flow tests.

## Scope guardrails (YAGNI)

Out of scope: additional payment methods (cards, net-banking, wallets) beyond
COD/UPI; real payment-gateway integration; remembering the last-used payment
method across sessions; changing the address-card or address-screen behavior
(covered by the 2026-06-21 cart-address-flow spec). This change is strictly the
bottom-bar state machine + the inline COD/UPI selector and their wiring.

## End-to-end UX

A shopper opens the cart. If logged out, one green button says "Login to
proceed"; tapping it authenticates in place. The button then reads "Select
address to proceed"; tapping opens the address screen and returns with a chosen
address. A "Payment method" section now appears below the bill summary with two
rows — Cash on delivery and UPI — the picked one filling solid green. The bottom
bar, grey until a method is chosen, turns green and reads "₹176 — Place order".
Tapping it runs the existing order-placement flow.

# Cart Checkout CTA + Inline Payment — Design

Date: 2026-06-22 (revised 2026-06-23)
Status: Implemented

> **2026-06-23 revision.** After review against the live Blinkit-style reference
> the design changed in three ways: (a) the delivery address now lives **in the
> sticky bottom bar** as a "Delivering to <tag> · Change" strip (the in-scroll
> `DeliveryAddressCard` is removed); (b) payment is **no longer a gate** — Cash on
> delivery is preselected by default so the bar is ready to place the order as
> soon as an address exists, and the user switches method in the inline section
> below the bill; (c) CTA labels carry **no trailing arrow**. The state machine
> is therefore three states (`login` → `address` → `place`). Sections below are
> updated to match.

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

The bar derives one of **three** states from two inputs: `isAuthenticated` and
`hasAddress` (`selectedAddress != null`). Payment is not an input because a
method is always preselected (see §2).

| State | Condition | Bar contents | Tap action |
|-------|-----------|--------------|------------|
| `login` | `!isAuthenticated` | Full-width green **"Login to proceed"** | Open `LoginBottomSheet` (`mode='auth'`). On success the bar re-evaluates to `address` or `place`. |
| `address` | authed, `!hasAddress` | Full-width green **"Select address to proceed"** | `router.push('/address/add')`. On return with a selected address → `place`. |
| `place` | authed, `hasAddress` | Two-row card: **address strip** ("Delivering to <tag>" + one-line address + **"Change"**) above the **Place order** button (left = `₹grandTotal` + "TOTAL" label; right = **"Place order"**). | "Change" → address screen; button → checkout flow (`handleCheckout` → `LoginBottomSheet` `'placing'`). |

The derivation is a **pure function** `deriveCheckoutState({ isAuthenticated,
hasAddress }) → 'login' | 'address' | 'place'`, extracted so it can be
unit-tested without rendering. `CheckoutBar` is presentational: it receives the
derived `state`, `grandTotal`, the selected `addressTag` + one-line
`addressLine`, and callbacks (`onLogin`, `onSelectAddress`, `onPlaceOrder`), and
renders the matching layout. The address strip uses the lucide `Home` icon and
the `delivering_to_<tag>` / `change` translation keys. CTA labels carry **no
trailing arrow**.

### 2. Inline payment section (new `PaymentMethodSection`)

A new presentational component rendered in the Cart scroll content **directly
below `BillSummaryCard`**, shown only when `isAuthenticated && hasAddress` (the
`place` state). Hidden otherwise so the gated states match the reference (just
the single full-width CTA). **Cash on delivery is preselected** (`paymentMethod`
defaults to `'cod'`), so this section is never an empty/required gate — it lets
the user switch to UPI, and Place Order is always enabled.

- Section header: "Payment method".
- Two selectable rows, COD/UPI only:
  - **Cash on delivery** — lucide `Banknote` icon, subtitle "Pay when it
    arrives".
  - **UPI** — lucide `Smartphone` icon, subtitle "GPay, PhonePe, Paytm".
- Each row: a neutral rounded icon tile on the left, name + subtitle, and a
  trailing **radio button**.
- All rows are **plain white cards** with a subtle shadow (the card is never
  filled). Selection is shown only by the radio:
  - **Selected** — filled brand-green (`#16a34a`) radio with a white center dot,
    plus a thin green ring (`box-shadow` outline) around the card.
  - **Unselected** — empty grey-bordered radio, plain card.
- Props: `selected: PaymentMethod`, `onSelect: (m) => void`.

Selection state stays in `CartScreen` — `paymentMethod` `useState` defaults to
`'cod'`. Picking a row switches the method; it never returns the bar to a
non-`place` state.

### 3. CartScreen wiring

- Compute `hasAddress = addr.selectedAddress != null` and a one-line
  `addressLine` (`[addressLine1, villageName].filter(Boolean).join(', ')`).
- Render `PaymentMethodSection` after `BillSummaryCard` guarded by
  `addr.isAuthenticated && hasAddress`. The in-scroll `DeliveryAddressCard` is
  **removed** (address now lives in the bar).
- Pass to `CheckoutBar`: `state`, `grandTotal`, `addressTag`
  (`addr.selectedAddress?.tag`), `addressLine`, and callbacks:
  - `onLogin` (`login` state) → open a `LoginBottomSheet` with `mode='auth'` whose
    `onComplete` simply closes the sheet. After auth, `isAuthenticated` flips and
    the bar advances on its own — no navigation needed. This is the **pure login**
    path; it does **not** reuse the `'placing'`-step checkout sheet.
  - `onSelectAddress` (`address` state button **and** the `place`-state "Change"
    link) → `handleAddressPress` (authed → address screen; else the address auth
    gate).
  - `onPlaceOrder` (`place` state) → `handleCheckout` (existing `'placing'` flow).
- Note there are two distinct sheets: the **auth-mode** sheet used by the login
  CTA and the existing address auth gate, vs. the **placing** sheet used by
  "Place order". Keep them separate.

### 4. Components and responsibilities

- `deriveCheckoutState` (pure helper, `src/features/cart/domain/`) — maps the two
  inputs to `'login' | 'address' | 'place'`. Unit-tested.
- `CheckoutBar` (refactored, presentational) — renders the bar for the derived
  state, including the `place`-state address strip; no payment selector, no
  internal business logic.
- `PaymentMethodSection` (presentational) — the two-row COD/UPI selector with the
  radio-selection treatment.
- `CartScreen` — owns `paymentMethod` (default `'cod'`), derives `hasAddress` +
  `addressLine`, composes the section + bar, owns the sheets/navigation
  callbacks.

### 5. Error and loading handling

- Address loading: the payment section and the `place`-state bar simply do not
  render until `hasAddress` is true; while authed addresses load, the bar shows
  "Select address to proceed".
- Auth errors: handled inside `LoginBottomSheet` (existing).
- No new network calls are introduced (payment is still a local selection feeding
  the existing placing flow).

### 6. Testing

- Unit-test `deriveCheckoutState` across the truth table: unauth → `login`;
  authed+noaddr → `address`; authed+addr → `place`.
- Manually verify the transitions end-to-end:
  1. Logged out cart → "Login to proceed" → auth → bar shows "Select address to
     proceed".
  2. Authed, no address → "Select address to proceed" → add/select address →
     payment section appears (COD preselected); bar shows the address strip +
     "₹… / TOTAL / Place order".
  3. Switch COD ↔ UPI in the inline section (Place order stays enabled).
  4. "Place order" → existing placing flow runs. "Change" → address screen.
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
address. The bottom bar now shows a "Delivering to Home … Change" strip above a
"₹176 / TOTAL / Place order" button, and a "Payment method" section appears
below the bill summary with two radio rows — Cash on delivery (preselected) and
UPI. Place Order is enabled throughout; tapping it runs the existing
order-placement flow, and "Change" reopens the address screen.

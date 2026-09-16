# Cart Wallet Redemption — Design

**Date:** 2026-09-16
**Status:** Approved design, pending implementation plan

## Goal

Let a customer apply their real wallet/cashback balance (already surfaced read-only on the Wallet screen, see `2026-09-08-wallet-screen-design.md`) to reduce the total on the Cart page, and actually redeem it when the order is placed.

The Wallet screen spec explicitly marked "spending the wallet balance at checkout" out of scope. This spec is that follow-up.

## Background: the backend contract

`POST /app/orders` (`createOrder` in `orderApi.ts`) accepts a top-level boolean field, confirmed from the staging Swagger request schema:

```json
{
  "products": [...],
  "address": "string",
  "orderPayments": [...],
  "useWallet": true
}
```

This is **all-or-nothing** — a boolean flag, not a partial amount. The backend, not the client, decides how much of the balance is actually applied to the order. The response shape for a `useWallet: true` order (whether it echoes back the amount deducted) is **unconfirmed** — this spec does not depend on it (see "Known simplification" below).

## Scope

**In scope**
- A `WalletApplyCard` on the Cart screen showing the real `/app/wallet` cashback balance, applied by default, removable by the customer.
- Bill math that estimates the discount client-side for display (`min(balance, total-so-far)`).
- Wiring `useWallet` into the real `POST /app/orders` call.
- Refetching the wallet balance after a successful order (the backend, not this app, is authoritative on what was actually deducted).

**Out of scope**
- Partial wallet redemption (the backend flag doesn't support it).
- Reconciling/displaying a server-confirmed deducted amount post-order (response shape unconfirmed; noted as a follow-up if/when confirmed).
- Any change to the generic `wallet` balance field (still not surfaced anywhere, per the Wallet screen spec).

## Architecture & data flow

- Reuse the existing `useWalletQuery` (already fetches `/app/wallet` → `{ cashback, expiryDate, daysLeft }`) on the Cart screen. Same query key as Profile (`queryKeys.wallet.detail()`), so cached data (if any) paints instantly — no blank flash. But this balance directly affects real money at checkout, so the Cart screen must not trust a value that might be stale from an earlier Profile visit: `useWalletQuery` gains an optional `{ alwaysFresh?: boolean }` param that sets React Query's `refetchOnMount: 'always'`. Profile keeps calling it with no args (normal caching behavior); the Cart screen calls `useWalletQuery({ alwaysFresh: true })` so it always revalidates against the server the moment the Cart screen mounts, while still showing the cached figure immediately if one exists.
- New `WalletApplyCard` component in `src/shared/components/`, modeled directly on `VipMembershipCard`'s controlled add/remove pattern: the screen owns the boolean, the component only renders it.
- `useCartViewModel` gains `walletApplied` state, seeded from whether a usable balance exists once the wallet query resolves (see "Default behavior" below), plus `toggleWallet`/`removeWallet` to flip it.
- `computeBill()` gains new opts: `walletApplied?: boolean`, `walletBalance?: number` (internal units, from the wallet query).

## Default behavior (applied by default)

Unlike the coupon toggle (which defaults off), the wallet card **defaults to applied** whenever a positive balance is available — the discount already shows in the bill and the card reads "₹50 applied to this order" / "Remove" on first render. This mirrors "the discount you're entitled to is already working for you" rather than requiring an extra tap.

Implementation detail: `useCartViewModel` tracks two pieces of state — `walletApplied` (boolean, starts `false`) and `walletAutoAppliedOnce` (boolean, starts `false`). A `useEffect` watching the wallet query's `data` sets `walletApplied = true` and `walletAutoAppliedOnce = true` the first time `wallet.cashback > 0` is seen AND `walletAutoAppliedOnce` is still `false`. Once `walletAutoAppliedOnce` is `true`, the effect never fires again this mount, so a customer who taps Remove keeps it removed even if the query refetches in the background (e.g. tab focus revalidation). `toggleWallet` flips `walletApplied` directly and does not touch `walletAutoAppliedOnce`.

## Bill computation

- New `Bill.walletDiscount` field: `walletApplied ? Math.min(walletBalance, amountBeforeWallet) : 0`, applied after coupon discount and VIP fee — same slot in the pipeline, so `minOrderValue`/`belowMinimum` derive from the post-wallet total, consistent with how coupon/VIP discounts already work.
- `grandTotal` is reduced by `walletDiscount`, same as today's `couponDiscount`.

## UI

- `WalletApplyCard` sits right after `VipMembershipCard`, before the items list (see mockup reviewed in the visual companion).
- Hidden entirely when: unauthenticated, wallet query loading/error, or balance is 0/null — mirrors the "confident data or nothing" rule already in `walletApi.mapWallet`. This is a convenience feature, not core checkout; it must never show a broken or misleading state.
- Applied (default) state: teal/cyan card, "Wallet balance" + "₹50 applied to this order" + a **Remove** pill.
- Removed state: same card, outline style, "₹50 cashback available" + an **Apply** pill.
- `BillSummaryCard` gets a new `walletApplied` prop and renders a green "Wallet balance −₹50" row when applied, mirroring the existing coupon row exactly.

## Order placement wiring

- `CreateOrderInput` gains `useWallet?: boolean`; `orderApi.createOrder` sends it in the POST body (defaults `false`).
- `CartScreen.handlePlaceOrder` passes `useWallet: vm.walletApplied && vm.bill.walletDiscount > 0`.
- `useCreateOrderMutation`'s success path (only when `orderId` is present, same guard as the existing orders-cache invalidation) also invalidates `queryKeys.wallet.detail()`, so the real post-order balance refetches next time it's read.

## Known simplification (explicit, by request)

Since `useWallet` is boolean, the **backend** decides the real amount deducted — the client's `walletDiscount` is a best-effort display estimate only (`min(balance, total-so-far)`), not a guarantee of what gets charged. We never see a confirmed applied-amount back from the order response (shape unconfirmed), so we don't try to reconcile it — we refetch the wallet balance after a successful order and trust that number going forward. If the true deducted amount ever needs to be shown on an order-confirmation surface, that's a separate follow-up once the response shape is confirmed.

## Edge cases

- **Balance exceeds order total:** discount caps at the pre-wallet total (order can't go negative); the customer's remaining balance is whatever the backend leaves it at afterward.
- **Applying wallet drops the total below the ₹199 minimum:** inherits the same pre-existing behavior as a large coupon discount already has today (both apply before the `minOrderValue` derivation) — not a new gap introduced here, not fixed here.
- **Cart contents change after the toggle state is set:** the toggle (on or off) is not reset; the discount just re-estimates against the new total on every render.
- **Query still loading on first paint:** card is hidden (not a skeleton) until the balance is known, then appears already-applied if positive.

## Testing

- `bill.ts` unit tests: wallet discount capped at balance vs. capped at total; `walletApplied=false` yields 0 discount.
- `orderApi.createOrder` test: `useWallet` included in the POST body when set, defaults to `false` when omitted.
- `useCreateOrderMutation` test: wallet query invalidated on successful placement (and not on stock-conflict/error paths, matching the existing orders-invalidation tests).
- `BillSummaryCard` test: wallet row shown/hidden by `walletApplied`.
- `WalletApplyCard` component tests: hidden states (loading/error/zero/unauthenticated), default-applied state when balance > 0, apply/remove interaction, and that a manual removal survives a background refetch.
- `useCartViewModel` test: default-applied seeding happens once per resolved balance, not on every refetch.
- `useWalletQuery` test: `alwaysFresh: true` sets `refetchOnMount: 'always'`; the default (no args) call keeps normal caching, matching Profile's existing usage.

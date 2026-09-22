# Wallet Screen — Design

**Date:** 2026-09-08
**Status:** Approved design, pending implementation plan

## Goal

Give a customer a screen showing their wallet balance and transaction history, reachable from Profile, using the real backend wallet data the admin panel's "Wallet Details & Cashback" tab already reads — not the locally-simulated cashback state this app has used everywhere else so far.

## Background: how this was found

The admin panel (`staging-admin.villagedelivery.in`, customer edit → Wallet & Cashback tab) calls two endpoints on `staging-api.villagedelivery.in`, discovered by intercepting the panel's own XHR traffic against a real customer (Gopi Guri):

- `GET /customers/{customerId}` — the full staff-facing customer record. The wallet-relevant slice, as actually observed:
  ```json
  {
    "currentMonthSpend": 1080,
    "currentMonthCashbackEarned": 50,
    "isVip": true,
    "hasLimitlessCashback": false,
    "walletId": {
      "wallet": 0,
      "cashback": 50,
      "cashbackExpiryDate": "2026-11-06T18:29:59.999Z"
    }
  }
  ```
- `GET /customer-wallet-transactions/customer/{customerId}` — the transaction list:
  ```json
  {
    "transactions": [{
      "transactionType": "CREDIT",
      "amount": 50,
      "status": "ACTIVE",
      "description": "Cashback earned, order OD-1788660748803 (₹750+ tier)",
      "createdAt": "2026-09-06T03:34:04.900Z"
    }],
    "count": 1
  }
  ```

Cross-checked against the backend's own Swagger docs (`staging-api.villagedelivery.in/api`, "Commerce9 API"), which additionally documents:
- `GET /wallet/customer/{customerId}` — the wallet document directly (same shape as the `walletId` object above), without the surrounding staff-record payload.
- `GET /customer-wallet-transactions/balance/{customerId}` — a dedicated balance-only endpoint.
- `GET /customer-wallet-transactions/cart-preview` — appears to be server-side cashback-tier computation. Not used by this spec; noted because it could eventually replace the local `cashbackConfig.ts` simulation this app built earlier — out of scope here.

None of these four appear under the Swagger doc's `App*`-tagged operations (`AppAuth`, `AppOrder`, `AppCustomer`, …) — the route family this app's own client (`apiClient` + `WebService.villageBaseURL`, i.e. `/app/...` on `ub7mvw9ks.bizzz.in`) actually calls for everything else. They're grouped under plain `Wallet` / `customer-wallet-transactions` tags, alongside other staff-only operations. See **Open question — endpoint scope** below; this spec designs against the shape of this data, not against calling these specific URLs from the app.

## Scope

**In scope**
- A new Wallet screen: one balance card + a transaction history list.
- A "Wallet" entry point on the Profile screen.
- The data layer (types, API functions, React Query hooks) shaped to match the real backend response, with the network call itself behind an integration point that's trivial to repoint once the endpoint question below is resolved.

**Out of scope**
- Spending the wallet balance at checkout ("pay with wallet"). Nothing here implies that's coming; this is a read-only balance + history view, matching the literal ask.
- The generic `wallet` field's own UI treatment beyond storing it — see **Known simplification** below.
- `/customer-wallet-transactions/cart-preview` and any move toward server-computed cashback tiers. Separate, larger piece of work.
- Redeeming, transferring, or otherwise mutating wallet state from the app.

## Known simplification (explicit, by request)

The backend wallet document carries two independent numbers — a generic `wallet` balance and a `cashback` balance — currently `0` and `50` respectively for every account inspected. Per direction: **the screen shows one card, labelled "Wallet", displaying the `cashback` figure.** The generic `wallet` field is fetched and typed but not surfaced in this pass. If a future feature ever populates it (e.g. a refund credited to the generic wallet rather than cashback), this card's number will read `cashback` only and quietly miss it — revisit then, not now.

The transaction list is not filtered to cashback-sourced entries — it renders every transaction the endpoint returns, since the endpoint itself does not tag transactions by which balance they moved. In practice, today, everything in it *is* cashback (see the real example above), so this matches the single-balance card without extra filtering logic.

This isn't an arbitrary simplification: the admin's own customers list has a "Wallet" column, and for every account checked there it shows the `cashback` figure, not the generic `wallet` field (Gopi Guri: column reads ₹50, matching `cashback: 50` against `wallet: 0`). The admin UI already conflates the two under one "Wallet" label — this spec's single card follows the same convention the backend team's own tooling uses.

## Open question — endpoint scope

The four discovered endpoints take an explicit `{customerId}` path parameter — correct for the admin panel, where staff look up *any* customer. For this app, that shape is a liability: if the backend trusts the path parameter rather than deriving identity from the auth token, one customer's token could read another customer's balance by substituting the id in the URL.

**Recommendation, not yet confirmed with backend:** request parameterless, token-scoped equivalents — e.g. `GET /app/wallet` and `GET /app/wallet/transactions` — that resolve "which customer" from the caller's own auth token, matching every other `/app/...` route this app already calls. Do not point the app at the bare `/customers/{id}` record under any circumstance — it returned other staff accounts' data and full household member records in the captured example, which is broadly wrong to ship into a customer's own device regardless of auth. The narrower `/wallet/customer/{id}` and `/customer-wallet-transactions/customer/{id}` are closer to right-shaped but still carry the id-in-path risk above and are unconfirmed for customer-token access.

This spec's data layer is written against the *response shape* either way — the only thing that changes once this is resolved is the URL and whether a customer id is passed at all. That seam is called out explicitly in the data-layer section below so it's a one-file change.

## Architecture

A new `wallet` feature module, mirroring the existing `orders` module's structure exactly — this app already has a working pattern for "authenticated list screen backed by a query," and there's no reason to invent a second one.

```
app/(dashboard)/wallet.tsx                          — thin route
src/features/wallet/
  data/
    walletApi.ts                                     — types + fetch + mapping
    queries/
      useWalletBalanceQuery.ts
      useWalletTransactionsQuery.ts
  views/
    WalletScreen.tsx
    components/
      WalletBalanceCard.tsx
      WalletTransactionRow.tsx
```

## Data layer

```ts
// walletApi.ts
export interface WalletBalance {
  /** Cashback balance, internal units (see currency.ts) — the figure the card shows. */
  cashback: number;
  /** Generic wallet balance, internal units. Fetched, not yet displayed. */
  wallet: number;
  /** ISO date string, or null if the customer has no active cashback. */
  cashbackExpiryDate: string | null;
}

export type WalletTransactionType = 'CREDIT' | 'DEBIT';
export type WalletTransactionStatus = 'ACTIVE' | 'EXPIRED' | 'REVERSED';
// Status values beyond ACTIVE are inferred from the domain (a wallet credit
// that can expire needs some status to expire into) — not directly observed.
// The mapper treats any status string it doesn't recognize as inactive
// (de-emphasized in the UI) rather than crashing, so an unanticipated real
// value degrades gracefully instead of breaking the screen.

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number; // internal units, always positive — type carries the sign
  status: WalletTransactionStatus;
  description: string; // server-formatted, rendered as-is
  orderId: string | null;
  createdAt: string; // ISO date string
}

export function getWalletBalance(): Promise<WalletBalance>;
export function getWalletTransactions(): Promise<WalletTransaction[]>;
```

Both functions take no arguments — no customer id parameter, deliberately, per the open question above. Whichever URL and auth shape backend confirms, the call sites (`useWalletBalanceQuery`, `useWalletTransactionsQuery`, and the screen) never need to know a customer id; that stays entirely inside `walletApi.ts`.

Amounts arrive from the backend in rupees (matching every other real-API integration point in this app, e.g. `ordersApi.toUnits`) and are converted to internal units at the API boundary via the existing `toUnits()` — never displayed raw, same rule `currency.ts` already states for every other money value in this codebase.

## Screen

```
┌─────────────────────────────┐
│ ←  Wallet                    │
│                               │
│ ┌───────────────────────────┐ │
│ │ WALLET BALANCE             │ │
│ │ ₹50                        │ │
│ │ Cashback expires 6 Nov 2026│ │
│ └───────────────────────────┘ │
│                               │
│ TRANSACTION HISTORY          │
│ ┌───────────────────────────┐ │
│ │ 🎁 Cashback earned, order  │ │
│ │    OD-...(₹750+ tier)      │ │
│ │    6 Sep 2026, 9:04 AM     │ │
│ │    ACTIVE            +₹50 │ │
│ └───────────────────────────┘ │
└─────────────────────────────┘
```

- **`WalletBalanceCard`** — a single green gradient card (matching the app's brand green, `#16a34a`/`#15803d`, consistent with `CartSummaryCard`/`ProfileScreen`'s header treatment), showing the `cashback` figure via `rupees()`. The expiry subtitle renders only when `cashbackExpiryDate` is non-null; omitted entirely otherwise (no "no expiry" text — absence is the message).
- **`WalletTransactionRow`** — one row per transaction. `CREDIT` renders `+{amount}` in green; `DEBIT` renders `-{amount}` in red, mirroring the `CartItemRow`/order-history sign convention already used elsewhere. The `description` string renders verbatim — it's already server-formatted human copy, matching how `bill_cashback_earn` and friends treat pre-formatted amounts, except here the *whole sentence* comes from the server, not just a number. A non-`ACTIVE` status (`EXPIRED`, `REVERSED`) shows the row de-emphasized (muted text, muted badge) rather than hidden — it's a real thing that happened, just not contributing to the current balance.
- **Empty state**: no transactions — a plain centered message, matching `EmptyCart`'s tone ("No transactions yet" rather than an apology).
- **Loading**: `ActivityIndicator`, matching `OrdersScreen`.
- **Error**: inline error + retry, matching `OrdersScreen`'s `isError` branch.
- Both queries (`useWalletBalanceQuery`, `useWalletTransactionsQuery`) run independently and are each `enabled: isAuthenticated`, so a slow transaction list never blocks the balance card from rendering, and neither fires for a logged-out user — same gating `useOrdersQuery` already uses.

## Entry point

A new `ProfileRow` in `ProfileScreen.tsx`, inserted between the existing "My Orders" and "Address Book" rows (signed-in only, matching those two):

```tsx
<ProfileRow
  icon={<Wallet size={20} color="#16a34a" />}
  label={t('profile_wallet')}
  onPress={() => router.push('/(dashboard)/wallet')}
/>
```

New translation key `profile_wallet` (`te`/`en`), following the existing `profile_orders`/`profile_address_book` naming.

## Testing

- `walletApi.ts` mapper: unit tests turning a raw server payload (using the real captured shape, sanitized) into `WalletBalance`/`WalletTransaction[]`, including the null-expiry case, the unrecognized-status-degrades-gracefully case, and the unit conversion.
- `WalletScreen`: component tests for loading, error, empty, and populated states, plus the `enabled: isAuthenticated` gating — mirroring `OrdersScreen`'s existing test structure.
- `WalletBalanceCard` / `WalletTransactionRow`: focused component tests for the CREDIT/DEBIT sign convention and the non-ACTIVE de-emphasis, in the style of `CartItemRow`'s tests.

## Open questions

1. **Endpoint scope and auth** — see above. Blocks wiring the real network call; does not block building the screen against typed fixture data first.
2. **Deep-linking a transaction to its order** — `orderId` is present on each transaction. Tapping through to `OrderDetailScreen` is a natural extension but wasn't asked for; noted as a clean follow-up, not built here.
3. **Generic `wallet` field** — see Known simplification. Revisit once it's ever non-zero for a real account.

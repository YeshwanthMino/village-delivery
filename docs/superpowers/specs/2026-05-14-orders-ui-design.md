# Orders UI — Design Spec
**Date:** 2026-05-14  
**Project:** village-delivery (Expo RN)  
**Scope:** Order list screen + order detail screen, static mock data, Telugu/English i18n

---

## Context

`village-delivery` is a quick-commerce app for village users in Andhra Pradesh. UI is Telugu-first, low complexity. Products, cart, and checkout flows already exist. `OrdersScreen` is currently a placeholder (empty state with clipboard icon). This spec covers replacing that placeholder with a full orders list and detail screen — no backend API yet.

---

## Data Model

New types added to `src/base/types/village.types.ts`:

```ts
export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  nameTE: string;
  emoji: string;
  weight: string;
  price: number;
  mrp: number;
  quantity: number;
}

export interface Order {
  id: string;              // e.g. "ORD-2024-001"
  placedAt: string;        // ISO 8601 timestamp
  status: OrderStatus;
  items: OrderItem[];
  bill: Bill;              // reuse existing Bill type
  deliveryAddress: string;
  paymentMethod: 'cod' | 'upi';
}
```

`Bill` is the existing type from `village.types.ts` — no changes needed.

---

## Mock Data

File: `src/features/orders/data/mockOrders.ts`

5 orders covering all statuses:
- 1 × `out_for_delivery` (active, recent — shown prominently)
- 2 × `delivered`
- 1 × `confirmed`
- 1 × `cancelled`

Each order has 3–6 items drawn from existing product data (same emojis/names). Bill computed to match items.

---

## Zustand Store

`src/core/store/useVillageStore.ts` gets a new read-only slice:

```ts
orders: Order[]   // initialised from mockOrders
```

No write actions needed now. When checkout is implemented later, it will call `placeOrder(order: Order)` to push into this array.

---

## Architecture — New Files

```
src/features/orders/
  data/
    mockOrders.ts
  viewmodel/
    useOrdersViewModel.ts        ← groups orders: active[], past[]
    useOrderDetailViewModel.ts   ← single order by id + reorder()
  views/
    OrdersScreen.tsx             ← replaces placeholder
    OrderDetailScreen.tsx        ← new screen
```

**Navigation:** New Expo Router route `app/order-detail.tsx`. Receives `orderId` as query param. Same pattern as `app/category-details.tsx`.

---

## ViewModel Contracts

### useOrdersViewModel
```ts
{
  activeOrders: Order[];   // placed | confirmed | out_for_delivery
  pastOrders: Order[];     // delivered | cancelled
}
```

### useOrderDetailViewModel(orderId: string)
```ts
{
  order: Order | undefined;
  reorder: () => void;     // clears cart, adds all items, navigates to /cart
}
```

---

## UI — Orders List Screen

Replaces `src/features/orders/views/OrdersScreen.tsx`.

**Structure:**
- Header: "ఆర్డర్లు / Orders" (existing translation key `nav_orders`)
- If no orders: keep existing empty state (clipboard icon)
- If orders exist:
  - Section "Active" — `activeOrders` cards
  - Section "Past orders" — `pastOrders` cards

**Order Card layout:**
```
┌─────────────────────────────────────────┐
│  ORD-2024-001          [STATUS BADGE]   │
│  14 May · COD                           │
│  🍎 🥦 🥛  +2 more          ₹ 247      │
│                       View Details →    │
└─────────────────────────────────────────┘
```

**Status badge colors:**
| Status           | Color  | Extra          |
|------------------|--------|----------------|
| placed           | amber  |                |
| confirmed        | blue   |                |
| out_for_delivery | orange | pulsing dot    |
| delivered        | green  |                |
| cancelled        | slate  | strikethrough  |

---

## UI — Order Detail Screen

New file: `src/features/orders/views/OrderDetailScreen.tsx`.

**Structure (top to bottom):**

1. **Status banner** — full-width colored card, large icon, status label in Telugu + English
2. **Status timeline** — vertical 5-step stepper (Placed → Confirmed → Out for delivery → Delivered). Filled up to current step. Cancelled shows red X at `confirmed` step.
3. **Items list** — each row: `emoji  name (weight)  qty × ₹price`
4. **Bill summary** — reuse existing `BillSummaryCard` component
5. **Delivery address** — address string with map-pin icon
6. **Payment method** — COD or UPI chip

**Sticky bottom bar** (only for non-cancelled orders):
- Green "Reorder" button (full width)
- Tapping: clears cart → adds all items → navigates to `/cart`

---

## Translations

New keys added to `src/base/constants/translations.ts`:

| Key | English | Telugu |
|-----|---------|--------|
| `orders_active` | Active Orders | చురుకైన ఆర్డర్లు |
| `orders_past` | Past Orders | గత ఆర్డర్లు |
| `order_id` | Order {id} | ఆర్డర్ {id} |
| `status_placed` | Order Placed | ఆర్డర్ చేయబడింది |
| `status_confirmed` | Confirmed | నిర్ధారించబడింది |
| `status_out_for_delivery` | Out for Delivery | డెలివరీకి బయలుదేరింది |
| `status_delivered` | Delivered | డెలివరీ అయింది |
| `status_cancelled` | Cancelled | రద్దు చేయబడింది |
| `reorder_btn` | Reorder | మళ్ళీ ఆర్డర్ చేయి |
| `delivery_address` | Delivery Address | డెలివరీ చిరునామా |
| `payment_method_used` | Payment | చెల్లింపు |
| `order_total` | Total | మొత్తం |

---

## Error & Edge Cases

- Unknown `orderId` in detail screen → navigate back (no crash)
- Empty orders list → show existing empty state (clipboard icon)
- Cancelled order → hide "Reorder" button; timeline shows red X
- Items with variants → show variant name in weight field (already stored in `OrderItem.weight`)

---

## Out of Scope

- Real API integration (mino-api order module)
- Push notifications for status changes
- Order cancellation from app
- WhatsApp order tracking link
- Order search / filter

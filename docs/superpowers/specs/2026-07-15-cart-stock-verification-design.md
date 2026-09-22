# Cart Stock Verification on Open — Design Spec

**Date:** 2026-07-15  
**Feature:** Call stock verification API when user opens cart, display stock status, and enable modification workflow for out-of-stock items

---

## Overview

When a user opens their cart, we will immediately call the backend stock verification endpoint to check availability of all items. Stock status will be displayed as visual badges on each item. When a user clicks an out-of-stock item, the existing `OrderModificationSheet` will open to let them handle the conflict.

---

## Requirements

- **Trigger:** Stock check API called once when cart screen opens
- **Endpoint:** `POST https://ub7mvw9ks.bizzz.in/app/orders/check-stock`
- **Request payload:** Array of `{ productId: string, quantity: number }`
- **Display:** Red "Out of stock" badge on items that are unavailable
- **User action:** Clicking out-of-stock item opens `OrderModificationSheet`
- **Cache:** Stock status persists until cart is closed/reopened
- **No auto-refresh:** Status remains static from first check until user re-opens cart

---

## Architecture

### Global Stock State

Add a new state slice to your existing state management (context, Zustand, Redux, etc.):

```typescript
interface StockStatus {
  [productId: string]: {
    inStock: boolean;
    availableQuantity?: number;
  };
}

interface CartStockState {
  stockStatus: StockStatus;
  isLoading: boolean;
  error: string | null;
  lastChecked: number | null;
}
```

### State Management Responsibilities

1. **Fetch stock on cart open:** Call API with cart items, store results
2. **Expose stock status:** Components query state to check if item is in stock
3. **Manage loading/error states:** UI shows spinner while fetching, toast if API fails
4. **Clear on demand:** Optional cleanup when cart closes

---

## Data Flow

```
User opens Cart
  ↓
Cart screen mounts → useEffect triggered
  ↓
Call verifyCartStock() with cart items
  ↓
POST /app/orders/check-stock
  ↓
Response: { productId: boolean | { inStock: boolean, availableQuantity: number } }
  ↓
Store in global stock state
  ↓
Cart item rows render with stock badges
  ↓
User clicks out-of-stock item badge
  ↓
Open OrderModificationSheet for that item
```

---

## Component Changes

### Cart Screen
- On mount: Call `dispatch(verifyCartStock(cartItems))`
- Show loading spinner while `isLoading === true`
- Show error toast if `error` is set
- Provide retry button if API fails

### Cart Item Row
- Read `stockStatus[productId]` from global state
- If `inStock === false`, render red "Out of stock" badge
- On badge click: Open `OrderModificationSheet` (existing component)
- Allow user to modify quantity, remove item, or view similar items

### OrderModificationSheet
- No changes needed; accept the item and its out-of-stock status as input

---

## API Contract

### Request
```json
{
  "items": [
    {
      "productId": "string",
      "quantity": number
    }
  ]
}
```

### Response (Expected)
```json
{
  "items": [
    {
      "productId": "string",
      "inStock": boolean,
      "availableQuantity": number
    }
  ]
}
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| API call succeeds | Store stock status, render badges |
| API timeout (>5s) | Show toast "Unable to verify stock"; assume all in stock |
| Network error | Show toast with retry button |
| Partial response | Use previous cached status for missing items; warn user |
| Empty cart | Skip API call; clear stock state |

---

## Caching & Cleanup

- **Cache lifetime:** From cart open until cart close or user navigates away
- **On cart close:** Clear stock state (optional; can also persist until next open)
- **On refresh/reopen:** Fetch fresh stock status (no stale data assumption)

---

## Testing Strategy

1. **Unit:** Mock API, test state updates
2. **Integration:** Test cart + stock API interaction
3. **E2E:** Open cart → verify badges appear → click badge → OrderModificationSheet opens

---

## Success Criteria

- [ ] Stock API called once when cart opens
- [ ] Out-of-stock items display red badge matching provided design
- [ ] Clicking badge opens OrderModificationSheet
- [ ] Loading spinner shows during API call
- [ ] Error toast appears if API fails
- [ ] Stock status persists until cart closes
- [ ] No automatic refresh while cart is open

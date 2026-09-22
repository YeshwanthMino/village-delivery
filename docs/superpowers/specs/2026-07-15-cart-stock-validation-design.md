# Cart Stock Validation & Conflict Resolution Design
**Date:** 2026-07-15  
**Status:** Approved

---

## Overview

When a user attempts checkout, the POST `/app/orders` API may return a `stockInfo` array indicating that one or more cart items have stock conflicts:
- **Out of stock** (availableStock = 0): product should be removed
- **Partial stock** (availableStock < quantity): quantity should be reduced

This design provides a user-friendly modal dialog that presents conflicts, guides the user to resolve them, and auto-retries checkout after updates.

---

## User Flow

```
User taps "Place Order"
       ↓
createOrder() called
       ↓
API returns stockInfo? ─→ No ─→ Success flow (existing)
       ↓ Yes
Show StockConflictDialog
       ↓
User taps "Update Cart"
       ↓
Dialog: "Updating your cart..." (loading)
       ↓
Apply changes to store (remove/reduce items)
       ↓
Dialog: "Placing your order..." (loading)
       ↓
Auto-retry createOrder()
       ↓
Response? ─→ orderId ─→ Success (navigate to orders)
       ├→ stockInfo ─→ Show dialog again
       └→ error ─→ Show error state in dialog
       
User taps "Cancel"
       ↓
Dialog dismisses
Cart unchanged, checkout remains available
```

---

## Dialog Component: StockConflictDialog

### Props

```typescript
interface StockConflictDialogProps {
  visible: boolean;
  stockInfo: Array<{
    productId: string;
    availableStock: number;
  }>;
  cartItems: CartItem[]; // Current cart items to map productId → name/image
  onUpdateCart: () => Promise<void>; // Called when user taps "Update Cart"
  onCancel: () => void; // Called when user taps "Cancel"
  isLoading?: boolean; // Externally controlled loading state (optional)
  loadingMessage?: string; // Custom message during loading
}
```

### Internal State

```typescript
type DialogState = 
  | 'showing'           // Initial display, waiting for user action
  | 'updating'          // Updating cart in store
  | 'retrying'          // Retrying checkout after update
  | 'error';            // Error during update/retry

// Component manages loading state and messages internally
```

### Rendering

**Header:**
- Title: `t('stock_conflict_title')` (e.g., "Update your order")
- Subtitle: `t('stock_conflict_subtitle')` (e.g., "Some items aren't fully available")

**Body: Affected Products List**
Each product row displays:
1. **Thumbnail** (match CartItemRow style: 60×60, rounded)
2. **Product name** (from cart snapshot)
3. **Action badge** (color-coded):
   - **"Remove"** (red/warning) if availableStock = 0
   - **"Reduce to {n}"** (yellow/caution) if availableStock > 0
4. **Quantity change text** (smaller, secondary gray):
   - Format: "Had {cartQuantity}, now: {availableStock}"
   - Only shown for clarity; helps user understand the change

**Example:**
```
┌─────────────────────────────────────────┐
│ Update your order                       │
│ Some items aren't fully available       │
├─────────────────────────────────────────┤
│ [60×60 img] Godrej No.1 Sandal Soap    │
│             Remove                  │
│             Had 2, now: 0           │
│                                     │
│ [60×60 img] Jet Jumbo Gold (Set)    │
│             Reduce to 2             │
│             Had 5, now: 2           │
├─────────────────────────────────────────┤
│  [Update Cart]      [Cancel]            │
└─────────────────────────────────────────┘
```

**Loading States:**
- **State "updating":** Dim overlay, spinner, text "Updating your cart..."
- **State "retrying":** Spinner, text "Placing your order..."
- **State "error":** Error icon, error message, "Try Again" and "Back to Cart" buttons

**Buttons:**
- **"Update Cart"** (primary green) → triggers update + retry flow
- **"Cancel"** (secondary) → dismisses dialog without changes

---

## Integration with CartScreen

### Modified createOrder Response Type

The `CreateOrderResult` type (currently in `src/features/cart/data/orderApi.ts`) is enhanced to surface stock conflicts:

```typescript
export interface CreateOrderResult {
  orderId: string | null;
  raw: any;
  // New: present if API returned stockInfo instead of error
  stockInfo?: Array<{
    productId: string;
    availableStock: number;
  }>;
}
```

### CartScreen handlePlaceOrder Flow

```typescript
const handlePlaceOrder = async () => {
  const addressId = addr.selectedAddress?.id;
  if (!addressId) throw new Error('Select a delivery address first.');
  
  const result = await createOrder({
    products: vm.cartItems.map(item => ({
      productId: item.productId,
      quantity: item.count,
    })),
    address: addressId,
    paymentMethod: paymentMethod ?? 'cod',
    isPriority: false,
  });

  // NEW: Check for stock conflicts before treating as success
  if (result.stockInfo && result.stockInfo.length > 0) {
    // Show dialog, don't clear cart, don't navigate
    setStockConflictInfo(result.stockInfo);
    return; // Throw is handled by checkout sheet
  }

  // Existing success path
  if (result.orderId) {
    vm.clearCart();
    router.replace('/(dashboard)/orders');
  }
};
```

### CartScreen State for Dialog

```typescript
const [stockConflictInfo, setStockConflictInfo] = useState<
  Array<{ productId: string; availableStock: number }> | null
>(null);

const handleUpdateCart = async () => {
  // Apply changes to cart store
  for (const conflict of stockConflictInfo) {
    const cartItem = vm.cartItems.find(i => i.productId === conflict.productId);
    if (!cartItem) continue;

    if (conflict.availableStock === 0) {
      // Remove: keep decrementing until quantity is 0
      for (let i = 0; i < cartItem.count; i++) {
        vm.decFromCart(conflict.productId);
      }
    } else if (conflict.availableStock < cartItem.count) {
      // Reduce: decrement to the available stock
      const diff = cartItem.count - conflict.availableStock;
      for (let i = 0; i < diff; i++) {
        vm.decFromCart(conflict.productId);
      }
    }
  }

  // Retry checkout
  await handlePlaceOrder();
  
  // Clear dialog if retry succeeds (success path clears it)
  // Dialog remains shown if retry fails (error state shown)
};

const handleCancelStockConflict = () => {
  setStockConflictInfo(null); // Dismiss dialog, cart unchanged
};
```

### Render StockConflictDialog

Add to CartScreen JSX (above LoginBottomSheet):

```jsx
<StockConflictDialog
  visible={stockConflictInfo != null}
  stockInfo={stockConflictInfo ?? []}
  cartItems={vm.cartItems}
  onUpdateCart={handleUpdateCart}
  onCancel={handleCancelStockConflict}
/>
```

---

## Data Flow & State Management

### createOrder Enhancement

In `src/features/cart/data/orderApi.ts`, parse the response to detect stockInfo:

```typescript
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const body = { /* ... */ };
  const resp = await apiClient.post<any>(`${BASE}/app/orders`, body);
  const data = resp?.data ?? resp;

  // Check for stock conflict response
  if (data?.stockInfo && Array.isArray(data.stockInfo)) {
    return {
      orderId: null,
      raw: resp,
      stockInfo: data.stockInfo, // Bubble up stockInfo
    };
  }

  // Existing success path
  const orderId = data?._id ?? data?.id ?? data?.orderId ?? null;
  return { orderId: orderId != null ? String(orderId) : null, raw: resp };
}
```

### Cart Item Removal Strategy

When updating cart after stock conflict:
- **Out of stock:** Use `vm.decFromCart()` repeatedly until count reaches 0
- **Partial stock:** Use `vm.decFromCart()` to reduce from current count to availableStock

This ensures store consistency and respects existing cart mutation API.

---

## Error Handling

### Case 1: Network Error During Update/Retry
- **Display:** Error icon + message "Couldn't update your order. Try again?"
- **Actions:** "Try Again" (retries from current state), "Back to Cart" (dismisses)
- **Cart state:** Already updated (item removals/reductions applied)

### Case 2: Stock Conflict on Retry
- **Display:** Same dialog with new `stockInfo` array
- **Actions:** "Update Cart" (apply new changes), "Cancel" (dismiss)
- **Expected:** Rare, but handled gracefully

### Case 3: Product Not Found in Cart
- **Handling:** Skip the product in conflict resolution (defensive)
- **Rationale:** Shouldn't happen; means productId in stockInfo doesn't match cart

### Case 4: All Items Removed (availableStock = 0 for all)
- **Result:** Cart becomes empty after update
- **Next retry:** createOrder with empty products array
- **Expected:** API may return validation error or 4xx
- **UX:** Show error state; user must add items to cart to proceed

### Case 5: Cart Already Partially Updated
- If user cancels mid-update and retries, original cart quantities are preserved
- Each conflict resolution attempt starts fresh from current store state

---

## i18n Keys Required

- `stock_conflict_title` — "Update your order" (or equivalent)
- `stock_conflict_subtitle` — "Some items aren't fully available"
- `stock_conflict_remove_badge` — "Remove"
- `stock_conflict_reduce_to` — "Reduce to {n}"
- `stock_conflict_quantity_change` — "Had {current}, now: {available}"
- `stock_conflict_update_button` — "Update Cart"
- `stock_conflict_cancel_button` — "Cancel"
- `stock_conflict_updating` — "Updating your cart..."
- `stock_conflict_retrying` — "Placing your order..."
- `stock_conflict_error` — "Couldn't update your order. Try again?"
- `stock_conflict_try_again` — "Try Again"
- `stock_conflict_back_to_cart` — "Back to Cart"

---

## Testing Strategy

### Unit Tests (StockConflictDialog)
1. Renders products with correct badges (Remove vs Reduce to N)
2. Quantity change text displays correctly
3. Tapping "Update Cart" calls `onUpdateCart` callback
4. Tapping "Cancel" calls `onCancel` callback
5. Loading states display correct message and spinner
6. Error state shows error message and retry/dismiss buttons

### Integration Tests (CartScreen + createOrder)
1. Checkout with stock conflict → dialog appears
2. "Update Cart" → cart items updated → checkout retried → success
3. "Update Cart" → checkout retried → new conflict → dialog shown again
4. "Cancel" → dialog dismissed → cart unchanged → checkout still available
5. Network error during retry → error state shown → retry succeeds

### Manual Testing (Simulator)
1. Mock API to return `stockInfo` on first checkout
2. Verify dialog displays affected products correctly
3. Verify auto-retry succeeds after "Update Cart"
4. Verify cancel leaves cart unchanged
5. Verify re-conflict scenario (API returns conflict on retry)

---

## Files to Create/Modify

### Create:
- `src/shared/components/StockConflictDialog.tsx` — Dialog component

### Modify:
- `src/features/cart/data/orderApi.ts` — Enhance CreateOrderResult type and parseResponse
- `src/features/cart/views/CartScreen.tsx` — Add dialog state, callbacks, render
- `src/shared/components/index.ts` — Export StockConflictDialog

### i18n:
- `src/base/constants/translations.ts` (or relevant i18n file) — Add keys listed above

---

## Success Criteria

- ✅ Dialog shows all affected products with correct action badges
- ✅ "Update Cart" removes/reduces items and auto-retries checkout
- ✅ "Cancel" dismisses without changes
- ✅ Loading states show clear feedback
- ✅ Re-conflicts handled gracefully
- ✅ Checkout blocked until stock issues resolved
- ✅ Cart state remains consistent
- ✅ All edge cases handled (empty cart, missing products, network errors)

# Order Modification Sheet Design

**Date:** 2026-07-15  
**Status:** Draft  
**Related:** Removed StockConflictDialog component; replaces conflict handling during checkout

## Overview

The **Order Modification Sheet** is a bottom sheet that appears when a checkout attempt returns stock conflicts (items out of stock or running low). It allows users to resolve conflicts by removing items or adjusting quantities, then retry checkout without leaving the flow.

**Location:** `src/shared/components/OrderModificationSheet.tsx`

## Requirements

### Functional Requirements

1. **Trigger**: Sheet appears only when `createOrder()` returns `stockInfo` array
2. **Display conflicts**: Show all conflicted items with their status (out of stock vs. low stock)
3. **User actions**:
   - Remove out-of-stock items (single tap)
   - Reduce quantity for low-stock items (stepper + "Remove instead" link)
   - Dismiss sheet without changes (X button, swipe down)
4. **Update behavior**:
   - **Auto-adjust only** (user didn't manually change): "Update all" auto-retries checkout
   - **Manual adjustments**: "Update all" closes sheet, shows "Place order" button in main view
5. **Retry loop**: If auto-retry fails with new conflicts, show new conflicts in sheet
6. **Success path**: Auto-retry that succeeds closes sheet and navigates to orders

### Non-Functional Requirements

- Uses existing `VillageBottomSheet` for consistency
- Follows current theming (Tailwind classes)
- i18n support for all text
- Accessible (buttons, touch targets ≥44px)

## Component Structure

### Props

```typescript
interface StockInfo {
  productId: string;
  availableStock: number;
}

interface CartItem {
  productId: string;
  name: string;
  weight: string;
  price: number;
  image: string;
  count: number;
}

interface OrderModificationSheetProps {
  visible: boolean;
  stockInfo: StockInfo[];
  cartItems: CartItem[];
  onClose: () => void;
  onRetryCheckout: () => Promise<void>;
  onManualAdjustment?: (adjustedQuantities: Record<string, number>) => void;
}
```

### Internal State

```typescript
// Track which items user manually adjusted (not auto-adjusted)
const [manuallyAdjusted, setManuallyAdjusted] = useState<Set<string>>(new Set());

// Current quantities being shown (may differ from cart due to conflicts)
const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});

// Auto-retry state
const [isLoading, setIsLoading] = useState(false);
const [retryError, setRetryError] = useState<string | null>(null);

// UI state: 'conflicts' | 'all-sorted'
const [state, setState] = useState<'conflicts' | 'all-sorted'>('conflicts');
```

## Data Flow

### Initialization (Sheet Opens)

1. Parse `stockInfo` and `cartItems`
2. Build `localQuantities`:
   - For each conflict:
     - If `availableStock === 0` → quantity = 0
     - If `availableStock < cartItem.count` → quantity = availableStock
     - Otherwise → quantity = cartItem.count
3. Initialize `manuallyAdjusted` as empty set
4. Set `state = 'conflicts'`

### User Adjusts Quantity

When user taps stepper +/- or "Remove instead":
1. Update `localQuantities[productId]`
2. Add `productId` to `manuallyAdjusted` set
3. Keep `state = 'conflicts'`

### "Update all" Tapped

**Branch 1: No manual adjustments**
1. Set `isLoading = true`
2. Call `onRetryCheckout()` (parent calls `handlePlaceOrder()`)
3. Await response:
   - **Success** (no new stockInfo): Sheet closes, order placed
   - **New conflicts** (stockInfo returned): Update `stockInfo` state, re-render conflicts
   - **Other error**: Set `retryError`, show error UI

**Branch 2: User made manual changes**
1. Call `onClose()` to close sheet
2. Emit callback with adjusted quantities (passed to parent)
3. Parent (CartScreen) applies quantities to cart and shows "All sorted" confirmation
4. User taps "Place order" button in main view to proceed with retry

### "Place order" Tapped (from "All sorted" state)

1. User is back in main CartScreen view
2. User sees "All sorted" confirmation with updated subtotal
3. User taps "Place order" button
4. CartScreen calls `handlePlaceOrder()` normally (outside sheet flow)

### Dismiss (X or Swipe)

1. Call `onClose()` (parent sets `stockConflictInfo = null`)
2. Sheet closes
3. Cart quantities remain as they were when conflicts appeared
4. User can manually adjust in main cart view and retry

## UI States

### State 1: Conflict Resolution

**Header:**
- Title: "A couple of things changed" (or localized equivalent)
- Description: "Some items in your cart are sold out or running low. Update your order to continue."
- Close button (X)

**Item Rows:**

For each conflicted item:
- Product image (or placeholder)
- Product name, variant, price
- Status badge:
  - Red "Out of stock" if `availableStock === 0`
  - Orange "Only {X} left" if `availableStock < count`
- Action:
  - If out of stock: "Remove item" button (outline, red text)
  - If low stock: CompactStepper + "Remove instead" link (underlined)

**Footer:**
- Subtotal
- Two buttons:
  - "Cancel" (outline, secondary)
  - "Update all" (solid green, primary) — disabled if `isLoading`

**Loading variant:**
- "Update all" button shows spinner, disabled

### State 2: "All Sorted" Confirmation

**Header:**
- Title: "All sorted!"
- Description: "Your cart is ready — nothing else needs attention."
- Close button (X)

**Item Rows:**

For each adjusted item:
- Product image, name, variant, price
- Green "Updated ✓" badge
- Quantity display (read-only, no stepper)
- "Remove instead" link (optional, for re-opening conflict flow)

**Success Message:**
- Green checkmark + "All set! Your cart is up to date."

**Footer:**
- Subtotal
- "Place order · ₹{total}" button (solid green, primary)

## Integration with CartScreen

### Props Passed to Sheet

```typescript
<OrderModificationSheet
  visible={stockConflictInfo !== null}
  stockInfo={stockConflictInfo ?? []}
  cartItems={vm.cartItems.map(item => ({
    productId: item.productId,
    name: item.name,
    weight: item.weight,
    price: item.price,
    image: item.imageUrl,
    count: item.count,
  }))}
  onClose={() => setStockConflictInfo(null)}
  onRetryCheckout={handlePlaceOrder}
  onManualAdjustment={quantities => {
    // Apply adjusted quantities to cart
    for (const [productId, newQuantity] of Object.entries(quantities)) {
      const cartItem = vm.cartItems.find(i => i.productId === productId);
      if (!cartItem) continue;
      
      const diff = newQuantity - cartItem.count;
      if (diff > 0) {
        for (let i = 0; i < diff; i++) vm.addToCart(productId);
      } else if (diff < 0) {
        for (let i = 0; i < Math.abs(diff); i++) vm.decFromCart(productId);
      }
    }
    // Show "All sorted" confirmation
    setShowAllSortedConfirmation(true);
  }}
/>
```

### CartScreen Callback: `handlePlaceOrder`

- Already exists; called by sheet's `onRetryCheckout`
- Returns success (orderId) or throws error with new `stockInfo`
- Sheet catches and handles appropriately

### Manual Adjustment Flow

When sheet shows "All sorted" and user taps "Place order":
1. Sheet closes (user taps X or order succeeds)
2. CartScreen shows updated cart with new subtotal
3. User sees "Place order · ₹{newTotal}" in main checkout bar
4. User taps to proceed with order

## Error Handling

### Auto-Retry Failure

If `onRetryCheckout()` throws or returns new conflicts:
1. Show error toast or inline message
2. Keep sheet open
3. User can:
   - Dismiss and adjust in main cart view
   - Or continue adjusting in sheet and retry again

### Out-of-Sync Cart

If cart ViewModel state doesn't match sheet state (edge case):
- Sheet state is source of truth during conflict resolution
- On manual adjustments, apply to cart immediately
- On sheet close, cart state is preserved

## Testing

### Unit Tests (OrderModificationSheet)

- [x] Renders conflicts correctly based on stockInfo
- [x] Quantity stepper updates local state
- [x] "Update all" without manual changes calls onRetryCheckout
- [x] "Update all" with manual changes shows "All sorted" state
- [x] X button and swipe call onClose
- [x] Loading state while retry is pending
- [x] New conflicts shown on retry failure

### Integration Tests (CartScreen + OrderModificationSheet)

- [x] Sheet appears when checkout returns stockInfo
- [x] Auto-retry flow: conflicts → resolve → success → order placed
- [x] Manual flow: conflicts → adjust → "All sorted" → place order button shown
- [x] Sheet close preserves cart state

## Migrations & Cleanup

- Delete removed `StockConflictDialog.tsx` and test file (already scheduled)
- Remove `StockConflict` and `CartItem` type imports from index.ts (already done)
- Remove stock conflict state and handlers from CartScreen (already done)

## Open Questions

None — design is complete and approved by user.

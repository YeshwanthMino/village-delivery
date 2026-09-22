# Cart Stock Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a StockConflictDialog component that handles product stock conflicts during checkout, displays affected items, and auto-retries after cart updates.

**Architecture:** Dialog-based conflict resolution triggered during `createOrder` when the API returns `stockInfo`. The dialog shows affected products with action badges (Remove/Reduce), manages loading states, and coordinates cart updates → checkout retry. All state managed in CartScreen; dialog remains generic and reusable.

**Tech Stack:** React Native, TypeScript, TailwindCSS, lucide-react-native, custom i18n

---

## File Structure Overview

| File | Purpose | Status |
|------|---------|--------|
| `src/shared/components/StockConflictDialog.tsx` | Dialog component showing conflicts and managing loading states | Create |
| `src/features/cart/data/orderApi.ts` | Enhanced response type + stock conflict detection | Modify |
| `src/features/cart/views/CartScreen.tsx` | Dialog integration + cart update + retry logic | Modify |
| `src/shared/components/index.ts` | Export StockConflictDialog | Modify |
| `src/base/constants/translations.ts` | Add i18n keys for dialog text | Modify |
| `__tests__/StockConflictDialog.test.tsx` | Component unit tests | Create |
| `__tests__/cartCheckout.integration.test.ts` | CartScreen + createOrder integration tests | Create |

---

## Task 1: Enhance CreateOrderResult Type

**Files:**
- Modify: `src/features/cart/data/orderApi.ts:1-56`

**Rationale:** Add `stockInfo` field to the response type so the API layer can surface stock conflicts without treating them as errors.

- [ ] **Step 1: Add StockInfo type to orderApi.ts**

Add this interface at the top of the file (after imports, before `OrderProductInput`):

```typescript
export interface StockInfo {
  productId: string;
  availableStock: number;
}
```

- [ ] **Step 2: Update CreateOrderResult interface**

Modify the existing interface:

```typescript
export interface CreateOrderResult {
  /** Server order id, when the response carries one. */
  orderId: string | null;
  raw: any;
  /** Stock conflicts returned by server instead of error. */
  stockInfo?: StockInfo[];
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/cart/data/orderApi.ts
git commit -m "feat: add StockInfo type to CreateOrderResult"
```

---

## Task 2: Implement Stock Conflict Detection in createOrder

**Files:**
- Modify: `src/features/cart/data/orderApi.ts:37-55`

**Rationale:** Parse the API response to detect and surface `stockInfo` array before treating response as success/failure.

- [ ] **Step 1: Update createOrder function**

Replace the function body with:

```typescript
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const body = {
    products: input.products.map((p) => ({
      productId: p.productId,
      quantity: p.quantity,
      hasFreeItem: p.hasFreeItem ?? false,
    })),
    address: input.address,
    preferredPaymentMethod: input.paymentMethod,
    scheduledOn: input.scheduledOn,
    notes: input.notes,
    isPriority: input.isPriority ?? false,
  };

  const resp = await apiClient.post<any>(`${BASE}/app/orders`, body);
  const data = resp?.data ?? resp;

  // Check for stock conflict response (API returns stockInfo instead of success/error)
  if (data?.stockInfo && Array.isArray(data.stockInfo) && data.stockInfo.length > 0) {
    return {
      orderId: null,
      raw: resp,
      stockInfo: data.stockInfo,
    };
  }

  // Existing success path
  const orderId = data?._id ?? data?.id ?? data?.orderId ?? null;
  return { orderId: orderId != null ? String(orderId) : null, raw: resp };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/cart/data/orderApi.ts
git commit -m "feat: detect stock conflicts in createOrder response"
```

---

## Task 3: Create StockConflictDialog Component Structure

**Files:**
- Create: `src/shared/components/StockConflictDialog.tsx`

**Rationale:** Build the reusable modal component that displays stock conflicts and manages state transitions.

- [ ] **Step 1: Create the component file with types**

Create `src/shared/components/StockConflictDialog.tsx`:

```typescript
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
  Image,
  ScrollView,
} from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';

export interface StockConflict {
  productId: string;
  availableStock: number;
}

export interface CartItem {
  productId: string;
  name: string;
  image?: string;
  count: number;
}

type DialogState = 'showing' | 'updating' | 'retrying' | 'error';

interface StockConflictDialogProps {
  visible: boolean;
  stockInfo: StockConflict[];
  cartItems: CartItem[];
  onUpdateCart: () => Promise<void>;
  onCancel: () => void;
}

export const StockConflictDialog: React.FC<StockConflictDialogProps> = ({
  visible,
  stockInfo,
  cartItems,
  onUpdateCart,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<DialogState>('showing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleUpdateCart = async () => {
    try {
      setState('updating');
      await onUpdateCart();
      // If successful, onUpdateCart should handle navigation/state reset
      // Dialog will be dismissed by parent via visible prop
    } catch (error) {
      setState('error');
      setErrorMessage(
        error instanceof Error ? error.message : t('stock_conflict_error')
      );
    }
  };

  const handleRetry = async () => {
    await handleUpdateCart();
  };

  const handleBackToCart = () => {
    setState('showing');
    setErrorMessage('');
    onCancel();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/50 justify-center px-4">
        <View className="bg-white rounded-2xl overflow-hidden">
          {/* Header */}
          <View className="px-4 py-4 border-b border-slate-200">
            <Text className="text-slate-900 font-bold text-lg">
              {t('stock_conflict_title')}
            </Text>
            <Text className="text-slate-500 text-sm mt-1">
              {t('stock_conflict_subtitle')}
            </Text>
          </View>

          {/* Body */}
          <ScrollView
            className="max-h-96"
            showsVerticalScrollIndicator={false}
          >
            {state === 'showing' && (
              <View className="px-4 py-4">
                {stockInfo.map((conflict) => {
                  const cartItem = cartItems.find(
                    (item) => item.productId === conflict.productId
                  );
                  if (!cartItem) return null;

                  const isRemoval = conflict.availableStock === 0;
                  const badgeText = isRemoval
                    ? t('stock_conflict_remove_badge')
                    : t('stock_conflict_reduce_to').replace(
                        '{n}',
                        String(conflict.availableStock)
                      );
                  const badgeColor = isRemoval ? '#dc2626' : '#eab308';

                  return (
                    <View
                      key={conflict.productId}
                      className="flex-row gap-3 mb-4 pb-4 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0"
                    >
                      {/* Product thumbnail */}
                      <View className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100">
                        {cartItem.image ? (
                          <Image
                            source={{ uri: cartItem.image }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-full h-full items-center justify-center bg-slate-100">
                            <Text className="text-2xl">📦</Text>
                          </View>
                        )}
                      </View>

                      {/* Product info */}
                      <View className="flex-1">
                        <Text
                          className="text-slate-900 font-semibold text-sm"
                          numberOfLines={2}
                        >
                          {cartItem.name}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-2">
                          <View
                            style={{ backgroundColor: badgeColor }}
                            className="px-2.5 py-1 rounded-full"
                          >
                            <Text className="text-xs font-bold text-slate-900">
                              {badgeText}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-slate-400 text-xs mt-1">
                          {t('stock_conflict_quantity_change')
                            .replace('{current}', String(cartItem.count))
                            .replace('{available}', String(conflict.availableStock))}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {state === 'updating' && (
              <View className="px-4 py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#16a34a" />
                <Text className="text-slate-600 text-sm mt-3">
                  {t('stock_conflict_updating')}
                </Text>
              </View>
            )}

            {state === 'retrying' && (
              <View className="px-4 py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#16a34a" />
                <Text className="text-slate-600 text-sm mt-3">
                  {t('stock_conflict_retrying')}
                </Text>
              </View>
            )}

            {state === 'error' && (
              <View className="px-4 py-8 items-center justify-center">
                <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-3">
                  <Text className="text-2xl">⚠️</Text>
                </View>
                <Text className="text-slate-900 font-semibold text-center">
                  {errorMessage}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer with buttons */}
          <View className="px-4 py-4 border-t border-slate-100 flex-row gap-3">
            {state === 'showing' && (
              <>
                <Pressable
                  onPress={onCancel}
                  className="flex-1 py-3 rounded-lg border border-slate-200 items-center"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Text className="text-slate-600 font-semibold text-sm">
                    {t('stock_conflict_cancel_button')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleUpdateCart}
                  className="flex-1 py-3 rounded-lg bg-green-600 items-center"
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                >
                  <Text className="text-white font-semibold text-sm">
                    {t('stock_conflict_update_button')}
                  </Text>
                </Pressable>
              </>
            )}

            {state === 'error' && (
              <>
                <Pressable
                  onPress={handleBackToCart}
                  className="flex-1 py-3 rounded-lg border border-slate-200 items-center"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Text className="text-slate-600 font-semibold text-sm">
                    {t('stock_conflict_back_to_cart')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleRetry}
                  className="flex-1 py-3 rounded-lg bg-green-600 items-center"
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                >
                  <Text className="text-white font-semibold text-sm">
                    {t('stock_conflict_try_again')}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/components/StockConflictDialog.tsx
git commit -m "feat: create StockConflictDialog component"
```

---

## Task 4: Export StockConflictDialog

**Files:**
- Modify: `src/shared/components/index.ts`

**Rationale:** Make dialog available for import from shared components barrel export.

- [ ] **Step 1: Add export**

Add this line to `src/shared/components/index.ts`:

```typescript
export { StockConflictDialog } from './StockConflictDialog';
export type { StockConflict, CartItem } from './StockConflictDialog';
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/components/index.ts
git commit -m "feat: export StockConflictDialog and types"
```

---

## Task 5: Add i18n Keys

**Files:**
- Modify: `src/base/constants/translations.ts` (or relevant i18n file)

**Rationale:** Add all English translations for dialog text.

- [ ] **Step 1: Locate translations file**

Check where translations are defined in your codebase. Based on the imports, look for a file that exports translation objects or strings. Common locations:
- `src/base/constants/translations.ts`
- `src/core/utils/i18n.ts`
- `src/base/locales/en.json`

- [ ] **Step 2: Add stock conflict translations**

Add these keys to the English translation object (adjust file path as needed):

```typescript
// In your translations file, add to the English locale object:
stock_conflict_title: 'Update your order',
stock_conflict_subtitle: 'Some items aren\'t fully available',
stock_conflict_remove_badge: 'Remove',
stock_conflict_reduce_to: 'Reduce to {n}',
stock_conflict_quantity_change: 'Had {current}, now: {available}',
stock_conflict_update_button: 'Update Cart',
stock_conflict_cancel_button: 'Cancel',
stock_conflict_updating: 'Updating your cart...',
stock_conflict_retrying: 'Placing your order...',
stock_conflict_error: 'Couldn\'t update your order. Try again?',
stock_conflict_try_again: 'Try Again',
stock_conflict_back_to_cart: 'Back to Cart',
```

- [ ] **Step 3: Commit**

```bash
git add src/base/constants/translations.ts
git commit -m "feat: add stock conflict dialog i18n keys"
```

---

## Task 6: Integrate StockConflictDialog into CartScreen

**Files:**
- Modify: `src/features/cart/views/CartScreen.tsx:1-85`

**Rationale:** Add state for stock conflict dialog and handle cart update + retry logic.

- [ ] **Step 1: Add imports**

Add these imports at the top of CartScreen.tsx (after existing imports):

```typescript
import { StockConflictDialog, type StockConflict } from '@/src/shared/components';
```

- [ ] **Step 2: Add state for stock conflict**

Add this state variable inside the CartScreen component (after other useState calls, around line 40):

```typescript
const [stockConflictInfo, setStockConflictInfo] = useState<StockConflict[] | null>(null);
const [stockConflictLoading, setStockConflictLoading] = useState(false);
```

- [ ] **Step 3: Update handlePlaceOrder function**

Replace the existing `handlePlaceOrder` function (lines 66-79) with:

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

  // Check for stock conflicts before treating as success
  if (result.stockInfo && result.stockInfo.length > 0) {
    setStockConflictInfo(result.stockInfo);
    return;
  }

  // Existing success path
  if (result.orderId) {
    vm.clearCart();
    router.replace('/(dashboard)/orders');
  }
};
```

- [ ] **Step 4: Add handleUpdateCart function**

Add this function after `handlePlaceOrder`:

```typescript
const handleUpdateCart = async () => {
  if (!stockConflictInfo) return;

  setStockConflictLoading(true);
  try {
    // Apply changes to cart store
    for (const conflict of stockConflictInfo) {
      const cartItem = vm.cartItems.find(i => i.productId === conflict.productId);
      if (!cartItem) continue;

      if (conflict.availableStock === 0) {
        // Remove: decrement until quantity is 0
        for (let i = 0; i < cartItem.count; i++) {
          vm.decFromCart(conflict.productId);
        }
      } else if (conflict.availableStock < cartItem.count) {
        // Reduce: decrement to available stock
        const diff = cartItem.count - conflict.availableStock;
        for (let i = 0; i < diff; i++) {
          vm.decFromCart(conflict.productId);
        }
      }
    }

    // Clear conflict state before retry
    setStockConflictInfo(null);
    
    // Retry checkout
    await handlePlaceOrder();
  } finally {
    setStockConflictLoading(false);
  }
};
```

- [ ] **Step 5: Add handleCancelStockConflict function**

Add this function after `handleUpdateCart`:

```typescript
const handleCancelStockConflict = () => {
  setStockConflictInfo(null);
};
```

- [ ] **Step 6: Commit**

```bash
git add src/features/cart/views/CartScreen.tsx
git commit -m "feat: add stock conflict state and handlers to CartScreen"
```

---

## Task 7: Render StockConflictDialog in CartScreen

**Files:**
- Modify: `src/features/cart/views/CartScreen.tsx:430-440`

**Rationale:** Add the dialog component to the render tree (before LoginBottomSheet).

- [ ] **Step 1: Add dialog render**

Add this before the closing `</SafeAreaView>` tag (around line 440, before LoginBottomSheet):

```jsx
      <StockConflictDialog
        visible={stockConflictInfo != null}
        stockInfo={stockConflictInfo ?? []}
        cartItems={vm.cartItems.map(item => ({
          productId: item.productId,
          name: item.name,
          image: item.image,
          count: item.count,
        }))}
        onUpdateCart={handleUpdateCart}
        onCancel={handleCancelStockConflict}
      />
```

- [ ] **Step 2: Commit**

```bash
git add src/features/cart/views/CartScreen.tsx
git commit -m "feat: render StockConflictDialog in CartScreen"
```

---

## Task 8: Write Component Unit Tests

**Files:**
- Create: `src/shared/components/__tests__/StockConflictDialog.test.tsx`

**Rationale:** Test dialog rendering, user interactions, and state transitions.

- [ ] **Step 1: Create test file**

Create `src/shared/components/__tests__/StockConflictDialog.test.tsx`:

```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { StockConflictDialog } from '../StockConflictDialog';

// Mock the translation hook
jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        stock_conflict_title: 'Update your order',
        stock_conflict_subtitle: 'Some items aren\'t fully available',
        stock_conflict_remove_badge: 'Remove',
        stock_conflict_reduce_to: 'Reduce to 2',
        stock_conflict_quantity_change: 'Had 5, now: 2',
        stock_conflict_update_button: 'Update Cart',
        stock_conflict_cancel_button: 'Cancel',
        stock_conflict_updating: 'Updating your cart...',
        stock_conflict_retrying: 'Placing your order...',
        stock_conflict_error: 'Couldn\'t update your order. Try again?',
        stock_conflict_try_again: 'Try Again',
        stock_conflict_back_to_cart: 'Back to Cart',
      };
      return translations[key] || key;
    },
  }),
}));

describe('StockConflictDialog', () => {
  const mockStockInfo = [
    { productId: 'prod1', availableStock: 0 },
    { productId: 'prod2', availableStock: 2 },
  ];

  const mockCartItems = [
    {
      productId: 'prod1',
      name: 'Godrej Soap',
      image: 'http://example.com/soap.jpg',
      count: 2,
    },
    {
      productId: 'prod2',
      name: 'Jet Gold',
      image: 'http://example.com/jet.jpg',
      count: 5,
    },
  ];

  const mockOnUpdateCart = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not render when visible is false', () => {
    const { queryByText } = render(
      <StockConflictDialog
        visible={false}
        stockInfo={mockStockInfo}
        cartItems={mockCartItems}
        onUpdateCart={mockOnUpdateCart}
        onCancel={mockOnCancel}
      />
    );

    expect(queryByText('Update your order')).not.toBeOnTheScreen();
  });

  test('renders when visible is true', () => {
    const { getByText } = render(
      <StockConflictDialog
        visible={true}
        stockInfo={mockStockInfo}
        cartItems={mockCartItems}
        onUpdateCart={mockOnUpdateCart}
        onCancel={mockOnCancel}
      />
    );

    expect(getByText('Update your order')).toBeOnTheScreen();
    expect(getByText('Some items aren\'t fully available')).toBeOnTheScreen();
  });

  test('displays affected products with correct badges', () => {
    const { getByText } = render(
      <StockConflictDialog
        visible={true}
        stockInfo={mockStockInfo}
        cartItems={mockCartItems}
        onUpdateCart={mockOnUpdateCart}
        onCancel={mockOnCancel}
      />
    );

    // Check for product names
    expect(getByText('Godrej Soap')).toBeOnTheScreen();
    expect(getByText('Jet Gold')).toBeOnTheScreen();

    // Check for badges
    expect(getByText('Remove')).toBeOnTheScreen();
    expect(getByText('Reduce to 2')).toBeOnTheScreen();
  });

  test('displays quantity changes correctly', () => {
    const { getByText } = render(
      <StockConflictDialog
        visible={true}
        stockInfo={mockStockInfo}
        cartItems={mockCartItems}
        onUpdateCart={mockOnUpdateCart}
        onCancel={mockOnCancel}
      />
    );

    expect(getByText('Had 2, now: 0')).toBeOnTheScreen();
    expect(getByText('Had 5, now: 2')).toBeOnTheScreen();
  });

  test('calls onCancel when Cancel button is pressed', () => {
    const { getByText } = render(
      <StockConflictDialog
        visible={true}
        stockInfo={mockStockInfo}
        cartItems={mockCartItems}
        onUpdateCart={mockOnUpdateCart}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('calls onUpdateCart when Update Cart button is pressed', () => {
    const { getByText } = render(
      <StockConflictDialog
        visible={true}
        stockInfo={mockStockInfo}
        cartItems={mockCartItems}
        onUpdateCart={mockOnUpdateCart}
        onCancel={mockOnCancel}
      />
    );

    const updateButton = getByText('Update Cart');
    fireEvent.press(updateButton);

    expect(mockOnUpdateCart).toHaveBeenCalled();
  });

  test('shows loading state when updating', async () => {
    const slowUpdate = jest.fn(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    const { getByText, queryByText } = render(
      <StockConflictDialog
        visible={true}
        stockInfo={mockStockInfo}
        cartItems={mockCartItems}
        onUpdateCart={slowUpdate}
        onCancel={mockOnCancel}
      />
    );

    const updateButton = getByText('Update Cart');
    fireEvent.press(updateButton);

    await waitFor(() => {
      expect(getByText('Updating your cart...')).toBeOnTheScreen();
    });
  });

  test('skips products not found in cart', () => {
    const conflictWithMissingProduct = [
      { productId: 'missing-prod', availableStock: 0 },
      { productId: 'prod1', availableStock: 0 },
    ];

    const { getByText, queryByText } = render(
      <StockConflictDialog
        visible={true}
        stockInfo={conflictWithMissingProduct}
        cartItems={mockCartItems}
        onUpdateCart={mockOnUpdateCart}
        onCancel={mockOnCancel}
      />
    );

    expect(getByText('Godrej Soap')).toBeOnTheScreen();
    // Missing product should not crash; just not displayed
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd /Users/yeshwanth/Mino/village-delivery
npm test -- src/shared/components/__tests__/StockConflictDialog.test.tsx --watch=false
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/__tests__/StockConflictDialog.test.tsx
git commit -m "test: add StockConflictDialog unit tests"
```

---

## Task 9: Write Integration Tests for Cart Checkout

**Files:**
- Create: `src/features/cart/__tests__/cartCheckout.integration.test.ts`

**Rationale:** Test the complete flow: checkout with stock conflict → dialog shown → cart updated → retry succeeds.

- [ ] **Step 1: Create test file**

Create `src/features/cart/__tests__/cartCheckout.integration.test.ts`:

```typescript
import { createOrder } from '../data/orderApi';
import { CreateOrderResult } from '../data/orderApi';

// Mock apiClient
jest.mock('@/src/base/services/remote/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

import { apiClient } from '@/src/base/services/remote/apiClient';

describe('Cart Checkout with Stock Conflicts', () => {
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createOrder returns stockInfo when API responds with stock conflicts', async () => {
    const stockConflictResponse = {
      stockInfo: [
        { productId: 'prod1', availableStock: 0 },
        { productId: 'prod2', availableStock: 2 },
      ],
    };

    mockApiClient.post.mockResolvedValue(stockConflictResponse);

    const result = await createOrder({
      products: [
        { productId: 'prod1', quantity: 2 },
        { productId: 'prod2', quantity: 5 },
      ],
      address: 'addr123',
      paymentMethod: 'cod',
    });

    expect(result.orderId).toBeNull();
    expect(result.stockInfo).toEqual(stockConflictResponse.stockInfo);
  });

  test('createOrder returns orderId when checkout succeeds', async () => {
    const successResponse = {
      _id: 'order123',
    };

    mockApiClient.post.mockResolvedValue(successResponse);

    const result = await createOrder({
      products: [{ productId: 'prod1', quantity: 2 }],
      address: 'addr123',
      paymentMethod: 'cod',
    });

    expect(result.orderId).toBe('order123');
    expect(result.stockInfo).toBeUndefined();
  });

  test('createOrder handles empty stockInfo array as success', async () => {
    const responseWithEmptyStockInfo = {
      _id: 'order124',
      stockInfo: [],
    };

    mockApiClient.post.mockResolvedValue(responseWithEmptyStockInfo);

    const result = await createOrder({
      products: [{ productId: 'prod1', quantity: 2 }],
      address: 'addr123',
      paymentMethod: 'cod',
    });

    expect(result.orderId).toBe('order124');
    // Empty stockInfo is not surfaced (treated as success)
    expect(result.stockInfo).toBeUndefined();
  });

  test('createOrder handles null/undefined stockInfo gracefully', async () => {
    const responseWithoutStockInfo = {
      _id: 'order125',
      stockInfo: null,
    };

    mockApiClient.post.mockResolvedValue(responseWithoutStockInfo);

    const result = await createOrder({
      products: [{ productId: 'prod1', quantity: 2 }],
      address: 'addr123',
      paymentMethod: 'cod',
    });

    expect(result.orderId).toBe('order125');
    expect(result.stockInfo).toBeUndefined();
  });

  test('createOrder includes all required fields in request', async () => {
    mockApiClient.post.mockResolvedValue({ _id: 'order126' });

    await createOrder({
      products: [
        { productId: 'prod1', quantity: 2, hasFreeItem: true },
        { productId: 'prod2', quantity: 1, hasFreeItem: false },
      ],
      address: 'addr123',
      paymentMethod: 'upi',
      scheduledOn: '2026-07-20',
      notes: 'Leave at gate',
      isPriority: true,
    });

    expect(mockApiClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/app/orders'),
      expect.objectContaining({
        products: [
          { productId: 'prod1', quantity: 2, hasFreeItem: true },
          { productId: 'prod2', quantity: 1, hasFreeItem: false },
        ],
        address: 'addr123',
        preferredPaymentMethod: 'upi',
        scheduledOn: '2026-07-20',
        notes: 'Leave at gate',
        isPriority: true,
      })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npm test -- src/features/cart/__tests__/cartCheckout.integration.test.ts --watch=false
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/cart/__tests__/cartCheckout.integration.test.ts
git commit -m "test: add cart checkout integration tests with stock conflicts"
```

---

## Task 10: Manual Testing in Simulator

**Rationale:** Verify the feature works end-to-end in the real app.

- [ ] **Step 1: Set up mock for stock conflict response**

Before running the simulator, you'll need a way to trigger stock conflicts. Options:
- Modify the backend API temporarily to return stockInfo
- Use network interception tools (Proxyman, Charles) to mock the response
- Patch the API in dev mode with a feature flag

For development, the simplest approach is to mock in CartScreen temporarily:

In `src/features/cart/views/CartScreen.tsx`, modify the `handlePlaceOrder` function to force a conflict response for testing:

```typescript
// TEMP: Force stock conflict for testing (remove after manual testing)
if (process.env.FORCE_STOCK_CONFLICT === 'true') {
  setStockConflictInfo([
    { productId: vm.cartItems[0]?.productId ?? 'test', availableStock: 0 },
  ]);
  return;
}
```

- [ ] **Step 2: Start the simulator**

```bash
npm start
# or
yarn start
```

- [ ] **Step 3: Test the happy path (no stock conflict)**

1. Add items to cart
2. Tap "Place Order"
3. Fill in address and payment method
4. Tap "Place Order" again
5. Verify order succeeds and navigates to orders screen
6. Verify cart is cleared

- [ ] **Step 4: Test stock conflict path**

1. Add items to cart
2. Set `FORCE_STOCK_CONFLICT=true` in your environment or code
3. Start the app
4. Add items to cart
5. Tap "Place Order"
6. Verify dialog appears with affected products
7. Tap "Update Cart"
8. Verify loading states ("Updating...", "Placing...")
9. Verify order succeeds and navigates to orders screen

- [ ] **Step 5: Test cancel path**

1. Repeat steps 1-6 above
2. Tap "Cancel" instead of "Update Cart"
3. Verify dialog disappears
4. Verify cart still has original items
5. Verify you can retry "Place Order"

- [ ] **Step 6: Remove temporary mock**

Remove the `FORCE_STOCK_CONFLICT` code from CartScreen after testing.

- [ ] **Step 7: Commit clean-up**

```bash
git add src/features/cart/views/CartScreen.tsx
git commit -m "test: remove temporary stock conflict mock from CartScreen"
```

---

## Task 11: Type Safety Check

**Rationale:** Ensure all types match across the codebase (TypeScript compile check).

- [ ] **Step 1: Run TypeScript compiler**

```bash
npx tsc --noEmit
```

Expected: No type errors.

If there are errors, resolve them by:
- Checking that `StockConflict` type is exported from `StockConflictDialog.tsx`
- Checking that `CartItem` type matches the shape used in `handleUpdateCart`
- Verifying `CreateOrderResult` is imported correctly in CartScreen

- [ ] **Step 2: Commit if needed**

```bash
git add .
git commit -m "fix: resolve TypeScript type errors"
```

---

## Task 12: Final Verification & Documentation

**Rationale:** Ensure feature is complete and documented.

- [ ] **Step 1: Review the implementation against the spec**

Checklist:
- ✅ Dialog shows affected products with thumbnails + names + action badges
- ✅ "Update Cart" removes/reduces items in store
- ✅ "Update Cart" auto-retries checkout
- ✅ "Cancel" dismisses without changes
- ✅ Loading states (updating, retrying) are shown
- ✅ Error state is handled
- ✅ Re-conflict scenario handled (dialog shown again)
- ✅ i18n keys added
- ✅ Tests written for component and integration
- ✅ Manual testing done in simulator

- [ ] **Step 2: Verify all files are committed**

```bash
git status
```

Expected: No uncommitted changes (or only expected changes).

- [ ] **Step 3: Run test suite to ensure no regressions**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 4: Final commit summary**

Review the commit log to make sure each task is represented:

```bash
git log --oneline -15
```

Expected output should show commits like:
```
feat: add StockInfo type to CreateOrderResult
feat: detect stock conflicts in createOrder response
feat: create StockConflictDialog component
feat: export StockConflictDialog and types
feat: add stock conflict dialog i18n keys
feat: add stock conflict state and handlers to CartScreen
feat: render StockConflictDialog in CartScreen
test: add StockConflictDialog unit tests
test: add cart checkout integration tests with stock conflicts
```

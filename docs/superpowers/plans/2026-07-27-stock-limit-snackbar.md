# Stock-limit snackbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a bottom snackbar ("We only have {n} left in stock") when a user taps `+` on any quantity stepper that's already at its stock cap, instead of the tap silently doing nothing.

**Architecture:** A standalone zustand store (`useSnackbarStore`) holds transient `{ message, key, bottomOffset }` state. A single `<StockSnackbar/>` component, mounted once at the app root, renders that state as an animated bottom bar with a 2.5s auto-dismiss timer that restarts on every repeat `show()` call. The four stepper implementations in the app (`CompactStepper`, `FullWidthStepper`, `ProductCartBar`, `DynamicProductCard`) each move their `+`-button stock check out of a `disabled` prop and into the press handler, calling `show()` when the cap is hit.

**Tech Stack:** React Native, Expo Router, zustand, NativeWind (Tailwind), `react-native-safe-area-context`, Jest + `@testing-library/react-native`.

---

## File structure

- **Create** `src/core/store/useSnackbarStore.ts` — the zustand store (state + `show`/`hide`).
- **Create** `src/core/store/__tests__/useSnackbarStore.test.ts` — store unit tests.
- **Create** `src/shared/components/StockSnackbar.tsx` — the visual bar + auto-dismiss timer, subscribed to the store.
- **Create** `src/shared/components/__tests__/StockSnackbar.test.tsx` — component tests.
- **Modify** `src/base/constants/translations.ts` — add `stock_limit_reached` key.
- **Modify** `app/_layout.tsx` — mount `<StockSnackbar/>` once.
- **Modify** `src/shared/components/CompactStepper.tsx` — move the stock check into `onPress`, add optional `bottomOffset` prop.
- **Modify** `src/shared/components/__tests__/CompactStepper.test.tsx` *(new file — none exists today)* — stepper tests.
- **Modify** `src/shared/components/FullWidthStepper.tsx` — same treatment.
- **Modify** `src/shared/components/__tests__/FullWidthStepper.test.tsx` *(new file)* — stepper tests.
- **Modify** `src/features/product/views/components/ProductCartBar.tsx` — same treatment; measures its own height via `onLayout` to compute `bottomOffset`.
- **Create** `src/features/product/views/components/__tests__/ProductCartBar.test.tsx` *(no `__tests__` dir exists yet under this path)* — bar tests.
- **Modify** `src/features/home/views/home/components/DynamicProductCard.tsx` — same treatment on its inline "stepper" branch; computes `bottomOffset` from the dashboard tab-bar height.
- **Modify** `src/features/home/views/home/components/__tests__/DynamicProductCard.test.tsx` — extend with a stock-cap test.

Note: `StockSnackbar` is mounted directly from `app/_layout.tsx` and is **not** re-exported through `src/shared/components/index.ts` — none of the other root-mounted providers (`ErrorBoundary`, `AppScreen`) go through that barrel either, so this follows the existing convention.

**Why `CompactStepper`'s other consumers (`ProductCard`, `OrderModificationSheet`, `VariantBottomSheet`) and `FullWidthStepper`'s consumer (`CartItemRow`) need no changes:** they all render on top-level Stack screens or inside modals/sheets that sit above any tab bar, so the default `bottomOffset = 0` is already correct — no per-caller wiring needed. Only `ProductCartBar` (PDP, its own bar) and `DynamicProductCard` (home tab, needs to clear the floating tab bar) require a non-zero offset.

---

### Task 1: `useSnackbarStore`

**Files:**
- Create: `src/core/store/useSnackbarStore.ts`
- Test: `src/core/store/__tests__/useSnackbarStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/store/__tests__/useSnackbarStore.test.ts
import { useSnackbarStore } from '../useSnackbarStore';

const reset = () => useSnackbarStore.setState({ message: null, key: 0, bottomOffset: 0 });

describe('useSnackbarStore', () => {
  beforeEach(reset);

  it('starts with no message', () => {
    expect(useSnackbarStore.getState().message).toBeNull();
  });

  it('show() sets the message and bottomOffset', () => {
    useSnackbarStore.getState().show('We only have 1 left in stock', 56);

    const state = useSnackbarStore.getState();
    expect(state.message).toBe('We only have 1 left in stock');
    expect(state.bottomOffset).toBe(56);
  });

  it('show() defaults bottomOffset to 0 when omitted', () => {
    useSnackbarStore.getState().show('Capped out');
    expect(useSnackbarStore.getState().bottomOffset).toBe(0);
  });

  it('show() increments key every call, even with the same message', () => {
    useSnackbarStore.getState().show('Capped out');
    const firstKey = useSnackbarStore.getState().key;

    useSnackbarStore.getState().show('Capped out');
    expect(useSnackbarStore.getState().key).toBe(firstKey + 1);
  });

  it('hide() clears the message', () => {
    useSnackbarStore.getState().show('Capped out');
    useSnackbarStore.getState().hide();
    expect(useSnackbarStore.getState().message).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/core/store/__tests__/useSnackbarStore.test.ts`
Expected: FAIL — `Cannot find module '../useSnackbarStore'`

- [ ] **Step 3: Write the implementation**

```ts
// src/core/store/useSnackbarStore.ts

import { create } from 'zustand';

interface SnackbarState {
  message: string | null;
  /** Bumped on every show() call, including repeats — StockSnackbar keys its
   *  auto-dismiss effect on this so a repeat tap restarts the countdown. */
  key: number;
  /** Px to float above whatever bar occupies the bottom of the current screen. */
  bottomOffset: number;
}

interface SnackbarActions {
  show: (message: string, bottomOffset?: number) => void;
  hide: () => void;
}

type SnackbarStore = SnackbarState & SnackbarActions;

export const useSnackbarStore = create<SnackbarStore>((set, get) => ({
  message: null,
  key: 0,
  bottomOffset: 0,

  show: (message, bottomOffset = 0) => {
    set({ message, bottomOffset, key: get().key + 1 });
  },

  hide: () => set({ message: null }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/core/store/__tests__/useSnackbarStore.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/store/useSnackbarStore.ts src/core/store/__tests__/useSnackbarStore.test.ts
git commit -m "feat(snackbar): add useSnackbarStore for transient stock-limit messages"
```

---

### Task 2: `stock_limit_reached` translation key

**Files:**
- Modify: `src/base/constants/translations.ts:300` (insert alongside the existing `order_mod_only_left` entry)

- [ ] **Step 1: Add the key**

In `src/base/constants/translations.ts`, immediately after the `order_mod_only_left` line (line 300), add:

```ts
  stock_limit_reached: { te: 'ప్రస్తుతం మాకు {n} మాత్రమే మిగిలి ఉన్నాయి', en: 'We only have {n} left in stock' },
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `npx jest src/base/constants`
Expected: PASS, or "no tests found" (there is no dedicated test file for this map today — that's expected, not a failure). Confirm with:

Run: `npx jest --listTests | grep translations`
Expected: no output (no test file targets this module directly; it's covered indirectly through component tests in later tasks).

- [ ] **Step 3: Commit**

```bash
git add src/base/constants/translations.ts
git commit -m "feat(snackbar): add stock_limit_reached translation key"
```

---

### Task 3: `StockSnackbar` component

**Files:**
- Create: `src/shared/components/StockSnackbar.tsx`
- Test: `src/shared/components/__tests__/StockSnackbar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/components/__tests__/StockSnackbar.test.tsx
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { StockSnackbar } from '../StockSnackbar';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';

const reset = () => useSnackbarStore.setState({ message: null, key: 0, bottomOffset: 0 });

beforeEach(() => {
  reset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('StockSnackbar', () => {
  it('renders nothing when there is no message', () => {
    render(<StockSnackbar />);
    expect(screen.queryByTestId('stock-snackbar')).toBeNull();
  });

  it('renders the message and an Ok button once shown', () => {
    render(<StockSnackbar />);
    act(() => useSnackbarStore.getState().show('We only have 1 left in stock'));

    expect(screen.getByText('We only have 1 left in stock')).toBeTruthy();
    expect(screen.getByText('Ok')).toBeTruthy();
  });

  it('pressing Ok dismisses it immediately', () => {
    render(<StockSnackbar />);
    act(() => useSnackbarStore.getState().show('Capped out'));

    fireEvent.press(screen.getByText('Ok'));

    expect(screen.queryByTestId('stock-snackbar')).toBeNull();
  });

  it('auto-dismisses after 2.5s', () => {
    render(<StockSnackbar />);
    act(() => useSnackbarStore.getState().show('Capped out'));

    act(() => jest.advanceTimersByTime(2500));

    expect(screen.queryByTestId('stock-snackbar')).toBeNull();
  });

  it('a repeat show() before the timeout resets the countdown', () => {
    render(<StockSnackbar />);
    act(() => useSnackbarStore.getState().show('Capped out'));

    act(() => jest.advanceTimersByTime(2000)); // 500ms shy of dismissal
    act(() => useSnackbarStore.getState().show('Capped out')); // repeat tap

    act(() => jest.advanceTimersByTime(2000)); // would've been 4000ms since first show
    expect(screen.getByText('Capped out')).toBeTruthy(); // still visible — timer restarted

    act(() => jest.advanceTimersByTime(500)); // now 2500ms since the repeat show()
    expect(screen.queryByTestId('stock-snackbar')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/shared/components/__tests__/StockSnackbar.test.tsx`
Expected: FAIL — `Cannot find module '../StockSnackbar'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/shared/components/StockSnackbar.tsx

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';

const AUTO_DISMISS_MS = 2500;

export const StockSnackbar = () => {
  const message = useSnackbarStore((s) => s.message);
  const key = useSnackbarStore((s) => s.key);
  const bottomOffset = useSnackbarStore((s) => s.bottomOffset);
  const hide = useSnackbarStore((s) => s.hide);

  // Re-running on every `key` change (bumped by every show(), including
  // repeats) is what makes a repeat tap restart the countdown instead of
  // dismissing on the original timer.
  React.useEffect(() => {
    if (message === null) return;
    const id = setTimeout(hide, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [key, message, hide]);

  if (message === null) return null;

  return (
    <View
      testID="stock-snackbar"
      className="absolute left-0 right-0 flex-row items-center justify-between bg-pink-600 rounded-t-2xl px-4 py-4"
      style={{ bottom: bottomOffset }}
    >
      <Text className="text-white font-extrabold text-sm flex-1 pr-3">
        {'\u{1F9FA}\u{2728} '}
        {message}
      </Text>
      <TouchableOpacity onPress={hide} hitSlop={8}>
        <Text className="text-white font-extrabold text-sm">Ok</Text>
      </TouchableOpacity>
    </View>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/shared/components/__tests__/StockSnackbar.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/StockSnackbar.tsx src/shared/components/__tests__/StockSnackbar.test.tsx
git commit -m "feat(snackbar): add StockSnackbar component with auto-dismiss"
```

---

### Task 4: Mount `StockSnackbar` at the app root

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add the import and mount point**

In `app/_layout.tsx`, add the import near the other shared-component/store imports:

```tsx
import { StockSnackbar } from '@/src/shared/components/StockSnackbar';
```

Then render it as a sibling of `<AppScreen>`, inside `<ErrorBoundary>` (so it participates in the same error-boundary scope as the rest of the app), right after the `<Stack>` closes:

```tsx
          <ErrorBoundary>
          <AppScreen>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(dashboard)" />
              <Stack.Screen name="onboarding/language" />
              <Stack.Screen name="search" />
              <Stack.Screen name="category-details" />
              <Stack.Screen name="product" />
              <Stack.Screen name="cart" />
              <Stack.Screen name="order-detail" />
              <Stack.Screen name="top-picks" />
              <Stack.Screen name="index" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="location/index" />
              <Stack.Screen name="address/add" />
              <Stack.Screen name="about" />
            </Stack>
            <StockSnackbar />
          </AppScreen>
          </ErrorBoundary>
```

- [ ] **Step 2: Manually verify the app still boots**

Run: `npx expo start` (or the project's usual dev command), open the app, confirm no red-box error on launch. This file has no existing automated test — `AppScreen`/`RootLayout` aren't unit tested elsewhere in the repo, so a manual boot check is the right level of verification here.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(snackbar): mount StockSnackbar at the app root"
```

---

### Task 5: `CompactStepper` — move the stock check into the handler

**Files:**
- Modify: `src/shared/components/CompactStepper.tsx`
- Create: `src/shared/components/__tests__/CompactStepper.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/components/__tests__/CompactStepper.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CompactStepper } from '../CompactStepper';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';

beforeEach(() => useSnackbarStore.setState({ message: null, key: 0, bottomOffset: 0 }));

describe('CompactStepper', () => {
  it('calls onAdd when below maxQuantity', () => {
    const onAdd = jest.fn();
    render(<CompactStepper count={1} maxQuantity={3} onAdd={onAdd} onDec={jest.fn()} />);

    fireEvent.press(screen.getByTestId('stepper-add'));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(useSnackbarStore.getState().message).toBeNull();
  });

  it('shows the stock-limit snackbar instead of calling onAdd once maxQuantity is hit', () => {
    const onAdd = jest.fn();
    render(<CompactStepper count={3} maxQuantity={3} onAdd={onAdd} onDec={jest.fn()} />);

    fireEvent.press(screen.getByTestId('stepper-add'));

    expect(onAdd).not.toHaveBeenCalled();
    expect(useSnackbarStore.getState().message).toBe('We only have 3 left in stock');
  });

  it('always allows onAdd when maxQuantity is undefined', () => {
    const onAdd = jest.fn();
    render(<CompactStepper count={99} onAdd={onAdd} onDec={jest.fn()} />);

    fireEvent.press(screen.getByTestId('stepper-add'));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/shared/components/__tests__/CompactStepper.test.tsx`
Expected: FAIL — the `+` button is `disabled`, so `fireEvent.press` on the capped case does nothing and `onAdd` is never called either way; specifically the second test's `expect(useSnackbarStore.getState().message).toBe(...)` fails since nothing sets it today.

- [ ] **Step 3: Write the implementation**

Replace the full contents of `src/shared/components/CompactStepper.tsx`:

```tsx
import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

interface CompactStepperProps {
  count: number;
  onAdd: () => void;
  onDec: () => void;
  maxQuantity?: number;
  /** Suffix for the increment/decrement testIDs, so multiple steppers on one
   *  screen stay addressable in tests. */
  testIDSuffix?: string;
  /** Px to float the stock-limit snackbar above the bottom of the screen. */
  bottomOffset?: number;
}

export const CompactStepper = ({
  count, onAdd, onDec, maxQuantity, testIDSuffix, bottomOffset,
}: CompactStepperProps) => {
  const canAdd = maxQuantity === undefined || count < maxQuantity;
  const suffix = testIDSuffix ? `-${testIDSuffix}` : '';
  const { t } = useTranslation();

  const handleAdd = () => {
    if (!canAdd) {
      useSnackbarStore.getState().show(interpolate(t('stock_limit_reached'), maxQuantity!), bottomOffset);
      return;
    }
    onAdd();
  };

  return (
    <View className="flex-row items-center border-2 border-green-600 rounded-lg h-11">
      <TouchableOpacity
        onPress={onDec}
        testID={`stepper-dec${suffix}`}
        className="w-12 h-full items-center justify-center active:bg-green-50"
      >
        <Minus size={14} color="#15803d" />
      </TouchableOpacity>
      <Text
        testID={`stepper-count${suffix}`}
        className="flex-1 text-green-700 font-extrabold text-sm text-center"
      >
        {count}
      </Text>
      <TouchableOpacity
        onPress={handleAdd}
        testID={`stepper-add${suffix}`}
        className={`w-12 h-full items-center justify-center ${canAdd ? 'active:bg-green-50' : 'opacity-50'}`}
      >
        <Plus size={14} color={canAdd ? '#15803d' : '#d1d5db'} />
      </TouchableOpacity>
    </View>
  );
};
```

Note: the `+` button is no longer `disabled` — it stays pressable so `handleAdd` can run the check and trigger the snackbar; the dimmed `opacity-50` styling is preserved via the existing `canAdd` conditional class, so the visual "disabled" look is unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/shared/components/__tests__/CompactStepper.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full test suite to check for regressions in existing consumers**

Run: `npx jest src/shared/components/ProductCard src/shared/components/OrderModificationSheet src/shared/components/VariantBottomSheet`
Expected: PASS — these consumers pass `maxQuantity` already; confirm none of them assert on `disabled` prop state directly (if any do, update the assertion to check `onAdd` was/wasn't called instead, since the button is no longer `disabled`).

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/CompactStepper.tsx src/shared/components/__tests__/CompactStepper.test.tsx
git commit -m "feat(snackbar): CompactStepper shows stock-limit snackbar instead of a dead +"
```

---

### Task 6: `FullWidthStepper` — same treatment

**Files:**
- Modify: `src/shared/components/FullWidthStepper.tsx`
- Create: `src/shared/components/__tests__/FullWidthStepper.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/components/__tests__/FullWidthStepper.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FullWidthStepper } from '../FullWidthStepper';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';

beforeEach(() => useSnackbarStore.setState({ message: null, key: 0, bottomOffset: 0 }));

describe('FullWidthStepper', () => {
  it('calls onAdd when below maxQuantity', () => {
    const onAdd = jest.fn();
    render(<FullWidthStepper count={1} maxQuantity={3} onAdd={onAdd} onDec={jest.fn()} />);

    fireEvent.press(screen.getByTestId('stepper-add'));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('shows the stock-limit snackbar instead of calling onAdd once maxQuantity is hit', () => {
    const onAdd = jest.fn();
    render(<FullWidthStepper count={2} maxQuantity={2} onAdd={onAdd} onDec={jest.fn()} />);

    fireEvent.press(screen.getByTestId('stepper-add'));

    expect(onAdd).not.toHaveBeenCalled();
    expect(useSnackbarStore.getState().message).toBe('We only have 2 left in stock');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/shared/components/__tests__/FullWidthStepper.test.tsx`
Expected: FAIL — second test's snackbar assertion fails since nothing sets it today.

- [ ] **Step 3: Write the implementation**

Replace the full contents of `src/shared/components/FullWidthStepper.tsx`:

```tsx
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

interface FullWidthStepperProps {
  count: number;
  onAdd: () => void;
  onDec: () => void;
  maxQuantity?: number;
  /** Px to float the stock-limit snackbar above the bottom of the screen. */
  bottomOffset?: number;
}

export const FullWidthStepper = ({ count, onAdd, onDec, maxQuantity, bottomOffset }: FullWidthStepperProps) => {
  const canAdd = maxQuantity === undefined || count < maxQuantity;
  const { t } = useTranslation();

  const handleAdd = () => {
    if (!canAdd) {
      useSnackbarStore.getState().show(interpolate(t('stock_limit_reached'), maxQuantity!), bottomOffset);
      return;
    }
    onAdd();
  };

  return (
    <View className="flex-row items-center border-2 border-green-600 rounded-lg h-10">
      <TouchableOpacity
        onPress={onDec}
        testID="stepper-dec"
        className="flex-1 items-center justify-center h-full active:bg-green-50"
      >
        {count === 1
          ? <Trash2 size={16} color="#15803d" />
          : <Minus size={16} color="#15803d" />}
      </TouchableOpacity>
      <Text className="text-green-700 font-extrabold text-base min-w-[28px] text-center">
        {count}
      </Text>
      <TouchableOpacity
        onPress={handleAdd}
        testID="stepper-add"
        className={`flex-1 items-center justify-center h-full ${canAdd ? 'active:bg-green-50' : 'opacity-50'}`}
      >
        <Plus size={16} color={canAdd ? '#15803d' : '#d1d5db'} />
      </TouchableOpacity>
    </View>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/shared/components/__tests__/FullWidthStepper.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Check the existing consumer for regressions**

Run: `npx jest src/shared/components/__tests__/CartItemRow.test.tsx`
Expected: PASS — `CartItemRow` passes `maxQuantity` through already; if any assertion there checks `disabled` state on the `+` button directly, update it to assert on `onAdd` call count instead.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/FullWidthStepper.tsx src/shared/components/__tests__/FullWidthStepper.test.tsx
git commit -m "feat(snackbar): FullWidthStepper shows stock-limit snackbar instead of a dead +"
```

---

### Task 7: `ProductCartBar` — same treatment, own height as `bottomOffset`

**Files:**
- Modify: `src/features/product/views/components/ProductCartBar.tsx`
- Create: `src/features/product/views/components/__tests__/ProductCartBar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/product/views/components/__tests__/ProductCartBar.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ProductCartBar } from '../ProductCartBar';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

beforeEach(() => useSnackbarStore.setState({ message: null, key: 0, bottomOffset: 0 }));

describe('ProductCartBar', () => {
  it('calls onAdd when below maxQuantity', () => {
    const onAdd = jest.fn();
    render(
      <ProductCartBar count={1} maxQuantity={3} onAdd={onAdd} onDec={jest.fn()} onViewCart={jest.fn()} />,
    );

    fireEvent.press(screen.getByTestId('cart-bar-add'));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('shows the stock-limit snackbar instead of calling onAdd once maxQuantity is hit', () => {
    const onAdd = jest.fn();
    render(
      <ProductCartBar count={5} maxQuantity={5} onAdd={onAdd} onDec={jest.fn()} onViewCart={jest.fn()} />,
    );

    fireEvent.press(screen.getByTestId('cart-bar-add'));

    expect(onAdd).not.toHaveBeenCalled();
    expect(useSnackbarStore.getState().message).toBe('We only have 5 left in stock');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/product/views/components/__tests__/ProductCartBar.test.tsx`
Expected: FAIL — `getByTestId('cart-bar-add')` doesn't exist yet (the `+` button currently has no `testID`), and the button is `disabled` so no snackbar fires either way.

- [ ] **Step 3: Write the implementation**

Replace the full contents of `src/features/product/views/components/ProductCartBar.tsx`:

```tsx
// src/features/product/views/components/ProductCartBar.tsx

import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { LayoutChangeEvent, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';
import { interpolate } from '@/src/base/constants/translations';

interface Props {
  count: number;
  inStock?: boolean;
  maxQuantity?: number;
  onAdd: () => void;
  onDec: () => void;
  onViewCart: () => void;
}

export const ProductCartBar = ({ count, inStock = true, maxQuantity, onAdd, onDec, onViewCart }: Props) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const canAdd = maxQuantity === undefined || count < maxQuantity;
  const [barHeight, setBarHeight] = React.useState(0);

  const handleLayout = (e: LayoutChangeEvent) => setBarHeight(e.nativeEvent.layout.height);

  const handleAdd = () => {
    if (!canAdd) {
      useSnackbarStore.getState().show(interpolate(t('stock_limit_reached'), maxQuantity!), barHeight);
      return;
    }
    onAdd();
  };

  if (!inStock) {
    return (
      <View
        className="bg-white border-t border-slate-100 px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="bg-slate-100 rounded-2xl h-14 items-center justify-center">
          <Text className="text-slate-400 font-extrabold text-base">{t('out_of_stock')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      onLayout={handleLayout}
      className="bg-white border-t border-slate-100 px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      {count === 0 ? (
        <TouchableOpacity
          onPress={onAdd}
          className="bg-green-600 rounded-2xl h-14 items-center justify-center"
        >
          <Text className="text-white font-extrabold text-base">{t('add_to_cart')}</Text>
        </TouchableOpacity>
      ) : (
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center justify-between bg-green-600 rounded-2xl px-4 h-14 flex-1">
            <TouchableOpacity onPress={onDec} hitSlop={8}>
              <Minus size={20} color="#ffffff" />
            </TouchableOpacity>
            <Text className="text-white font-extrabold text-base">{count}</Text>
            <TouchableOpacity testID="cart-bar-add" onPress={handleAdd} hitSlop={8} style={{ opacity: canAdd ? 1 : 0.5 }}>
              <Plus size={20} color={canAdd ? '#ffffff' : '#d1d5db'} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={onViewCart}
            className="border-2 border-green-600 rounded-2xl h-14 px-5 items-center justify-center flex-1"
          >
            <Text className="text-green-700 font-extrabold text-base">{t('view_cart')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
```

Note: `onLayout` fires synchronously in RNTL's JSDOM-style test renderer with a zero-size layout by default, so `barHeight` will be `0` in the tests above — that's fine, the test only asserts the message content, not the offset value. In a real device, `onLayout` fires with the bar's actual measured height after first paint.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/product/views/components/__tests__/ProductCartBar.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/product/views/components/ProductCartBar.tsx src/features/product/views/components/__tests__/ProductCartBar.test.tsx
git commit -m "feat(snackbar): ProductCartBar shows stock-limit snackbar above its own height"
```

---

### Task 8: `DynamicProductCard` — same treatment, dashboard tab-bar height as `bottomOffset`

**Files:**
- Modify: `src/features/home/views/home/components/DynamicProductCard.tsx`
- Modify: `src/features/home/views/home/components/__tests__/DynamicProductCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Add this `describe` block to the end of `src/features/home/views/home/components/__tests__/DynamicProductCard.test.tsx` (after the existing `describe('DynamicProductCard, no variants', ...)` block, before the file's final closing):

```tsx
describe('DynamicProductCard, stock cap', () => {
  it('shows the stock-limit snackbar instead of adding once ownCount reaches stock', () => {
    useVillageStore.setState({ cart: { p2: 5 }, cartSnapshots: {}, lastVariantKey: {} });

    render(<DynamicProductCard product={plain} onOpenVariants={jest.fn()} />);
    fireEvent.press(screen.getByTestId('stepper-inc'));

    expect(useVillageStore.getState().cart.p2).toBe(5); // unchanged
    expect(useSnackbarStore.getState().message).toBe('We only have 5 left in stock');
  });
});
```

And add the import at the top of the file, alongside the existing `useVillageStore` import:

```tsx
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';
```

Also add a `beforeEach` reset for the snackbar store, next to the existing cart-reset `beforeEach`:

```tsx
beforeEach(() => useSnackbarStore.setState({ message: null, key: 0, bottomOffset: 0 }));
```

(`plain` has `stock: 5`, matching the `cart: { p2: 5 }` setup — `ownCount === stock` is exactly the capped condition.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/home/views/home/components/__tests__/DynamicProductCard.test.tsx`
Expected: FAIL — the new test's `expect(useSnackbarStore.getState().message)...` fails since nothing sets it today (today the `+` is simply `disabled` at `ownCount === stock` and the press is a no-op).

- [ ] **Step 3: Write the implementation**

In `src/features/home/views/home/components/DynamicProductCard.tsx`:

Add imports at the top:

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';
import { interpolate } from '@/src/base/constants/translations';
```

Inside `DynamicProductCardComponent`, after the existing `const stock = product.stock ?? 0;` / `const canAdd = ownCount < stock;` lines (around line 47-48), add:

```tsx
  const { bottom } = useSafeAreaInsets();
  // Matches the (dashboard) tab bar's own height formula in
  // app/(dashboard)/_layout.tsx, so the snackbar clears the floating tab bar
  // rather than being hidden behind it.
  const TAB_BAR_CONTENT_HEIGHT = 64;
  const tabBarBottomOffset = TAB_BAR_CONTENT_HEIGHT + bottom;

  const handlePlainAdd = () => {
    if (!canAdd) {
      useSnackbarStore.getState().show(interpolate(t('stock_limit_reached'), stock), tabBarBottomOffset);
      return;
    }
    handleAdd();
  };
```

Then, in the plain-stepper JSX branch (around line 180-196), change the `+` button's `onPress` from `handleAdd` to `handlePlainAdd`:

```tsx
            <View className="flex-row items-center justify-between bg-green-600 rounded-xl px-2 py-2">
              <TouchableOpacity testID="stepper-dec" onPress={() => decFromCart(product.id)} hitSlop={6}>
                <Minus size={16} color="#ffffff" />
              </TouchableOpacity>
              <Text className="text-white font-bold text-sm">{ownCount}</Text>
              <TouchableOpacity
                testID="stepper-inc"
                onPress={handlePlainAdd}
                hitSlop={6}
                style={{ opacity: canAdd ? 1 : 0.5 }}
              >
                <Plus size={16} color={canAdd ? '#ffffff' : '#d1d5db'} />
              </TouchableOpacity>
            </View>
```

(Leave the `mode === 'add'` and `view.opensSheet` branches untouched — the `add` branch's button already routes through `handleAdd`'s own `stock === 0` gate elsewhere via `product.inStock`, and the sheet-opening row has no direct `+`/`-` handlers to change, per the existing code comment on that block.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/home/views/home/components/__tests__/DynamicProductCard.test.tsx`
Expected: PASS (all tests, including the new one)

- [ ] **Step 5: Run the full suite once to confirm no regressions anywhere touched by this plan**

Run: `npx jest src/core/store src/shared/components src/features/product/views/components src/features/home/views/home/components`
Expected: PASS across all of the above.

- [ ] **Step 6: Commit**

```bash
git add src/features/home/views/home/components/DynamicProductCard.tsx src/features/home/views/home/components/__tests__/DynamicProductCard.test.tsx
git commit -m "feat(snackbar): DynamicProductCard shows stock-limit snackbar above the tab bar"
```

---

### Task 9: Manual verification

- [ ] **Step 1: Boot the app and exercise the golden path**

Run: `npx expo start`, open on a simulator/device.

- On the PDP for a product with low stock (or temporarily hardcode a product's `stock` to `1` in test data if none exists), add to cart until the stepper reads `1/1`, tap `+` again: confirm the pink snackbar appears above the `ProductCartBar`, reading "We only have 1 left in stock", with an "Ok" button.
- Tap "Ok": confirm it dismisses immediately.
- Tap `+` again at the cap: confirm the snackbar re-appears; wait without touching anything: confirm it auto-dismisses after ~2.5s.
- Tap `+` repeatedly at the cap (3-4 fast taps): confirm the snackbar stays visible for the full 2.5s counted from the *last* tap, not the first.
- On the home tab, find a low-stock product card, cap it out, tap `+`: confirm the snackbar appears above the floating tab bar, not underneath it.
- Navigate to the cart screen and repeat with a `CartItemRow` at its cap: confirm the snackbar appears (bottom offset `0` is correct here, no tab bar).

- [ ] **Step 2: Run the entire test suite once more end-to-end**

Run: `npx jest`
Expected: PASS, no failures introduced anywhere in the suite.

---

## Self-review notes

- **Spec coverage:** every spec section maps to a task — store (Task 1), copy (Task 2), component + auto-dismiss/reset-on-repeat behavior (Task 3), mounting (Task 4), the three originally-scoped steppers (Tasks 5-7), plus `DynamicProductCard` (Task 8), which the spec's "everywhere steppers exist" scope answer covers even though it wasn't named explicitly in the spec's file list — it's the fourth stepper implementation found during planning and is in scope per the user's answer.
- **Placeholder scan:** no TBD/TODO; every step has literal code.
- **Type consistency:** `bottomOffset?: number` prop name and `show(message, bottomOffset?)` signature are identical across `useSnackbarStore`, `StockSnackbar`, `CompactStepper`, `FullWidthStepper`; `ProductCartBar` and `DynamicProductCard` compute their own offset value locally (`barHeight` / `tabBarBottomOffset`) and pass it positionally to the same `show()` signature — no divergent naming.

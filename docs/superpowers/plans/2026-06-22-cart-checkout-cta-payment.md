# Cart Checkout CTA + Inline Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Cart's bottom CTA a 4-state machine (login → select address → select payment → place order) and move payment selection into an inline COD/UPI section below the bill summary with radio-button selection.

**Architecture:** A pure helper `deriveCheckoutState` maps `{ isAuthenticated, hasAddress, paymentMethod }` to one of four state strings. `CheckoutBar` becomes a presentational component that renders the bar for the given state. A new presentational `PaymentMethodSection` renders the two COD/UPI rows. `CartScreen` owns the `paymentMethod` state, derives `hasAddress` from the existing `useCartAddressViewModel`, composes the section + bar, and owns the auth/placing sheets.

**Tech Stack:** React Native, Expo Router, NativeWind (className) + StyleSheet, lucide-react-native icons, Jest (jest-expo preset). Existing VMs reused: `useCartViewModel`, `useCartAddressViewModel`; existing `LoginBottomSheet`.

---

## File Structure

- **Create** `src/features/cart/domain/checkoutState.ts` — pure `deriveCheckoutState` + `CheckoutState` type.
- **Create** `src/features/cart/domain/__tests__/checkoutState.test.ts` — unit tests for the helper.
- **Create** `src/shared/components/PaymentMethodSection.tsx` — inline COD/UPI selector (presentational) + `PaymentMethod` type.
- **Modify** `src/shared/components/index.ts` — export `PaymentMethodSection`.
- **Modify** `src/base/constants/translations.ts` — new CTA + payment strings.
- **Modify** `src/shared/components/CheckoutBar.tsx` — refactor to a state-driven presentational bar (remove the inline payment selector).
- **Modify** `src/features/cart/views/CartScreen.tsx` — wire state derivation, render the payment section, pass new props to `CheckoutBar`, add the pure-login sheet.

---

## Task 1: `deriveCheckoutState` pure helper

**Files:**
- Create: `src/features/cart/domain/checkoutState.ts`
- Test: `src/features/cart/domain/__tests__/checkoutState.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/cart/domain/__tests__/checkoutState.test.ts`:

```ts
import { deriveCheckoutState } from '../checkoutState';

describe('deriveCheckoutState', () => {
  it('returns "login" when not authenticated', () => {
    expect(
      deriveCheckoutState({ isAuthenticated: false, hasAddress: false, paymentMethod: null })
    ).toBe('login');
    // auth is the first gate regardless of other inputs
    expect(
      deriveCheckoutState({ isAuthenticated: false, hasAddress: true, paymentMethod: 'cod' })
    ).toBe('login');
  });

  it('returns "address" when authenticated but no address', () => {
    expect(
      deriveCheckoutState({ isAuthenticated: true, hasAddress: false, paymentMethod: null })
    ).toBe('address');
    expect(
      deriveCheckoutState({ isAuthenticated: true, hasAddress: false, paymentMethod: 'upi' })
    ).toBe('address');
  });

  it('returns "payment" when authed + address but no payment method', () => {
    expect(
      deriveCheckoutState({ isAuthenticated: true, hasAddress: true, paymentMethod: null })
    ).toBe('payment');
  });

  it('returns "place" when authed + address + payment method', () => {
    expect(
      deriveCheckoutState({ isAuthenticated: true, hasAddress: true, paymentMethod: 'cod' })
    ).toBe('place');
    expect(
      deriveCheckoutState({ isAuthenticated: true, hasAddress: true, paymentMethod: 'upi' })
    ).toBe('place');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/cart/domain/__tests__/checkoutState.test.ts`
Expected: FAIL — "Cannot find module '../checkoutState'".

- [ ] **Step 3: Write minimal implementation**

Create `src/features/cart/domain/checkoutState.ts`:

```ts
// Pure derivation of the Cart bottom-bar state from auth + address + payment.
// No React, no store access — unit-testable in isolation.

import type { PaymentMethod } from '@/src/shared/components/PaymentMethodSection';

export type CheckoutState = 'login' | 'address' | 'payment' | 'place';

export interface CheckoutInputs {
  isAuthenticated: boolean;
  hasAddress: boolean;
  paymentMethod: PaymentMethod;
}

export function deriveCheckoutState({
  isAuthenticated,
  hasAddress,
  paymentMethod,
}: CheckoutInputs): CheckoutState {
  if (!isAuthenticated) return 'login';
  if (!hasAddress) return 'address';
  if (!paymentMethod) return 'payment';
  return 'place';
}
```

> Note: this imports the `PaymentMethod` type from `PaymentMethodSection`, created in Task 3. If you implement Task 1 before Task 3, the type import will not resolve yet — implement Task 3 before running the full type-check, or temporarily inline `type PaymentMethod = 'cod' | 'upi' | null` and switch to the import in Task 3. The Jest test itself does not need the type to pass (it only passes string/null literals).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/cart/domain/__tests__/checkoutState.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/cart/domain/checkoutState.ts src/features/cart/domain/__tests__/checkoutState.test.ts
git commit -m "feat(cart): add deriveCheckoutState helper with tests"
```

---

## Task 2: Translation strings

**Files:**
- Modify: `src/base/constants/translations.ts:32-35`

- [ ] **Step 1: Add the new keys**

In `src/base/constants/translations.ts`, find the block (around lines 32-35):

```ts
  payment_title:    { te: 'చెల్లింపు పద్ధతి', en: 'Payment Method' },
  cod:              { te: 'నగదు చెల్లింపు', en: 'Cash on Delivery' },
  upi:              { te: 'UPI చెల్లింపు', en: 'UPI Payment' },
  proceed_checkout: { te: 'చెక్అవుట్ కు వెళ్ళండి →', en: 'PROCEED TO CHECKOUT →' },
```

Replace it with (adds seven keys after `proceed_checkout`):

```ts
  payment_title:    { te: 'చెల్లింపు పద్ధతి', en: 'Payment Method' },
  cod:              { te: 'నగదు చెల్లింపు', en: 'Cash on Delivery' },
  upi:              { te: 'UPI చెల్లింపు', en: 'UPI Payment' },
  proceed_checkout: { te: 'చెక్అవుట్ కు వెళ్ళండి →', en: 'PROCEED TO CHECKOUT →' },
  login_to_proceed:        { te: 'కొనసాగడానికి లాగిన్ చేయండి →', en: 'Login to proceed →' },
  select_address_to_proceed: { te: 'చిరునామా ఎంచుకోండి →', en: 'Select address to proceed →' },
  select_payment_method:   { te: 'చెల్లింపు పద్ధతిని ఎంచుకోండి', en: 'Select a payment method' },
  place_order:             { te: 'ఆర్డర్ చేయండి →', en: 'Place order →' },
  choose_payment_method:   { te: 'మీకు నచ్చిన చెల్లింపు పద్ధతిని ఎంచుకోండి.', en: "Choose the payment method you'd like to use." },
  cod_subtitle:            { te: 'వచ్చినప్పుడు చెల్లించండి', en: 'Pay when it arrives' },
  upi_subtitle:            { te: 'GPay, PhonePe, Paytm', en: 'GPay, PhonePe, Paytm' },
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors from `translations.ts` (the `t()` function takes a plain `string`, so no key-type updates are required).

- [ ] **Step 3: Commit**

```bash
git add src/base/constants/translations.ts
git commit -m "feat(cart): add checkout CTA and payment translation strings"
```

---

## Task 3: `PaymentMethodSection` component

**Files:**
- Create: `src/shared/components/PaymentMethodSection.tsx`
- Modify: `src/shared/components/index.ts:17` (add export)

- [ ] **Step 1: Create the component**

Create `src/shared/components/PaymentMethodSection.tsx`:

```tsx
import { Banknote, Smartphone } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';

export type PaymentMethod = 'cod' | 'upi' | null;

interface PaymentMethodSectionProps {
  selected: PaymentMethod;
  onSelect: (method: 'cod' | 'upi') => void;
}

const OPTIONS = [
  { method: 'cod', Icon: Banknote, titleKey: 'cod', subtitleKey: 'cod_subtitle' },
  { method: 'upi', Icon: Smartphone, titleKey: 'upi', subtitleKey: 'upi_subtitle' },
] as const;

export const PaymentMethodSection = ({ selected, onSelect }: PaymentMethodSectionProps) => {
  const { t } = useTranslation();

  return (
    <View>
      <Text className="text-slate-500 text-[10px] font-bold tracking-widest mb-1 uppercase">
        {t('payment_title')}
      </Text>
      <Text className="text-slate-400 text-xs mb-2.5">{t('choose_payment_method')}</Text>

      <View className="gap-2.5">
        {OPTIONS.map(({ method, Icon, titleKey, subtitleKey }) => {
          const isSelected = selected === method;
          return (
            <TouchableOpacity
              key={method}
              activeOpacity={0.85}
              onPress={() => onSelect(method)}
              className={`flex-row items-center justify-between bg-white rounded-2xl px-3.5 py-3.5 ${
                isSelected ? 'border-2 border-green-600' : 'border border-slate-100'
              }`}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center">
                  <Icon size={21} color="#475569" />
                </View>
                <View>
                  <Text className="text-slate-900 font-bold text-[15px]">{t(titleKey)}</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">{t(subtitleKey)}</Text>
                </View>
              </View>

              <View
                className={`w-[22px] h-[22px] rounded-full items-center justify-center ${
                  isSelected ? 'bg-green-600' : 'border-2 border-slate-300'
                }`}
              >
                {isSelected && <View className="w-[9px] h-[9px] rounded-full bg-white" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
```

- [ ] **Step 2: Export it from the barrel**

In `src/shared/components/index.ts`, after the line:

```ts
export { CheckoutBar } from './CheckoutBar';
```

add:

```ts
export { PaymentMethodSection } from './PaymentMethodSection';
export type { PaymentMethod } from './PaymentMethodSection';
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors (Task 1's import of `PaymentMethod` from this file now resolves).

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/PaymentMethodSection.tsx src/shared/components/index.ts
git commit -m "feat(cart): add PaymentMethodSection with radio selection"
```

---

## Task 4: Refactor `CheckoutBar` to be state-driven

**Files:**
- Modify: `src/shared/components/CheckoutBar.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/shared/components/CheckoutBar.tsx` with:

```tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { rupees } from '@/src/features/home/data/static/villageData';
import { useTranslation } from '@/src/core/utils/useTranslation';
import type { CheckoutState } from '@/src/features/cart/domain/checkoutState';

interface CheckoutBarProps {
  state: CheckoutState;
  grandTotal: number;
  savings: number;
  onLogin: () => void;
  onSelectAddress: () => void;
  onPlaceOrder: () => void;
}

export const CheckoutBar = ({
  state,
  grandTotal,
  savings,
  onLogin,
  onSelectAddress,
  onPlaceOrder,
}: CheckoutBarProps) => {
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;

  // States 1-3 are a single full-width button (states 1-2 green/actionable,
  // state 3 grey/disabled). State 4 shows the total + "Place order".
  if (state !== 'place') {
    const config = {
      login: { label: t('login_to_proceed'), onPress: onLogin, disabled: false },
      address: { label: t('select_address_to_proceed'), onPress: onSelectAddress, disabled: false },
      payment: { label: t('select_payment_method'), onPress: undefined, disabled: true },
    }[state];

    return (
      <View style={styles.wrap}>
        <TouchableOpacity
          style={[styles.fullButton, config.disabled && styles.buttonDisabled]}
          activeOpacity={config.disabled ? 1 : 0.9}
          disabled={config.disabled}
          onPress={config.onPress}
        >
          <Text style={[styles.fullCta, teFont]}>{config.label}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={onPlaceOrder}>
        <View>
          <Text style={styles.total}>{rupees(grandTotal)}</Text>
          {savings > 0 && <Text style={styles.saving}>saving {rupees(savings)}</Text>}
        </View>
        <Text style={[styles.cta, teFont]}>{t('place_order')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 8, marginHorizontal: 12 },
  button: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  fullButton: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  total: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  saving: { color: 'rgba(255,255,255,0.72)', fontSize: 10, marginTop: 1 },
  cta: { color: '#ffffff', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  fullCta: { color: '#ffffff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
});
```

> The old `PaymentMethod` type and `PaymentMethod` selector live in `PaymentMethodSection` now (Task 3). `CheckoutBar` no longer exports `PaymentMethod` — Task 5 updates the only other importer (`CartScreen`).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: One remaining error in `CartScreen.tsx` (still imports `PaymentMethod` from `./CheckoutBar` and passes old props). Fixed in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/CheckoutBar.tsx
git commit -m "refactor(cart): make CheckoutBar a state-driven presentational bar"
```

---

## Task 5: Wire `CartScreen`

**Files:**
- Modify: `src/features/cart/views/CartScreen.tsx`

- [ ] **Step 1: Update imports**

In `src/features/cart/views/CartScreen.tsx`, replace the import block (lines 7-23) component imports as follows.

Change this line:

```tsx
import {
  BillSummaryCard,
  CartItemRow,
  CheckoutBar,
  DeliveryETACard,
  EmptyCart,
  SavingsStrip,
  VariantBottomSheet,
} from '@/src/shared/components';
```

to:

```tsx
import {
  BillSummaryCard,
  CartItemRow,
  CheckoutBar,
  DeliveryETACard,
  EmptyCart,
  PaymentMethodSection,
  SavingsStrip,
  VariantBottomSheet,
} from '@/src/shared/components';
import type { PaymentMethod } from '@/src/shared/components';
import { deriveCheckoutState } from '@/src/features/cart/domain/checkoutState';
```

Then delete the now-unused import line:

```tsx
import { PaymentMethod } from '@/src/shared/components/CheckoutBar';
```

- [ ] **Step 2: Add the pure-login sheet state and derive checkout state**

In the component body, find:

```tsx
  const addr = useCartAddressViewModel();
  const [addressLoginVisible, setAddressLoginVisible] = React.useState(false);
```

and add directly below it:

```tsx
  const [pureLoginVisible, setPureLoginVisible] = React.useState(false);

  const hasAddress = addr.selectedAddress != null;
  const checkoutState = deriveCheckoutState({
    isAuthenticated: addr.isAuthenticated,
    hasAddress,
    paymentMethod,
  });
```

- [ ] **Step 3: Render the payment section below the bill summary**

Find:

```tsx
          {/* Bill summary */}
          <BillSummaryCard bill={vm.bill} couponApplied={vm.couponApplied} />
```

and insert the payment section immediately after it:

```tsx
          {/* Bill summary */}
          <BillSummaryCard bill={vm.bill} couponApplied={vm.couponApplied} />

          {/* Payment method — only once authed and an address is selected */}
          {addr.isAuthenticated && hasAddress && (
            <PaymentMethodSection selected={paymentMethod} onSelect={setPaymentMethod} />
          )}
```

- [ ] **Step 4: Replace the CheckoutBar usage**

Find the existing `<CheckoutBar ... />` block:

```tsx
      {/* Checkout bar */}
      <CheckoutBar
        grandTotal={vm.bill.grandTotal}
        savings={vm.bill.totalSavings}
        paymentMethod={paymentMethod}
        onSelectPayment={setPaymentMethod}
        onCheckout={handleCheckout}
      />
```

Replace it with:

```tsx
      {/* Checkout bar */}
      <CheckoutBar
        state={checkoutState}
        grandTotal={vm.bill.grandTotal}
        savings={vm.bill.totalSavings}
        onLogin={() => setPureLoginVisible(true)}
        onSelectAddress={handleAddressPress}
        onPlaceOrder={handleCheckout}
      />
```

- [ ] **Step 5: Add the pure-login sheet**

Find the existing address auth-gate sheet at the end of the component:

```tsx
      {/* Auth gate for the address flow */}
      <LoginBottomSheet
        visible={addressLoginVisible}
        onClose={() => setAddressLoginVisible(false)}
        onComplete={() => {
          setAddressLoginVisible(false);
          openAddressScreen();
        }}
        mode="auth"
      />
```

Add directly after it (before the closing `</SafeAreaView>`):

```tsx
      {/* Pure login from the bottom CTA (state 1). On success the bar advances
          on its own because isAuthenticated flips — no navigation. */}
      <LoginBottomSheet
        visible={pureLoginVisible}
        onClose={() => setPureLoginVisible(false)}
        onComplete={() => setPureLoginVisible(false)}
        mode="auth"
      />
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 7: Run the full test suite**

Run: `npx jest`
Expected: PASS (including the new `checkoutState` tests; no existing tests broken).

- [ ] **Step 8: Commit**

```bash
git add src/features/cart/views/CartScreen.tsx
git commit -m "feat(cart): wire auth/address/payment-aware checkout bar"
```

---

## Manual Verification (after Task 5)

Run the app and verify the four transitions on the Cart:

1. **Logged out** → bottom bar shows green **"Login to proceed"**; no payment section. Tap → auth sheet → after login the bar shows **"Select address to proceed"**.
2. **Authed, no address** → tap **"Select address to proceed"** → address screen → pick/add an address → return: a **Payment method** section appears below the bill summary; bar shows grey **"Select a payment method"**.
3. **Pick COD or UPI** → the chosen row's radio fills green (green border ring); bar turns green showing **"₹… / saving ₹… — Place order"**.
4. **Tap "Place order"** → existing placing flow runs (`LoginBottomSheet` `'placing'` step).

---

## Self-Review Notes

- **Spec coverage:** §1 bottom-bar state machine → Tasks 1 & 4 & 5; §2 inline payment section → Tasks 2 & 3 & 5; §3 CartScreen wiring → Task 5; §6 testing → Task 1 (pure tests) + manual section.
- **Type consistency:** `PaymentMethod` is defined once in `PaymentMethodSection.tsx` and imported by `checkoutState.ts` and `CartScreen.tsx`. `CheckoutState` defined in `checkoutState.ts`, imported by `CheckoutBar.tsx`. `deriveCheckoutState({ isAuthenticated, hasAddress, paymentMethod })` signature matches its call site in Task 5.
- **No placeholders:** every code step shows full code.
- **Build-order caveat (called out in Task 1):** implement Task 3 before running `tsc` so the `PaymentMethod` type import resolves; the Task 1 Jest test passes independently.

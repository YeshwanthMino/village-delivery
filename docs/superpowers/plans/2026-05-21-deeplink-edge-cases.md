# Deeplink Edge Case Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all Critical and Medium deeplink edge cases: deferred deeplink on first launch, stranded blank screens on invalid route params, stack routes bypassing onboarding, and silent empty results on invalid search categoryId.

**Architecture:** AppScreen becomes the single source of truth for first-launch detection (removing the duplicate check in the dashboard layout). Deferred deeplink is captured via `Linking.getInitialURL()` before the onboarding redirect and consumed in `language.tsx` after the user selects a language. Error states replace silent `return null` guards in OrderDetailScreen and CategoryDetailsScreen. `useSearchViewModel` validates categoryId against the known CATEGORIES array on mount.

**Tech Stack:** Expo Router v6, expo-linking ~55, StoredPrefs (existing async storage abstraction with `getDeferredDeepLink`/`setDeferredDeepLink` already implemented), React Native, NativeWind (Tailwind), TypeScript

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `src/features/initialization/views/screens/AppScreen/AppScreen.tsx` | First-launch guard for all routes + deferred deeplink capture |
| Modify | `app/(dashboard)/_layout.tsx` | Remove now-redundant first-launch redirect |
| Modify | `app/onboarding/language.tsx` | Resume deferred deeplink after onboarding completes |
| Modify | `src/features/orders/views/OrderDetailScreen.tsx` | Error state for missing/invalid orderId |
| Modify | `src/features/home/views/category-details/CategoryDetailsScreen.tsx` | Error state for missing/invalid categoryId |
| Modify | `src/features/home/viewmodel/search/useSearchViewModel.ts` | Validate categoryId against CATEGORIES on mount |

---

### Task 1: Consolidate first-launch guard into AppScreen + capture deferred deeplink

**Files:**
- Modify: `src/features/initialization/views/screens/AppScreen/AppScreen.tsx`
- Modify: `app/(dashboard)/_layout.tsx`

The first-launch redirect currently lives in `(dashboard)/_layout.tsx`, so stack routes outside the dashboard group (`/cart`, `/top-picks`, `/order-detail`, etc.) bypass it on fresh install. Moving the check to `AppScreen` applies it to every route. During the same init pass, if the app was opened via a deeplink on first launch, capture it with `Linking.getInitialURL()` and persist it via `StoredPrefs.setDeferredDeepLink()`.

- [ ] **Step 1: Replace AppScreen.tsx**

```tsx
import { useAuthStore } from '@/src/core/store';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';

export const AppScreen = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const checkExistingAuth = useAuthStore((state) => state.checkExistingAuth);

  const [fontsLoaded] = useFonts({
    'EuclidCircularA-Regular': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Regular.ttf'),
    'EuclidCircularA-Medium': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Medium.ttf'),
    'EuclidCircularA-SemiBold': require('../../../../../../assets/fonts/fonts/EuclidCircularA-SemiBold.ttf'),
    'EuclidCircularA-Bold': require('../../../../../../assets/fonts/fonts/EuclidCircularA-Bold.ttf'),
  });

  useEffect(() => {
    const init = async () => {
      await checkExistingAuth();
      const firstLaunch = await StoredPrefs.getIsFirstLaunch();
      if (firstLaunch) {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl?.startsWith('villagedelivery://')) {
          await StoredPrefs.setDeferredDeepLink(initialUrl);
        }
      }
      setIsFirstLaunch(firstLaunch);
      setReady(true);
    };
    init();
  }, [checkExistingAuth]);

  useEffect(() => {
    if (!fontsLoaded || !ready) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (isFirstLaunch && !inOnboarding) {
      router.replace('/onboarding/language');
      return;
    }

    if (!isFirstLaunch) {
      const inDashboard = segments[0] === '(dashboard)';
      const inAuth = segments[0] === 'auth';
      const inSearch = segments[0] === 'search';
      const inCategoryDetails = segments[0] === 'category-details';
      const inCart = segments[0] === 'cart';
      const inTopPicks = segments[0] === 'top-picks';
      const inOrderDetail = segments[0] === 'order-detail';
      if (!inDashboard && !inAuth && !inSearch && !inOnboarding && !inCategoryDetails && !inCart && !inTopPicks && !inOrderDetail) {
        router.replace('/(dashboard)/home');
      }
    }
  }, [fontsLoaded, ready, isFirstLaunch, segments, router]);

  if (!fontsLoaded || !ready) return null;

  return <>{children}</>;
};
```

- [ ] **Step 2: Replace `(dashboard)/_layout.tsx`**

Remove `firstLaunch` state, its `useEffect`, `StoredPrefs` import, `Redirect` import, and the two conditional returns. The layout becomes a pure Tabs renderer:

```tsx
import { LayoutGrid, Home, ClipboardList, User } from 'lucide-react-native';
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/src/core/utils/useTranslation';

const TAB_BAR_CONTENT_HEIGHT = 64;

export default function DashboardLayout() {
  const { bottom } = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + bottom;
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#28ae61',
        tabBarInactiveTintColor: '#8c8c8c',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          height: tabBarHeight,
          paddingBottom: bottom > 0 ? bottom : 8,
          paddingTop: 8,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'EuclidCircularA-Medium',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('nav_home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: t('nav_categories'),
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('nav_orders'),
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav_profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/initialization/views/screens/AppScreen/AppScreen.tsx "app/(dashboard)/_layout.tsx"
git commit -m "feat: move first-launch guard to AppScreen, capture deferred deeplink on cold launch"
```

---

### Task 2: Resume deferred deeplink after onboarding

**Files:**
- Modify: `app/onboarding/language.tsx`

After the user selects a language and taps Continue, read the stored deferred deeplink. If one exists, parse the hostname to determine the Expo Router path and navigate there instead of `/(dashboard)/home`. Clear the stored value so it does not persist across future launches.

`Linking.parse('villagedelivery://order-detail?orderId=123')` returns `{ hostname: 'order-detail', queryParams: { orderId: '123' } }`. Tab screens need the `/(dashboard)/` prefix when navigating programmatically — the `DEEPLINK_ROUTE_MAP` below handles that mapping.

- [ ] **Step 1: Add `expo-linking` import to `language.tsx`**

Add alongside the existing imports:
```tsx
import * as Linking from 'expo-linking';
```

- [ ] **Step 2: Replace `handleContinue` in `language.tsx`**

The route map and updated function replace only the `handleContinue` declaration — all other code in the file is unchanged:

```tsx
const DEEPLINK_ROUTE_MAP: Record<string, string> = {
  home:               '/(dashboard)/home',
  categories:         '/(dashboard)/categories',
  orders:             '/(dashboard)/orders',
  profile:            '/(dashboard)/profile',
  search:             '/search',
  'category-details': '/category-details',
  cart:               '/cart',
  'top-picks':        '/top-picks',
  'order-detail':     '/order-detail',
};

const handleContinue = async () => {
  if (loading) return;
  setLoading(true);
  await setLocale(selected);
  await StoredPrefs.setIsFirstLaunch(false);

  const deferred = await StoredPrefs.getDeferredDeepLink();
  if (deferred) {
    await StoredPrefs.setDeferredDeepLink(null);
    const parsed = Linking.parse(deferred);
    const pathname = DEEPLINK_ROUTE_MAP[parsed.hostname ?? ''] ?? '/(dashboard)/home';
    const params = (parsed.queryParams as Record<string, string>) ?? {};
    router.replace({ pathname: pathname as any, params });
  } else {
    router.replace('/(dashboard)/home');
  }
};
```

- [ ] **Step 3: Manual verification**

Run in iOS Simulator (requires first-launch state — uninstall or clear app data first):

```bash
npx expo start --ios
# In a second terminal, before completing onboarding:
xcrun simctl openurl booted "villagedelivery://category-details?categoryId=fruits"
```

Expected: app opens to language selection screen. After tapping Continue, navigates directly to Fruits category detail — not to home.

Also verify normal flow (no deeplink on first launch) still lands on home after language selection.

- [ ] **Step 4: Commit**

```bash
git add app/onboarding/language.tsx
git commit -m "feat: resume deferred deeplink after onboarding language selection"
```

---

### Task 3: Error state for order-detail with missing or invalid orderId

**Files:**
- Modify: `src/features/orders/views/OrderDetailScreen.tsx`

Currently the screen calls `router.back()` from a `useEffect` when `order` is not found, producing a blank flash and abrupt navigation. On a cold deeplink there is no back stack to return to. Replace with an explicit error state with a safe exit to the orders tab.

- [ ] **Step 1: Remove the `useEffect` guard and update the destructure**

Find and remove this block entirely:
```tsx
useEffect(() => {
  if (orderId && !order) {
    router.back();
  }
}, [orderId, order, router]);
```

Also update the viewmodel destructure — `orderId` is no longer used:
```tsx
// Before:
const { orderId, order, handleReorder } = useOrderDetailViewModel();

// After:
const { order, handleReorder } = useOrderDetailViewModel();
```

- [ ] **Step 2: Replace `if (!order) return null` with the error state**

Find:
```tsx
if (!order) return null;
```

Replace with:
```tsx
if (!order) {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      <View className="px-4" style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}>
        <Pressable
          onPress={() => router.replace('/(dashboard)/orders' as any)}
          className="p-1 self-start"
        >
          <ArrowLeft size={22} color="#0f172a" />
        </Pressable>
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-4xl mb-4">📦</Text>
        <Text className="text-slate-900 font-bold text-lg mb-2 text-center">Order not found</Text>
        <Text className="text-slate-500 text-sm text-center mb-6">
          This order doesn't exist or may have been removed.
        </Text>
        <Pressable
          onPress={() => router.replace('/(dashboard)/orders' as any)}
          className="bg-green-500 rounded-2xl px-8 py-3"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Text className="text-white font-bold text-base">View all orders</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
```

All imports (`SafeAreaView`, `View`, `Text`, `Pressable`, `ArrowLeft`, `insets`, `router`) are already present in the file — no new imports needed.

- [ ] **Step 3: Manual verification**

```bash
# Missing orderId
xcrun simctl openurl booted "villagedelivery://order-detail"

# Invalid orderId
xcrun simctl openurl booted "villagedelivery://order-detail?orderId=nonexistent-999"
```

Both should show "Order not found" with a back arrow and "View all orders" button. No blank flash. Tapping either navigates to the orders tab.

- [ ] **Step 4: Commit**

```bash
git add src/features/orders/views/OrderDetailScreen.tsx
git commit -m "fix: error state instead of blank bounce on invalid order-detail deeplink"
```

---

### Task 4: Error state for category-details with missing or invalid categoryId

**Files:**
- Modify: `src/features/home/views/category-details/CategoryDetailsScreen.tsx`

`CategoryDetailsScreen` returns `null` when `currentCategory` or `heroGradient` is null. This is a blank screen with no back button — the user is stranded. Replace with an error state.

- [ ] **Step 1: Replace the `return null` guard**

Find:
```tsx
if (!vm.currentCategory || !vm.heroGradient) {
  return null;
}
```

Replace with:
```tsx
if (!vm.currentCategory || !vm.heroGradient) {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      <View className="px-4" style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}>
        <TouchableOpacity
          onPress={() => router.replace('/(dashboard)/categories' as any)}
          className="p-1 self-start"
        >
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-4xl mb-4">🔍</Text>
        <Text className="text-slate-900 font-bold text-lg mb-2 text-center">Category not found</Text>
        <Text className="text-slate-500 text-sm text-center mb-6">
          This category doesn't exist or may have been removed.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(dashboard)/categories' as any)}
          className="bg-green-500 rounded-2xl px-8 py-3"
        >
          <Text className="text-white font-bold text-base">Browse categories</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

All imports (`SafeAreaView`, `View`, `Text`, `TouchableOpacity`, `ArrowLeft`, `insets`, `router`) are already present — no new imports needed.

- [ ] **Step 2: Manual verification**

```bash
# Missing categoryId
xcrun simctl openurl booted "villagedelivery://category-details"

# Invalid categoryId
xcrun simctl openurl booted "villagedelivery://category-details?categoryId=notreal"
```

Both should show "Category not found" with a back arrow and "Browse categories" button. No blank screen. Tapping either navigates to the categories tab.

- [ ] **Step 3: Commit**

```bash
git add src/features/home/views/category-details/CategoryDetailsScreen.tsx
git commit -m "fix: error state instead of blank screen on invalid category-details deeplink"
```

---

### Task 5: Validate categoryId in useSearchViewModel

**Files:**
- Modify: `src/features/home/viewmodel/search/useSearchViewModel.ts`

When `villagedelivery://search?categoryId=invalid` opens, `activeCategoryId` is set to the invalid value. The category chip renders but every product is filtered out — silent empty results. Fix by validating `categoryId` against `CATEGORIES` on mount and falling back to `null` (global search) if invalid.

- [ ] **Step 1: Add CATEGORIES to the import**

Find the existing import:
```ts
import { ALL_PRODUCTS } from '@/src/features/home/data/static/villageData';
```

Replace with:
```ts
import { ALL_PRODUCTS, CATEGORIES } from '@/src/features/home/data/static/villageData';
```

- [ ] **Step 2: Validate categoryId before initialising state**

Find:
```ts
const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
  params.categoryId ?? null
);
```

Replace with:
```ts
const isValidCategory = params.categoryId
  ? CATEGORIES.some(c => c.id === params.categoryId)
  : false;

const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
  isValidCategory ? (params.categoryId ?? null) : null
);
```

- [ ] **Step 3: Manual verification**

```bash
# Valid — should show Dairy chip + all dairy products when a query matches
xcrun simctl openurl booted "villagedelivery://search?categoryId=dairy&categoryName=Dairy"

# Invalid — should show global search, no chip, 'start typing' placeholder
xcrun simctl openurl booted "villagedelivery://search?categoryId=invalid&categoryName=Fake"
```

For the invalid case: the category chip must NOT appear. The screen shows "Start typing to search" instead of an empty chip with no results.

- [ ] **Step 4: Commit**

```bash
git add src/features/home/viewmodel/search/useSearchViewModel.ts
git commit -m "fix: validate categoryId against CATEGORIES in search, fall back to global if invalid"
```

# Product Detail Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a scrollable product detail screen backed by `GET /app/product/:id`, with a fixed "Add to cart" bar pinned to the bottom, opened by tapping any product card.

**Architecture:** New `src/features/product/` feature folder following the app's MVVM layout (data → query → viewmodel → views). A pure mapper converts the raw API payload into a `ProductDetail` view-model; a React Query hook fetches it; the screen renders a fixed header, a scrollable body (image carousel, title, price, description, similar products), and a fixed bottom cart bar. Tapping the body of the existing `DynamicProductCard` navigates to the new route.

**Tech Stack:** Expo Router, React Query (`@tanstack/react-query`), Zustand cart store, NativeWind (Tailwind classNames), `expo-image`, `lucide-react-native`, Jest (`jest-expo` preset).

---

## File Structure

New:
- `src/features/product/data/productDetail.types.ts` — `ProductDetail` view-model type.
- `src/features/product/data/productDetailApi.ts` — `mapProductDetail` (pure) + `getProductDetail` (fetch).
- `src/features/product/data/__tests__/productDetailApi.test.ts` — mapper unit tests.
- `src/features/product/data/queries/useProductDetailQuery.ts` — React Query hook.
- `src/features/product/viewmodel/useProductDetailViewModel.ts` — route param + query + cart wiring.
- `src/features/product/views/components/ProductImageCarousel.tsx` — image pager + dots + discount badge.
- `src/features/product/views/components/ProductCartBar.tsx` — fixed bottom bar (add / stepper + view cart).
- `src/features/product/views/ProductDetailScreen.tsx` — screen composition + states.
- `app/product.tsx` — route entry.

Modified:
- `src/base/query/queryKeys.ts` — add `products.detail`.
- `app/_layout.tsx` — register `<Stack.Screen name="product" />`.
- `src/features/home/views/home/components/DynamicProductCard.tsx` — tap-to-open navigation.

---

## Task 1: `ProductDetail` type + pure mapper (TDD)

**Files:**
- Create: `src/features/product/data/productDetail.types.ts`
- Create: `src/features/product/data/productDetailApi.ts`
- Test: `src/features/product/data/__tests__/productDetailApi.test.ts`

- [ ] **Step 1: Create the view-model type**

`src/features/product/data/productDetail.types.ts`:
```ts
// src/features/product/data/productDetail.types.ts
//
// View-model for the product detail page (GET /app/product/:id). Raw API
// objects are mapped into this by productDetailApi so the UI never touches
// backend field shapes directly.

import { HomeProduct } from '@/src/features/home/data/homeLayout.types';

export interface ProductDetail {
  id: string;
  title: string;
  teluguTitle?: string;
  description: string;
  image: string;          // landingImage || images[0]
  images: string[];       // images[], falling back to [image] when empty
  mrp: number;
  price: number;          // dealPrice ?? listPrice ?? mrp
  discountPct: number;    // 0 when no discount
  categoryTitle?: string; // categoryId.title
  similarProducts: HomeProduct[];
}
```

- [ ] **Step 2: Write the failing test**

`src/features/product/data/__tests__/productDetailApi.test.ts`:
```ts
// src/features/product/data/__tests__/productDetailApi.test.ts
import { mapProductDetail } from '../productDetailApi';

const RAW = {
  _id: '69f2c9520469cfb86fcdd71a',
  title: 'Natu Kodi gudlu',
  description: '',
  mrp: 25,
  listPrice: 20,
  dealPrice: 20,
  landingImage: 'https://img/land.png',
  images: ['https://img/land.png'],
  categoryId: { _id: 'c1', title: 'Dairy & Eggs', path: '_Dairy-&-Eggs' },
  similarProducts: [],
};

describe('mapProductDetail', () => {
  it('maps core fields and computes discount from mrp vs price', () => {
    const d = mapProductDetail(RAW);
    expect(d.id).toBe('69f2c9520469cfb86fcdd71a');
    expect(d.title).toBe('Natu Kodi gudlu');
    expect(d.price).toBe(20);
    expect(d.mrp).toBe(25);
    expect(d.discountPct).toBe(20); // (25-20)/25 = 20%
    expect(d.categoryTitle).toBe('Dairy & Eggs');
  });

  it('falls back images to [landingImage] when images is empty', () => {
    const d = mapProductDetail({ ...RAW, images: [] });
    expect(d.images).toEqual(['https://img/land.png']);
  });

  it('prefers dealPrice, then listPrice, then mrp for price', () => {
    expect(mapProductDetail({ ...RAW, dealPrice: undefined }).price).toBe(20); // listPrice
    expect(mapProductDetail({ ...RAW, dealPrice: undefined, listPrice: undefined }).price).toBe(25); // mrp
  });

  it('maps active similar products via mapProduct, dropping inactive ones', () => {
    const d = mapProductDetail({
      ...RAW,
      similarProducts: [
        { _id: 's1', title: 'Sim A', active: true, mrp: 10, dealPrice: 8, landingImage: 'a.png' },
        { _id: 's2', title: 'Sim B', active: false, mrp: 10, dealPrice: 8, landingImage: 'b.png' },
      ],
    });
    expect(d.similarProducts).toHaveLength(1);
    expect(d.similarProducts[0].id).toBe('s1');
  });

  it('defaults discountPct to 0 when there is no discount', () => {
    const d = mapProductDetail({ ...RAW, mrp: 20, listPrice: 20, dealPrice: 20 });
    expect(d.discountPct).toBe(0);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest src/features/product/data/__tests__/productDetailApi.test.ts`
Expected: FAIL — `Cannot find module '../productDetailApi'`.

- [ ] **Step 4: Implement the pure mapper (fetch added in Task 2)**

`src/features/product/data/productDetailApi.ts`:
```ts
// src/features/product/data/productDetailApi.ts
//
// Product detail via GET /app/product/:id, keyed by the x-store-id header.
// mapProductDetail is a pure transform (unit-tested); getProductDetail wraps
// it with the network call.

import { mapProduct, isProductActive } from '@/src/features/home/data/homeLayoutMapper';
import { ProductDetail } from './productDetail.types';

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function mapProductDetail(p: any): ProductDetail {
  const mrp = num(p?.mrp);
  const price = num(p?.dealPrice ?? p?.listPrice ?? p?.mrp);
  const discountPct = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const image = p?.landingImage || (Array.isArray(p?.images) ? p.images[0] : undefined) || '';
  const imagesRaw = Array.isArray(p?.images) ? p.images.filter(Boolean) : [];
  const images = imagesRaw.length > 0 ? imagesRaw : image ? [image] : [];
  const similarRaw = Array.isArray(p?.similarProducts) ? p.similarProducts : [];

  return {
    id: String(p?._id ?? ''),
    title: String(p?.title ?? ''),
    teluguTitle: p?.teluguTitle || undefined,
    description: String(p?.description ?? ''),
    image,
    images,
    mrp,
    price,
    discountPct,
    categoryTitle: p?.categoryId?.title || undefined,
    similarProducts: similarRaw.filter(isProductActive).map(mapProduct),
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/features/product/data/__tests__/productDetailApi.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/product/data/productDetail.types.ts src/features/product/data/productDetailApi.ts src/features/product/data/__tests__/productDetailApi.test.ts
git commit -m "feat(product): ProductDetail type + mapProductDetail mapper"
```

---

## Task 2: `getProductDetail` fetch

**Files:**
- Modify: `src/features/product/data/productDetailApi.ts`

- [ ] **Step 1: Add imports at the top of the file**

Add to the existing imports in `src/features/product/data/productDetailApi.ts`:
```ts
import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';
```

- [ ] **Step 2: Append the fetch function**

At the end of `src/features/product/data/productDetailApi.ts`:
```ts
export async function getProductDetail(storeId: string, id: string): Promise<ProductDetail> {
  const data = await apiClient.get<any>(
    `${WebService.villageBaseURL}/app/product/${id}`,
    { headers: { Accept: '*/*', 'x-store-id': storeId } },
  );
  return mapProductDetail(data);
}
```

- [ ] **Step 3: Verify the mapper tests still pass and types compile**

Run: `npx jest src/features/product/data/__tests__/productDetailApi.test.ts && npx tsc --noEmit`
Expected: tests PASS; `tsc` reports no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/product/data/productDetailApi.ts
git commit -m "feat(product): getProductDetail fetch via /app/product/:id"
```

---

## Task 3: `products.detail` query key + `useProductDetailQuery`

**Files:**
- Modify: `src/base/query/queryKeys.ts`
- Create: `src/features/product/data/queries/useProductDetailQuery.ts`

- [ ] **Step 1: Add the detail key**

In `src/base/query/queryKeys.ts`, inside the `products` object, add after the `search` line:
```ts
    detail: (id: string) => [...queryKeys.products.list(), 'detail', { id }] as const,
```

- [ ] **Step 2: Create the query hook**

`src/features/product/data/queries/useProductDetailQuery.ts`:
```ts
// src/features/product/data/queries/useProductDetailQuery.ts

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { getProductDetail } from '../productDetailApi';

export const useProductDetailQuery = (id?: string) => {
  const storeId = useLocationStore((s) => s.serviceableVillage?.storeId);

  return useQuery({
    queryKey: [...queryKeys.products.detail(id ?? ''), { storeId }],
    queryFn: () => getProductDetail(storeId!, id!),
    enabled: !!id && !!storeId,
    staleTime: 5 * 60 * 1000,
  });
};
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/base/query/queryKeys.ts src/features/product/data/queries/useProductDetailQuery.ts
git commit -m "feat(product): useProductDetailQuery + products.detail key"
```

---

## Task 4: `useProductDetailViewModel`

**Files:**
- Create: `src/features/product/viewmodel/useProductDetailViewModel.ts`

- [ ] **Step 1: Create the view-model hook**

`src/features/product/viewmodel/useProductDetailViewModel.ts`:
```ts
// src/features/product/viewmodel/useProductDetailViewModel.ts

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { useProductDetailQuery } from '../data/queries/useProductDetailQuery';
import { ProductDetail } from '../data/productDetail.types';

export function useProductDetailViewModel() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const query = useProductDetailQuery(id);
  const detail = query.data;

  const cart = useVillageStore((s) => s.cart);
  const addToCart = useVillageStore((s) => s.addToCart);
  const decFromCart = useVillageStore((s) => s.decFromCart);

  const count = detail ? cart[detail.id] ?? 0 : 0;

  // API prices are real rupees; the cart pipeline works in "units" (display ×20).
  const onAdd = () => {
    if (!detail) return;
    addToCart(detail.id, {
      key: detail.id,
      productId: detail.id,
      variantIndex: null,
      name: detail.title,
      nameTE: detail.teluguTitle,
      weight: '',
      price: detail.price / 20,
      mrp: detail.mrp / 20,
      imageUrl: detail.image,
    });
  };

  const onDec = () => {
    if (detail) decFromCart(detail.id);
  };

  return {
    detail: detail as ProductDetail | undefined,
    loading: query.isLoading,
    error: query.isError,
    refetch: query.refetch,
    count,
    onAdd,
    onDec,
    onViewCart: () => router.push('/cart' as any),
    onBack: () => router.back(),
    onSearch: () => router.push('/search' as any),
  };
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/product/viewmodel/useProductDetailViewModel.ts
git commit -m "feat(product): useProductDetailViewModel"
```

---

## Task 5: `ProductImageCarousel` component

**Files:**
- Create: `src/features/product/views/components/ProductImageCarousel.tsx`

- [ ] **Step 1: Create the carousel**

`src/features/product/views/components/ProductImageCarousel.tsx`:
```tsx
// src/features/product/views/components/ProductImageCarousel.tsx

import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, View } from 'react-native';

interface Props {
  images: string[];
  discountPct: number;
}

const { width: SCREEN_W } = Dimensions.get('window');

export const ProductImageCarousel = ({ images, discountPct }: Props) => {
  const [page, setPage] = useState(0);
  const pics = images.length > 0 ? images : [''];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (next !== page) setPage(next);
  };

  return (
    <View className="bg-white">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {pics.map((uri, i) => (
          <Image
            key={`${uri}-${i}`}
            source={{ uri }}
            style={{ width: SCREEN_W, aspectRatio: 1, backgroundColor: '#f8fafc' }}
            contentFit="contain"
            transition={150}
          />
        ))}
      </ScrollView>

      {discountPct > 0 ? (
        <View className="absolute top-3 left-3 bg-green-600 rounded-md px-2 py-1">
          <Text className="text-white text-xs font-extrabold">{discountPct}% OFF</Text>
        </View>
      ) : null}

      {pics.length > 1 ? (
        <View className="flex-row items-center justify-center gap-1.5 py-3">
          {pics.map((_, i) => (
            <View
              key={i}
              className={`h-1.5 rounded-full ${i === page ? 'w-4 bg-green-600' : 'w-1.5 bg-slate-300'}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/product/views/components/ProductImageCarousel.tsx
git commit -m "feat(product): ProductImageCarousel component"
```

---

## Task 6: `ProductCartBar` component

**Files:**
- Create: `src/features/product/views/components/ProductCartBar.tsx`

- [ ] **Step 1: Create the bottom bar**

`src/features/product/views/components/ProductCartBar.tsx`:
```tsx
// src/features/product/views/components/ProductCartBar.tsx

import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/src/core/utils/useTranslation';

interface Props {
  count: number;
  onAdd: () => void;
  onDec: () => void;
  onViewCart: () => void;
}

export const ProductCartBar = ({ count, onAdd, onDec, onViewCart }: Props) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View
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
            <TouchableOpacity onPress={onAdd} hitSlop={8}>
              <Plus size={20} color="#ffffff" />
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

- [ ] **Step 2: Add the translation keys**

`src/base/constants/translations.ts` exports a single `TRANSLATIONS` map of the
shape `Record<string, { te: string; en: string }>` with snake_case keys (e.g.
`add`, `see_all`). Add two entries inside the `TRANSLATIONS` object (place them
near the existing `add` / `added` keys):
```ts
  add_to_cart:      { te: 'కార్ట్‌లో చేర్చండి', en: 'Add to cart' },
  view_cart:        { te: 'కార్ట్ చూడండి',       en: 'View cart' },
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors (the `t('add_to_cart')` / `t('view_cart')` keys now resolve at runtime via the `TRANSLATIONS` map).

- [ ] **Step 4: Commit**

```bash
git add src/features/product/views/components/ProductCartBar.tsx src/base/constants/translations.ts
git commit -m "feat(product): ProductCartBar with add / stepper + view cart + i18n keys"
```

---

## Task 7: `ProductDetailScreen`

**Files:**
- Create: `src/features/product/views/ProductDetailScreen.tsx`

- [ ] **Step 1: Create the screen**

`src/features/product/views/ProductDetailScreen.tsx`:
```tsx
// src/features/product/views/ProductDetailScreen.tsx

import { ArrowLeft, Search } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DynamicProductCard } from '@/src/features/home/views/home/components/DynamicProductCard';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useProductDetailViewModel } from '../viewmodel/useProductDetailViewModel';
import { ProductImageCarousel } from './components/ProductImageCarousel';
import { ProductCartBar } from './components/ProductCartBar';

export const ProductDetailScreen = () => {
  const vm = useProductDetailViewModel();
  const insets = useSafeAreaInsets();
  const { locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;

  const header = (
    <View className="bg-white border-b border-slate-100" style={{ paddingTop: insets.top + 8 }}>
      <View className="px-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity onPress={vm.onBack} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <TouchableOpacity onPress={vm.onSearch} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
          <Search size={18} color="#334155" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (vm.loading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#16a34a" />
        </View>
      </SafeAreaView>
    );
  }

  if (vm.error || !vm.detail) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
        {header}
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-slate-500 text-center mb-4">Couldn't load this product.</Text>
          <TouchableOpacity onPress={() => vm.refetch()} className="border-2 border-green-600 rounded-xl px-6 py-3">
            <Text className="text-green-700 font-bold">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const d = vm.detail;
  const displayTitle = locale === 'te' && d.teluguTitle ? d.teluguTitle : d.title;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
      {header}

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <ProductImageCarousel images={d.images} discountPct={d.discountPct} />

        <View className="px-4 pt-4">
          {d.categoryTitle ? (
            <Text className="text-slate-400 text-xs font-semibold uppercase">{d.categoryTitle}</Text>
          ) : null}

          <Text className="text-slate-900 text-xl font-bold mt-1" style={teFont}>
            {displayTitle}
          </Text>

          <View className="flex-row items-baseline gap-2 flex-wrap mt-3">
            <Text className="text-slate-900 font-extrabold text-2xl">₹{Math.round(d.price)}</Text>
            {d.mrp > d.price ? (
              <Text className="text-slate-400 text-base line-through">₹{Math.round(d.mrp)}</Text>
            ) : null}
            {d.discountPct > 0 ? (
              <Text className="text-green-700 font-bold text-base">{d.discountPct}% Off</Text>
            ) : null}
          </View>
          <Text className="text-slate-400 text-xs mt-0.5">MRP (inclusive of all taxes)</Text>

          {d.description.trim().length > 0 ? (
            <View className="mt-5">
              <Text className="text-slate-900 font-bold text-base mb-1">Description</Text>
              <Text className="text-slate-600 text-sm leading-5">{d.description}</Text>
            </View>
          ) : null}
        </View>

        {d.similarProducts.length > 0 ? (
          <View className="mt-6">
            <Text className="text-slate-900 font-bold text-base px-4 mb-3">You might also like</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {d.similarProducts.map((p) => (
                <DynamicProductCard key={p.id} product={p} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      <ProductCartBar count={vm.count} onAdd={vm.onAdd} onDec={vm.onDec} onViewCart={vm.onViewCart} />
    </SafeAreaView>
  );
};
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/product/views/ProductDetailScreen.tsx
git commit -m "feat(product): ProductDetailScreen"
```

---

## Task 8: Route entry + registration

**Files:**
- Create: `app/product.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Create the route file**

`app/product.tsx`:
```tsx
import { ProductDetailScreen } from '@/src/features/product/views/ProductDetailScreen';

export default function ProductRoute() {
  return <ProductDetailScreen />;
}
```

- [ ] **Step 2: Register the screen**

In `app/_layout.tsx`, add alongside the other `<Stack.Screen>` entries (e.g. right after the `category-details` line):
```tsx
              <Stack.Screen name="product" />
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/product.tsx app/_layout.tsx
git commit -m "feat(product): register /product route"
```

---

## Task 9: Wire tap-to-open on `DynamicProductCard`

**Files:**
- Modify: `src/features/home/views/home/components/DynamicProductCard.tsx`

- [ ] **Step 1: Add the router import**

At the top of `src/features/home/views/home/components/DynamicProductCard.tsx`, add:
```tsx
import { useRouter } from 'expo-router';
```

- [ ] **Step 2: Get the router inside the component**

In the `DynamicProductCard` component body, alongside the other hooks (e.g. after `const { locale } = useTranslation();`), add:
```tsx
  const router = useRouter();
  const openDetail = () => router.push({ pathname: '/product', params: { id: product.id } } as any);
```

- [ ] **Step 3: Wrap the image block in a touchable**

The current image block is:
```tsx
      <View style={{ position: 'relative' }}>
        <Image
```
Change the opening `<View style={{ position: 'relative' }}>` to a `TouchableOpacity` and close it accordingly. Replace the opening tag with:
```tsx
      <TouchableOpacity activeOpacity={0.9} onPress={openDetail} style={{ position: 'relative' }}>
```
and change its matching closing `</View>` (the one immediately before the `<View className="p-2.5">` body block) to `</TouchableOpacity>`.

- [ ] **Step 4: Make the title tappable too**

Wrap the title `<Text>` in a touchable. Replace:
```tsx
        <Text
          className="text-slate-800 text-sm font-semibold"
          numberOfLines={2}
          style={[{ minHeight: 36 }, teFont]}
        >
          {displayTitle}
        </Text>
```
with:
```tsx
        <TouchableOpacity activeOpacity={0.9} onPress={openDetail}>
          <Text
            className="text-slate-800 text-sm font-semibold"
            numberOfLines={2}
            style={[{ minHeight: 36 }, teFont]}
          >
            {displayTitle}
          </Text>
        </TouchableOpacity>
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run: `npm start` and open the app. From the home screen, tap a product image or title → the detail screen opens, the page scrolls, and the "Add to cart" bar stays pinned at the bottom. Tapping the card's ADD button/stepper still adds without navigating. Add an item → bar shows the stepper + "View cart"; "View cart" opens the cart.

- [ ] **Step 7: Commit**

```bash
git add src/features/home/views/home/components/DynamicProductCard.tsx
git commit -m "feat(product): open detail screen on product card tap"
```

---

## Final verification

- [ ] Run the full test suite: `npx jest` — Expected: all green (including the new mapper tests).
- [ ] Run typecheck: `npx tsc --noEmit` — Expected: no errors.
- [ ] Run lint: `npm run lint` — Expected: no new errors in the touched files.

---

## Self-Review notes

- **Spec coverage:** route + registration (Task 8); data layer / mapper / query (Tasks 1–3); viewmodel (Task 4); carousel, cart bar, screen (Tasks 5–7); tap-to-open on all surfaces via `DynamicProductCard` (Task 9). All spec sections covered.
- **Type consistency:** `ProductDetail` fields defined in Task 1 are the exact fields read in Tasks 4 and 7 (`id, title, teluguTitle, description, image, images, mrp, price, discountPct, categoryTitle, similarProducts`). `mapProductDetail` / `getProductDetail` names are consistent across Tasks 1, 2, 3. `products.detail(id)` defined in Task 3 and used only there.
- **Out of scope (per spec):** rating, Net Qty, ETA badge, tags, variants, brand — intentionally not implemented.

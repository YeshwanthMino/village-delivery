# Product & Category Visibility Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide inactive categories everywhere, and make the product detail page respect stock (disabled "Out of Stock" bar) and `active` (an "unavailable" state) — inactive products and out-of-stock card behavior are already implemented.

**Architecture:** Filter inactive categories at the single mapper chokepoint (`homeLayoutMapper`), mirroring the existing `isProductActive` pattern, so Home, Categories, and Category Details all inherit it. Extend the product-detail mapper with `inStock`/`active` fields and consume them in `ProductCartBar` and `ProductDetailScreen`.

**Tech Stack:** Expo / React Native, TypeScript, NativeWind (Tailwind classes), Jest, TanStack Query.

## Global Constraints

- Active convention is `value?.active !== false` — a missing `active` flag means active. Copy this verbatim; never write `=== true`.
- Stock convention matches the list APIs: absent `stock` means in-stock — `p?.stock === undefined ? true : num(p?.stock) > 0`.
- There is no "Buy Now" control in the app; do not add one.
- Follow existing file patterns: pure mappers stay unit-tested; UI changes are verified via `npx tsc --noEmit` and the Jest suite (the repo has no component tests).
- Run a single test file with `npx jest <path>` from `village-delivery/`.

---

### Task 1: Filter inactive categories in `homeLayoutMapper`

**Files:**
- Modify: `src/features/home/data/homeLayoutMapper.ts` (add `isCategoryActive`; filter in `mapCategory`; guard in `mapHomeLayout`)
- Test: `src/features/home/data/__tests__/homeLayoutMapper.test.ts`

**Interfaces:**
- Consumes: existing `mapHomeLayout(raw: any): HomeLayout`, `CategorySection { kind:'category'; id; title; hideTitle; items: CategoryItem[] }`.
- Produces: `isCategoryActive(c: any): boolean`. `mapCategory` now drops inactive `menuItems`; `mapHomeLayout` skips a `FeaturedMenu` whose menu document is inactive.

- [ ] **Step 1: Write the failing tests**

Append to `src/features/home/data/__tests__/homeLayoutMapper.test.ts`. Add `isCategoryActive` to the existing import on line 2 so it reads:

```typescript
import { isCategoryActive, isProductActive, mapHomeLayout } from '../homeLayoutMapper';
```

Then append these blocks at the end of the file:

```typescript
describe('isCategoryActive', () => {
  it('treats active:false as inactive', () => {
    expect(isCategoryActive({ active: false })).toBe(false);
  });
  it('treats missing or true active as active', () => {
    expect(isCategoryActive({})).toBe(true);
    expect(isCategoryActive({ active: true })).toBe(true);
  });
});

describe('mapHomeLayout category filtering', () => {
  it('drops inactive menu items from a category section', () => {
    const raw = {
      _id: 'l1',
      featuredMenus: [
        {
          _id: 'm1',
          title: 'Shop by category',
          menuItems: [
            { docId: 'c-a', title: 'Active Cat', active: true, imageUrl: 'a.png' },
            { docId: 'c-b', title: 'Inactive Cat', active: false, imageUrl: 'b.png' },
          ],
        },
      ],
      components: [{ collection: 'FeaturedMenu', component: 'm1' }],
    };
    const layout = mapHomeLayout(raw);
    const section = layout.sections.find((sec) => sec.kind === 'category') as any;
    expect(section.items.map((i: any) => i.id)).toEqual(['c-a']);
  });

  it('drops a whole category section when the menu is inactive', () => {
    const raw = {
      _id: 'l1',
      featuredMenus: [
        {
          _id: 'm1',
          title: 'Hidden menu',
          active: false,
          menuItems: [{ docId: 'c-a', title: 'Active Cat', active: true, imageUrl: 'a.png' }],
        },
      ],
      components: [{ collection: 'FeaturedMenu', component: 'm1' }],
    };
    const layout = mapHomeLayout(raw);
    expect(layout.sections.find((sec) => sec.kind === 'category')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/home/data/__tests__/homeLayoutMapper.test.ts`
Expected: FAIL — `isCategoryActive` is `undefined` / not exported (import error), and the new assertions do not pass.

- [ ] **Step 3: Add `isCategoryActive` and apply it in the mapper**

In `src/features/home/data/homeLayoutMapper.ts`, add the helper directly below the existing `isProductActive` function (after its closing brace):

```typescript
/**
 * Inactive categories (`active: false`) are hidden everywhere — the home page,
 * the Categories page, and the Category Details rail (all driven by the same
 * page-layout). A missing `active` flag is treated as active.
 */
export function isCategoryActive(c: any): boolean {
  return c?.active !== false;
}
```

In the same file, change `mapCategory` to filter `menuItems`. Replace:

```typescript
    items: (Array.isArray(m?.menuItems) ? m.menuItems : []).map((it: any) => ({
```

with:

```typescript
    items: (Array.isArray(m?.menuItems) ? m.menuItems : []).filter(isCategoryActive).map((it: any) => ({
```

In `mapHomeLayout`, guard the `FeaturedMenu` branch. Replace:

```typescript
    } else if (c?.collection === 'FeaturedMenu') {
      const m = byId(menus, id);
      if (m) sections.push(mapCategory(m));
    } else if (c?.collection === 'ProductCarousel') {
```

with:

```typescript
    } else if (c?.collection === 'FeaturedMenu') {
      const m = byId(menus, id);
      if (m && isCategoryActive(m)) sections.push(mapCategory(m));
    } else if (c?.collection === 'ProductCarousel') {
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/features/home/data/__tests__/homeLayoutMapper.test.ts`
Expected: PASS (all `isProductActive`, product-filtering, `isCategoryActive`, and category-filtering blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/features/home/data/homeLayoutMapper.ts src/features/home/data/__tests__/homeLayoutMapper.test.ts
git commit -m "feat: filter inactive categories at the home-layout mapper"
```

---

### Task 2: Add `inStock` and `active` to the product detail mapper

**Files:**
- Modify: `src/features/product/data/productDetail.types.ts` (add `inStock`, `active`)
- Modify: `src/features/product/data/productDetailApi.ts` (`mapProductDetail` return block)
- Test: `src/features/product/data/__tests__/productDetailApi.test.ts`

**Interfaces:**
- Consumes: existing `mapProductDetail(p: any): ProductDetail`.
- Produces: `ProductDetail` now has `inStock: boolean` (`p?.stock === undefined ? true : num(p?.stock) > 0`) and `active: boolean` (`p?.active !== false`). Tasks 3 and 4 read `detail.inStock` and `detail.active`.

- [ ] **Step 1: Write the failing tests**

Append to `src/features/product/data/__tests__/productDetailApi.test.ts` (inside the existing `describe('mapProductDetail', ...)` block, before its closing `});`):

```typescript
  it('treats absent stock as in-stock and active by default', () => {
    const d = mapProductDetail(RAW);
    expect(d.inStock).toBe(true);
    expect(d.active).toBe(true);
  });

  it('maps inStock from stock count', () => {
    expect(mapProductDetail({ ...RAW, stock: 0 }).inStock).toBe(false);
    expect(mapProductDetail({ ...RAW, stock: 3 }).inStock).toBe(true);
  });

  it('maps active:false to inactive', () => {
    expect(mapProductDetail({ ...RAW, active: false }).active).toBe(false);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/product/data/__tests__/productDetailApi.test.ts`
Expected: FAIL — `d.inStock` and `d.active` are `undefined`.

- [ ] **Step 3: Add the fields to the type**

In `src/features/product/data/productDetail.types.ts`, add two fields to the `ProductDetail` interface, directly after the `discountPct` line:

```typescript
  discountPct: number;    // 0 when no discount
  inStock: boolean;       // false when stock is 0; absent stock => true
  active: boolean;        // p.active !== false (missing flag => active)
  categoryTitle?: string; // categoryId.title
```

- [ ] **Step 4: Populate the fields in the mapper**

In `src/features/product/data/productDetailApi.ts`, inside `mapProductDetail`'s returned object, add the two fields directly after the `discountPct,` line:

```typescript
    discountPct,
    inStock: p?.stock === undefined ? true : num(p?.stock) > 0,
    active: p?.active !== false,
    categoryTitle: p?.categoryId?.title || undefined,
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/features/product/data/__tests__/productDetailApi.test.ts`
Expected: PASS (existing cases plus the three new ones).

- [ ] **Step 6: Commit**

```bash
git add src/features/product/data/productDetail.types.ts src/features/product/data/productDetailApi.ts src/features/product/data/__tests__/productDetailApi.test.ts
git commit -m "feat: map inStock and active on product detail"
```

---

### Task 3: Out-of-stock bar in `ProductCartBar`

**Files:**
- Modify: `src/features/product/views/components/ProductCartBar.tsx` (add `inStock` prop + disabled bar)
- Modify: `src/features/product/views/ProductDetailScreen.tsx:111` (pass `inStock={d.inStock}`)

**Interfaces:**
- Consumes: `ProductDetail.inStock` from Task 2.
- Produces: `ProductCartBar` accepts `inStock?: boolean` (defaults to `true`); when `false` it renders a disabled "Out of Stock" bar instead of the Add/stepper UI.

- [ ] **Step 1: Add the `inStock` prop and the disabled bar**

In `src/features/product/views/components/ProductCartBar.tsx`, add `inStock` to the `Props` interface:

```typescript
interface Props {
  count: number;
  inStock?: boolean;
  onAdd: () => void;
  onDec: () => void;
  onViewCart: () => void;
}
```

Update the component signature to destructure it with a default:

```typescript
export const ProductCartBar = ({ count, inStock = true, onAdd, onDec, onViewCart }: Props) => {
```

Immediately after the `const { t } = useTranslation();` line (before the existing `return (`), insert the out-of-stock branch:

```typescript
  if (!inStock) {
    return (
      <View
        className="bg-white border-t border-slate-100 px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="bg-slate-100 rounded-2xl h-14 items-center justify-center">
          <Text className="text-slate-400 font-extrabold text-base">Out of Stock</Text>
        </View>
      </View>
    );
  }
```

- [ ] **Step 2: Pass `inStock` from the screen**

In `src/features/product/views/ProductDetailScreen.tsx`, update the `ProductCartBar` usage on line 111. Replace:

```tsx
      <ProductCartBar count={vm.count} onAdd={vm.onAdd} onDec={vm.onDec} onViewCart={vm.onViewCart} />
```

with:

```tsx
      <ProductCartBar count={vm.count} inStock={d.inStock} onAdd={vm.onAdd} onDec={vm.onDec} onViewCart={vm.onViewCart} />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (specifically none referencing `ProductCartBar` or `inStock`).

- [ ] **Step 4: Commit**

```bash
git add src/features/product/views/components/ProductCartBar.tsx src/features/product/views/ProductDetailScreen.tsx
git commit -m "feat: disabled Out of Stock bar on product detail"
```

---

### Task 4: "No longer available" state for inactive products

**Files:**
- Modify: `src/features/product/views/ProductDetailScreen.tsx` (add inactive guard after `const d = vm.detail;`)

**Interfaces:**
- Consumes: `ProductDetail.active` from Task 2, and the existing `header` element already defined in the component.

- [ ] **Step 1: Render the unavailable state when inactive**

In `src/features/product/views/ProductDetailScreen.tsx`, find the line `const d = vm.detail;` (currently line 57). Directly **after** the following line `const displayTitle = ...`, insert the inactive guard:

```tsx
  const d = vm.detail;
  const displayTitle = locale === 'te' && d.teluguTitle ? d.teluguTitle : d.title;

  if (!d.active) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
        {header}
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-slate-500 text-center">This product is no longer available.</Text>
        </View>
      </SafeAreaView>
    );
  }
```

(The `header` element — defined earlier in the component — already contains a working back button via `vm.onBack`, so no extra control is needed.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the full Jest suite to confirm nothing regressed**

Run: `npx jest`
Expected: PASS (all suites green).

- [ ] **Step 4: Commit**

```bash
git add src/features/product/views/ProductDetailScreen.tsx
git commit -m "feat: show unavailable state for inactive product detail"
```

---

## Notes for the implementer

- **Why no UI unit tests:** this repo unit-tests pure mappers/stores only; there are no React Native component tests. UI tasks (3, 4) are gated by `npx tsc --noEmit` plus the full Jest suite, matching the existing convention.
- **Category surfaces need no per-screen edits:** `CategoryGrid` already returns `null` for an empty `items` array, and the Category Details rail is built from the same (now-filtered) `section.items` passed as the `subcategories` route param. Filtering in Task 1 covers all three surfaces.
- **No "Buy Now":** the original request mentions it, but no such control exists; do not add one.

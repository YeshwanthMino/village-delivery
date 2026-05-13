# Village Delivery — Design Spec

_Date: 2026-05-13_

---

## Overview

Village Delivery is a single-vendor grocery delivery mobile app (React Native / Expo). It is a new standalone project that implements the Greenly Grocery App HTML prototype design with "Village Delivery" as the brand name throughout.

**Tech stack:** Expo ~54, Expo Router v6 (file-based routing), React Native 0.81, NativeWind v4 (Tailwind CSS), Zustand v5, GluestackUI v3, Axios, RxJS, TypeScript — identical to the Mino-hyper-local reference project.

**Architecture:** Clean Architecture + MVVM, feature-based folder structure, DI containers per feature, Zustand for global state.

**Auth:** Infrastructure present (AppScreen guard, useAuthStore) but no auth screens. App always boots to the dashboard. Profile tab shows a non-functional "Sign In" placeholder.

---

## Brand & Theme

| Token | Value |
|---|---|
| App name | Village Delivery |
| Tagline | Fresh groceries · 30 min delivery |
| Logo | "V" in a green rounded square (green-500 → emerald-600 gradient) |
| Primary CTA | `bg-green-600` (#16a34a) |
| Active state | `text-green-700` (#15803d) |
| Accent bg | `bg-green-50` (#f0fdf4) |
| Card surface | `bg-white`, `border-slate-100` |
| Primary text | `text-slate-900` |
| Secondary text | `text-slate-500` |
| Font | EuclidCircularA (Regular, Medium, SemiBold, Bold) |
| Coupon code | `VILLAGE10` (10% off, capped ₹40) |
| Currency | ₹ (rupees), prices stored as float × 20 |
| Free delivery threshold | ₹500 |
| Platform fee | ₹10 |
| Delivery ETA | 12 min |

---

## Project Structure

```
village-delivery/
├── app/
│   ├── _layout.tsx                    ← Root: GluestackUIProvider + AppScreen
│   ├── index.tsx                      ← Redirect → /(dashboard)/home
│   ├── auth/
│   │   ├── _layout.tsx
│   │   └── index.tsx                  ← Placeholder (no auth screens)
│   └── (dashboard)/
│       ├── _layout.tsx                ← Tab navigator (4 tabs)
│       ├── home.tsx
│       ├── categories.tsx
│       ├── cart.tsx
│       └── profile.tsx
├── src/
│   ├── application/di/
│   │   ├── Container.ts
│   │   ├── hooks.ts
│   │   └── index.ts
│   ├── base/
│   │   ├── constants/
│   │   │   └── theme.ts               ← TabBarColors, FontFamily, BackgroundColors
│   │   ├── services/
│   │   │   ├── platform/              ← IPlatformService, Mobile + Web impls
│   │   │   ├── remote/                ← apiClient (Axios), interceptors, errorMapper
│   │   │   └── storage/               ← IStorageService, SecureStore (mobile) + localStorage (web)
│   │   └── types/
│   │       └── village.types.ts       ← Category, Product, Variant
│   ├── core/
│   │   ├── config/
│   │   │   ├── env.native.ts
│   │   │   └── env.web.ts
│   │   ├── store/
│   │   │   ├── useAuthStore.ts        ← Auth state (checkExistingAuth, login, logout)
│   │   │   ├── useVillageStore.ts     ← Cart + favs + categories + sort state
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── imageSource.ts
│   │       └── platform.js
│   ├── features/
│   │   ├── initialization/
│   │   │   ├── domain/models/AppState.ts
│   │   │   ├── viewmodels/AppViewModel.ts
│   │   │   └── views/screens/AppScreen/AppScreen.tsx
│   │   ├── home/
│   │   │   ├── data/static/
│   │   │   │   └── villageData.ts     ← CATEGORIES, ALL_PRODUCTS, HERO_SLIDES + helpers
│   │   │   ├── viewmodel/
│   │   │   │   ├── home/useHomeViewModel.ts
│   │   │   │   └── categories/useCategoriesViewModel.ts
│   │   │   └── views/
│   │   │       ├── home/HomeScreen.tsx
│   │   │       └── categories/CategoriesScreen.tsx
│   │   ├── cart/
│   │   │   ├── viewmodel/useCartViewModel.ts
│   │   │   └── views/CartScreen.tsx
│   │   └── profile/
│   │       └── views/ProfileScreen.tsx
│   └── shared/
│       └── components/
│           └── index.ts               ← Re-exports all shared components
├── assets/
│   └── fonts/                         ← EuclidCircularA-{Regular,Medium,SemiBold,Bold}.ttf
├── components/ui/gluestack-ui-provider/
├── global.css
├── tailwind.config.js
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── app.json
└── .env                               ← EXPO_PUBLIC_API_BASE_URL (staging)
```

---

## Data Layer

### Types (`src/base/types/village.types.ts`)

```ts
export interface Variant {
  name: string;     // "500 g", "1 Kg", "2 L"
  price: number;    // float (× 20 = ₹)
  mrp: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  weight: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  emoji: string;
  gradientFrom: string;  // Tailwind class: "from-orange-100"
  gradientTo: string;    // Tailwind class: "to-orange-50"
  variants?: Variant[];
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  bgClass: string;    // "bg-red-100"
  textClass: string;  // "text-red-700"
}

export type CartRecord = Record<string, number>;
// Simple: { 'f1': 2 }
// Variant: { 'f1-v0': 1, 'f1-v2': 3 }

export interface CartLineItem {
  key: string;                  // cart record key
  product: Product;
  variantIndex: number | null;
  name: string;
  weight: string;
  price: number;                // pre-multiplier float
  mrp: number;                  // pre-multiplier float
  count: number;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
}

export interface Bill {
  itemTotal: number;            // pre-multiplier; use rupees() to display
  mrpTotal: number;
  itemDiscount: number;
  deliveryFee: number;          // pre-multiplier
  platformFee: number;          // pre-multiplier
  couponDiscount: number;       // pre-multiplier
  grandTotal: number;           // pre-multiplier
  totalSavings: number;         // pre-multiplier
  totalCount: number;
}
```

### Static data (`src/features/home/data/static/villageData.ts`)

**10 categories:**
fruits 🍎, vegetables 🥦, dairy 🥛, snacks 🍿, beverages 🧃, bakery 🥐, meat 🍗, frozen 🧊, organic 🌿, pantry 🫙

**36 products** (6 per category). ~12 products have `variants`. Examples:
- Sweet Navel Oranges — variants: 500g / 1Kg / 2Kg
- Whole Milk — variants: 500ml / 1L / 2L
- Alphonso Mangoes — variants: 500g / 1Kg
- Yellow Onions — variants: 500g / 1Kg / 3Kg
- Greek Yogurt — variants: 200g / 500g
- Russet Potatoes — variants: 1Kg / 2Kg
- Milk Chocolate Bar — variants: 50g / 100g / 200g
- Fresh Orange Juice — variants: 500ml / 1L
- Buttery Croissants — variants: 2 pcs / 4 pcs
- Chicken Drumsticks — variants: 500g / 1Kg
- Vanilla Ice Cream Tub — variants: 500ml / 1L
- Organic Honey Jar — variants: 250g / 500g
- Basmati Rice — variants: 1Kg / 2Kg / 5Kg

**Hero slides (3):**
1. tag: "FRESH PICKS", title: "Farm-fresh produce, daily", emoji: 🥗, gradient: from-green-600 to-emerald-700
2. tag: "WEEKLY DEAL", title: "Save up to 40% on essentials", emoji: 🛍️, gradient: from-emerald-600 to-teal-700
3. tag: "FAST DELIVERY", title: "Groceries in under 30 min", emoji: 🚚, gradient: from-lime-600 to-green-700

**Helper functions:**
```ts
getProducts(categoryId?: string): Product[]
getCategory(id: string): Category | undefined
sortProducts(list: Product[], sortKey: SortKey): Product[]
getCartItems(cart: CartRecord): CartLineItem[]
computeBill(items: CartLineItem[], opts?: { couponDiscount?: number }): Bill
rupees(price: number): string   // '₹' + Math.round(price * 20)
```

**Bill computation:**
- `itemTotal` = sum(price × qty)
- `mrpTotal` = sum(mrp × qty)
- `itemDiscount` = mrpTotal − itemTotal
- `deliveryFee` = 0 if `itemTotal ≥ 25` (pre-multiplier, equivalent to ₹500), else `2.5` (displays as ₹50)
- `platformFee` = `0.5` pre-multiplier (displays as ₹10), fixed when cart non-empty
- `couponDiscount` = `min(itemTotal × 0.10, 2)` pre-multiplier (displays up to ₹40) when VILLAGE10 applied
- `grandTotal` = itemTotal + deliveryFee + platformFee − couponDiscount

---

## Zustand Store (`useVillageStore`)

```ts
// State
cart: CartRecord                        // cart quantities keyed by product/variant key
favs: Record<string, boolean>           // keyed by product id
selectedCat: string | null             // active category in Categories tab
sortKey: 'popular' | 'price_asc' | 'price_desc' | 'rating'

// Actions
addToCart(key: string): void            // increments key in cart
decFromCart(key: string): void          // decrements; removes key if reaches 0
toggleFav(productId: string): void
setSelectedCat(id: string | null): void
setSortKey(key: SortKey): void
clearCart(): void

// Selectors
cartCount: number                       // sum of all cart values
cartTotal: number                       // computed from cart × product prices (post rupees multiplier)
```

---

## Shared Components

All components use NativeWind classes. EuclidCircularA accessed via `fontFamily` from `theme.ts`.

### Primitives

**`FullWidthStepper`** (`h-10`, full width)
- Outlined: `border-2 border-green-600 rounded-lg`
- Left: Minus icon (or Trash2 icon when `count === 1` — used in cart rows)
- Center: count, `text-green-700 font-extrabold`
- Right: Plus icon
- All buttons: `text-green-700 hover:bg-green-50 active:scale-90`

**`CompactStepper`** (compact, `h-9` buttons `w-8`)
- Same style, used in variant sheet rows

**`PromoStrip`**
- `bg-green-50 border border-green-100 rounded-2xl p-3`
- Left: `w-10 h-10 bg-green-600 rounded-xl` with Sparkles icon (white)
- Text: "10% off your first order" bold + "Use code at checkout" muted
- Right: dashed-border badge `VILLAGE10` in `text-green-700 font-black`

### Product Cards

**`ProductCard`**
- Container: `bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col`
- Image area: `aspect-square bg-gradient-to-br {gradientFrom} {gradientTo} relative`
  - Emoji centered, `text-[64px]`
  - Heart button top-right: white/85 backdrop circle, toggles rose fill via `useVillageStore.toggleFav`
  - Discount badge top-left: `bg-green-600 text-white text-[10px] font-extrabold px-2 py-1 rounded-md` (only if discount > 0)
- Body (`p-3 flex-1 flex flex-col gap-2`):
  - Name: `text-[13px] font-bold text-slate-900 leading-tight` (2-line clamp)
  - Pills row: weight in `bg-slate-100` pill + rating in `bg-green-50` pill (Star icon + rating + `({reviews})` in slate)
  - Price row: "from" label if has variants + bold price + struck MRP + `{X}% off` if no variants
  - CTA (pinned to bottom with `mt-auto pt-1`):
    - No cart: ADD button (outlined green, full width) — variant products show ChevronDown + "ADD"
    - In cart (simple): `FullWidthStepper`
    - In cart (variant): "{n} ADDED" button with ChevronDown → opens VariantBottomSheet

**`MiniProductCard`** (128px wide, for FBT scroll)
- Same gradient emoji area (44px emoji)
- Name 2-line, weight, price, small ADD button (`h-7 px-2 text-[10px]`)
- Tapping ADD on a variant product calls `openVariants(product)` (opens VariantBottomSheet); on a simple product calls `addToCart(product.id)` directly

### Category Components

**`CategoryTile`** (5-col home grid)
- `w-14 h-14 rounded-2xl {bgClass} grid place-items-center text-2xl` emoji box
- Name label below: `text-[10.5px] font-semibold text-slate-700`
- `active:scale-95 transition`

**`CategoryBigCard`** (2-col browse grid)
- `bg-white border border-slate-100 rounded-2xl p-3`
- Emoji box (same tile style)
- Category name bold + "{n} items" muted text
- ChevronRight icon right-aligned

### Hero Carousel

**`HeroCarousel`**
- Container: `px-4 pt-4`
- Slides wrapper: `relative overflow-hidden rounded-2xl h-[180px]`
- Each slide: `absolute inset-0 bg-gradient-to-br {gradient}`, opacity fade via `Animated.Value`
- Auto-rotate: `setInterval` 4500ms, clears on unmount
- Per slide: ambient blur blobs (white/15 circles behind), emoji right-aligned, tag pill + title + subtitle + "Shop Now" button left
- Dot indicators below: active = `w-6 h-1.5 bg-green-600 rounded-full`, inactive = `w-1.5 h-1.5 bg-slate-300 rounded-full`

### Bottom Sheets (Reanimated)

**`VillageBottomSheet`** (base)
- Backdrop: `absolute inset-0 bg-black/50`, animates opacity 0→1 on open
- Sheet: `absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-xl`
- Animation: `useAnimatedStyle` + `withTiming` on `translateY` (0 ↔ full height)
- Drag handle: `w-10 h-1.5 bg-slate-200 rounded-full` centered at top

**`VariantBottomSheet`** (wraps base)
- Header: product emoji thumbnail + name + "Choose a weight / pack size" + X close
- Variant rows: name, price, struck MRP, discount %, ADD button or `CompactStepper`
- Reads/writes `useVillageStore.cart`

**`SortBottomSheet`** (wraps base)
- Header: "Sort by" + X close
- 4 option buttons: Most Popular / Price: Low to High / Price: High to Low / Top Rated
- Active: `bg-green-600 border-green-600 text-white` + Check icon
- On select: calls `setSortKey`, closes sheet

### Cart-Specific Components

**`CartItemRow`**
- `bg-white border border-slate-100 rounded-2xl p-2.5 flex-row items-center gap-3`
- Left: 64×64 gradient emoji thumb with discount % badge (top-left, green-600)
- Middle: name (2-line clamp), weight, price + struck MRP
- Right: inline stepper (outlined, `h-9`) — Minus becomes Trash2 at count=1; line total below

**`DeliveryETACard`**
- `bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-3.5`
- Clock icon in `bg-white/20` square + "Delivery in 12 min" white bold + "Free over ₹500" note
- ChevronRight trailing

**`SavingsStrip`** (conditional — only if savings > 0)
- `bg-amber-50 border border-amber-200 rounded-xl px-3 py-2`
- Sparkles icon + "You're saving ₹X on this order" text

**`CouponRow`**
- Full-width tap-to-toggle button
- Inactive: white border, Tag icon in `bg-green-50`, "Apply coupon" + "Tap to apply VILLAGE10 — 10% off, up to ₹40"
- Active: `bg-green-50 border-green-200`, Tag icon in `bg-green-600` (white), "Coupon VILLAGE10 applied" + savings shown
- Right label: "APPLY" / "REMOVE"

**`BillSummaryCard`**
- `bg-white border border-slate-200 rounded-2xl p-4`
- Receipt icon + "BILL SUMMARY" header
- `BillRow` lines: Item total (MRP), Discount on MRP (green), Delivery fee (FREE/amount), Platform fee, Coupon (if applied)
- Dashed divider
- "To Pay" row (bold)
- `bg-green-50` savings callout: "🎉 You saved ₹X on this order" (conditional)

**`CheckoutBar`** (absolute overlay above tab bar)
- `bg-green-600 rounded-2xl h-14 mx-3 flex-row items-center justify-between`
- Left: grand total (bold) + savings line (small)
- Right: "Proceed to Checkout →" uppercase
- Shadow: `shadow-[0_8px_24px_rgba(22,163,74,0.45)]`

**`FloatingCartPill`** (absolute overlay above tab bar, shown on Home/Categories)
- Same green styling as CheckoutBar but shorter
- Left: count badge circle + "{n} item(s) in cart"
- Right: "View cart →"
- Tapping navigates to cart tab

**`EmptyCart`**
- `ShoppingBag` icon in `bg-green-50` circle (w-28 h-28), small 🥦 emoji badge bottom-right
- "Your cart is empty" heading + subtitle
- "Start Shopping" green button → navigates to Home tab

---

## Screens

### HomeScreen (`src/features/home/views/home/HomeScreen.tsx`)

Layout inside `SafeAreaView` > `ScrollView`:

1. **HeroCarousel** — tapping "Shop Now" navigates to Categories tab (clears selectedCat)
2. **"Shop by category" section** — "See all" → Categories tab, 5-col `CategoryTile` grid (all 10), tap → Categories tab with that cat pre-selected
3. **`PromoStrip`** — VILLAGE10
4. **"Top picks for you" section** — 2-col `ProductCard` grid, top 6 products sorted by `rating × reviews` desc
5. **`FloatingCartPill`** — absolute overlay above tab bar, visible when `cartCount > 0`
6. **`VariantBottomSheet`** — global overlay, controlled by local `variantProduct` state

Viewmodel (`useHomeViewModel`): provides `topPicks`, `categories`, `cart`, `favs`, and action handlers from `useVillageStore`.

### CategoriesScreen (`src/features/home/views/categories/CategoriesScreen.tsx`)

**State A — Browse** (`selectedCat === null`):
- Title "Groceries" + subtitle "36 products across 10 categories"
- 2-col `CategoryBigCard` grid — tap sets `selectedCat`

**State B — Category Detail** (`selectedCat !== null`):
- Full-bleed gradient hero (category-specific gradient, 10 mappings):
  - fruits → `from-red-400 to-rose-500`
  - vegetables → `from-green-500 to-emerald-600`
  - dairy → `from-sky-400 to-blue-500`
  - snacks → `from-amber-400 to-orange-500`
  - beverages → `from-orange-400 to-amber-500`
  - bakery → `from-yellow-400 to-amber-500`
  - meat → `from-rose-400 to-red-500`
  - frozen → `from-cyan-400 to-sky-500`
  - organic → `from-lime-400 to-green-500`
  - pantry → `from-stone-400 to-amber-600`
- Overlaid chrome: ArrowLeft (back → null), Search, Heart buttons in `bg-white/20` frosted pills
- Hero content: eyebrow "Category · {n} products", category name `text-[28px] font-black text-white`, subtitle, large emoji
- White `rounded-t-3xl` card body, `-mt-4` to overlap hero
- Sticky compact sub-header: emoji badge + name + product count + Sort button (opens SortBottomSheet)
- Subcategory chips horizontal scroll (All active, others decorative)
- Active sort pill with X dismiss (if sortKey !== 'popular')
- "Showing {n}" count + sort label
- 2-col `ProductCard` grid
- `SortBottomSheet` + `VariantBottomSheet` overlaid

Slide-in animation on category selection: Reanimated `withTiming` on `translateX` from +390 (off-screen right) to 0, duration 280ms ease-out. Slides back on clearing selection.

### CartScreen (`src/features/cart/views/CartScreen.tsx`)

Reads from `useVillageStore.cart`. If `cartCount === 0` → renders `EmptyCart`.

Full cart layout (ScrollView):
1. Sticky page header: back (→ Home tab), "My Cart" + item count subtitle
2. `DeliveryETACard`
3. `SavingsStrip` (conditional)
4. "YOUR ITEMS" section label + `CartItemRow` list
5. `CouponRow` (VILLAGE10 toggle, local `coupon` state)
6. "FREQUENTLY BOUGHT TOGETHER" + horizontal `MiniProductCard` scroll (top 8 non-cart products by rating×reviews)
7. `BillSummaryCard`
8. Delivery address card: MapPin icon, "Delivering to Home", "221B Baker Street…", CHANGE button
9. Trust badges: ShieldCheck icon + "100% secure checkout · Quality guaranteed"
10. `h-[180px]` spacer (for CheckoutBar + tab bar)

`CheckoutBar` rendered as absolute overlay in `app/(dashboard)/_layout.tsx`.

### ProfileScreen (`src/features/profile/views/ProfileScreen.tsx`)

Centered layout:
- User icon in `bg-green-50` circle (w-20 h-20)
- "Sign in to Village Delivery" heading
- "Track orders, save favourites and unlock member-only deals." subtitle
- "Sign In" green button (non-functional, no navigation)

---

## Navigation (`app/(dashboard)/_layout.tsx`)

4 tabs using Expo Router `Tabs`:

| Tab | Route | Icon (lucide-react-native) | Label |
|---|---|---|---|
| Home | `/home` | `Home` | Home |
| Categories | `/categories` | `LayoutGrid` | Categories |
| Cart | `/cart` | `ShoppingCart` | Cart |
| Profile | `/profile` | `User` | Profile |

Tab bar style: white bg, `borderTopLeftRadius: 24`, `borderTopRightRadius: 24`, shadow, no border-top line. Active tint: `#28ae61`. Inactive tint: `#8c8c8c`.

**Overlays in layout:**
- `FloatingCartPill`: visible when `cartCount > 0` AND current tab is `home` or `categories`. Positioned `absolute bottom={tabBarHeight + insets.bottom}`.
- `CheckoutBar`: visible when `cartCount > 0` AND current tab is `cart`. Same position.

No `BottomCart` from Mino — these two components replace it.

---

## App Initialization (`AppScreen.tsx`)

1. Load EuclidCircularA fonts (4 weights from `assets/fonts/`)
2. Call `useAuthStore.checkExistingAuth()` — reads stored token
3. Since no auth screens exist, always navigate to `/(dashboard)/home` regardless of auth state
4. Show splash screen until fonts loaded + auth check complete

---

## Configuration Files

**`tailwind.config.js`** — identical to Mino: NativeWind preset, EuclidCircularA font families, custom shadows, CSS-var color tokens, safelist pattern.

**`global.css`** — identical to Mino: Tailwind directives + `.noscroll { scrollbar-width: none }`.

**`babel.config.js`** — Expo preset + `babel-plugin-module-resolver` (`@/` → root).

**`tsconfig.json`** — strict mode, `@/*` path alias.

**`.env`**:
```
EXPO_PUBLIC_APP_ENV=staging
EXPO_PUBLIC_API_BASE_URL=https://v1-663580528661.asia-south1.run.app
```

---

## Error Handling

- Static data — no network calls from Greenly screens. No loading/error states needed for product/category data.
- Cart calculations — pure functions, no async. No error states.
- Font loading — `useFonts` returns `[fontsLoaded]`; AppScreen shows splash until true.

---

## Out of Scope

- Real checkout flow
- Search functionality (search bar present in header, non-functional)
- Subcategory chips (rendered, first chip "All" visually active, no filter logic)
- Notifications (bell icon present, non-functional)
- Address management (hardcoded delivery address in cart)
- Favorites persistence (in-memory Zustand state only, resets on app restart)
- Orders history
- Real auth (OTP, backend integration)

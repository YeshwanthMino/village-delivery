# Telugu i18n + Bottom Overflow Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `nameTE` to Product/Category models, extract all hardcoded English screen text to the translation system with Telugu equivalents, and fix hardcoded bottom padding so content isn't hidden behind the tab bar.

**Architecture:** All localizable strings live in `translations.ts` as `{ te, en }` pairs; components call `t(key)` via `useTranslation()`. Product/Category data gains a `nameTE` field; rendering uses `locale === 'te' ? x.nameTE : x.name`. Bottom padding is computed dynamically from `useSafeAreaInsets().bottom + TAB_BAR_CONTENT_HEIGHT` instead of hardcoded values.

**Tech Stack:** React Native, Expo 55, NativeWind v4, Zustand v5, `react-native-safe-area-context`

---

## File Map

| File | Change |
|------|--------|
| `src/base/types/village.types.ts` | Add `nameTE: string` to `Product` and `Category` |
| `src/features/home/data/static/villageData.ts` | Add `nameTE` to all 36 products + 10 categories |
| `src/base/constants/translations.ts` | Add ~50 new translation keys |
| `src/shared/components/ProductCard.tsx` | Use `nameTE` when locale is `te` |
| `src/shared/components/CategoryTile.tsx` | Use `category.nameTE` instead of `t('cat_...')` |
| `src/shared/components/CategoryBigCard.tsx` | Use `nameTE` + `t('items_label')` |
| `src/shared/components/MiniProductCard.tsx` | Use `nameTE` + `t('add')` |
| `src/shared/components/CartItemRow.tsx` | Use `product.nameTE` via locale |
| `src/shared/components/BillSummaryCard.tsx` | `t()` all labels |
| `src/shared/components/CouponRow.tsx` | `t()` all labels |
| `src/shared/components/SavingsStrip.tsx` | `t()` + interpolate |
| `src/shared/components/DeliveryETACard.tsx` | `tEta(12)` + `t('free_over_500')` |
| `src/shared/components/EmptyCart.tsx` | `t()` all labels |
| `src/shared/components/FloatingCartPill.tsx` | `t()` + interpolate |
| `src/features/cart/views/CartScreen.tsx` | `t()` headers + dynamic bottom pad |
| `src/features/home/views/categories/CategoriesScreen.tsx` | `t()` all text + `nameTE` + dynamic bottom pad |
| `src/features/home/views/search/SearchScreen.tsx` | `t()` all text + dynamic bottom pad |
| `src/features/profile/views/ProfileScreen.tsx` | `t()` all text + dynamic bottom pad |
| `src/features/home/views/home/HomeScreen.tsx` | Dynamic bottom pad only |

---

### Task 1: Extend types and populate data

**Files:**
- Modify: `src/base/types/village.types.ts`
- Modify: `src/features/home/data/static/villageData.ts`

- [ ] **Step 1: Add `nameTE` to Product and Category types**

Replace the `Product` and `Category` interfaces in `src/base/types/village.types.ts`:

```typescript
export interface Product {
  id: string;
  categoryId: string;
  name: string;
  nameTE: string;
  weight: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  variants?: Variant[];
}

export interface Category {
  id: string;
  name: string;
  nameTE: string;
  emoji: string;
  bgClass: string;
  textClass: string;
}
```

- [ ] **Step 2: Verify TypeScript fails (missing nameTE in data)**

```bash
cd village-delivery && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors like `Property 'nameTE' is missing in type ...` for every product and category.

- [ ] **Step 3: Add `nameTE` to all 10 categories in `villageData.ts`**

Replace the `CATEGORIES` array:

```typescript
export const CATEGORIES: Category[] = [
  { id: 'fruits',     name: 'Fruits',     nameTE: 'పండ్లు',           emoji: '🍎', bgClass: 'bg-red-100',    textClass: 'text-red-700'    },
  { id: 'vegetables', name: 'Vegetables', nameTE: 'కూరగాయలు',         emoji: '🥦', bgClass: 'bg-green-100',  textClass: 'text-green-700'  },
  { id: 'dairy',      name: 'Dairy',      nameTE: 'పాల ఉత్పత్తులు',   emoji: '🥛', bgClass: 'bg-blue-100',   textClass: 'text-blue-700'   },
  { id: 'snacks',     name: 'Snacks',     nameTE: 'స్నాక్స్',          emoji: '🍿', bgClass: 'bg-amber-100',  textClass: 'text-amber-700'  },
  { id: 'beverages',  name: 'Beverages',  nameTE: 'పానీయాలు',          emoji: '🧃', bgClass: 'bg-orange-100', textClass: 'text-orange-700' },
  { id: 'bakery',     name: 'Bakery',     nameTE: 'బేకరీ',             emoji: '🥐', bgClass: 'bg-yellow-100', textClass: 'text-yellow-700' },
  { id: 'meat',       name: 'Meat',       nameTE: 'మాంసం',             emoji: '🍗', bgClass: 'bg-rose-100',   textClass: 'text-rose-700'   },
  { id: 'frozen',     name: 'Frozen',     nameTE: 'ఫ్రోజన్',           emoji: '🧊', bgClass: 'bg-cyan-100',   textClass: 'text-cyan-700'   },
  { id: 'organic',    name: 'Organic',    nameTE: 'సేంద్రీయ',          emoji: '🌿', bgClass: 'bg-lime-100',   textClass: 'text-lime-700'   },
  { id: 'pantry',     name: 'Pantry',     nameTE: 'పాంట్రీ',           emoji: '🫙', bgClass: 'bg-stone-100',  textClass: 'text-stone-700'  },
];
```

- [ ] **Step 4: Add `nameTE` to all 36 products in `villageData.ts`**

Add `nameTE` field to every product. Insert after each `name:` field:

```
// Fruits
f1  Sweet Navel Oranges   → nameTE: 'తీపి నారింజలు',
f2  Fresh Strawberries    → nameTE: 'స్ట్రాబెర్రీలు',
f3  Alphonso Mangoes      → nameTE: 'అల్ఫాన్సో మామిడిపండ్లు',
f4  Organic Bananas       → nameTE: 'అరటిపండ్లు',
f5  Red Grapes            → nameTE: 'ఎర్ర ద్రాక్ష',
f6  Pomegranate           → nameTE: 'దానిమ్మపండు',

// Vegetables
v1  Yellow Onions         → nameTE: 'ఉల్లిపాయలు',
v2  Vine Tomatoes         → nameTE: 'టమోటాలు',
v3  Baby Spinach          → nameTE: 'పాలకూర',
v4  Russet Potatoes       → nameTE: 'బంగాళాదుంపలు',
v5  Broccoli Head         → nameTE: 'బ్రోకలీ',
v6  Bell Peppers Mix      → nameTE: 'క్యాప్సికమ్',

// Dairy
d1  Whole Milk            → nameTE: 'పూర్తి పాలు',
d2  Greek Yogurt          → nameTE: 'పెరుగు',
d3  Salted Butter         → nameTE: 'వెన్న',
d4  Cheddar Cheese        → nameTE: 'చీజ్',
d5  Paneer                → nameTE: 'పనీర్',
d6  Dahi                  → nameTE: 'దహి',

// Snacks
s1  Milk Chocolate Bar    → nameTE: 'చాక్లెట్ బార్',
s2  Salted Crackers       → nameTE: 'బిస్కెట్లు',
s3  Mixed Nuts            → nameTE: 'డ్రైఫ్రూట్స్',
s4  Potato Chips          → nameTE: 'చిప్స్',
s5  Dark Chocolate        → nameTE: 'డార్క్ చాక్లెట్',
s6  Popcorn Pack          → nameTE: 'పాప్‌కార్న్',

// Beverages
b1  Fresh Orange Juice    → nameTE: 'నారింజ రసం',
b2  Sparkling Water       → nameTE: 'మంచినీళ్ళు',
b3  Green Tea             → nameTE: 'గ్రీన్ టీ',
b4  Mango Lassi           → nameTE: 'మామిడి లస్సీ',
b5  Cold Brew Coffee      → nameTE: 'కాఫీ',
b6  Coconut Water         → nameTE: 'కొబ్బరి నీళ్ళు',

// Bakery
bk1 Buttery Croissants   → nameTE: 'క్రోసాంట్లు',
bk2 Sourdough Loaf       → nameTE: 'బ్రెడ్',
bk3 Blueberry Muffins    → nameTE: 'మఫిన్స్',
bk4 Bagels               → nameTE: 'బాగెల్స్',
bk5 Banana Bread         → nameTE: 'అరటి బ్రెడ్',
bk6 Cinnamon Rolls       → nameTE: 'దాల్చిన రొట్టెలు',

// Meat
m1  Chicken Drumsticks   → nameTE: 'చికెన్ కాళ్ళు',
m2  Salmon Fillet        → nameTE: 'సాల్మన్ చేప',
m3  Beef Mince           → nameTE: 'గొడ్డు మాంసం',
m4  Prawns               → nameTE: 'రొయ్యలు',
m5  Mutton Curry Cut     → nameTE: 'మటన్',
m6  Egg Tray             → nameTE: 'గుడ్లు',

// Frozen
fr1 Vanilla Ice Cream Tub → nameTE: 'వనిల్లా ఐస్‌క్రీం',
fr2 Frozen Peas          → nameTE: 'బఠానీలు',
fr3 Fish Fingers         → nameTE: 'చేప వేళ్ళు',
fr4 Frozen Pizza         → nameTE: 'పిజ్జా',
fr5 Ice Cream Cones      → nameTE: 'ఐస్‌క్రీం కోన్లు',
fr6 Frozen Edamame       → nameTE: 'ఎడమామే',

// Organic
o1  Organic Honey Jar    → nameTE: 'తేనె',
o2  Organic Brown Rice   → nameTE: 'బ్రౌన్ రైస్',
o3  Organic Oats         → nameTE: 'ఓట్స్',
o4  Organic Coconut Oil  → nameTE: 'కొబ్బరి నూనె',
o5  Organic Flaxseeds    → nameTE: 'అవిసె గింజలు',
o6  Organic Turmeric     → nameTE: 'పసుపు',

// Pantry
p1  Basmati Rice         → nameTE: 'బాస్మతి బియ్యం',
p2  Red Lentils          → nameTE: 'ఎర్ర పప్పు',
p3  Olive Oil            → nameTE: 'ఆలివ్ నూనె',
p4  Sea Salt             → nameTE: 'ఉప్పు',
p5  Black Pepper         → nameTE: 'మిరియాలు',
p6  Tomato Sauce         → nameTE: 'టమోటా సాస్',
```

For example, product `f1` becomes:
```typescript
{
  id: 'f1',
  categoryId: 'fruits',
  name: 'Sweet Navel Oranges',
  nameTE: 'తీపి నారింజలు',
  weight: '1 Kg',
  // ...rest unchanged
},
```

- [ ] **Step 5: Verify TypeScript passes**

```bash
cd village-delivery && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/base/types/village.types.ts src/features/home/data/static/villageData.ts
git commit -m "feat: add nameTE field to Product and Category types with Telugu translations"
```

---

### Task 2: Expand translations.ts with all screen strings

**Files:**
- Modify: `src/base/constants/translations.ts`

- [ ] **Step 1: Add all new keys to TRANSLATIONS**

Append the following keys inside the `TRANSLATIONS` object in `src/base/constants/translations.ts` (after the existing `cat_pantry` entry):

```typescript
  // Cart screen
  my_cart:             { te: 'నా కార్ట్',                                          en: 'My Cart' },
  your_items:          { te: 'మీ వస్తువులు',                                       en: 'Your Items' },
  fbt:                 { te: 'తరచుగా కలిసి కొనే వస్తువులు',                        en: 'Frequently Bought Together' },
  delivering_to_home:  { te: 'ఇంటికి డెలివరీ',                                     en: 'Delivering to Home' },
  change:              { te: 'మార్చు',                                              en: 'CHANGE' },
  secure_payments:     { te: 'సురక్షిత చెల్లింపులు · నిజమైన ఉత్పత్తులు',          en: 'Safe & secure payments · 100% genuine products' },

  // Bill summary
  bill_summary:        { te: 'బిల్లు వివరాలు',                                     en: 'BILL SUMMARY' },
  item_total_mrp:      { te: 'వస్తువుల మొత్తం (MRP)',                              en: 'Item total (MRP)' },
  discount_on_mrp:     { te: 'MRP పై తగ్గింపు',                                    en: 'Discount on MRP' },
  delivery_fee:        { te: 'డెలివరీ చార్జ్',                                     en: 'Delivery fee' },
  free:                { te: 'ఉచిత',                                               en: 'FREE' },
  platform_fee:        { te: 'ప్లాట్‌ఫారమ్ చార్జ్',                               en: 'Platform fee' },
  coupon_label:        { te: 'కూపన్ (VILLAGE10)',                                   en: 'Coupon (VILLAGE10)' },
  to_pay:              { te: 'చెల్లించాల్సిన మొత్తం',                              en: 'To Pay' },
  you_saved_order:     { te: '🎉 మీరు {n} ఆదా చేశారు',                            en: '🎉 You saved {n} on this order' },

  // Delivery ETA card
  free_over_500:       { te: '₹500 పైన ఉచిత',                                     en: 'Free over ₹500' },

  // Savings strip
  youre_saving:        { te: 'మీరు {n} ఆదా చేస్తున్నారు',                         en: "You're saving {n} on this order" },

  // Empty cart
  cart_empty_title:    { te: 'మీ కార్ట్ ఖాళీగా ఉంది',                             en: 'Your cart is empty' },
  cart_empty_subtitle: { te: 'తాజా కిరాణా వస్తువులు కార్ట్‌కు జోడించండి',         en: 'Add fresh groceries, dairy, snacks and more to your cart' },
  start_shopping:      { te: 'షాపింగ్ ప్రారంభించండి',                             en: 'Start Shopping' },

  // Floating cart pill
  one_item_cart:       { te: '1 వస్తువు కార్ట్‌లో',                               en: '1 item in cart' },
  n_items_cart:        { te: '{n} వస్తువులు కార్ట్‌లో',                            en: '{n} items in cart' },
  view_cart_arrow:     { te: 'కార్ట్ చూడండి →',                                   en: 'View cart →' },

  // Coupon row
  coupon_applied:      { te: 'కూపన్ VILLAGE10 వర్తించింది',                        en: 'Coupon VILLAGE10 applied' },
  apply_coupon:        { te: 'కూపన్ వర్తించండి',                                   en: 'Apply coupon' },
  coupon_savings:      { te: 'మీరు ₹{n} ఆదా చేశారు',                              en: 'You saved ₹{n}' },
  coupon_hint:         { te: 'VILLAGE10 వర్తించడానికి నొక్కండి — 10% తగ్గింపు',   en: 'Tap to apply VILLAGE10 — 10% off, up to ₹40' },
  remove:              { te: 'తొలగించు',                                           en: 'REMOVE' },
  apply:               { te: 'వర్తించు',                                           en: 'APPLY' },

  // Categories screen
  groceries_title:     { te: 'కిరాణా వస్తువులు',                                   en: 'Groceries' },
  sort:                { te: 'క్రమబద్ధం',                                          en: 'Sort' },
  sort_popular:        { te: 'అత్యంత జనాదరణ',                                      en: 'Most Popular' },
  sort_price_asc:      { te: 'ధర: తక్కువ నుండి ఎక్కువ',                          en: 'Price: Low to High' },
  sort_price_desc:     { te: 'ధర: ఎక్కువ నుండి తక్కువ',                          en: 'Price: High to Low' },
  sort_rating:         { te: 'అత్యుత్తమ రేటింగ్',                                  en: 'Top Rated' },
  cat_tagline:         { te: 'తాజా · నాణ్యమైన · 12 నిమిషాల్లో',                  en: 'Fresh · Quality · Delivered in 12 min' },
  filter_all:          { te: 'అన్నీ',                                              en: 'All' },
  filter_best_sellers: { te: 'బెస్ట్ సెల్లర్స్',                                  en: 'Best sellers' },
  filter_new:          { te: 'కొత్తవి',                                            en: 'New' },
  filter_on_sale:      { te: 'సేల్‌లో',                                           en: 'On sale' },
  filter_top_rated:    { te: 'టాప్ రేటెడ్',                                        en: 'Top rated' },
  items_label:         { te: '{n} వస్తువులు',                                      en: '{n} items' },

  // Category count
  cat_count:           { te: '{n} వర్గాలు',                                        en: '{n} categories' },

  // Search screen
  search_brands_ph:    { te: 'కిరాణా వస్తువులు, బ్రాండ్లు వెతకండి…',             en: 'Search groceries, brands…' },
  no_results:          { te: '"{n}" కోసం ఫలితాలు లేవు',                           en: 'No results for "{n}"' },
  start_typing:        { te: 'వెతకడానికి టైప్ చేయండి',                            en: 'Start typing to search' },

  // Profile screen
  sign_in_title:       { te: 'విలేజ్ డెలివరీకి సైన్ ఇన్ చేయండి',                en: 'Sign in to Village Delivery' },
  sign_in_subtitle:    { te: 'ఆర్డర్లు ట్రాక్ చేయండి, ఫేవరెట్లు సేవ్ చేయండి',  en: 'Track orders, save favourites and unlock member-only deals.' },
  sign_in_btn:         { te: 'సైన్ ఇన్',                                          en: 'Sign In' },
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd village-delivery && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/base/constants/translations.ts
git commit -m "feat: add 50 translation keys for full Telugu/English i18n coverage"
```

---

### Task 3: Localize product/category name rendering

**Files:**
- Modify: `src/shared/components/ProductCard.tsx`
- Modify: `src/shared/components/CategoryTile.tsx`
- Modify: `src/shared/components/CategoryBigCard.tsx`
- Modify: `src/shared/components/MiniProductCard.tsx`

- [ ] **Step 1: Update ProductCard to use `nameTE`**

In `src/shared/components/ProductCard.tsx`, replace the product name Text (around line 75):

```tsx
// Before
<Text
  className="text-base font-bold text-slate-900 leading-tight"
  style={teFont}
  numberOfLines={2}
>
  {product.name}
</Text>

// After
<Text
  className="text-base font-bold text-slate-900 leading-tight"
  style={teFont}
  numberOfLines={2}
>
  {locale === 'te' ? product.nameTE : product.name}
</Text>
```

- [ ] **Step 2: Update CategoryTile to use `category.nameTE`**

In `src/shared/components/CategoryTile.tsx`, replace:

```tsx
// Before
export const CategoryTile = ({ category, onPress }: CategoryTileProps) => {
  const { t, locale } = useTranslation();
  const label = t(`cat_${category.id}`);
  // ...
      <Text
        className="text-sm font-semibold text-slate-700 text-center"
        style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular', fontSize: 12 } : undefined}
        numberOfLines={2}
      >
        {label}
      </Text>

// After
export const CategoryTile = ({ category, onPress }: CategoryTileProps) => {
  const { locale } = useTranslation();
  const label = locale === 'te' ? category.nameTE : category.name;
  // ...
      <Text
        className="text-sm font-semibold text-slate-700 text-center"
        style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular', fontSize: 12 } : undefined}
        numberOfLines={2}
      >
        {label}
      </Text>
```

Remove the unused `t` import from the destructure.

- [ ] **Step 3: Update CategoryBigCard to use `nameTE` and `t('items_label')`**

`CategoryBigCard` currently imports nothing from the translation system. Add the hook and localize:

```tsx
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Category } from '@/src/base/types/village.types';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

interface CategoryBigCardProps {
  category: Category;
  itemCount: number;
  onPress: () => void;
}

export const CategoryBigCard = ({ category, itemCount, onPress }: CategoryBigCardProps) => {
  const { t, locale } = useTranslation();
  const name = locale === 'te' ? category.nameTE : category.name;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white border border-slate-100 rounded-2xl p-3 flex-row items-center gap-3 active:bg-slate-50"
    >
      <View className={`w-14 h-14 rounded-2xl ${category.bgClass} items-center justify-center`}>
        <Text style={{ fontSize: 28 }}>{category.emoji}</Text>
      </View>
      <View className="flex-1">
        <Text
          className="text-slate-900 font-bold text-sm"
          style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
        >
          {name}
        </Text>
        <Text className="text-slate-500 text-xs mt-0.5">
          {interpolate(t('items_label'), itemCount)}
        </Text>
      </View>
      <ChevronRight size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
};
```

- [ ] **Step 4: Update MiniProductCard to use `nameTE` and `t('add')`**

Replace full file content of `src/shared/components/MiniProductCard.tsx`:

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { gradientColor } from '@/src/core/utils/gradientColors';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import { rupees } from '@/src/features/home/data/static/villageData';
import { useTranslation } from '@/src/core/utils/useTranslation';

interface MiniProductCardProps {
  product: Product;
  openVariants: (product: Product) => void;
}

export const MiniProductCard = ({ product, openVariants }: MiniProductCardProps) => {
  const addToCart = useVillageStore(state => state.addToCart);
  const { t, locale } = useTranslation();
  const hasVariants = !!product.variants?.length;

  const handleAdd = () => {
    if (hasVariants) openVariants(product);
    else addToCart(product.id);
  };

  return (
    <View className="bg-white border border-slate-100 rounded-2xl overflow-hidden" style={{ width: 128 }}>
      <LinearGradient
        colors={[gradientColor(product.gradientFrom), gradientColor(product.gradientTo)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 44 }}>{product.emoji}</Text>
      </LinearGradient>

      <View className="p-2 gap-1">
        <Text
          className="text-[11px] font-bold text-slate-900 leading-tight"
          style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
          numberOfLines={2}
        >
          {locale === 'te' ? product.nameTE : product.name}
        </Text>
        <Text className="text-slate-500 text-[10px]">{product.weight}</Text>
        <Text className="text-slate-900 font-bold text-xs">{rupees(product.price)}</Text>

        <TouchableOpacity
          onPress={handleAdd}
          className="border border-green-600 rounded-md h-7 items-center justify-center mt-1"
        >
          <Text
            className="text-green-700 font-bold text-[10px] px-2"
            style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
          >
            {t('add')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd village-delivery && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/ProductCard.tsx src/shared/components/CategoryTile.tsx src/shared/components/CategoryBigCard.tsx src/shared/components/MiniProductCard.tsx
git commit -m "feat: localize product/category names using nameTE field"
```

---

### Task 4: Localize cart shared components

**Files:**
- Modify: `src/shared/components/CartItemRow.tsx`
- Modify: `src/shared/components/BillSummaryCard.tsx`
- Modify: `src/shared/components/CouponRow.tsx`
- Modify: `src/shared/components/SavingsStrip.tsx`
- Modify: `src/shared/components/DeliveryETACard.tsx`
- Modify: `src/shared/components/EmptyCart.tsx`
- Modify: `src/shared/components/FloatingCartPill.tsx`

- [ ] **Step 1: Update CartItemRow to show localized product name**

In `src/shared/components/CartItemRow.tsx`, add `useTranslation` and use `product.nameTE`:

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import { CartLineItem } from '@/src/base/types/village.types';
import { rupees } from '@/src/features/home/data/static/villageData';
import { useVillageStore } from '@/src/core/store';
import { FullWidthStepper } from './FullWidthStepper';
import { useTranslation } from '@/src/core/utils/useTranslation';

interface CartItemRowProps {
  item: CartLineItem;
}

export const CartItemRow = ({ item }: CartItemRowProps) => {
  const addToCart = useVillageStore(state => state.addToCart);
  const decFromCart = useVillageStore(state => state.decFromCart);
  const { locale } = useTranslation();

  const displayName = locale === 'te' ? item.product.nameTE : item.product.name;

  const discount = item.mrp > item.price
    ? Math.round((1 - item.price / item.mrp) * 100)
    : 0;

  return (
    <View className="bg-white border border-slate-100 rounded-2xl p-2.5 flex-row items-center gap-3">
      <View className={`w-16 h-16 rounded-xl bg-gradient-to-br ${item.gradientFrom} ${item.gradientTo} items-center justify-center relative`}>
        <Text style={{ fontSize: 32 }}>{item.emoji}</Text>
        {discount > 0 && (
          <View className="absolute top-0 left-0 bg-green-600 rounded-tl-xl rounded-br-xl px-1 py-0.5">
            <Text className="text-white text-[8px] font-extrabold">{discount}%</Text>
          </View>
        )}
      </View>

      <View className="flex-1">
        <Text
          className="text-slate-900 font-bold text-sm leading-tight"
          style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
          numberOfLines={2}
        >
          {displayName}
        </Text>
        <Text className="text-slate-500 text-xs mt-0.5">{item.weight}</Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          <Text className="text-slate-900 font-bold text-sm">{rupees(item.price)}</Text>
          {item.mrp > item.price && (
            <Text className="text-slate-400 text-xs line-through">{rupees(item.mrp)}</Text>
          )}
        </View>
      </View>

      <View className="items-end gap-1" style={{ width: 96 }}>
        <FullWidthStepper
          count={item.count}
          onAdd={() => addToCart(item.key)}
          onDec={() => decFromCart(item.key)}
        />
        <Text className="text-slate-500 text-[10px]">
          {rupees(item.price * item.count)}
        </Text>
      </View>
    </View>
  );
};
```

- [ ] **Step 2: Update BillSummaryCard**

Replace `src/shared/components/BillSummaryCard.tsx`:

```tsx
import { Receipt } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { Bill } from '@/src/base/types/village.types';
import { rupees } from '@/src/features/home/data/static/villageData';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

interface BillRowProps {
  label: string;
  value: string;
  isGreen?: boolean;
  isBold?: boolean;
}

const BillRow = ({ label, value, isGreen, isBold }: BillRowProps) => (
  <View className="flex-row justify-between items-center py-1.5">
    <Text className={`text-sm ${isBold ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>{label}</Text>
    <Text className={`text-sm ${isBold ? 'text-slate-900 font-bold' : ''} ${isGreen ? 'text-green-600 font-medium' : 'text-slate-900'}`}>
      {value}
    </Text>
  </View>
);

interface BillSummaryCardProps {
  bill: Bill;
  couponApplied: boolean;
}

export const BillSummaryCard = ({ bill, couponApplied }: BillSummaryCardProps) => {
  const { t } = useTranslation();

  return (
    <View className="bg-white border border-slate-200 rounded-2xl p-4">
      <View className="flex-row items-center gap-2 mb-3">
        <Receipt size={16} color="#64748b" />
        <Text className="text-slate-500 text-xs font-bold tracking-wider">{t('bill_summary')}</Text>
      </View>

      <BillRow label={t('item_total_mrp')} value={rupees(bill.mrpTotal)} />
      <BillRow label={t('discount_on_mrp')} value={`-${rupees(bill.itemDiscount)}`} isGreen />
      <BillRow
        label={t('delivery_fee')}
        value={bill.deliveryFee === 0 ? t('free') : rupees(bill.deliveryFee)}
        isGreen={bill.deliveryFee === 0}
      />
      <BillRow label={t('platform_fee')} value={rupees(bill.platformFee)} />
      {couponApplied && bill.couponDiscount > 0 && (
        <BillRow label={t('coupon_label')} value={`-${rupees(bill.couponDiscount)}`} isGreen />
      )}

      <View className="border-t border-dashed border-slate-300 my-2" />

      <BillRow label={t('to_pay')} value={rupees(bill.grandTotal)} isBold />

      {bill.totalSavings > 0 && (
        <View className="bg-green-50 rounded-xl px-3 py-2 mt-2">
          <Text className="text-green-700 text-xs font-medium text-center">
            {interpolate(t('you_saved_order'), rupees(bill.totalSavings))}
          </Text>
        </View>
      )}
    </View>
  );
};
```

- [ ] **Step 3: Update CouponRow**

Replace `src/shared/components/CouponRow.tsx`:

```tsx
import { Tag } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

interface CouponRowProps {
  applied: boolean;
  savings: number;
  onToggle: () => void;
}

export const CouponRow = ({ applied, savings, onToggle }: CouponRowProps) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      onPress={onToggle}
      className={`flex-row items-center rounded-2xl border-2 p-3 gap-3 ${
        applied ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
      }`}
    >
      <View className={`w-10 h-10 rounded-xl items-center justify-center ${
        applied ? 'bg-green-600' : 'bg-green-50'
      }`}>
        <Tag size={20} color={applied ? 'white' : '#16a34a'} />
      </View>
      <View className="flex-1">
        <Text className="text-slate-900 font-bold text-sm">
          {applied ? t('coupon_applied') : t('apply_coupon')}
        </Text>
        <Text className="text-slate-500 text-xs mt-0.5">
          {applied
            ? interpolate(t('coupon_savings'), Math.round(savings * 20))
            : t('coupon_hint')}
        </Text>
      </View>
      <Text className={`font-bold text-sm ${applied ? 'text-red-500' : 'text-green-600'}`}>
        {applied ? t('remove') : t('apply')}
      </Text>
    </TouchableOpacity>
  );
};
```

- [ ] **Step 4: Update SavingsStrip**

Replace `src/shared/components/SavingsStrip.tsx`:

```tsx
import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { rupees } from '@/src/features/home/data/static/villageData';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

interface SavingsStripProps {
  savings: number;
}

export const SavingsStrip = ({ savings }: SavingsStripProps) => {
  const { t } = useTranslation();
  if (savings <= 0) return null;
  return (
    <View className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex-row items-center gap-2">
      <Sparkles size={16} color="#d97706" />
      <Text className="text-amber-800 text-sm font-medium">
        {interpolate(t('youre_saving'), rupees(savings))}
      </Text>
    </View>
  );
};
```

- [ ] **Step 5: Update DeliveryETACard**

Replace `src/shared/components/DeliveryETACard.tsx`:

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Clock } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';

export const DeliveryETACard = () => {
  const { t, tEta } = useTranslation();
  return (
    <LinearGradient
      colors={['#16a34a', '#059669']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center' }}
    >
      <View style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Clock size={20} color="white" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>{tEta(12)}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>{t('free_over_500')}</Text>
      </View>
      <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
    </LinearGradient>
  );
};
```

- [ ] **Step 6: Update EmptyCart**

Replace `src/shared/components/EmptyCart.tsx`:

```tsx
import { ShoppingBag } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';

interface EmptyCartProps {
  onStartShopping: () => void;
}

export const EmptyCart = ({ onStartShopping }: EmptyCartProps) => {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <View className="w-28 h-28 bg-green-50 rounded-full items-center justify-center mb-5 relative">
        <ShoppingBag size={52} color="#16a34a" />
        <Text className="absolute bottom-1 right-1 text-xl">🥦</Text>
      </View>
      <Text className="text-slate-900 font-bold text-xl mb-2">{t('cart_empty_title')}</Text>
      <Text className="text-slate-500 text-sm text-center mb-6">{t('cart_empty_subtitle')}</Text>
      <TouchableOpacity
        onPress={onStartShopping}
        className="bg-green-600 rounded-2xl px-8 py-3"
      >
        <Text className="text-white font-bold text-sm">{t('start_shopping')}</Text>
      </TouchableOpacity>
    </View>
  );
};
```

- [ ] **Step 7: Update FloatingCartPill**

In `src/shared/components/FloatingCartPill.tsx`, add `useTranslation` and replace hardcoded strings:

```tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

interface FloatingCartPillProps {
  count: number;
  onPress: () => void;
}

const TAB_BAR_CONTENT_HEIGHT = 64;

export const FloatingCartPill = ({ count, onPress }: FloatingCartPillProps) => {
  const { bottom } = useSafeAreaInsets();
  const { t } = useTranslation();
  if (count === 0) return null;

  const pillBottom = TAB_BAR_CONTENT_HEIGHT + 8;
  const label = count === 1 ? t('one_item_cart') : interpolate(t('n_items_cart'), count);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.pill, { marginBottom: pillBottom }]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.action}>{t('view_cart_arrow')}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    marginHorizontal: 12,
    backgroundColor: '#16a34a',
    borderRadius: 16,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 10,
  },
  badge: {
    width: 26,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  badgeText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  label:     { color: '#ffffff', fontWeight: '600', fontSize: 14, flex: 1 },
  action:    { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
```

- [ ] **Step 8: Verify TypeScript**

```bash
cd village-delivery && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/shared/components/CartItemRow.tsx src/shared/components/BillSummaryCard.tsx src/shared/components/CouponRow.tsx src/shared/components/SavingsStrip.tsx src/shared/components/DeliveryETACard.tsx src/shared/components/EmptyCart.tsx src/shared/components/FloatingCartPill.tsx
git commit -m "feat: localize all cart shared components"
```

---

### Task 5: Localize CartScreen

**Files:**
- Modify: `src/features/cart/views/CartScreen.tsx`

- [ ] **Step 1: Update CartScreen header and section labels**

Add `useTranslation` and replace hardcoded strings. The full updated file:

```tsx
import { MapPin, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BillSummaryCard,
  CartItemRow,
  CheckoutBar,
  CouponRow,
  DeliveryETACard,
  EmptyCart,
  MiniProductCard,
  SavingsStrip,
  VariantBottomSheet,
} from '@/src/shared/components';
import { useCartViewModel } from '../viewmodel/useCartViewModel';
import { PaymentMethod } from '@/src/shared/components/CheckoutBar';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

const TAB_BAR_CONTENT_HEIGHT = 64;

export const CartScreen = () => {
  const router = useRouter();
  const vm = useCartViewModel();
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(null);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const goToHome = () => router.push('/(dashboard)/home');
  const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

  if (vm.cartCount === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <EmptyCart onStartShopping={goToHome} />
      </SafeAreaView>
    );
  }

  const itemLabel = vm.cartCount === 1
    ? t('item_count').replace('{n}', '1')
    : interpolate(t('n_items_cart'), vm.cartCount);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      {/* Sticky Header */}
      <View className="bg-white border-b border-slate-100" style={{ paddingTop: insets.top + 12, paddingBottom: 12, paddingHorizontal: 16 }}>
        <Text className="text-slate-900 font-black text-xl">{t('my_cart')}</Text>
        <Text className="text-slate-500 text-sm mt-0.5">{itemLabel}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPadding }}
        decelerationRate="normal"
        scrollEventThrottle={16}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
      >
        <View className="px-4 py-3 gap-3">
          <DeliveryETACard />
          <SavingsStrip savings={vm.bill.totalSavings} />

          <View>
            <Text className="text-slate-500 text-[10px] font-bold tracking-widest mb-2 uppercase">
              {t('your_items')}
            </Text>
            <View className="gap-2">
              {vm.cartItems.map(item => (
                <CartItemRow key={item.key} item={item} />
              ))}
            </View>
          </View>

          <CouponRow
            applied={vm.couponApplied}
            savings={vm.bill.couponDiscount}
            onToggle={vm.toggleCoupon}
          />

          {vm.fbtProducts.length > 0 && (
            <View>
              <Text className="text-slate-500 text-[10px] font-bold tracking-widest mb-2 uppercase">
                {t('fbt')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {vm.fbtProducts.map(product => (
                  <MiniProductCard
                    key={product.id}
                    product={product}
                    openVariants={vm.openVariants}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <BillSummaryCard bill={vm.bill} couponApplied={vm.couponApplied} />

          <View className="bg-white border border-slate-200 rounded-2xl p-4 flex-row items-start gap-3">
            <MapPin size={18} color="#16a34a" className="mt-0.5" />
            <View className="flex-1">
              <Text className="text-slate-900 font-bold text-sm">{t('delivering_to_home')}</Text>
              <Text className="text-slate-500 text-xs mt-0.5">
                221B Baker Street, Apartment 4B, Mumbai 400001
              </Text>
            </View>
            <TouchableOpacity>
              <Text className="text-green-600 font-bold text-sm">{t('change')}</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center gap-2 justify-center py-2">
            <ShieldCheck size={16} color="#22c55e" />
            <Text className="text-slate-500 text-xs">{t('secure_payments')}</Text>
          </View>
        </View>
      </ScrollView>

      <CheckoutBar
        grandTotal={vm.bill.grandTotal}
        savings={vm.bill.totalSavings}
        paymentMethod={paymentMethod}
        onSelectPayment={setPaymentMethod}
      />

      <VariantBottomSheet product={vm.variantProduct} onClose={vm.closeVariants} />
    </SafeAreaView>
  );
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd village-delivery && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/cart/views/CartScreen.tsx
git commit -m "feat: localize CartScreen text + dynamic bottom padding"
```

---

### Task 6: Localize CategoriesScreen

**Files:**
- Modify: `src/features/home/views/categories/CategoriesScreen.tsx`

- [ ] **Step 1: Replace SORT_LABELS constant and all hardcoded text**

The `SORT_LABELS` object is a module-level constant that needs locale — move it inside the component as a function. Full updated file:

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Heart, Search, SlidersHorizontal, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { gradientColor } from '@/src/core/utils/gradientColors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CategoryBigCard,
  FloatingCartPill,
  ProductCard,
  SortBottomSheet,
  VariantBottomSheet,
} from '@/src/shared/components';
import { useCategoriesViewModel } from '../../viewmodel/categories/useCategoriesViewModel';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
const TAB_BAR_CONTENT_HEIGHT = 64;

export const CategoriesScreen = () => {
  const router = useRouter();
  const vm = useCategoriesViewModel();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(390)).current;
  const { t, locale } = useTranslation();

  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

  const SORT_LABELS: Record<string, string> = {
    popular:    t('sort_popular'),
    price_asc:  t('sort_price_asc'),
    price_desc: t('sort_price_desc'),
    rating:     t('sort_rating'),
  };

  const FILTER_CHIPS = [
    t('filter_all'),
    t('filter_best_sellers'),
    t('filter_new'),
    t('filter_on_sale'),
    t('filter_top_rated'),
  ];

  useEffect(() => {
    if (vm.selectedCat) {
      slideAnim.setValue(390);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  }, [vm.selectedCat]);

  const goToCart = () => router.push('/(dashboard)/cart');

  if (!vm.selectedCat) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: scrollPadding }}
          decelerationRate="normal"
          scrollEventThrottle={16}
          bounces={true}
          alwaysBounceVertical={true}
          overScrollMode="always"
        >
          <View className="px-4 pb-2" style={{ paddingTop: insets.top + 16 }}>
            <Text className="text-slate-900 font-black text-2xl" style={teFont}>
              {t('groceries_title')}
            </Text>
            <Text className="text-slate-500 text-sm mt-1">
              {interpolate(t('items_label'), vm.categories.length * 6)} · {interpolate(t('cat_count'), vm.categories.length)}
            </Text>
          </View>

          <View className="px-4 gap-3 pb-4">
            {Array.from({ length: Math.ceil(vm.categories.length / 2) }, (_, rowIdx) => (
              <View key={rowIdx} className="flex-row gap-3">
                {vm.categories.slice(rowIdx * 2, rowIdx * 2 + 2).map(cat => (
                  <View key={cat.id} className="flex-1">
                    <CategoryBigCard
                      category={cat}
                      itemCount={vm.productCountInCat(cat.id)}
                      onPress={() => vm.setSelectedCat(cat.id)}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const cat = vm.currentCategory!;
  const grad = vm.heroGradient!;
  const catName = locale === 'te' ? cat.nameTE : cat.name;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      <Animated.View
        className="bg-white border-b border-slate-100"
        style={{ transform: [{ translateX: slideAnim }] }}
      >
        <View className="px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => vm.setSelectedCat(null)}
                className="w-8 h-8 items-center justify-center mr-1"
              >
                <ArrowLeft size={20} color="#0f172a" />
              </TouchableOpacity>
              <View className={`w-8 h-8 rounded-lg ${cat.bgClass} items-center justify-center`}>
                <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
              </View>
              <View>
                <Text className="text-slate-900 font-bold text-sm" style={teFont}>{catName}</Text>
                <Text className="text-slate-400 text-[10px]">
                  {interpolate(t('items_label'), vm.products.length)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={vm.openSortSheet}
              className="flex-row items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5"
            >
              <SlidersHorizontal size={14} color="#64748b" />
              <Text className="text-slate-600 text-xs font-medium">{t('sort')}</Text>
            </TouchableOpacity>
          </View>

          {vm.sortKey !== 'popular' && (
            <View className="flex-row items-center gap-1.5 mt-2">
              <View className="flex-row items-center gap-1 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                <Text className="text-green-700 text-xs font-medium">{SORT_LABELS[vm.sortKey]}</Text>
                <TouchableOpacity onPress={() => vm.setSortKey('popular')}>
                  <X size={12} color="#15803d" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      <AnimatedScrollView
        style={{ flex: 1, transform: [{ translateX: slideAnim }] }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPadding }}
        stickyHeaderIndices={[1]}
        decelerationRate="normal"
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
      >
        {/* [0] Hero */}
        <LinearGradient
          colors={[gradientColor(grad.from), gradientColor(grad.to)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ minHeight: 180, paddingTop: 20, paddingBottom: 40, paddingHorizontal: 16 }}
        >
          <View className="flex-row gap-2 justify-end mb-2">
            <TouchableOpacity
              className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
              onPress={() =>
                router.push(
                  `/search?categoryId=${cat.id}&categoryName=${encodeURIComponent(cat.name)}`
                )
              }
            >
              <Search size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
              <Heart size={18} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-white/70 text-xs font-semibold tracking-wider uppercase">
            {interpolate(t('items_label'), vm.products.length)}
          </Text>
          <Text className="text-white font-black mt-1" style={[{ fontSize: 28 }, teFont]}>{catName}</Text>
          <Text className="text-white/70 text-sm mt-1">{t('cat_tagline')}</Text>
          <Text style={{ fontSize: 64, marginTop: 8 }}>{cat.emoji}</Text>
        </LinearGradient>

        {/* [1] Chips */}
        <View className="bg-white border-b border-slate-100">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ paddingHorizontal: 16, paddingVertical: 10 }}
            contentContainerStyle={{ gap: 8 }}
            directionalLockEnabled={true}
            nestedScrollEnabled={true}
            decelerationRate="normal"
          >
            {FILTER_CHIPS.map((chip, i) => (
              <View
                key={chip}
                className={`rounded-full px-4 py-1.5 border ${
                  i === 0 ? 'bg-green-600 border-green-600' : 'bg-white border-slate-200'
                }`}
              >
                <Text className={`text-xs font-semibold ${i === 0 ? 'text-white' : 'text-slate-600'}`}>
                  {chip}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* [2] Products */}
        <View className="bg-white">
          <View className="px-4 pt-3 pb-2">
            <Text className="text-slate-500 text-xs">
              {interpolate(t('items_label'), vm.products.length)} · {SORT_LABELS[vm.sortKey]}
            </Text>
          </View>
          <View className="px-4 pb-8">
            <View className="flex-row flex-wrap gap-3">
              {vm.products.map(product => (
                <View key={product.id} style={{ width: '47.5%' }}>
                  <ProductCard product={product} openVariants={vm.openVariants} />
                </View>
              ))}
            </View>
          </View>
        </View>
      </AnimatedScrollView>

      {vm.cartCount > 0 && (
        <FloatingCartPill count={vm.cartCount} onPress={goToCart} />
      )}
      <SortBottomSheet visible={vm.sortSheetVisible} onClose={vm.closeSortSheet} />
      <VariantBottomSheet product={vm.variantProduct} onClose={vm.closeVariants} />
    </SafeAreaView>
  );
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd village-delivery && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/home/views/categories/CategoriesScreen.tsx
git commit -m "feat: localize CategoriesScreen — sort labels, category names, filter chips, dynamic padding"
```

---

### Task 7: Localize SearchScreen and ProfileScreen

**Files:**
- Modify: `src/features/home/views/search/SearchScreen.tsx`
- Modify: `src/features/profile/views/ProfileScreen.tsx`

- [ ] **Step 1: Update SearchScreen**

In `src/features/home/views/search/SearchScreen.tsx`:

1. Add `useTranslation` and `interpolate` imports:
```tsx
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';
```

2. Add inside the component (after existing hooks):
```tsx
const { t } = useTranslation();
const TAB_BAR_CONTENT_HEIGHT = 64;
const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;
```

3. Replace `placeholder="Search groceries, brands…"` with:
```tsx
placeholder={t('search_brands_ph')}
```

4. Replace empty/no-results text block:
```tsx
// Before
{vm.query.trim().length > 0 ? (
  <Text className="text-slate-400 text-sm">No results for "{vm.query.trim()}"</Text>
) : (
  <Text className="text-slate-400 text-sm">Start typing to search</Text>
)}

// After
{vm.query.trim().length > 0 ? (
  <Text className="text-slate-400 text-sm">{interpolate(t('no_results'), vm.query.trim())}</Text>
) : (
  <Text className="text-slate-400 text-sm">{t('start_typing')}</Text>
)}
```

5. Replace `paddingBottom: 160` with `paddingBottom: scrollPadding`.

- [ ] **Step 2: Update ProfileScreen**

In `src/features/profile/views/ProfileScreen.tsx`:

1. Add `useSafeAreaInsets` import (it's already imported via `react-native-safe-area-context`). Add inside component:
```tsx
const { bottom } = useSafeAreaInsets();
const TAB_BAR_CONTENT_HEIGHT = 64;
const bottomPad = TAB_BAR_CONTENT_HEIGHT + bottom + 8;
```

2. Replace hardcoded sign-in section text:
```tsx
// Before
<Text className="text-slate-900 font-black text-xl mb-2 text-center">
  Sign in to Village Delivery
</Text>
<Text className="text-slate-500 text-sm text-center mb-8">
  Track orders, save favourites and unlock member-only deals.
</Text>
<TouchableOpacity className="bg-green-600 rounded-2xl px-10 py-3">
  <Text className="text-white font-bold text-base">Sign In</Text>
</TouchableOpacity>

// After
<Text className="text-slate-900 font-black text-xl mb-2 text-center" style={teFont}>
  {t('sign_in_title')}
</Text>
<Text className="text-slate-500 text-sm text-center mb-8" style={teRegular}>
  {t('sign_in_subtitle')}
</Text>
<TouchableOpacity className="bg-green-600 rounded-2xl px-10 py-3">
  <Text className="text-white font-bold text-base" style={teFont}>{t('sign_in_btn')}</Text>
</TouchableOpacity>
```

3. Add `paddingBottom: bottomPad` to the bottom help section:
```tsx
// Before
<View className="px-4 pb-8 border-t border-slate-100 pt-4">

// After
<View className="px-4 border-t border-slate-100 pt-4" style={{ paddingBottom: bottomPad }}>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd village-delivery && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/home/views/search/SearchScreen.tsx src/features/profile/views/ProfileScreen.tsx
git commit -m "feat: localize SearchScreen and ProfileScreen; fix bottom overflow on both"
```

---

### Task 8: Fix bottom overflow on HomeScreen

**Files:**
- Modify: `src/features/home/views/home/HomeScreen.tsx`

- [ ] **Step 1: Replace hardcoded paddingBottom with dynamic value**

In `src/features/home/views/home/HomeScreen.tsx`, find the ScrollView's `contentContainerStyle` (currently `paddingBottom: 250`) and update:

1. Add constant at top of component (after existing hook calls):
```tsx
const TAB_BAR_CONTENT_HEIGHT = 64;
const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;
```

2. Replace the ScrollView's contentContainerStyle:
```tsx
// Before
contentContainerStyle={{ paddingBottom: 250 }}

// After
contentContainerStyle={{ paddingBottom: scrollPadding }}
```

Note: `insets` is already available in HomeScreen from `useSafeAreaInsets()`.

- [ ] **Step 2: Verify TypeScript**

```bash
cd village-delivery && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/home/views/home/HomeScreen.tsx
git commit -m "fix: dynamic bottom padding on HomeScreen to prevent tab bar overlap"
```

# Product Detail Screen — Design

Date: 2026-06-26
Branch: feat/address-location-flow

## Problem

The app has no product detail page (PDP). Tapping a product card today only
adds to cart or opens a variant sheet — there is no way to view a product's
images, description, or price breakdown on a dedicated screen. We need a PDP
backed by `GET /app/product/:id`, with a scrollable body and a fixed
"Add to cart" bar pinned to the bottom (per the reference design).

## Scope decisions (confirmed with user)

- **Data shown: API data only.** Render image carousel, title, category,
  price/MRP/discount %, description, similar products, and the cart bar. The
  detail endpoint does **not** return rating, Net Qty, delivery ETA, or tags,
  so these are omitted from v1 (no placeholder/fake data).
- **Entry points: all API product cards.** All four surfaces (home carousels,
  search results, category-details, top-picks) render `DynamicProductCard`, so
  wiring tap-to-open once on that card covers every surface.
- **Bottom bar when in cart: stepper + View cart.** When count is 0 the bar is
  a full-width "Add to cart" button; when count > 0 it becomes a `− qty +`
  stepper plus a "View cart" button.

## API

`GET /app/product/:id`
- Headers: `x-store-id: <storeId>`, auth via `apiClient.get` (Bearer token).
- Response fields used: `_id`, `title`, `slug`, `description`, `mrp`,
  `listPrice`, `dealPrice`, `landingImage`, `images[]`, `categoryId.title`,
  `similarProducts[]`.

Example response:
```json
{
  "_id": "69f2c9520469cfb86fcdd71a",
  "title": "Natu Kodi gudlu",
  "description": "",
  "mrp": 25, "listPrice": 20, "dealPrice": 20,
  "landingImage": "https://.../land-cat-eggs.png",
  "images": ["https://.../land-cat-eggs.png"],
  "categoryId": { "_id": "...", "title": "Dairy & Eggs", "path": "_Dairy-&-Eggs" },
  "similarProducts": []
}
```

## Data layer

Mirrors the existing `searchProductsApi` + query patterns.

### `ProductDetail` view-model (new type)
```ts
interface ProductDetail {
  id: string;
  title: string;
  teluguTitle?: string;     // if API provides one; else undefined
  description: string;
  image: string;            // landingImage || images[0]
  images: string[];         // images[], falling back to [image] when empty
  mrp: number;
  price: number;            // dealPrice ?? listPrice ?? mrp
  discountPct: number;      // 0 when no discount
  categoryTitle?: string;   // categoryId.title
  similarProducts: HomeProduct[]; // reuse mapProduct + isProductActive
}
```

### `productDetailApi.ts`
- `getProductDetail(storeId: string, id: string): Promise<ProductDetail>`
- Calls `apiClient.get(`${WebService.villageBaseURL}/app/product/${id}`,
  { headers: { Accept: '*/*', 'x-store-id': storeId } })`.
- Maps raw → `ProductDetail`. Price math matches `mapProduct`:
  `price = dealPrice ?? listPrice ?? mrp`,
  `discountPct = mrp > price && mrp > 0 ? round((mrp - price)/mrp*100) : 0`.
- `images` falls back to `[image]` when the array is empty.
- `similarProducts`: filter `isProductActive`, map via `mapProduct`.

### `queries/useProductDetailQuery.ts`
- `useQuery` keyed by `[...queryKeys.products.detail(id), { storeId }]`.
- `enabled: !!id && !!storeId`, `staleTime: 5 * 60 * 1000`.
- Add `detail: (id: string) => [...list(), 'detail', { id }]` to `queryKeys.products`.

## Navigation

- New route file `app/product.tsx` rendering `<ProductDetailScreen />`.
- Register `<Stack.Screen name="product" />` in `app/_layout.tsx`.
- Open via `router.push({ pathname: '/product', params: { id } })`.
- In `DynamicProductCard`, wrap the **image + title** area in a `TouchableOpacity`
  that navigates. The ADD button / stepper keep their own handlers so existing
  add-to-cart behavior is unchanged.

## Screen layout (`ProductDetailScreen`)

```
SafeAreaView (flex-1, edges bottom/left/right)
├─ Header row (fixed): ← back | spacer | search + share icons
├─ ScrollView (flex-1)            ← whole page scrolls
│   ├─ ProductImageCarousel: horizontal pager over images[], page dots,
│   │     discount badge (top-left) when discountPct > 0
│   ├─ Title (locale-aware), category label
│   ├─ Price row: ₹price (bold) · ₹mrp strikethrough · "X% Off" ·
│   │     "(inclusive of all taxes)"
│   ├─ Description (only when non-empty)
│   └─ Similar products row (only when similarProducts.length > 0):
│         horizontal list of DynamicProductCard
└─ ProductCartBar (fixed, padded by safe-area bottom inset)
```

### States
- Loading → centered `ActivityIndicator` (green `#16a34a`).
- Error / not found → simple message with a Retry action (refetch).
- Success → layout above.

## Components

- `ProductDetailScreen.tsx` — composition + loading/error/success states.
- `components/ProductImageCarousel.tsx` — horizontal pager + page dots +
  discount badge. Input: `images: string[]`, `discountPct: number`.
- `components/ProductCartBar.tsx` — fixed bottom bar. Input: `count`,
  `onAdd`, `onDec`, `onViewCart`. Renders "Add to cart" when count is 0,
  else stepper + "View cart".
- `useProductDetailViewModel` — reads `id` from route params, runs
  `useProductDetailQuery`, exposes cart count + add/dec/viewCart handlers.

## Add-to-cart behavior

Reuse the exact snapshot logic from `DynamicProductCard.handleAdd` so the cart
pipeline stays consistent (API prices are real rupees; cart works in "units" =
display ×20):

```ts
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
```

`onDec` → `decFromCart(detail.id)`. `onViewCart` → `router.push('/cart')`.

## Out of scope (v1)

- Rating / reviews, Net Qty, delivery ETA badge, product tags (no API data).
- Variants (the detail endpoint returns none for these products).
- Brand display (`brandId` is null in observed payloads).

## File summary

New:
- `app/product.tsx`
- `src/features/product/data/productDetailApi.ts`
- `src/features/product/data/queries/useProductDetailQuery.ts`
- `src/features/product/viewmodel/useProductDetailViewModel.ts`
- `src/features/product/views/ProductDetailScreen.tsx`
- `src/features/product/views/components/ProductImageCarousel.tsx`
- `src/features/product/views/components/ProductCartBar.tsx`

Modified:
- `app/_layout.tsx` (register route)
- `src/base/query/queryKeys.ts` (add `products.detail`)
- `src/features/home/views/home/components/DynamicProductCard.tsx` (tap-to-open)

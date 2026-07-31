// src/features/home/data/productMapper.ts
//
// Maps backend product objects (with variantIds) to the Product interface.
// Extracts comprehensive data from variants including images, pricing, taxes, and stock.

import { Product, Variant } from '@/src/base/types/village.types';
import { toUnits } from '@/src/shared/utils/currency';

/**
 * Shape of a variant as the backend sends it (populated, i.e. already an
 * object rather than a bare ObjectId ref — see `mapVariants`). Every field is
 * `unknown` rather than the plausible JS type: nothing here is validated
 * server-side, every read already goes through `num`/`String`/`Boolean`, and a
 * looser type would just be a type assertion with extra steps.
 */
export interface RawVariant {
  _id?: unknown;
  title?: unknown;
  teluguTitle?: unknown;
  slug?: unknown;
  description?: unknown;
  mrp?: unknown;
  listPrice?: unknown;
  dealPrice?: unknown;
  stockId?: { stock?: unknown };
  stock?: unknown;
  images?: unknown;
  landingImage?: unknown;
  taxType?: unknown;
  taxRate?: unknown;
  hasFreeItem?: unknown;
  hsn?: unknown;
  active?: unknown;
}

/**
 * Shape of a product as the backend sends it, before mapping to `Product` or
 * `HomeProduct`. Shared by every product mapper (this file and
 * homeLayoutMapper.ts) because they map the same conceptual payload from
 * different endpoints; each mapper reads only the subset it needs.
 *
 * `categoryId` is `unknown` rather than a fixed shape because the two
 * endpoints disagree: the page-layout feed sends it unpopulated (a bare id
 * string), product/category-detail endpoints send it populated (`{ _id,
 * title }`). Callers narrow at the point of use rather than the type lying
 * about a single shape.
 */
export interface RawApiProduct {
  _id?: unknown;
  categoryId?: unknown;
  title?: unknown;
  teluguTitle?: unknown;
  rating?: unknown;
  reviews?: unknown;
  description?: unknown;
  manufacturerId?: unknown;
  brandId?: unknown;
  mrp?: unknown;
  listPrice?: unknown;
  dealPrice?: unknown;
  landingImage?: unknown;
  images?: unknown;
  slug?: unknown;
  stock?: unknown;
  active?: unknown;
  /** Populated variant objects — the key newer endpoints send. See `rawVariants`. */
  variants?: unknown;
  /** Legacy key: populated variant objects, or unpopulated ObjectId refs. */
  variantIds?: unknown;
}

/** Read an id out of the loosely-typed `categoryId`, which arrives in two
 *  shapes depending on the endpoint: a bare id string, or a populated
 *  `{ _id, title }` object. Anything else yields the empty default. */
export function populatedCategoryId(categoryId: unknown): string {
  if (typeof categoryId === 'string') return categoryId;
  if (categoryId && typeof categoryId === 'object' && '_id' in categoryId) {
    return String((categoryId as { _id?: unknown })._id ?? '');
  }
  return '';
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The API sends real rupees; everything downstream of a mapper carries internal
 * units (see shared/utils/currency). Converting here — the boundary — is what
 * lets productSnapshot copy a price verbatim and be right for every source.
 */
function toPriceUnits(v: unknown): number {
  return toUnits(num(v));
}

export function mapVariant(v: RawVariant): Variant {
  const mrp = toPriceUnits(v?.mrp);
  const listPrice = toPriceUnits(v?.listPrice);
  const dealPrice = toPriceUnits(v?.dealPrice);
  const price = dealPrice > 0 ? dealPrice : listPrice > 0 ? listPrice : mrp;
  const stock = num(v?.stockId?.stock ?? v?.stock);
  const images = Array.isArray(v?.images) ? v.images : [];
  const primaryImage = v?.landingImage || images[0];

  return {
    id: String(v?._id ?? ''),
    name: String(v?.title ?? ''),
    nameTE: String(v?.teluguTitle ?? ''),
    slug: String(v?.slug ?? ''),
    description: String(v?.description ?? ''),
    price,
    mrp,
    listPrice,
    dealPrice,
    stock,
    landingImage: v?.landingImage ? String(v.landingImage) : undefined,
    image: primaryImage ? String(primaryImage) : undefined,
    images: images.length > 0 ? images.map(String) : undefined,
    taxType: String(v?.taxType ?? ''),
    taxRate: num(v?.taxRate),
    hasFreeItem: Boolean(v?.hasFreeItem),
    hsn: String(v?.hsn ?? ''),
    // A missing flag means active — matches isProductActive/isCategoryActive.
    active: v?.active !== false,
  };
}

/**
 * The raw variant array as the backend sends it. Newer endpoints populate
 * `variants`; the page-layout feed still sends `variantIds` (populated objects
 * or bare ObjectId refs). `variants` wins when a response carries both, so a
 * half-migrated response can never serve stale variant data.
 *
 * Exported because mapProductWithVariants needs the *raw* first entry for an
 * image fallback — reading `p.variantIds[0]` there directly is what would
 * otherwise keep it on the old key.
 */
export function rawVariants(p: RawApiProduct): unknown[] {
  const raw = p?.variants ?? p?.variantIds;
  return Array.isArray(raw) ? raw : [];
}

/**
 * Maps a product's variants, dropping unpopulated refs (a raw ObjectId
 * string instead of the populated variant object) so callers never see a
 * nameless, ₹0 row.
 */
export function mapVariants(p: RawApiProduct): Variant[] {
  return rawVariants(p)
    .filter((v): v is RawVariant => v != null && typeof v === 'object')
    .map(mapVariant);
}

/**
 * Map a backend product object (with variantIds) to the Product interface.
 * - Extracts comprehensive variant data including images, pricing tiers, and tax info
 * - Aggregates stock from all variants
 * - Uses first variant's image and price for product-level defaults
 */
export function mapApiProduct(p: RawApiProduct): Product {
  const variants = mapVariants(p);

  // Aggregate stock from all variants
  const totalStock = variants.reduce((sum: number, v: Variant) => sum + (v.stock ?? 0), 0);

  // Use first variant's price and image for product-level fields
  const firstVariant = variants[0];
  const productPrice = firstVariant?.price ?? 0;
  const productMrp = firstVariant?.mrp ?? 0;
  const productImage = firstVariant?.image;
  const productImages = firstVariant?.images;

  return {
    id: String(p?._id ?? ''),
    categoryId: populatedCategoryId(p?.categoryId),
    name: String(p?.title ?? ''),
    nameTE: String(p?.teluguTitle ?? ''),
    weight: '', // Not provided by backend
    price: productPrice,
    mrp: productMrp,
    rating: num(p?.rating),
    reviews: num(p?.reviews),
    description: String(p?.description ?? ''),
    manufacturerId: String(p?.manufacturerId ?? ''),
    brandId: String(p?.brandId ?? ''),
    stock: totalStock,
    image: productImage,
    images: productImages,
    emoji: '', // Not provided by backend
    gradientFrom: '', // Not provided by backend
    gradientTo: '', // Not provided by backend
    variants: variants.length > 0 ? variants : undefined,
  };
}

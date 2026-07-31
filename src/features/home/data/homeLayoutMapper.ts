// src/features/home/data/homeLayoutMapper.ts
//
// Maps the raw /app/page-layout/path/main payload into ordered HomeSection[].
// `components[]` defines section order and type; each entry's `component` id is
// resolved against bannerCarousels / featuredMenus / productCarousels by _id.

import {
  BannerSection,
  CategorySection,
  HomeLayout,
  HomeProduct,
  HomeSection,
  ProductCarouselSection,
} from './homeLayout.types';

import { Product, Variant } from '@/src/base/types/village.types';
import { toUnits } from '@/src/shared/utils/currency';
import { mapVariants, populatedCategoryId, rawVariants, RawApiProduct, RawVariant } from './productMapper';

/** Raw active-flag shape shared by products, categories, and menus — every
 *  caller only ever reads `active`, so this is deliberately minimal rather
 *  than duplicating the fuller product/category interfaces below. */
interface RawActiveFlagged {
  active?: unknown;
}

interface RawBannerSlide {
  uniqueId?: unknown;
  _id?: unknown;
  title?: unknown;
  imageUrl?: unknown;
  link?: unknown;
}

interface RawBanner {
  _id?: unknown;
  title?: unknown;
  hideTitle?: unknown;
  slides?: unknown;
  height?: unknown;
  autoScroll?: unknown;
  autoPlayDelay?: unknown;
  itemsPerSlide?: unknown;
}

interface RawMenuItem extends RawActiveFlagged {
  docId?: unknown;
  uniqueId?: unknown;
  title?: unknown;
  imageUrl?: unknown;
  link?: unknown;
}

interface RawFeaturedMenu extends RawActiveFlagged {
  _id?: unknown;
  title?: unknown;
  hideTitle?: unknown;
  menuItems?: unknown;
}

interface RawProductCarousel {
  _id?: unknown;
  title?: unknown;
  hideTitle?: unknown;
  products?: unknown;
}

interface RawLayoutComponent {
  collection?: unknown;
  component?: unknown;
}

interface RawHomeLayoutRoot {
  _id?: unknown;
  title?: unknown;
  path?: unknown;
  bannerCarousels?: unknown;
  featuredMenus?: unknown;
  productCarousels?: unknown;
  components?: unknown;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Coerce to a non-empty string, or undefined — mirrors the `x || undefined`
 *  fallback every mapper here already used, just typed for an `unknown` input. */
function str(v: unknown): string | undefined {
  return v ? String(v) : undefined;
}

/** The network layer hands back either the payload itself or `{ data: payload }`;
 *  narrow to a plain object either way before reading named fields off it. */
function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function byId<T extends { _id?: unknown }>(arr: T[], id: string): T | undefined {
  return arr.find((x) => String(x?._id) === String(id));
}

/**
 * Inactive products (`active: false`) are hidden everywhere — feed, search, and
 * category listings — so they can never be added to the cart or ordered. A
 * missing `active` flag is treated as active.
 */
export function isProductActive(p: RawActiveFlagged): boolean {
  return p?.active !== false;
}

/**
 * Map backend product with variants (variantIds) to Product interface.
 * Handles both API products with variantIds and legacy products.
 */
export function mapProductWithVariants(p: RawApiProduct): Product {
  const variants = mapVariants(p);

  // Use first variant's price for product-level price, or fallback to dealPrice/listPrice/mrp
  const firstVariant = variants[0];
  const productPrice = firstVariant?.price ?? toUnits(num(p?.dealPrice ?? p?.listPrice ?? p?.mrp));
  const productMrp = firstVariant?.mrp ?? toUnits(num(p?.mrp));

  // Extract image from product or first variant. The raw (pre-mapVariants) first
  // entry is read directly here, matching the pre-existing fallback order;
  // `variantIds` is `unknown` on the raw type, so this narrows once at the single
  // nested access rather than typing every level of an already-raw JSON blob.
  const rawFirstVariant = rawVariants(p)[0] as RawVariant | undefined;
  const image = String(
    p?.landingImage ||
    (Array.isArray(p?.images) ? p.images[0] : undefined) ||
    (firstVariant && (rawFirstVariant?.landingImage || Array.isArray(rawFirstVariant?.images))
      ? (rawFirstVariant?.images as unknown[] | undefined)?.[0]
      : undefined) ||
    ''
  );

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
    emoji: undefined,
    gradientFrom: undefined,
    gradientTo: undefined,
    image,
    categoryName: str(p?.category),
    categoryPath: str(p?.categoryPath),
    variants: variants.length > 0 ? variants : undefined,
  };
}

/**
 * Inactive categories (`active: false`) are hidden everywhere — the home page,
 * the Categories page, and the Category Details rail (all driven by the same
 * page-layout). A missing `active` flag is treated as active.
 */
export function isCategoryActive(c: RawActiveFlagged): boolean {
  return c?.active !== false;
}

export function mapProduct(p: RawApiProduct): HomeProduct {
  // Unpopulated refs (a raw ObjectId string instead of the variant object)
  // are dropped by mapVariants, so an all-unpopulated array collapses to
  // undefined rather than a truthy [] that would swallow the stock fallback.
  const mapped = mapVariants(p);
  const variants = mapped.length > 0 ? mapped : undefined;
  const first = variants?.[0];

  const mrp = first?.mrp ?? toUnits(num(p?.mrp));
  const price = first?.price ?? toUnits(num(p?.dealPrice ?? p?.listPrice ?? p?.mrp));
  const discountPct = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

  // Use variant image if available, otherwise product image
  const image = String(
    first?.image ||
    p?.landingImage ||
    (Array.isArray(p?.images) ? p.images[0] : undefined) ||
    ''
  );

  const slug = str(p?.slug);

  // Get stock from variants if available, otherwise fallback to root stock
  const totalStock = variants
    ? variants.reduce((sum: number, v: Variant) => sum + (v.stock ?? 0), 0)
    : num(p?.stock);

  return {
    id: String(p?._id ?? ''),
    title: String(p?.title ?? ''),
    teluguTitle: str(p?.teluguTitle),
    image,
    mrp,
    price,
    discountPct,
    inStock: totalStock > 0,
    stock: totalStock,
    slug,
    link: slug ? `/${slug}` : undefined,
    // Both shapes (bare id string, populated object) resolve through the same
    // helper — see RawApiProduct's doc comment. HomeProduct's categoryId is
    // optional, so an absent field stays undefined rather than becoming ''.
    categoryId: populatedCategoryId(p?.categoryId) || undefined,
    categoryName: str(p?.category),
    categoryPath: str(p?.categoryPath),
    hasVariants: (variants?.length ?? 0) > 1,
    variants,
  };
}

function mapBanner(b: RawBanner): BannerSection {
  const slides: RawBannerSlide[] = Array.isArray(b?.slides) ? b.slides : [];
  return {
    kind: 'banner',
    id: String(b?._id ?? ''),
    title: String(b?.title ?? ''),
    hideTitle: Boolean(b?.hideTitle),
    slides: slides.map((s) => ({
      id: String(s?.uniqueId ?? s?._id ?? ''),
      title: String(s?.title ?? ''),
      imageUrl: String(s?.imageUrl ?? ''),
      link: str(s?.link),
    })),
    height: num(b?.height) || 200,
    autoScroll: Boolean(b?.autoScroll),
    autoPlayDelay: num(b?.autoPlayDelay),
    itemsPerSlide: num(b?.itemsPerSlide) || 1,
  };
}

function mapCategory(m: RawFeaturedMenu): CategorySection {
  const menuItems: RawMenuItem[] = Array.isArray(m?.menuItems) ? m.menuItems : [];
  return {
    kind: 'category',
    id: String(m?._id ?? ''),
    title: String(m?.title ?? ''),
    hideTitle: Boolean(m?.hideTitle),
    items: menuItems.filter(isCategoryActive).map((it) => ({
      id: String(it?.docId ?? it?.uniqueId ?? ''),
      title: String(it?.title ?? ''),
      imageUrl: String(it?.imageUrl ?? ''),
      link: str(it?.link),
    })),
  };
}

function mapProductCarousel(pc: RawProductCarousel): ProductCarouselSection {
  const products: RawApiProduct[] = Array.isArray(pc?.products) ? pc.products : [];
  return {
    kind: 'productCarousel',
    id: String(pc?._id ?? ''),
    title: String(pc?.title ?? ''),
    hideTitle: Boolean(pc?.hideTitle),
    products: products.filter(isProductActive).map(mapProduct),
  };
}

export function mapHomeLayout(raw: unknown): HomeLayout {
  const envelope = asRecord(raw);
  const root = asRecord(envelope.data ?? envelope) as RawHomeLayoutRoot;
  const banners: RawBanner[] = Array.isArray(root.bannerCarousels) ? root.bannerCarousels : [];
  const menus: RawFeaturedMenu[] = Array.isArray(root.featuredMenus) ? root.featuredMenus : [];
  const carousels: RawProductCarousel[] = Array.isArray(root.productCarousels) ? root.productCarousels : [];
  const components: RawLayoutComponent[] = Array.isArray(root.components) ? root.components : [];

  const sections: HomeSection[] = [];
  for (const c of components) {
    const id = String(c?.component ?? '');
    if (c?.collection === 'BannerCarousel') {
      const b = byId(banners, id);
      if (b) sections.push(mapBanner(b));
    } else if (c?.collection === 'FeaturedMenu') {
      const m = byId(menus, id);
      if (m && isCategoryActive(m)) sections.push(mapCategory(m));
    } else if (c?.collection === 'ProductCarousel') {
      const pc = byId(carousels, id);
      if (pc) sections.push(mapProductCarousel(pc));
    }
  }

  return {
    id: String(root._id ?? ''),
    title: String(root.title ?? ''),
    path: String(root.path ?? ''),
    sections,
  };
}

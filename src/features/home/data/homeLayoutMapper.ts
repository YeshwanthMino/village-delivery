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

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function byId(arr: any[], id: string): any {
  return arr.find((x) => String(x?._id) === String(id));
}

/**
 * Inactive products (`active: false`) are hidden everywhere — feed, search, and
 * category listings — so they can never be added to the cart or ordered. A
 * missing `active` flag is treated as active.
 */
export function isProductActive(p: any): boolean {
  return p?.active !== false;
}

function mapVariant(v: any): Variant {
  const mrp = num(v?.mrp);
  const price = num(v?.dealPrice ?? v?.listPrice ?? v?.mrp);
  // Get stock from stockId nested object if available
  const stock = v?.stockId?.stock ?? num(v?.stock);

  return {
    name: String(v?.title ?? ''),
    price,
    mrp,
    stock,
  };
}

/**
 * Map backend product with variants (variantIds) to Product interface.
 * Handles both API products with variantIds and legacy products.
 */
export function mapProductWithVariants(p: any): Product {
  const variants = Array.isArray(p?.variantIds)
    ? p.variantIds.map(mapVariant)
    : [];

  // Use first variant's price for product-level price, or fallback to dealPrice/listPrice/mrp
  const firstVariant = variants[0];
  const productPrice = firstVariant?.price ?? num(p?.dealPrice ?? p?.listPrice ?? p?.mrp);
  const productMrp = firstVariant?.mrp ?? num(p?.mrp);

  // Extract image from product or first variant
  const image = p?.landingImage || (Array.isArray(p?.images) ? p.images[0] : undefined) ||
                (firstVariant && (p?.variantIds?.[0]?.landingImage || Array.isArray(p?.variantIds?.[0]?.images) ? p.variantIds[0].images[0] : undefined)) || '';

  return {
    id: String(p?._id ?? ''),
    categoryId: String(p?.categoryId?._id ?? ''),
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
    variants: variants.length > 0 ? variants : undefined,
  };
}

/**
 * Inactive categories (`active: false`) are hidden everywhere — the home page,
 * the Categories page, and the Category Details rail (all driven by the same
 * page-layout). A missing `active` flag is treated as active.
 */
export function isCategoryActive(c: any): boolean {
  return c?.active !== false;
}

export function mapProduct(p: any): HomeProduct {
  const mrp = num(p?.mrp);
  const price = num(p?.dealPrice ?? p?.listPrice ?? p?.mrp);
  const discountPct = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const image = p?.landingImage || (Array.isArray(p?.images) ? p.images[0] : undefined) || '';
  const slug = p?.slug || undefined;

  // Get stock from variants if available, otherwise fallback to root stock
  let totalStock = num(p?.stock);
  if (Array.isArray(p?.variantIds) && p.variantIds.length > 0) {
    // Sum stock from all variants
    totalStock = p.variantIds.reduce((sum: number, v: any) => {
      const variantStock = v?.stockId?.stock ?? num(v?.stock);
      return sum + variantStock;
    }, 0);
  }

  return {
    id: String(p?._id ?? ''),
    title: String(p?.title ?? ''),
    teluguTitle: p?.teluguTitle || undefined,
    image,
    mrp,
    price,
    discountPct,
    inStock: totalStock > 0,
    slug,
    link: slug ? `/${slug}` : undefined,
    categoryId: p?.categoryId || undefined,
  };
}

function mapBanner(b: any): BannerSection {
  return {
    kind: 'banner',
    id: String(b?._id ?? ''),
    title: String(b?.title ?? ''),
    hideTitle: Boolean(b?.hideTitle),
    slides: (Array.isArray(b?.slides) ? b.slides : []).map((s: any) => ({
      id: String(s?.uniqueId ?? s?._id ?? ''),
      title: String(s?.title ?? ''),
      imageUrl: String(s?.imageUrl ?? ''),
      link: s?.link || undefined,
    })),
    height: num(b?.height) || 200,
    autoScroll: Boolean(b?.autoScroll),
    autoPlayDelay: num(b?.autoPlayDelay),
    itemsPerSlide: num(b?.itemsPerSlide) || 1,
  };
}

function mapCategory(m: any): CategorySection {
  return {
    kind: 'category',
    id: String(m?._id ?? ''),
    title: String(m?.title ?? ''),
    hideTitle: Boolean(m?.hideTitle),
    items: (Array.isArray(m?.menuItems) ? m.menuItems : []).filter(isCategoryActive).map((it: any) => ({
      id: String(it?.docId ?? it?.uniqueId ?? ''),
      title: String(it?.title ?? ''),
      imageUrl: String(it?.imageUrl ?? ''),
      link: it?.link || undefined,
    })),
  };
}

function mapProductCarousel(pc: any): ProductCarouselSection {
  return {
    kind: 'productCarousel',
    id: String(pc?._id ?? ''),
    title: String(pc?.title ?? ''),
    hideTitle: Boolean(pc?.hideTitle),
    products: (Array.isArray(pc?.products) ? pc.products : []).filter(isProductActive).map(mapProduct),
  };
}

export function mapHomeLayout(raw: any): HomeLayout {
  const root = raw?.data ?? raw ?? {};
  const banners = Array.isArray(root.bannerCarousels) ? root.bannerCarousels : [];
  const menus = Array.isArray(root.featuredMenus) ? root.featuredMenus : [];
  const carousels = Array.isArray(root.productCarousels) ? root.productCarousels : [];
  const components = Array.isArray(root.components) ? root.components : [];

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

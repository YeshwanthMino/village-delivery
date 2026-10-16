// src/features/home/data/bannerNavigation.ts
//
// Decides where a banner slide navigates. Returns undefined when the slide is
// not a Sale slide or has no usable slug, so callers can skip navigation.

import { BannerSlide } from './homeLayout.types';

export const SALE_COLLECTION = 'Sale';
export const CATEGORY_COLLECTION = 'Category';

const SALE_LINK = /^\/sale\/([^/?#]+)/;

/** Slug from `docId.slug` (BannerSlide.doc.slug), falling back to a `/sale/<slug>` link. */
export function getSaleSlug(
  slide: Pick<BannerSlide, 'collectionName' | 'doc' | 'link'>,
): string | undefined {
  if (slide.collectionName !== SALE_COLLECTION) return undefined;
  const slug = slide.doc?.slug?.trim() || slide.link?.match(SALE_LINK)?.[1];
  return slug || undefined;
}

/** Category id from `docId` (BannerSlide.doc.id) for a Category slide. */
export function getCategoryId(
  slide: Pick<BannerSlide, 'collectionName' | 'doc'>,
): string | undefined {
  if (slide.collectionName !== CATEGORY_COLLECTION) return undefined;
  return slide.doc?.id?.trim() || undefined;
}

// src/features/home/views/home/components/HomeSections.tsx
//
// Renders ordered HomeSection[] into the matching section component.

import { useGuardedRouter } from '@/src/shared/hooks/useGuardedRouter';
import { Product } from '@/src/base/types/village.types';
import React from 'react';
import { BannerSlide, CategoryItem, CategorySection, HomeSection } from '../../../data/homeLayout.types';
import { CategoryGrid } from './CategoryGrid';
import { HomeBannerCarousel } from './HomeBannerCarousel';
import { ProductCarouselRow } from './ProductCarouselRow';
import { getCategoryId, getSaleSlug } from '../../../data/bannerNavigation';
import { analytics } from '@/src/base/services/analytics';
import type { AnalyticsProductContext } from '@/src/base/services/analytics';

interface Props {
  sections: HomeSection[];
  onOpenVariants: (product: Product, context?: AnalyticsProductContext) => void;
  source?: 'home' | 'categories';
  registerImpressionCheck?: (check: () => void) => () => void;
}

export const HomeSections = ({ sections, onOpenVariants, source = 'home', registerImpressionCheck }: Props) => {
  const router = useGuardedRouter();

  const goCategory = (item: CategoryItem, section: CategorySection) => {
    analytics.track('category_selected', { category_id: item.id, section_id: section.id });
    router.push({
      pathname: '/category-details',
      params: {
        categoryId: item.id,
        title: section.title,
        subcategories: JSON.stringify(section.items),
      },
    } as any);
  };

  // Sale and Category banners have a native route. Other collections (and slides
  // with no usable docId/slug) stay a no-op rather than navigating nowhere.
  const goBanner = (slide: BannerSlide) => {
    const categoryId = getCategoryId(slide);
    if (categoryId) {
      analytics.track('banner_selected', { banner_id: slide.id, target_type: 'category', target_id: categoryId });
      // Reuse the home category section that lists this category so the details
      // page gets its name and sibling rail; fall back to the bare id.
      const section = sections.find(
        (s): s is CategorySection => s.kind === 'category' && s.items.some((i) => i.id === categoryId),
      );
      const item = section?.items.find((i) => i.id === categoryId);
      router.push({
        pathname: '/category-details',
        params: {
          categoryId,
          title: item?.title ?? section?.title ?? '',
          ...(section ? { subcategories: JSON.stringify(section.items) } : {}),
        },
      } as any);
      return;
    }
    const slug = getSaleSlug(slide);
    analytics.track('banner_selected', {
      banner_id: slide.id,
      target_type: slug ? 'sale' : 'unknown',
      ...(slug ? { target_id: slug } : {}),
    });
    if (!slug) return;
    router.push({ pathname: '/sale-products', params: { slug } } as any);
  };

  return (
    <>
      {sections.map((section) => {
        if (section.kind === 'banner') {
          return <HomeBannerCarousel key={section.id} section={section} onPressSlide={goBanner} />;
        }
        if (section.kind === 'category') {
          return <CategoryGrid key={section.id} section={section} onPressItem={goCategory} />;
        }
        return <ProductCarouselRow key={section.id} section={section} onOpenVariants={onOpenVariants} source={source} registerImpressionCheck={registerImpressionCheck} />;
      })}
    </>
  );
};

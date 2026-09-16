// src/features/home/views/home/components/HomeSections.tsx
//
// Renders ordered HomeSection[] into the matching section component.

import { useRouter } from 'expo-router';
import React from 'react';
import { CategoryItem, CategorySection, HomeSection } from '../../../data/homeLayout.types';
import { CategoryGrid } from './CategoryGrid';
import { HomeBannerCarousel } from './HomeBannerCarousel';
import { ProductCarouselRow } from './ProductCarouselRow';

interface Props {
  sections: HomeSection[];
}

export const HomeSections = ({ sections }: Props) => {
  const router = useRouter();

  const goCategory = (item: CategoryItem, section: CategorySection) =>
    router.push({
      pathname: '/category-details',
      params: {
        categoryId: item.id,
        title: section.title,
        subcategories: JSON.stringify(section.items),
      },
    } as any);

  // Banner slide links are slug paths (e.g. /category/<slug>) with no matching
  // native route yet; left as a no-op until product/category slug routes exist.
  const goBanner = (_link?: string) => {};

  return (
    <>
      {sections.map((section) => {
        if (section.kind === 'banner') {
          return <HomeBannerCarousel key={section.id} section={section} onPressSlide={goBanner} />;
        }
        if (section.kind === 'category') {
          return <CategoryGrid key={section.id} section={section} onPressItem={goCategory} />;
        }
        return <ProductCarouselRow key={section.id} section={section} />;
      })}
    </>
  );
};

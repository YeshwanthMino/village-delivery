// src/features/home/views/home/components/HomeSkeleton.tsx
//
// Shimmer placeholder shown in the Home body while the page-layout loads.

import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/src/shared/components';

const CategoryColumn = () => (
  <View className="items-center" style={{ width: 72 }}>
    <Skeleton width={56} height={56} radius={28} />
    <Skeleton width={48} height={10} radius={6} style={{ marginTop: 8 }} />
  </View>
);

const ProductCard = () => (
  <View style={{ width: 130 }}>
    <Skeleton width={130} height={110} radius={16} />
    <Skeleton width={110} height={12} radius={6} style={{ marginTop: 8 }} />
    <Skeleton width={70} height={12} radius={6} style={{ marginTop: 6 }} />
  </View>
);

export const HomeSkeleton = () => (
  <View className="px-4 pt-4">
    {/* Banner */}
    <Skeleton height={150} radius={20} />

    {/* Category row */}
    <View className="flex-row justify-between mt-6">
      <CategoryColumn />
      <CategoryColumn />
      <CategoryColumn />
      <CategoryColumn />
    </View>

    {/* Section title + product row */}
    <Skeleton width={160} height={18} radius={8} style={{ marginTop: 28 }} />
    <View className="flex-row mt-4" style={{ gap: 14 }}>
      <ProductCard />
      <ProductCard />
      <ProductCard />
    </View>

    {/* Second section */}
    <Skeleton width={140} height={18} radius={8} style={{ marginTop: 28 }} />
    <View className="flex-row mt-4" style={{ gap: 14 }}>
      <ProductCard />
      <ProductCard />
      <ProductCard />
    </View>
  </View>
);

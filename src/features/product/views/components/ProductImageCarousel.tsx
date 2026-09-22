// src/features/product/views/components/ProductImageCarousel.tsx

import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, View } from 'react-native';

interface Props {
  images: string[];
  discountPct: number;
}

const { width: SCREEN_W } = Dimensions.get('window');

export const ProductImageCarousel = ({ images, discountPct }: Props) => {
  const [page, setPage] = useState(0);
  const pics = images.length > 0 ? images : [''];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W), pics.length - 1);
    if (next !== page) setPage(next);
  };

  return (
    <View className="bg-white">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {pics.map((uri, i) => (
          <Image
            key={`${uri}-${i}`}
            source={{ uri }}
            style={{ width: SCREEN_W, aspectRatio: 1, backgroundColor: '#f8fafc' }}
            contentFit="contain"
            transition={150}
          />
        ))}
      </ScrollView>

      {discountPct > 0 ? (
        <View className="absolute top-3 left-3 bg-green-600 rounded-md px-2 py-1">
          <Text className="text-white text-xs font-extrabold">{discountPct}% OFF</Text>
        </View>
      ) : null}

      {pics.length > 1 ? (
        <View className="flex-row items-center justify-center gap-1.5 py-3">
          {pics.map((_, i) => (
            <View
              key={i}
              className={`h-1.5 rounded-full ${i === page ? 'w-4 bg-green-600' : 'w-1.5 bg-slate-300'}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

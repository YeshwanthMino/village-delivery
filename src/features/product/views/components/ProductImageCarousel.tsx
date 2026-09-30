// src/features/product/views/components/ProductImageCarousel.tsx

import { Image } from 'expo-image';
import React, { useState } from 'react';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, View } from 'react-native';

interface Props {
  images: string[];
  discountPct: number;
  soldOut?: boolean;
}

const { width: SCREEN_W } = Dimensions.get('window');

export const ProductImageCarousel = ({ images, discountPct, soldOut = false }: Props) => {
  const { t } = useTranslation();
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
            style={{ width: SCREEN_W, aspectRatio: 1, backgroundColor: '#f8fafc', opacity: soldOut ? 0.5 : 1 }}
            contentFit="contain"
            transition={150}
          />
        ))}
      </ScrollView>

      {soldOut ? (
        // Covers the image area only (square, SCREEN_W tall) — not the dots below —
        // and lets touches through so the gallery still swipes.
        <View
          pointerEvents="none"
          className="absolute top-0 left-0 items-center justify-center"
          style={{ width: SCREEN_W, height: SCREEN_W }}
        >
          <View
            className="border-2 border-red-600 rounded-md px-4 py-1 bg-white/70"
            style={{ transform: [{ rotate: '-6deg' }] }}
          >
            <Text className="text-red-600 font-extrabold text-2xl tracking-wide">{t('sold_out')}</Text>
          </View>
        </View>
      ) : null}

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

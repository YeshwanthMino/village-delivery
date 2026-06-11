// src/features/home/views/home/components/HomeBannerCarousel.tsx

import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { BannerSection } from '../../../data/homeLayout.types';

interface Props {
  section: BannerSection;
  onPressSlide: (link?: string) => void;
}

const H_PAD = 16;

export const HomeBannerCarousel = ({ section, onPressSlide }: Props) => {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - H_PAD * 2;
  const height = Math.min(Math.max(section.height || 180, 120), 200);

  const scrollRef = useRef<ScrollView>(null);
  const currentRef = useRef(0);
  const [current, setCurrent] = useState(0);

  const slides = section.slides;
  const delay = section.autoPlayDelay && section.autoPlayDelay > 0 ? section.autoPlayDelay : 4000;

  useEffect(() => {
    if (!section.autoScroll || slides.length <= 1) return;
    const timer = setInterval(() => {
      const next = (currentRef.current + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
      currentRef.current = next;
      setCurrent(next);
    }, delay);
    return () => clearInterval(timer);
  }, [section.autoScroll, slides.length, cardWidth, delay]);

  if (!slides.length) return null;

  return (
    <View style={{ paddingTop: 12 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: H_PAD }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
          currentRef.current = idx;
          setCurrent(idx);
        }}
      >
        {slides.map((slide) => (
          <TouchableOpacity
            key={slide.id}
            activeOpacity={0.9}
            onPress={() => onPressSlide(slide.link)}
            style={{ width: cardWidth, height, borderRadius: 16, overflow: 'hidden' }}
          >
            <Image
              source={{ uri: slide.imageUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {slides.length > 1 ? (
        <View className="flex-row justify-center mt-2 gap-1.5">
          {slides.map((s, i) => (
            <View
              key={s.id}
              className={`h-1.5 rounded-full ${i === current ? 'bg-green-600 w-4' : 'bg-slate-300 w-1.5'}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

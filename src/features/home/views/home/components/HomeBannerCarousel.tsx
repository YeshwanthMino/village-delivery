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
const GAP = 12; // space between cards
const PEEK = 28; // sliver of the next card shown past the gap

export const HomeBannerCarousel = ({ section, onPressSlide }: Props) => {
  const { width: screenWidth } = useWindowDimensions();
  // Leave room on the right for the gap + a peek of the next card.
  const cardWidth = screenWidth - H_PAD - GAP - PEEK;
  const snapInterval = cardWidth + GAP;

  const scrollRef = useRef<ScrollView>(null);
  const currentRef = useRef(0);
  const [current, setCurrent] = useState(0);

  // Banner artwork has text baked in, so a fixed card height + cover crops the
  // top/bottom (e.g. the SHOP NOW button). Track each slide's real aspect ratio
  // and size the card to the CURRENT slide → cover fills exactly, no vertical
  // crop, even when slides differ in dimensions. Fallback before images load.
  const [aspects, setAspects] = useState<Record<number, number>>({});
  const fallbackHeight = Math.min(Math.max(section.height || 180, 120), 200);
  const currentAspect = aspects[current];
  const height = currentAspect ? Math.round(cardWidth / currentAspect) : fallbackHeight;

  const slides = section.slides;
  const delay = section.autoPlayDelay && section.autoPlayDelay > 0 ? section.autoPlayDelay : 4000;

  useEffect(() => {
    if (!section.autoScroll || slides.length <= 1) return;
    const timer = setInterval(() => {
      const next = (currentRef.current + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: next * snapInterval, animated: true });
      currentRef.current = next;
      setCurrent(next);
    }, delay);
    return () => clearInterval(timer);
  }, [section.autoScroll, slides.length, snapInterval, delay]);

  if (!slides.length) return null;

  return (
    <View style={{ paddingTop: 12 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: H_PAD, paddingRight: H_PAD }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / snapInterval);
          currentRef.current = idx;
          setCurrent(idx);
        }}
      >
        {slides.map((slide, i) => (
          // Card width leaves a gap + peek of the next card on the right. Snap
          // interval = cardWidth + GAP keeps each card aligned to the left inset.
          <View key={slide.id} style={{ width: cardWidth, marginRight: i < slides.length - 1 ? GAP : 0 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onPressSlide(slide.link)}
              style={{ width: cardWidth, height, borderRadius: 16, overflow: 'hidden' }}
            >
              <Image
                source={{ uri: slide.imageUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
                onLoad={(e) => {
                  const { width: w, height: h } = e.source ?? {};
                  if (w && h) setAspects((prev) => (prev[i] ? prev : { ...prev, [i]: w / h }));
                }}
              />
            </TouchableOpacity>
          </View>
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

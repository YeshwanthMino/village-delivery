// src/features/home/views/home/components/HomeBannerCarousel.tsx

import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { BannerSection, BannerSlide } from '../../../data/homeLayout.types';
import { loopBannerSlides, useBannerCarousel } from '@/src/shared/hooks/useBannerCarousel';

interface Props {
  section: BannerSection;
  onPressSlide: (slide: BannerSlide) => void;
}

const H_PAD = 16;
const GAP = 12; // space between cards
const PEEK = 28; // sliver of the next card shown past the gap

export const HomeBannerCarousel = ({ section, onPressSlide }: Props) => {
  const { width: screenWidth } = useWindowDimensions();
  const slides = section.slides;
  // Leave room on the right for the gap + a peek of the next card.
  const cardWidth = Math.max(1, screenWidth - H_PAD - (slides.length > 1 ? GAP + PEEK : H_PAD));
  const snapInterval = cardWidth + GAP;
  const delay = Number.isFinite(section.autoPlayDelay) && section.autoPlayDelay > 0 ? section.autoPlayDelay : 4000;
  const { current, scrollRef, scrollHandlers } = useBannerCarousel({
    count: slides.length,
    snapInterval,
    autoPlay: section.autoScroll,
    delay,
    slidesKey: JSON.stringify(slides.map(slide => [slide.id, slide.imageUrl])),
  });
  const renderedSlides = loopBannerSlides(slides);

  // Use the first artwork's ratio for a stable track height. Other image sizes
  // fit inside it without cropping their text or resizing the page on each swipe.
  const [aspects, setAspects] = useState<Record<string, number>>({});
  const fallbackHeight = Math.min(Math.max(section.height || 180, 120), 200);
  const firstAspect = aspects[slides[0]?.imageUrl];
  const height = firstAspect ? Math.round(cardWidth / firstAspect) : fallbackHeight;

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
        bounces={false}
        scrollEnabled={slides.length > 1}
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: slides.length > 1 ? snapInterval : 0, y: 0 }}
        contentContainerStyle={{ paddingLeft: H_PAD, paddingRight: slides.length > 1 ? GAP + PEEK : H_PAD }}
        {...scrollHandlers}
      >
        {renderedSlides.map((slide, i) => (
          // Card width leaves a gap + peek of the next card on the right. Snap
          // interval = cardWidth + GAP keeps each card aligned to the left inset.
          <View key={`${slide.id}-${i}`} style={{ width: cardWidth, marginRight: i < renderedSlides.length - 1 ? GAP : 0 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onPressSlide(slide)}
              style={{ width: cardWidth, height, borderRadius: 16, overflow: 'hidden' }}
            >
              <Image
                source={{ uri: slide.imageUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                transition={200}
                onLoad={(e) => {
                  const { width: w, height: h } = e.source ?? {};
                  if (slide.imageUrl === slides[0]?.imageUrl && w && h) {
                    setAspects((prev) => (prev[slide.imageUrl] === w / h ? prev : { ...prev, [slide.imageUrl]: w / h }));
                  }
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

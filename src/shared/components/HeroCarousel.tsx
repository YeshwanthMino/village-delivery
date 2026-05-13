import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { gradientColor } from '@/src/core/utils/gradientColors';
import { HeroSlide } from '@/src/features/home/data/static/villageData';

interface HeroCarouselProps {
  slides: HeroSlide[];
  onShopNow?: () => void;
}

export const HeroCarousel = ({ slides, onShopNow }: HeroCarouselProps) => {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 32; // 16px padding on each side (px-4)
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const currentRef = useRef(0);

  // Auto-rotate every 4.5s
  useEffect(() => {
    const timer = setInterval(() => {
      const next = (currentRef.current + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
      currentRef.current = next;
      setCurrent(next);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length, cardWidth]);

  return (
    <View className="px-4 pt-4">
      {/* Carousel */}
      <View style={{ borderRadius: 16, overflow: 'hidden', height: 180 }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
            currentRef.current = idx;
            setCurrent(idx);
          }}
        >
          {slides.map((slide, i) => (
            <LinearGradient
              key={i}
              colors={[gradientColor(slide.gradientFrom), gradientColor(slide.gradientTo)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: cardWidth, height: 180, padding: 20, justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 }}>
                    <Text style={{ color: 'white', fontSize: 10, fontFamily: 'EuclidCircularA-Bold', letterSpacing: 2 }}>{slide.tag}</Text>
                  </View>
                  <Text style={{ color: 'white', fontSize: 22, fontFamily: 'EuclidCircularA-Bold', lineHeight: 28 }}>{slide.title}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>{slide.subtitle}</Text>
                </View>
                <Text style={{ fontSize: 64, marginLeft: 8 }}>{slide.emoji}</Text>
              </View>
              <Pressable
                onPress={onShopNow}
                style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 }}
              >
                <Text style={{ color: 'white', fontFamily: 'EuclidCircularA-Bold', fontSize: 14 }}>Shop Now</Text>
              </Pressable>
            </LinearGradient>
          ))}
        </ScrollView>
      </View>

      {/* Dot indicators */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === current ? 24 : 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: i === current ? '#16a34a' : '#cbd5e1',
            }}
          />
        ))}
      </View>
    </View>
  );
};

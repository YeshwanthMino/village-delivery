import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { HeroSlide } from '@/src/features/home/data/static/villageData';

interface HeroCarouselProps {
  slides: HeroSlide[];
  onShopNow?: () => void;
}

export const HeroCarousel = ({ slides, onShopNow }: HeroCarouselProps) => {
  const [current, setCurrent] = useState(0);
  const opacities = useRef(slides.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => {
        const next = (prev + 1) % slides.length;
        Animated.parallel([
          Animated.timing(opacities[prev], { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(opacities[next], { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
        return next;
      });
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <View className="px-4 pt-4">
      <View className="relative overflow-hidden rounded-2xl" style={{ height: 180 }}>
        {slides.map((slide, i) => (
          <Animated.View
            key={i}
            style={{ opacity: opacities[i] }}
            className={`absolute inset-0 bg-gradient-to-br ${slide.gradientFrom} ${slide.gradientTo} p-5 justify-between`}
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <View className="self-start bg-white/20 rounded-full px-3 py-1 mb-3">
                  <Text className="text-white text-[10px] font-bold tracking-widest">{slide.tag}</Text>
                </View>
                <Text className="text-white text-[22px] font-black leading-tight">{slide.title}</Text>
                <Text className="text-white/80 text-xs mt-1">{slide.subtitle}</Text>
              </View>
              <Text style={{ fontSize: 64 }} className="ml-2">{slide.emoji}</Text>
            </View>
            <Pressable
              onPress={onShopNow}
              className="self-start bg-white/25 border border-white/40 rounded-xl px-4 py-2"
            >
              <Text className="text-white font-bold text-sm">Shop Now</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      {/* Dot indicators */}
      <View className="flex-row justify-center gap-1.5 mt-3">
        {slides.map((_, i) => (
          <View
            key={i}
            className={i === current
              ? 'w-6 h-1.5 bg-green-600 rounded-full'
              : 'w-1.5 h-1.5 bg-slate-300 rounded-full'}
          />
        ))}
      </View>
    </View>
  );
};

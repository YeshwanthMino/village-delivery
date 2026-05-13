import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { gradientColor } from '@/src/core/utils/gradientColors';
import { HeroSlide } from '@/src/features/home/data/static/villageData';

interface HeroCarouselProps {
  slides: HeroSlide[];
  onShopNow?: () => void;
}

// Spacing constants for the peek carousel
const LEFT_PAD = 16;   // left padding before first card
const RIGHT_PEEK = 28; // px of next card visible on right
const CARD_GAP = 12;   // gap between cards

export const HeroCarousel = ({ slides, onShopNow }: HeroCarouselProps) => {
  const { width: screenWidth } = useWindowDimensions();
  // Card width leaves RIGHT_PEEK + CARD_GAP px of space for adjacent card peek
  const cardWidth = screenWidth - LEFT_PAD - RIGHT_PEEK - CARD_GAP;
  const snapInterval = cardWidth + CARD_GAP;

  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const currentRef = useRef(0);

  // Auto-rotate every 4.5s
  useEffect(() => {
    const timer = setInterval(() => {
      const next = (currentRef.current + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: next * snapInterval, animated: true });
      currentRef.current = next;
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length, snapInterval]);

  return (
    <View style={{ paddingTop: 16 }}>
      {/* Full-width ScrollView — cards are narrower so adjacent one peeks */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        contentContainerStyle={{
          paddingLeft: LEFT_PAD,
          // Right padding = PEEK + GAP so the last card can fully snap to LEFT_PAD position
          paddingRight: RIGHT_PEEK + CARD_GAP,
        }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / snapInterval);
          const clamped = Math.max(0, Math.min(idx, slides.length - 1));
          currentRef.current = clamped;
          setCurrent(clamped);
        }}
      >
        {slides.map((slide, i) => (
          <View
            key={i}
            style={[
              styles.card,
              {
                width: cardWidth,
                marginRight: i < slides.length - 1 ? CARD_GAP : 0,
              },
            ]}
          >
            <LinearGradient
              colors={[gradientColor(slide.gradientFrom), gradientColor(slide.gradientTo)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              {/* Top row: text + emoji */}
              <View style={styles.topRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={styles.tagPill}>
                    <Text style={styles.tagText}>{slide.tag}</Text>
                  </View>
                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.subtitle}>{slide.subtitle}</Text>
                </View>
                <Text style={styles.emoji}>{slide.emoji}</Text>
              </View>

              {/* CTA button */}
              <Pressable onPress={onShopNow} style={styles.ctaButton}>
                <Text style={styles.ctaText}>Shop Now</Text>
              </Pressable>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators — centered on full screen width */}
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: i === current ? 24 : 6,
                backgroundColor: i === current ? '#16a34a' : '#cbd5e1',
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    // Shadow (iOS + Android elevation)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6,
  },
  gradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  tagText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'EuclidCircularA-Bold',
    letterSpacing: 2,
  },
  title: {
    color: 'white',
    fontSize: 21,
    fontFamily: 'EuclidCircularA-Bold',
    lineHeight: 27,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  emoji: {
    fontSize: 58,
    lineHeight: 70,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ctaText: {
    color: 'white',
    fontFamily: 'EuclidCircularA-Bold',
    fontSize: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
});

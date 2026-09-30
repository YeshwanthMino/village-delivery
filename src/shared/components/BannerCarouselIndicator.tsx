import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface BannerCarouselIndicatorProps {
  count: number;
  snapInterval: number;
  scrollX: Animated.Value;
  activeWidth?: number;
  marginTop?: number;
}

const DOT_SIZE = 6;
const DOT_GAP = 6;

/** Each physical page includes the duplicate slides used by the looping track. */
export const BannerCarouselIndicator = ({
  count,
  snapInterval,
  scrollX,
  activeWidth = 16,
  marginTop = 8,
}: BannerCarouselIndicatorProps) => {
  if (count <= 1) return null;

  const pages = Array.from({ length: count + 3 }, (_, page) => page);
  const inputRange = pages.map(page => page * snapInterval);
  const inactiveScale = DOT_SIZE / activeWidth;
  // Reserve enough space for a full pill beside a small dot without moving
  // neighboring dots as the active pill changes.
  const slotWidth = (activeWidth + DOT_SIZE) / 2 + DOT_GAP;

  return (
    <View style={[styles.row, { marginTop }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, index) => index).map(index => {
        const activePages = pages.map(page => (page - 1 + count) % count === index);
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: activePages.map(active => active ? 1 : 0),
          extrapolate: 'clamp',
        });
        const scaleX = scrollX.interpolate({
          inputRange,
          outputRange: activePages.map(active => active ? 1 : inactiveScale),
          extrapolate: 'clamp',
        });

        return (
          <View key={index} style={[styles.slot, { width: slotWidth }]}>
            <View style={styles.inactiveDot} />
            <Animated.View style={[styles.activeDot, { left: (slotWidth - activeWidth) / 2, width: activeWidth, opacity, transform: [{ scaleX }] }]} />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slot: {
    height: DOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#cbd5e1',
  },
  activeDot: {
    position: 'absolute',
    top: 0,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#16a34a',
  },
});

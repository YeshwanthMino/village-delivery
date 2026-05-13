import React, { useCallback, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface VillageBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Sheet slides up with a light spring; dismisses with a quick timing curve
const OPEN_SPRING = { damping: 26, stiffness: 320, mass: 0.7 };
const DISMISS_THRESHOLD_PX = 80;  // drag distance that triggers dismiss
const DISMISS_VELOCITY = 600;     // px/s velocity that triggers dismiss
const MAX_HEIGHT_RATIO = 0.75;    // sheet never exceeds 75% of screen height

export const VillageBottomSheet = ({ visible, onClose, children }: VillageBottomSheetProps) => {
  const { height: screenHeight } = useWindowDimensions();
  const maxSheetHeight = screenHeight * MAX_HEIGHT_RATIO;

  // translateY = 0 → fully visible; positive → shifted down (hidden)
  // Start off-screen so the first open always animates in.
  const translateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);
  const dragStartY = useSharedValue(0);

  // Drive open / close animations whenever `visible` flips
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, OPEN_SPRING);
      backdropOpacity.value = withTiming(1, { duration: 280 });
    } else {
      translateY.value = withTiming(screenHeight, { duration: 260 });
      backdropOpacity.value = withTiming(0, { duration: 260 });
    }
  }, [visible, screenHeight]);

  // Stable dismiss callback — safe to call from the worklet via runOnJS
  const dismiss = useCallback(() => onClose(), [onClose]);

  // Pan gesture attached only to the drag handle, so it never fights the
  // inner ScrollView for touch ownership.
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      dragStartY.value = translateY.value;
    })
    .onUpdate((e) => {
      // Only allow dragging downward (positive Y)
      const next = dragStartY.value + e.translationY;
      translateY.value = Math.max(0, next);
      // Fade the backdrop in proportion to how far the sheet is dragged
      backdropOpacity.value = 1 - Math.min(1, Math.max(0, translateY.value / maxSheetHeight));
    })
    .onEnd((e) => {
      const shouldDismiss =
        e.translationY > DISMISS_THRESHOLD_PX || e.velocityY > DISMISS_VELOCITY;

      if (shouldDismiss) {
        backdropOpacity.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(screenHeight, { duration: 260 }, () => {
          runOnJS(dismiss)();
        });
      } else {
        // Snap back to fully open
        backdropOpacity.value = withTiming(1, { duration: 200 });
        translateY.value = withSpring(0, OPEN_SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/*
        GestureHandlerRootView is required inside Modal on Android —
        Modals create a separate native view hierarchy that doesn't
        inherit the root gesture context.
      */}
      <GestureHandlerRootView style={StyleSheet.absoluteFillObject}>

        {/* ── Backdrop ── */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.backdrop, backdropStyle]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        {/* ── Sheet panel ── */}
        <Animated.View style={[styles.sheet, { maxHeight: maxSheetHeight }, sheetStyle]}>

          {/* Drag handle — the ONLY area that drives the pan gesture */}
          <GestureDetector gesture={panGesture}>
            <View style={styles.handleArea}>
              <View style={styles.handleBar} />
            </View>
          </GestureDetector>

          {/*
            ScrollView provides scrollability when children exceed the
            available space (sheet height − handle height).
            bounces={false} avoids elastic overscroll on both platforms.
          */}
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            overScrollMode="never"
          >
            {children}
          </ScrollView>
        </Animated.View>

      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
  },
});

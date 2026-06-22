import React, { useCallback, useEffect, useRef } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  /** When false the sheet cannot be dismissed (no backdrop tap, swipe springs back). */
  dismissable?: boolean;
}

const OPEN_SPRING = { damping: 26, stiffness: 320, mass: 0.7 };
const DISMISS_THRESHOLD_PX = 80;
const DISMISS_VELOCITY = 600;
const MAX_HEIGHT_RATIO = 0.75;

export const VillageBottomSheet = ({ visible, onClose, children, dismissable = true }: VillageBottomSheetProps) => {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const maxSheetHeight = screenHeight * MAX_HEIGHT_RATIO;

  const translateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  // Lifts the sheet above the soft keyboard so inputs stay visible. We drive this
  // from JS Keyboard events rather than reanimated's useAnimatedKeyboard because
  // the sheet renders inside a React Native <Modal>: on Android the Modal is a
  // separate Dialog window that the OS doesn't pan/resize and that
  // useAnimatedKeyboard (which tracks the root window) can't see — so it would
  // report height 0 and never lift. Keyboard events fire regardless of window.
  const keyboardHeight = useSharedValue(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      keyboardHeight.value = withTiming(e.endCoordinates?.height ?? 0, { duration: 250 });
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      keyboardHeight.value = withTiming(0, { duration: 200 });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Track whether the Modal's native layer is ready (iOS fires onShow after present)
  const modalReady = useRef(false);

  const openSheet = useCallback(() => {
    translateY.value = screenHeight;
    translateY.value = withSpring(0, OPEN_SPRING);
    backdropOpacity.value = withTiming(1, { duration: 280 });
  }, [screenHeight]);

  const dismiss = useCallback(() => onClose(), [onClose]);

  // On iOS, onShow fires after the modal is presented — start animation there.
  // On Android, onShow may fire inconsistently, so we fall back to useEffect.
  const handleShow = useCallback(() => {
    modalReady.current = true;
    openSheet();
  }, [openSheet]);

  useEffect(() => {
    if (!visible) {
      modalReady.current = false;
      translateY.value = withTiming(screenHeight, { duration: 260 });
      backdropOpacity.value = withTiming(0, { duration: 260 });
    } else if (Platform.OS === 'android') {
      // Android: animate on visible change (onShow timing is unreliable)
      openSheet();
    }
    // iOS open animation is driven by onShow to avoid pre-mount animation
  }, [visible, screenHeight]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      dragStartY.value = translateY.value;
    })
    .onUpdate((e) => {
      const next = dragStartY.value + e.translationY;
      translateY.value = Math.max(0, next);
      backdropOpacity.value = 1 - Math.min(1, Math.max(0, translateY.value / maxSheetHeight));
    })
    .onEnd((e) => {
      const shouldDismiss =
        dismissable &&
        (e.translationY > DISMISS_THRESHOLD_PX || e.velocityY > DISMISS_VELOCITY);

      if (shouldDismiss) {
        backdropOpacity.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(screenHeight, { duration: 260 }, () => {
          runOnJS(dismiss)();
        });
      } else {
        backdropOpacity.value = withTiming(1, { duration: 200 });
        translateY.value = withSpring(0, OPEN_SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value - keyboardHeight.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Android Modals create a separate native view hierarchy that doesn't
  // inherit the root gesture context — GHRV is required there.
  // iOS shares the same gesture context as the app root (which already has GHRV),
  // so a nested GHRV on iOS causes conflicts and breaks the open animation.
  const Wrapper = Platform.OS === 'android' ? GestureHandlerRootView : View;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissable ? onClose : undefined}
      onShow={handleShow}
    >
      <Wrapper style={StyleSheet.absoluteFillObject}>

        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.backdrop, backdropStyle]}
        >
          <Pressable style={{ flex: 1 }} onPress={dismissable ? onClose : undefined} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { maxHeight: maxSheetHeight }, sheetStyle]}>

          <GestureDetector gesture={panGesture}>
            <View style={styles.handleArea}>
              <View style={styles.handleBar} />
            </View>
          </GestureDetector>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            overScrollMode="never"
            contentContainerStyle={{ paddingBottom: insets.bottom }}
          >
            {children}
          </ScrollView>
        </Animated.View>

      </Wrapper>
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

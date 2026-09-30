import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useScreenFocused } from '@/src/shared/hooks/useScreenActive';
import { StockSnackbarModalPresenter } from './StockSnackbar';
interface VillageBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Owning screen cleanup when it loses focus, even if onClose changes steps. */
  onBlur?: () => void;
  /** Modal Back can move a wizard to its previous step without allowing swipes. */
  onBack?: () => void;
  /** Native dismissal completed; safe to present the next modal. */
  onDismiss?: () => void;
  children: React.ReactNode;
  /** When false the sheet cannot be dismissed (no backdrop tap, swipe springs back). */
  dismissable?: boolean;
  /** Resets the close guard when a visible sheet changes to another step. */
  dismissalKey?: string | number;
}

const OPEN_SPRING = { damping: 26, stiffness: 320, mass: 0.7 };
const DISMISS_THRESHOLD_PX = 80;
const DISMISS_VELOCITY = 600;
const MAX_HEIGHT_RATIO = 0.75;

export const VillageBottomSheet = ({ visible: requestedVisible, onClose, onBlur, onBack, onDismiss, children, dismissable = true, dismissalKey }: VillageBottomSheetProps) => {
  const focused = useScreenFocused();
  // UIKit finishes dismissing a Modal asynchronously. Keep a new presentation
  // queued until that dismissal completes, otherwise a quick close/reopen can
  // leave a transparent native window above the app.
  const [mayPresent, setMayPresent] = useState(true);
  const visible = requestedVisible && focused && mayPresent;
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
    if (!visible) return;
    keyboardHeight.value = Keyboard.metrics()?.height ?? 0;
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
      cancelAnimation(keyboardHeight);
      keyboardHeight.value = 0;
    };
  }, [visible, keyboardHeight]);

  const openSheet = useCallback(() => {
    translateY.value = screenHeight;
    translateY.value = withSpring(0, OPEN_SPRING);
    backdropOpacity.value = withTiming(1, { duration: 280 });
  }, [screenHeight, translateY, backdropOpacity]);

  const closing = useRef(false);
  const latestClose = useRef(onClose);
  const latestBlur = useRef(onBlur);
  const latestDismiss = useRef(onDismiss);
  const visibleRef = useRef(visible);
  const blurClosed = useRef(false);
  const lastBackAt = useRef(-Infinity);
  const lastDismissalKey = useRef(dismissalKey);
  useEffect(() => {
    latestClose.current = onClose;
    latestBlur.current = onBlur;
    latestDismiss.current = onDismiss;
  }, [onClose, onBlur, onDismiss]);
  useEffect(() => {
    visibleRef.current = visible;
    if (visible) {
      closing.current = false;
      lastBackAt.current = -Infinity;
    }
  }, [visible]);
  useEffect(() => {
    if (lastDismissalKey.current !== dismissalKey) {
      closing.current = false;
      lastDismissalKey.current = dismissalKey;
    }
  }, [dismissalKey]);
  useEffect(() => {
    if (focused) {
      blurClosed.current = false;
    } else if (requestedVisible && !blurClosed.current) {
      blurClosed.current = true;
      (latestBlur.current ?? latestClose.current)();
    }
  }, [focused, requestedVisible]);
  const dismiss = useCallback(() => {
    if (!visibleRef.current || closing.current) return;
    closing.current = true;
    latestClose.current();
  }, []);

  const wasVisible = useRef(false);
  const awaitingDismiss = useRef(false);
  const handleDismiss = useCallback(() => {
    if (!awaitingDismiss.current) return;
    awaitingDismiss.current = false;
    if (Platform.OS === 'ios') setMayPresent(true);
    latestDismiss.current?.();
  }, []);
  useEffect(() => {
    if (wasVisible.current && !visible) {
      awaitingDismiss.current = true;
      if (Platform.OS === 'ios') setMayPresent(false);
      // Android removes its Dialog in this commit and has no onDismiss event.
      // iOS keeps the Modal host mounted until UIKit confirms dismissal.
      if (Platform.OS !== 'ios') handleDismiss();
    }
    wasVisible.current = visible;
  }, [visible, handleDismiss]);

  // On iOS, onShow fires after the modal is presented — start animation there.
  // On Android, onShow may fire inconsistently, so we fall back to useEffect.
  const handleShow = useCallback(() => {
    if (visible) openSheet();
  }, [visible, openSheet]);

  useEffect(() => {
    if (!visible) {
      translateY.value = screenHeight;
      backdropOpacity.value = 0;
    } else {
      // A cancelled entrance or a size change must never leave a visible
      // native modal with its content translated off-screen.
      translateY.value = withSpring(0, OPEN_SPRING);
      backdropOpacity.value = withTiming(1, { duration: 280 });
    }
    return () => {
      cancelAnimation(translateY);
      cancelAnimation(backdropOpacity);
    };
  }, [visible, screenHeight, openSheet, translateY, backdropOpacity]);

  const panGesture = useMemo(() => Gesture.Pan()
    .enabled(visible && dismissable)
    .activeOffsetY(8)
    .failOffsetX([-20, 20])
    .onBegin(() => {
      dragStartY.value = translateY.value;
    })
    .onUpdate((e) => {
      const next = dragStartY.value + e.translationY;
      translateY.value = Math.max(0, next);
      backdropOpacity.value = 1 - Math.min(1, Math.max(0, translateY.value / maxSheetHeight));
    })
    .onEnd((e, success) => {
      const shouldDismiss =
        success && dismissable &&
        (e.translationY > DISMISS_THRESHOLD_PX || e.velocityY > DISMISS_VELOCITY);

      if (shouldDismiss) {
        // Close the native modal immediately. Waiting for a cancellable exit
        // animation can leave an invisible full-screen touch interceptor.
        runOnJS(dismiss)();
      } else {
        backdropOpacity.value = withTiming(1, { duration: 200 });
        translateY.value = withSpring(0, OPEN_SPRING);
      }
    }), [visible, dismissable, maxSheetHeight, dragStartY, translateY, backdropOpacity, dismiss]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value - keyboardHeight.value }],
    maxHeight: Math.min(maxSheetHeight, Math.max(0, screenHeight - keyboardHeight.value - insets.top - 16)),
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
      onRequestClose={() => {
        if (!visibleRef.current) return;
        const now = Date.now();
        if (now - lastBackAt.current < 350) return;
        lastBackAt.current = now;
        if (Keyboard.isVisible()) { Keyboard.dismiss(); return; }
        if (onBack) onBack();
        else if (dismissable) dismiss();
      }}
      onShow={handleShow}
      onDismiss={handleDismiss}
    >
      {/* Keep the Modal host stable through native dismissal, but immediately
          remove children and gesture handlers when the sheet is hidden. */}
      {visible ? (
      <Wrapper style={StyleSheet.absoluteFillObject}>

        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.backdrop, backdropStyle]}
        >
          <Pressable testID="sheet-backdrop" style={{ flex: 1 }} onPress={dismissable ? dismiss : undefined} />
        </Animated.View>

        <Animated.View style={[styles.sheet, sheetStyle]}>

          <GestureDetector gesture={panGesture}>
            <View style={styles.handleArea}>
              <View style={styles.handleBar} />
            </View>
          </GestureDetector>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            nestedScrollEnabled
            overScrollMode="never"
            contentContainerStyle={{ paddingBottom: insets.bottom }}
          >
            {children}
          </ScrollView>
        </Animated.View>

        <StockSnackbarModalPresenter />

      </Wrapper>
      ) : null}
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

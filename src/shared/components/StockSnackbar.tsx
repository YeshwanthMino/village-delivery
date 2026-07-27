import { AlertTriangle } from 'lucide-react-native';
import React from 'react';
import { Animated, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';

const AUTO_DISMISS_MS = 2500;
const ENTRANCE_DURATION_MS = 200;
const ENTRANCE_TRANSLATE_Y = 20;

export const StockSnackbar = () => {
  const message = useSnackbarStore((s) => s.message);
  const key = useSnackbarStore((s) => s.key);
  const bottomOffset = useSnackbarStore((s) => s.bottomOffset);
  const hide = useSnackbarStore((s) => s.hide);

  const translateY = React.useRef(new Animated.Value(ENTRANCE_TRANSLATE_Y)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  // Re-running on every `key` change (bumped by every show(), including
  // repeats) is what makes a repeat tap restart the countdown instead of
  // dismissing on the original timer.
  React.useEffect(() => {
    if (message === null) return;
    const id = setTimeout(hide, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [key, message, hide]);

  // The entrance (slide-up + fade-in) should only play when the snackbar
  // transitions from hidden to shown, not on every repeat tap while it's
  // already visible — otherwise a repeat show() (which only bumps `key`)
  // would replay the animation and make it look like it's bouncing.
  const wasVisible = React.useRef(false);
  React.useEffect(() => {
    if (message !== null && !wasVisible.current) {
      translateY.setValue(ENTRANCE_TRANSLATE_Y);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: ENTRANCE_DURATION_MS,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: ENTRANCE_DURATION_MS,
          useNativeDriver: false,
        }),
      ]).start();
    }
    wasVisible.current = message !== null;
  }, [message, translateY, opacity]);

  if (message === null) return null;

  return (
    // A plain absolutely-positioned sibling of expo-router's <Stack/> can
    // render underneath it: react-native-screens gives each native-stack
    // screen (and the (dashboard) tab bar) its own native surface, which
    // isn't guaranteed to composite beneath a later plain View the way two
    // ordinary siblings would. A transparent Modal is a separate native
    // window that always paints on top — the same fix already used for
    // VillageBottomSheet's second <StockSnackbar/> instance, applied here
    // for the root-mounted one. `pointerEvents="box-none"` on the wrapping
    // View lets touches outside the snackbar itself pass through to the
    // screen underneath.
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={hide}>
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <Animated.View
          testID="stock-snackbar"
          className="absolute left-0 right-0 flex-row items-center gap-3 bg-slate-900 rounded-t-2xl pl-4 pr-3 py-3.5"
          style={{
            bottom: bottomOffset,
            opacity,
            transform: [{ translateY }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 16,
          }}
        >
          <View className="w-8 h-8 rounded-full bg-amber-400/20 items-center justify-center">
            <AlertTriangle size={16} color="#fbbf24" />
          </View>
          <Text className="text-white font-semibold text-[13px] leading-5 flex-1">{message}</Text>
          <TouchableOpacity
            onPress={hide}
            hitSlop={8}
            className="bg-white/10 rounded-full px-3.5 py-1.5"
          >
            <Text className="text-white font-bold text-xs tracking-wide">Ok</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

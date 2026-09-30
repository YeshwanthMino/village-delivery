import { AlertTriangle } from 'lucide-react-native';
import React from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { create } from 'zustand';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';

const AUTO_DISMISS_MS = 2500;
const ENTRANCE_DURATION_MS = 200;
const ENTRANCE_TRANSLATE_Y = 20;

// The snackbar has one lifetime/timer at the app root, but needs to paint
// inside Android's separate Dialog window while a bottom sheet is open.
// The most recently mounted modal presenter owns that visible surface.
const useModalSnackbarHosts = create<{ ids: number[] }>(() => ({ ids: [] }));
let nextModalSnackbarHostId = 0;

const registerModalSnackbarHost = (id: number) => {
  useModalSnackbarHosts.setState(({ ids }) => ({ ids: [...ids, id] }));
  return () => {
    useModalSnackbarHosts.setState(({ ids }) => ({ ids: ids.filter((hostId) => hostId !== id) }));
  };
};

type SnackbarSurfaceProps = {
  message: string | null;
  bottomOffset: number;
  hide: () => void;
  root: boolean;
};

const SnackbarSurface = ({ message, bottomOffset, hide, root }: SnackbarSurfaceProps) => {
  const translateY = React.useRef(new Animated.Value(ENTRANCE_TRANSLATE_Y)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  // The entrance (slide-up + fade-in) should only play when the snackbar
  // transitions from hidden to shown, not on every repeat tap while it's
  // already visible — otherwise a repeat show() (which only bumps `key`)
  // would replay the animation and make it look like it's bouncing.
  const wasVisible = React.useRef(false);
  React.useEffect(() => () => {
    translateY.stopAnimation();
    opacity.stopAnimation();
  }, [translateY, opacity]);
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

  const content = (
    <View
      testID="stock-snackbar-overlay"
      style={styles.overlay}
      pointerEvents="box-none"
    >
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
  );

  // A transparent RN Modal creates a separate native window on Android. Even
  // with box-none children that window intercepts every tap and scroll below
  // the snackbar. iOS FullWindowOverlay has native hit testing that returns
  // nil outside the snackbar; Android can use a normal root sibling instead.
  return root && Platform.OS === 'ios' ? (
    <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
      {content}
    </FullWindowOverlay>
  ) : content;
};

export const StockSnackbar = () => {
  const message = useSnackbarStore((s) => s.message);
  const key = useSnackbarStore((s) => s.key);
  const bottomOffset = useSnackbarStore((s) => s.bottomOffset);
  const hide = useSnackbarStore((s) => s.hide);
  const modalHostId = useModalSnackbarHosts((s) => s.ids[s.ids.length - 1]);

  // This is the only auto-dismiss timer, even while a modal presenter paints
  // the snackbar in the sheet window. Repeated show() calls restart it.
  React.useEffect(() => {
    if (message === null) return;
    const id = setTimeout(hide, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [key, message, hide]);

  return (
    <SnackbarSurface
      message={modalHostId === undefined ? message : null}
      bottomOffset={bottomOffset}
      hide={hide}
      root
    />
  );
};

/** Render this inside a native Modal's view hierarchy, after the sheet body. */
export const StockSnackbarModalPresenter = () => {
  const hostId = React.useRef<number | null>(null);
  if (hostId.current === null) hostId.current = ++nextModalSnackbarHostId;

  React.useLayoutEffect(() => registerModalSnackbarHost(hostId.current!), []);

  const isTopModalHost = useModalSnackbarHosts((s) => s.ids[s.ids.length - 1] === hostId.current);
  const message = useSnackbarStore((s) => s.message);
  const bottomOffset = useSnackbarStore((s) => s.bottomOffset);
  const hide = useSnackbarStore((s) => s.hide);

  return (
    <SnackbarSurface
      message={isTopModalHost ? message : null}
      bottomOffset={bottomOffset}
      hide={hide}
      root={false}
    />
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
});

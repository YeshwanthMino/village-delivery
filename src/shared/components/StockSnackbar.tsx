import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';

const AUTO_DISMISS_MS = 2500;

export const StockSnackbar = () => {
  const message = useSnackbarStore((s) => s.message);
  const key = useSnackbarStore((s) => s.key);
  const bottomOffset = useSnackbarStore((s) => s.bottomOffset);
  const hide = useSnackbarStore((s) => s.hide);

  // Re-running on every `key` change (bumped by every show(), including
  // repeats) is what makes a repeat tap restart the countdown instead of
  // dismissing on the original timer.
  React.useEffect(() => {
    if (message === null) return;
    const id = setTimeout(hide, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [key, message, hide]);

  if (message === null) return null;

  return (
    <View
      testID="stock-snackbar"
      className="absolute left-0 right-0 flex-row items-center justify-between bg-pink-600 rounded-t-2xl px-4 py-4"
      style={{ bottom: bottomOffset }}
    >
      <Text className="text-white font-extrabold text-sm flex-1 pr-3">{message}</Text>
      <TouchableOpacity onPress={hide} hitSlop={8}>
        <Text className="text-white font-extrabold text-sm">Ok</Text>
      </TouchableOpacity>
    </View>
  );
};

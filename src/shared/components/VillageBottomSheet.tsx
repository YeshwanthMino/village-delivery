import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface VillageBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const VillageBottomSheet = ({ visible, onClose, children }: VillageBottomSheetProps) => {
  const translateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
      backdropOpacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(400, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 250 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50">
      {/* Backdrop */}
      <Animated.View style={[backdropStyle]} className="absolute inset-0 bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[sheetStyle]}
        className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-xl"
      >
        {/* Drag handle */}
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1.5 bg-slate-200 rounded-full" />
        </View>
        {children}
      </Animated.View>
    </View>
  );
};

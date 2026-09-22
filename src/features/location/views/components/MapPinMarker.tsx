// src/features/location/views/components/MapPinMarker.tsx
//
// Fixed center pin rendered as an absolute overlay (NOT a map Marker), so the
// map moves underneath it. Includes the tooltip above and a shadow ellipse.

import React from 'react';
import { View } from 'react-native';
import { PinTooltip } from './PinTooltip';

export const MapPinMarker = () => (
  <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
    {/* tooltip + pin stacked; nudged up so the pin tip sits at exact center */}
    <View className="items-center -mt-[64px]">
      <PinTooltip />
      <View className="items-center mt-2">
        <View className="w-[18px] h-[18px] rounded-full bg-rose-600" />
        <View className="w-[3px] h-[22px] bg-rose-600" />
        <View className="w-[22px] h-[6px] rounded-full bg-purple-500/40 -mt-0.5" />
      </View>
    </View>
  </View>
);

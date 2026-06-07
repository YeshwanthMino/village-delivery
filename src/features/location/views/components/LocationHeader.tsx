// src/features/location/views/components/LocationHeader.tsx

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, UserCircle2, Zap } from 'lucide-react-native';

interface Props {
  etaMinutes: number;
  minutesLabel: string;
  primaryLabel: string;   // tag or village name, e.g. "Home" / village
  secondaryLabel: string; // address line / village description
  onPressLocation: () => void;
  onPressProfile: () => void;
}

export const LocationHeader = ({
  etaMinutes,
  minutesLabel,
  primaryLabel,
  secondaryLabel,
  onPressLocation,
  onPressProfile,
}: Props) => (
  <View className="flex-row items-start justify-between">
    <TouchableOpacity className="flex-1 mr-3" onPress={onPressLocation} activeOpacity={0.7}>
      <View className="flex-row items-center gap-1">
        <Zap size={18} color="#16a34a" fill="#16a34a" />
        <Text className="text-slate-900 font-bold text-lg">{etaMinutes} {minutesLabel}</Text>
      </View>
      <View className="flex-row items-center mt-0.5">
        <Text className="text-slate-700 font-semibold text-sm" numberOfLines={1}>
          {primaryLabel}
          {secondaryLabel ? <Text className="text-slate-500 font-normal"> - {secondaryLabel}</Text> : null}
        </Text>
        <ChevronDown size={16} color="#64748b" />
      </View>
    </TouchableOpacity>
    <TouchableOpacity onPress={onPressProfile}>
      <UserCircle2 size={32} color="#334155" />
    </TouchableOpacity>
  </View>
);

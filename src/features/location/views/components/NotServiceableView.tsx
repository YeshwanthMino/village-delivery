// src/features/location/views/components/NotServiceableView.tsx

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';

interface Props {
  title: string;
  subtitle: string;
  ctaLabel: string;
  onUseAnotherPincode: () => void;
}

export const NotServiceableView = ({ title, subtitle, ctaLabel, onUseAnotherPincode }: Props) => (
  <View className="items-center px-6 py-10">
    <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center mb-5">
      <ShoppingBag size={30} color="#16a34a" />
    </View>
    <Text className="text-slate-900 font-bold text-xl text-center">{title}</Text>
    <Text className="text-slate-500 text-base text-center mt-2 leading-6">{subtitle}</Text>
    <TouchableOpacity
      onPress={onUseAnotherPincode}
      className="bg-green-600 rounded-2xl px-6 py-3.5 mt-6"
    >
      <Text className="text-white font-bold text-base">{ctaLabel}</Text>
    </TouchableOpacity>
  </View>
);

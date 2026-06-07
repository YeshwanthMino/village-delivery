// src/features/location/views/components/CurrentLocationRow.tsx

import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { LocateFixed } from 'lucide-react-native';

interface Props {
  title: string;
  subtitle: string;
  cta: string;
  loading?: boolean;
  onPress: () => void;
}

export const CurrentLocationRow = ({ title, subtitle, cta, loading, onPress }: Props) => (
  <View className="flex-row items-center bg-white rounded-2xl px-4 py-4">
    <LocateFixed size={22} color="#16a34a" />
    <View className="flex-1 ml-3 mr-3">
      <Text className="text-green-700 font-bold text-base">{title}</Text>
      <Text className="text-slate-500 text-sm mt-0.5">{subtitle}</Text>
    </View>
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      className="border border-green-600 rounded-xl px-4 py-2"
    >
      {loading ? (
        <ActivityIndicator size="small" color="#16a34a" />
      ) : (
        <Text className="text-green-700 font-bold text-sm">{cta}</Text>
      )}
    </TouchableOpacity>
  </View>
);

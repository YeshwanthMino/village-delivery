// src/features/location/views/components/TagSelector.tsx

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Briefcase, Home, MapPin } from 'lucide-react-native';
import { AddressTag } from '../../domain/models';

interface Props {
  value: AddressTag;
  onChange: (tag: AddressTag) => void;
  labels: Record<AddressTag, string>;
}

const ICONS: Record<AddressTag, React.ComponentType<{ size: number; color: string }>> = {
  home: Home,
  work: Briefcase,
  other: MapPin,
};

export const TagSelector = ({ value, onChange, labels }: Props) => (
  <View className="flex-row gap-2">
    {(['home', 'work', 'other'] as AddressTag[]).map((tag) => {
      const Icon = ICONS[tag];
      const active = value === tag;
      return (
        <TouchableOpacity
          key={tag}
          onPress={() => onChange(tag)}
          className={`flex-row items-center px-4 py-2 rounded-full border ${active ? 'bg-green-50 border-green-600' : 'border-slate-200'}`}
        >
          <Icon size={16} color={active ? '#16a34a' : '#64748b'} />
          <Text className={`ml-1.5 text-sm font-semibold ${active ? 'text-green-700' : 'text-slate-600'}`}>
            {labels[tag]}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

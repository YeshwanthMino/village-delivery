// src/features/location/views/components/AddressRow.tsx

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Briefcase, Check, Home, MapPin, Pencil, Trash2 } from 'lucide-react-native';
import { Address, AddressTag } from '../../domain/models';

interface Props {
  address: Address;
  selected: boolean;
  tagLabel: string;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ICONS: Record<AddressTag, React.ComponentType<{ size: number; color: string }>> = {
  home: Home,
  work: Briefcase,
  other: MapPin,
};

export const AddressRow = ({ address, selected, tagLabel, onSelect, onEdit, onDelete }: Props) => {
  const Icon = ICONS[address.tag];
  const line = [address.addressLine1, address.addressLine2, address.villageName]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      onPress={onSelect}
      className={`flex-row items-start rounded-2xl px-4 py-4 mb-3 border ${selected ? 'bg-green-50 border-green-600' : 'bg-white border-slate-100'}`}
    >
      <Icon size={20} color={selected ? '#16a34a' : '#334155'} />
      <View className="flex-1 mx-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-slate-900 font-bold text-base">{tagLabel}</Text>
          {selected ? <Check size={16} color="#16a34a" /> : null}
        </View>
        <Text className="text-slate-500 text-sm mt-0.5" numberOfLines={2}>{line}</Text>
      </View>
      <View className="flex-row gap-3">
        <TouchableOpacity onPress={onEdit} hitSlop={8}><Pencil size={18} color="#64748b" /></TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={8}><Trash2 size={18} color="#ef4444" /></TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// src/features/home/views/category-details/components/SubcategoryRail.tsx

import { Image } from 'expo-image';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { CategoryItem } from '../../../data/homeLayout.types';

interface Props {
  items: CategoryItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export const SubcategoryRail = ({ items, selectedId, onSelect }: Props) => (
  <View style={{ width: 84, backgroundColor: '#f1f5f9' }}>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 4 }}
    >
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            onPress={() => onSelect(item.id)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 4,
              alignItems: 'center',
              backgroundColor: active ? '#ffffff' : 'transparent',
              borderLeftWidth: 3,
              borderLeftColor: active ? '#16a34a' : 'transparent',
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: active ? '#dcfce7' : '#e2e8f0',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: 48, height: 48 }}
                  contentFit="cover"
                  transition={150}
                />
              ) : null}
            </View>
            <Text
              numberOfLines={2}
              style={{
                fontSize: 10,
                lineHeight: 12,
                textAlign: 'center',
                color: active ? '#15803d' : '#475569',
                fontWeight: active ? '700' : '500',
              }}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

interface FloatingCartPillProps {
  count: number;
  onPress: () => void;
}

const TAB_BAR_CONTENT_HEIGHT = 64;

export const FloatingCartPill = ({ count, onPress }: FloatingCartPillProps) => {
  const { bottom } = useSafeAreaInsets();
  const { t } = useTranslation();
  if (count === 0) return null;

  const pillBottom = TAB_BAR_CONTENT_HEIGHT + 8;
  const label = count === 1 ? t('one_item_cart') : interpolate(t('n_items_cart'), count);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.pill, { marginBottom: pillBottom }]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.action}>{t('view_cart_arrow')}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    marginHorizontal: 12,
    backgroundColor: '#16a34a',
    borderRadius: 16,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 10,
  },
  badge: {
    width: 26,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  badgeText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  label:     { color: '#ffffff', fontWeight: '600', fontSize: 14, flex: 1 },
  action:    { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});

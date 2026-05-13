import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FloatingCartPillProps {
  count: number;
  onPress: () => void;
}

// Visual content height of the tab bar — must stay in sync with _layout.tsx
const TAB_BAR_CONTENT_HEIGHT = 64;

export const FloatingCartPill = ({ count, onPress }: FloatingCartPillProps) => {
  const { bottom } = useSafeAreaInsets();
  if (count === 0) return null;

  // SafeAreaView already applies bottom inset as padding on the wrapping screen.
  // We only need to clear the tab bar content height plus a small visual gap.
  const pillBottom = TAB_BAR_CONTENT_HEIGHT + 8;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.pill, { marginBottom: pillBottom }]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
      <Text style={styles.label}>
        {count === 1 ? '1 item in cart' : `${count} items in cart`}
      </Text>
      <Text style={styles.action}>View cart →</Text>
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
  badgeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  label: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
  },
  action: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});

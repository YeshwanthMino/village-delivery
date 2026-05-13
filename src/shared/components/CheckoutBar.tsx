import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { rupees } from '@/src/features/home/data/static/villageData';

// Must stay in sync with TAB_BAR_CONTENT_HEIGHT in _layout.tsx
const TAB_BAR_CONTENT_HEIGHT = 64;

interface CheckoutBarProps {
  grandTotal: number;
  savings: number;
}

export const CheckoutBar = ({ grandTotal, savings }: CheckoutBarProps) => {
  // SafeAreaView on the CartScreen already pads for the bottom nav inset.
  // We only need to visually clear the tab bar content height.
  const bottomPad = TAB_BAR_CONTENT_HEIGHT + 8;

  return (
    <View style={[styles.wrapper, { marginBottom: bottomPad }]}>
      <TouchableOpacity style={styles.button} activeOpacity={0.9}>
        <View>
          <Text style={styles.total}>{rupees(grandTotal)}</Text>
          {savings > 0 && (
            <Text style={styles.saving}>saving {rupees(savings)}</Text>
          )}
        </View>
        <Text style={styles.cta}>PROCEED TO CHECKOUT →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 12,
  },
  button: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  total: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  saving: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    marginTop: 1,
  },
  cta: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});

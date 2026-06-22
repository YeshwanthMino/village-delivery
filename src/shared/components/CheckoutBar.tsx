import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { rupees } from '@/src/features/home/data/static/villageData';
import { useTranslation } from '@/src/core/utils/useTranslation';
import type { CheckoutState } from '@/src/features/cart/domain/checkoutState';

interface CheckoutBarProps {
  state: CheckoutState;
  grandTotal: number;
  savings: number;
  onLogin: () => void;
  onSelectAddress: () => void;
  onPlaceOrder: () => void;
}

export const CheckoutBar = ({
  state,
  grandTotal,
  savings,
  onLogin,
  onSelectAddress,
  onPlaceOrder,
}: CheckoutBarProps) => {
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;

  // States 1-3 are a single full-width button (states 1-2 green/actionable,
  // state 3 grey/disabled). State 4 shows the total + "Place order".
  if (state !== 'place') {
    const config = {
      login: { label: t('login_to_proceed'), onPress: onLogin, disabled: false },
      address: { label: t('select_address_to_proceed'), onPress: onSelectAddress, disabled: false },
      payment: { label: t('select_payment_method'), onPress: undefined, disabled: true },
    }[state];

    return (
      <View style={styles.wrap}>
        <TouchableOpacity
          style={[styles.fullButton, config.disabled && styles.buttonDisabled]}
          activeOpacity={config.disabled ? 1 : 0.9}
          disabled={config.disabled}
          onPress={config.onPress}
        >
          <Text style={[styles.fullCta, teFont]}>{config.label}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={onPlaceOrder}>
        <View>
          <Text style={styles.total}>{rupees(grandTotal)}</Text>
          {savings > 0 && <Text style={styles.saving}>saving {rupees(savings)}</Text>}
        </View>
        <Text style={[styles.cta, teFont]}>{t('place_order')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 8, marginHorizontal: 12 },
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
  fullButton: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  total: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  saving: { color: 'rgba(255,255,255,0.72)', fontSize: 10, marginTop: 1 },
  cta: { color: '#ffffff', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  fullCta: { color: '#ffffff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
});

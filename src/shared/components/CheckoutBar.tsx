import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { rupees } from '@/src/features/home/data/static/villageData';
import { useTranslation } from '@/src/core/utils/useTranslation';

export type PaymentMethod = 'cod' | 'upi' | null;

interface CheckoutBarProps {
  grandTotal: number;
  savings: number;
  paymentMethod: PaymentMethod;
  onSelectPayment: (method: PaymentMethod) => void;
}

export const CheckoutBar = ({ grandTotal, savings, paymentMethod, onSelectPayment }: CheckoutBarProps) => {
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const teRegular = locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined;

  return (
    <View style={{ marginBottom: 8, marginHorizontal: 12, gap: 10 }}>
      {/* Payment method selector */}
      <View>
        <Text style={[styles.paymentTitle, teFont]}>{t('payment_title')}</Text>
        <View style={styles.paymentRow}>
          {(['cod', 'upi'] as ('cod' | 'upi')[]).map((method) => {
            const isSelected = paymentMethod === method;
            return (
              <TouchableOpacity
                key={method}
                onPress={() => onSelectPayment(method)}
                style={[
                  styles.paymentOption,
                  isSelected ? styles.paymentSelected : styles.paymentUnselected,
                ]}
              >
                <Text style={styles.paymentIcon}>{method === 'cod' ? '💵' : '📲'}</Text>
                <Text
                  style={[styles.paymentLabel, isSelected && styles.paymentLabelSelected, teRegular]}
                  numberOfLines={1}
                >
                  {t(method)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Checkout button */}
      <TouchableOpacity
        style={[styles.button, !paymentMethod && styles.buttonDisabled]}
        activeOpacity={paymentMethod ? 0.9 : 1}
        disabled={!paymentMethod}
      >
        <View>
          <Text style={styles.total}>{rupees(grandTotal)}</Text>
          {savings > 0 && (
            <Text style={styles.saving}>saving {rupees(savings)}</Text>
          )}
        </View>
        <Text style={[styles.cta, teFont]}>{t('proceed_checkout')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  paymentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  paymentSelected: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  paymentUnselected: {
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  paymentIcon: { fontSize: 18 },
  paymentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  paymentLabelSelected: {
    color: '#15803d',
    fontWeight: '700',
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
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
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

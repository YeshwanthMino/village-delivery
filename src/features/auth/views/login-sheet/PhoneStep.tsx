import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, Lock, Phone, ShieldCheck, X } from 'lucide-react-native';
import { s } from './styles';
import { requestPhoneNumber } from '@/src/native/PhoneHint';

interface PhoneStepProps {
  phone: string;
  setPhone: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  busy: boolean;
  onSimPick: (phone: string) => void;
  error: string | null;
  badge: string;
}

export const PhoneStep = ({ phone, setPhone, onSubmit, onClose, busy, onSimPick, error, badge }: PhoneStepProps) => {
  const valid = phone.length === 10;
  const inputRef = useRef<TextInput>(null);
  const [simBusy, setSimBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const handleSimPick = async () => {
    setSimBusy(true);
    try {
      const num = await requestPhoneNumber();
      if (num) onSimPick(num);
    } finally {
      setSimBusy(false);
    }
  };

  return (
    <View style={s.stepContainer}>
      {/* Header row */}
      <View style={s.headerRow}>
        <View style={s.badge}>
          <Text style={s.badgeText}>{badge}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.iconBtn} activeOpacity={0.7}>
          <X size={16} color="#334155" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <Text style={s.title}>Enter your mobile number</Text>
      <Text style={s.subtitle}>
        We&apos;ll send a 6-digit OTP to verify. Your number stays private.
      </Text>

      {/* SIM pick chip — Android only */}
      {Platform.OS === 'android' && (
        <TouchableOpacity
          onPress={handleSimPick}
          disabled={simBusy}
          style={s.simChip}
          activeOpacity={0.75}
        >
          <Phone size={13} color="#15803d" strokeWidth={2.5} />
          <Text style={s.simChipText}>
            {simBusy ? 'Fetching…' : 'Use number from SIM'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Phone input */}
      <View style={[s.phoneRow, valid && s.phoneRowValid]}>
        <View style={s.prefix}>
          <Text style={s.flag}>🇮🇳</Text>
          <Text style={s.countryCode}>+91</Text>
        </View>
        <TextInput
          ref={inputRef}
          style={s.phoneInput}
          placeholder="98765 43210"
          placeholderTextColor="#94a3b8"
          keyboardType="number-pad"
          maxLength={10}
          value={phone}
          onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
          returnKeyType="done"
          onSubmitEditing={() => valid && !busy && onSubmit()}
          autoComplete="tel"
        />
        {valid && (
          <View style={s.validCheck}>
            <View style={s.checkCircle}>
              <Check size={14} color="#fff" strokeWidth={3.5} />
            </View>
          </View>
        )}
      </View>

      {error && <Text style={[s.errorText, { marginTop: 8 }]}>{error}</Text>}

      {/* Trust row */}
      <View style={s.trustRow}>
        {[
          { icon: <ShieldCheck size={13} color="#94a3b8" />, label: 'Secure' },
          { icon: <Lock size={13} color="#94a3b8" />, label: 'No spam' },
        ].map(({ icon, label }) => (
          <View key={label} style={s.trustItem}>
            {icon}
            <Text style={s.trustLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        onPress={onSubmit}
        disabled={!valid || busy}
        style={[s.cta, valid && !busy ? s.ctaActive : s.ctaDisabled]}
        activeOpacity={0.88}
      >
        <Text style={[s.ctaText, valid && !busy ? s.ctaTextActive : s.ctaTextDisabled]}>
          {busy ? 'Sending OTP…' : 'Continue'}
        </Text>
      </TouchableOpacity>

      {/* Legal */}
      <Text style={s.legal}>
        By continuing, you agree to our{' '}
        <Text style={s.legalLink}>Terms of Service</Text>
        {' & '}
        <Text style={s.legalLink}>Privacy Policy</Text>.
      </Text>
    </View>
  );
};

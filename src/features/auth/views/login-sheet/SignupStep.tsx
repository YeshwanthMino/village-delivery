import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { formatPhone } from './helpers';
import { s } from './styles';

interface SignupStepProps {
  phone: string;
  onBack: () => void;
  onSubmit: (firstName: string, lastName: string) => void;
  busy: boolean;
  error: string | null;
}

export const SignupStep = ({ phone, onBack, onSubmit, busy, error }: SignupStepProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const valid = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <View style={s.stepContainer}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={onBack} style={s.iconBtn} activeOpacity={0.7}>
          <ArrowLeft size={16} color="#334155" strokeWidth={2.4} />
        </TouchableOpacity>
        <View style={s.badge}>
          <Text style={s.badgeText}>CREATE ACCOUNT</Text>
        </View>
        <View style={s.iconBtn} />
      </View>

      <Text style={s.title}>Tell us your name</Text>
      <Text style={s.subtitle}>
        New here — we just need your name to set up{' '}
        <Text style={s.phoneBold}>+91 {formatPhone(phone)}</Text>.
      </Text>

      <View style={[s.phoneRow, { marginTop: 16 }, firstName.trim() && s.phoneRowValid]}>
        <TextInput
          style={[s.phoneInput, { paddingLeft: 14 }]}
          placeholder="First name"
          placeholderTextColor="#94a3b8"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          returnKeyType="next"
          editable={!busy}
        />
      </View>

      <View style={[s.phoneRow, { marginTop: 12 }, lastName.trim() && s.phoneRowValid]}>
        <TextInput
          style={[s.phoneInput, { paddingLeft: 14 }]}
          placeholder="Last name"
          placeholderTextColor="#94a3b8"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          returnKeyType="done"
          editable={!busy}
          onSubmitEditing={() => valid && !busy && onSubmit(firstName.trim(), lastName.trim())}
        />
      </View>

      <View style={{ minHeight: 18, marginTop: 6 }}>
        {error && <Text style={s.errorText}>{error}</Text>}
      </View>

      <TouchableOpacity
        onPress={() => onSubmit(firstName.trim(), lastName.trim())}
        disabled={!valid || busy}
        style={[s.cta, valid && !busy ? s.ctaActive : s.ctaDisabled]}
        activeOpacity={0.88}
      >
        <Text style={[s.ctaText, valid && !busy ? s.ctaTextActive : s.ctaTextDisabled]}>
          {busy ? 'Creating account…' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

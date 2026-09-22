import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Clock, Pencil } from 'lucide-react-native';
import { OTP_LEN, formatPhone } from './helpers';
import { s } from './styles';

interface OtpStepProps {
  phone: string;
  onBack: () => void;
  onVerified: (otp: string) => void;
  verifying: boolean;
  error: string | null;
}

export const OtpStep = ({ phone, onBack, onVerified, verifying, error }: OtpStepProps) => {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [seconds, setSeconds] = useState(30);
  const refs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const t = setTimeout(() => refs.current[0]?.focus(), 220);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const filled = digits.every(d => d !== '');

  useEffect(() => {
    if (filled && !verifying) {
      onVerified(digits.join(''));
    }
  }, [filled]);

  useEffect(() => {
    // Reset boxes on new error
    if (error) {
      setDigits(Array(OTP_LEN).fill(''));
      setTimeout(() => refs.current[0]?.focus(), 100);
    }
  }, [error]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < OTP_LEN - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        refs.current[index - 1]?.focus();
      } else if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      }
    }
  };

  const handleResend = () => {
    if (seconds > 0) return;
    setSeconds(30);
    setDigits(Array(OTP_LEN).fill(''));
    refs.current[0]?.focus();
  };

  return (
    <View style={s.stepContainer}>
      {/* Header row */}
      <View style={s.headerRow}>
        <TouchableOpacity onPress={onBack} style={s.iconBtn} activeOpacity={0.7}>
          <ArrowLeft size={16} color="#334155" strokeWidth={2.4} />
        </TouchableOpacity>
        <View style={s.badge}>
          <Text style={s.badgeText}>VERIFY OTP</Text>
        </View>
        <View style={s.iconBtn} />
      </View>

      <Text style={s.title}>Verify your number</Text>
      <View style={s.otpSubtitleRow}>
        <Text style={s.subtitle}>
          Enter the 6-digit code sent to{' '}
          <Text style={s.phoneBold}>+91 {formatPhone(phone)}</Text>
        </Text>
        <TouchableOpacity onPress={onBack} style={{ marginLeft: 4 }} activeOpacity={0.7}>
          <Pencil size={12} color="#16a34a" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* SMS hint */}
      <View style={s.smsHint}>
        <View style={s.smsDot}>
          <View style={s.smsDotInner} />
        </View>
        <Text style={s.smsHintText}>Waiting for SMS auto-read…</Text>
      </View>

      {/* OTP boxes */}
      <View style={s.otpRow}>
        {digits.map((d, i) => {
          const hasError = !!error;
          const isActive = !d && digits.slice(0, i).every(x => x !== '');
          return (
            <TextInput
              key={i}
              ref={el => { refs.current[i] = el; }}
              style={[
                s.otpBox,
                hasError ? s.otpBoxError : d ? s.otpBoxFilled : isActive ? s.otpBoxActive : s.otpBoxEmpty,
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={d}
              onChangeText={v => handleChange(i, v)}
              onKeyPress={e => handleKeyPress(i, e.nativeEvent.key)}
              autoComplete="one-time-code"
              editable={!verifying}
              textAlign="center"
              caretHidden
            />
          );
        })}
      </View>

      {/* Error / verifying */}
      <View style={{ minHeight: 20, marginTop: 6 }}>
        {error && <Text style={s.errorText}>{error}</Text>}
        {verifying && !error && (
          <View style={s.verifyingRow}>
            <Text style={s.verifyingText}>Verifying…</Text>
          </View>
        )}
      </View>

      {/* Resend row */}
      <View style={s.resendRow}>
        <View style={s.resendLeft}>
          <Clock size={13} color="#94a3b8" />
          <Text style={s.resendTimer}>
            {seconds > 0
              ? `Resend in 00:${String(seconds).padStart(2, '0')}`
              : "Didn't get the code?"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleResend}
          disabled={seconds > 0}
          activeOpacity={0.7}
        >
          <Text style={[s.resendBtn, seconds > 0 && s.resendBtnDisabled]}>
            Resend OTP
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

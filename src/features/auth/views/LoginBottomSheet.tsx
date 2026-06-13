import { useAuthStore } from '@/src/core/store/useAuthStore';
import { VillageBottomSheet } from '@/src/shared/components/VillageBottomSheet';
import {
  ArrowLeft,
  Check,
  Clock,
  Lock,
  Pencil,
  Phone,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { requestPhoneNumber } from '@/src/native/PhoneHint';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type Step = 'phone' | 'otp' | 'signup' | 'placing' | 'success';

const OTP_LEN = 6;

function formatPhone(digits: string): string {
  if (digits.length <= 5) return digits;
  return digits.slice(0, 5) + ' ' + digits.slice(5);
}

// ─── Phone Step ────────────────────────────────────────────────────────────────

interface PhoneStepProps {
  phone: string;
  setPhone: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  busy: boolean;
  onSimPick: (phone: string) => void;
  error: string | null;
}

const PhoneStep = ({ phone, setPhone, onSubmit, onClose, busy, onSimPick, error }: PhoneStepProps) => {
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
          <Text style={s.badgeText}>LOGIN TO CHECKOUT</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.iconBtn} activeOpacity={0.7}>
          <X size={16} color="#334155" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <Text style={s.title}>Enter your mobile number</Text>
      <Text style={s.subtitle}>
        We'll send a 6-digit OTP to verify. Your number stays private.
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
          { icon: <Truck size={13} color="#94a3b8" />, label: '12 min delivery' },
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

// ─── OTP Step ─────────────────────────────────────────────────────────────────

interface OtpStepProps {
  phone: string;
  onBack: () => void;
  onVerified: (otp: string) => void;
  verifying: boolean;
  error: string | null;
}

const OtpStep = ({ phone, onBack, onVerified, verifying, error }: OtpStepProps) => {
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

// ─── Signup Step ──────────────────────────────────────────────────────────────

interface SignupStepProps {
  phone: string;
  onBack: () => void;
  onSubmit: (firstName: string, lastName: string) => void;
  busy: boolean;
  error: string | null;
}

const SignupStep = ({ phone, onBack, onSubmit, busy, error }: SignupStepProps) => {
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

// ─── Placing Step ──────────────────────────────────────────────────────────────

const PlacingStep = () => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rotation);
  }, []);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={s.centeredStep}>
      <View style={s.spinnerWrap}>
        <View style={s.spinnerBg} />
        <Animated.View style={[s.spinnerRing, spinStyle]} />
        <Truck size={28} color="#15803d" strokeWidth={2.2} />
      </View>
      <Text style={s.centeredTitle}>Placing your order…</Text>
      <Text style={s.centeredSubtitle}>Hold on while we confirm with the store.</Text>
    </View>
  );
};

// ─── Success Step ─────────────────────────────────────────────────────────────

interface SuccessStepProps {
  phone: string;
  onDone: () => void;
  grandTotal: number;
  itemCount: number;
}

const SuccessStep = ({ phone, onDone, grandTotal, itemCount }: SuccessStepProps) => {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 300 });
    ringScale.value = withRepeat(withTiming(1.5, { duration: 900 }), -1, false);
    ringOpacity.value = withRepeat(withTiming(0, { duration: 900 }), -1, false);

    const t = setTimeout(onDone, 1800);
    return () => {
      clearTimeout(t);
      cancelAnimation(scale);
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
    };
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View style={s.centeredStep}>
      <View style={s.spinnerWrap}>
        <Animated.View style={[s.pulseRing, ringStyle]} />
        <Animated.View style={[s.checkCircleBg, checkStyle]}>
          <Check size={40} color="#fff" strokeWidth={3.5} />
        </Animated.View>
      </View>
      <Text style={s.centeredTitle}>Order placed!</Text>
      <Text style={[s.centeredSubtitle, { textAlign: 'center', maxWidth: 240 }]}>
        {itemCount} {itemCount === 1 ? 'item' : 'items'} · ₹{grandTotal} · arriving in{' '}
        <Text style={{ fontWeight: '800', color: '#0f172a' }}>12 min</Text>
      </Text>
      <View style={s.smsConfirm}>
        <Phone size={12} color="#94a3b8" />
        <Text style={s.smsConfirmText}>SMS sent to +91 {formatPhone(phone)}</Text>
      </View>
    </View>
  );
};

// ─── LoginBottomSheet ─────────────────────────────────────────────────────────

export interface LoginBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialStep?: Step;
  itemCount?: number;
  grandTotal?: number;
  /**
   * 'checkout' (default) runs the placing→success order animation after auth.
   * 'auth' is a standalone sign-in (e.g. profile): once authenticated it calls
   * onComplete immediately without the order steps.
   */
  mode?: 'checkout' | 'auth';
}

export const LoginBottomSheet = ({
  visible,
  onClose,
  onComplete,
  initialStep = 'phone',
  itemCount = 0,
  grandTotal = 0,
  mode = 'checkout',
}: LoginBottomSheetProps) => {
  const [step, setStep] = useState<Step>(initialStep);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  const requestOtp = useAuthStore(state => state.requestOtp);
  const verifyOtp = useAuthStore(state => state.verifyOtp);
  const signupUser = useAuthStore(state => state.signupUser);

  useEffect(() => {
    if (visible) {
      setStep(initialStep);
      setSending(false);
      setVerifying(false);
      setSigningUp(false);
      setPhoneError(null);
      setOtpError(null);
      setSignupError(null);
      if (initialStep === 'placing') {
        setTimeout(() => setStep('success'), 1200);
      }
    }
  }, [visible]);

  const handlePhoneSubmit = async () => {
    if (phone.length !== 10) return;
    setSending(true);
    setPhoneError(null);
    try {
      await requestOtp(phone);
      setStep('otp');
    } catch (e) {
      setPhoneError(e instanceof Error ? e.message : 'Could not send OTP. Try again.');
    } finally {
      setSending(false);
    }
  };

  const handleVerified = async (code: string) => {
    setVerifying(true);
    setOtpError(null);
    setOtp(code);
    try {
      const result = await verifyOtp(phone, code);
      if (result === 'ok') {
        if (mode === 'auth') {
          onComplete();
        } else {
          setStep('placing');
          setTimeout(() => setStep('success'), 1200);
        }
      } else {
        setStep('signup');
      }
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : 'Verification failed. Try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSignup = async (firstName: string, lastName: string) => {
    setSigningUp(true);
    setSignupError(null);
    try {
      await signupUser(phone, otp, firstName, lastName);
      if (mode === 'auth') {
        onComplete();
      } else {
        setStep('placing');
        setTimeout(() => setStep('success'), 1200);
      }
    } catch (e) {
      setSignupError(e instanceof Error ? e.message : 'Could not create account. Try again.');
    } finally {
      setSigningUp(false);
    }
  };

  const preventClose = step === 'placing' || step === 'success';

  return (
    <VillageBottomSheet
      visible={visible}
      onClose={preventClose ? () => {} : onClose}
    >
      {step === 'phone' && (
        <PhoneStep
          phone={phone}
          setPhone={setPhone}
          onSubmit={handlePhoneSubmit}
          onClose={onClose}
          busy={sending}
          onSimPick={num => setPhone(num)}
          error={phoneError}
        />
      )}
      {step === 'otp' && (
        <OtpStep
          phone={phone}
          onBack={() => { setStep('phone'); setOtpError(null); }}
          onVerified={handleVerified}
          verifying={verifying}
          error={otpError}
        />
      )}
      {step === 'signup' && (
        <SignupStep
          phone={phone}
          onBack={() => { setStep('otp'); setSignupError(null); }}
          onSubmit={handleSignup}
          busy={signingUp}
          error={signupError}
        />
      )}
      {step === 'placing' && <PlacingStep />}
      {step === 'success' && (
        <SuccessStep
          phone={phone}
          onDone={onComplete}
          grandTotal={grandTotal}
          itemCount={itemCount}
        />
      )}
    </VillageBottomSheet>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  stepContainer: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 18,
  },
  phoneBold: {
    fontWeight: '800',
    color: '#1e293b',
  },
  simChip: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  simChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  phoneRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    height: 52,
  },
  phoneRowValid: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    height: '100%',
  },
  flag: { fontSize: 18 },
  countryCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  validCheck: {
    paddingRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trustLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.2,
  },
  cta: {
    marginTop: 20,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaActive: {
    backgroundColor: '#16a34a',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  ctaDisabled: {
    backgroundColor: '#f1f5f9',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  ctaTextActive: { color: '#fff' },
  ctaTextDisabled: { color: '#94a3b8' },
  legal: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 10.5,
    lineHeight: 16,
    color: '#64748b',
    paddingHorizontal: 12,
  },
  legalLink: {
    fontWeight: '700',
    color: '#334155',
    textDecorationLine: 'underline',
  },
  // OTP step
  otpSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  smsHint: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  smsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smsDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  smsHintText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.2,
  },
  otpRow: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  otpBoxEmpty: {
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  otpBoxActive: {
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  otpBoxFilled: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  otpBoxError: {
    borderColor: '#f43f5e',
    backgroundColor: '#fff1f2',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e11d48',
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifyingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  resendRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  resendTimer: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  resendBtn: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  resendBtnDisabled: {
    color: '#cbd5e1',
  },
  // Placing / success
  centeredStep: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  spinnerWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    backgroundColor: '#f0fdf4',
  },
  spinnerRing: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#16a34a',
    borderRightColor: 'transparent',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#bbf7d0',
  },
  checkCircleBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  centeredSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 18,
  },
  smsConfirm: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  smsConfirmText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94a3b8',
  },
});

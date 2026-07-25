// The six step components, their shared styles, and the small helpers now live
// in ./login-sheet. This file keeps only the orchestration: which step is
// showing, and what each step's callbacks do.

import { useAuthStore } from '@/src/core/store/useAuthStore';
import { VillageBottomSheet } from '@/src/shared/components/VillageBottomSheet';
import React, { useEffect, useState } from 'react';
import { errText, type Step } from './login-sheet/helpers';
import { PhoneStep } from './login-sheet/PhoneStep';
import { OtpStep } from './login-sheet/OtpStep';
import { SignupStep } from './login-sheet/SignupStep';
import { PlacingStep } from './login-sheet/PlacingStep';
import { SuccessStep } from './login-sheet/SuccessStep';
import { PlacingErrorStep } from './login-sheet/PlacingErrorStep';

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
  /**
   * Places the real order when the flow reaches the 'placing' step (checkout
   * mode). Resolve advances to 'success'; reject surfaces a retryable error. If
   * omitted, the placing step is a pure animation (legacy behaviour).
   */
  onPlaceOrder?: () => Promise<void>;
}

export const LoginBottomSheet = ({
  visible,
  onClose,
  onComplete,
  initialStep = 'phone',
  itemCount = 0,
  grandTotal = 0,
  mode = 'checkout',
  onPlaceOrder,
}: LoginBottomSheetProps) => {
  const [step, setStep] = useState<Step>(initialStep);
  const [placeError, setPlaceError] = useState<string | null>(null);
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
      setPlaceError(null);
      if (initialStep === 'placing') {
        goPlacing();
      }
    }
  }, [visible]);

  // Runs the placing animation while the real order request is in flight. The
  // animation has a floor (~1.2s) so it never flashes; on success it advances to
  // 'success', on failure to a retryable error step. With no onPlaceOrder it
  // degrades to the original pure-animation behaviour.
  const goPlacing = async () => {
    setPlaceError(null);
    setStep('placing');
    const floor = new Promise<void>((r) => setTimeout(r, 1200));
    try {
      await Promise.all([onPlaceOrder?.(), floor]);
      setStep('success');
    } catch (e) {
      await floor;
      setPlaceError(errText(e, 'Could not place your order. Try again.'));
      setStep('placing_error');
    }
  };

  const handlePhoneSubmit = async () => {
    if (phone.length !== 10) return;
    setSending(true);
    setPhoneError(null);
    try {
      await requestOtp(phone);
      setStep('otp');
    } catch (e) {
      setPhoneError(errText(e, 'Could not send OTP. Try again.'));
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
          goPlacing();
        }
      } else {
        setStep('signup');
      }
    } catch (e) {
      setOtpError(errText(e, 'Verification failed. Try again.'));
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
        goPlacing();
      }
    } catch (e) {
      setSignupError(errText(e, 'Could not create account. Try again.'));
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
          badge={mode === 'auth' ? 'LOGIN' : 'LOGIN TO CHECKOUT'}
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
      {step === 'placing_error' && (
        <PlacingErrorStep
          message={placeError ?? 'Could not place your order. Try again.'}
          onRetry={goPlacing}
          onClose={onClose}
        />
      )}
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

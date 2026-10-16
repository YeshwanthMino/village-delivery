// The six step components, their shared styles, and the small helpers now live
// in ./login-sheet. This file keeps only the orchestration: which step is
// showing, and what each step's callbacks do.

import { useAuthStore } from '@/src/core/store/useAuthStore';
import { VillageBottomSheet } from '@/src/shared/components/VillageBottomSheet';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useScreenFocused } from '@/src/shared/hooks/useScreenActive';
import { useBackAction } from '@/src/shared/hooks/useBackAction';
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
  /** Called after the native modal is gone, so another sheet may open. */
  onDismiss?: () => void;
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

export const LoginBottomSheet = (props: LoginBottomSheetProps) => {
  const focused = useScreenFocused();
  // Dismiss the owning screen's flag too: refocusing must not restart a
  // checkout whose order request is still completing in the background.
  const { visible, onClose } = props;
  useEffect(() => {
    if (visible && !focused) onClose();
  }, [visible, focused, onClose]);
  const requested = visible && focused;
  const [mounted, setMounted] = useState(requested);
  const [closing, setClosing] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const requestedRef = useRef(requested);
  requestedRef.current = requested;

  // Keep the native Modal mounted after hiding it. UIKit reports onDismiss
  // asynchronously; a request to reopen during that interval waits for it.
  useLayoutEffect(() => {
    if (requested && !mounted && !closing) setMounted(true);
    else if (!requested && mounted) setClosing(true);
  }, [requested, mounted, closing]);

  const handleDismiss = () => {
    props.onDismiss?.();
    if (requestedRef.current) {
      setSessionKey(key => key + 1);
      setClosing(false);
    } else {
      setMounted(false);
      setClosing(false);
    }
  };

  return mounted ? (
    <LoginFlow key={sessionKey} {...props} visible={requested && !closing} onNativeDismiss={handleDismiss} />
  ) : null;
};

const LoginFlow = ({
  visible,
  onClose,
  onComplete,
  initialStep = 'phone',
  itemCount = 0,
  grandTotal = 0,
  mode = 'checkout',
  onPlaceOrder,
  onNativeDismiss,
}: LoginBottomSheetProps & { onNativeDismiss: () => void }) => {
  const [step, setStep] = useState<Step>(initialStep);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  const requestOtp = useAuthStore(state => state.requestOtp);
  const verifyOtp = useAuthStore(state => state.verifyOtp);
  const signupUser = useAuthStore(state => state.signupUser);
  const session = useRef(0);
  const alive = useRef(true);
  const floor = useRef<{ timer: ReturnType<typeof setTimeout>; finish: () => void } | null>(null);
  const placingRequest = useRef<Promise<void> | null>(null);
  const completed = useRef(false);
  const complete = () => {
    if (!alive.current || completed.current) return;
    completed.current = true;
    session.current++;
    onComplete();
  };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (floor.current) {
        clearTimeout(floor.current.timer);
        floor.current.finish();
        floor.current = null;
      }
    };
  }, []);
  useEffect(() => {
    if (visible) return;
    // The host stays mounted for native dismissal, so invalidate UI work now
    // rather than waiting for the native callback to unmount this flow.
    alive.current = false;
    session.current++;
    placingRequest.current = null;
    setResendingOtp(false);
    if (floor.current) {
      clearTimeout(floor.current.timer);
      floor.current.finish();
      floor.current = null;
    }
  }, [visible]);

  // Runs the placing animation while the real order request is in flight. The
  // animation has a floor (~1.2s) so it never flashes; on success it advances to
  // 'success', on failure to a retryable error step. With no onPlaceOrder it
  // degrades to the original pure-animation behaviour.
  const goPlacing = async () => {
    const token = ++session.current;
    setPlaceError(null);
    setStep('placing');
    const minimumDuration = new Promise<void>((finish) => {
      floor.current = { timer: setTimeout(() => {
        floor.current = null;
        finish();
      }, 1200), finish };
    });
    try {
      // React can replay mount effects in development. Reuse the order request
      // while allowing the replayed effect to own a fresh animation deadline.
      placingRequest.current ??= onPlaceOrder?.() ?? Promise.resolve();
      await Promise.all([placingRequest.current, minimumDuration]);
      if (!alive.current || token !== session.current) return;
      setStep('success');
    } catch (e) {
      await minimumDuration;
      if (!alive.current || token !== session.current) return;
      setPlaceError(errText(e, 'Could not place your order. Try again.'));
      setStep('placing_error');
    } finally {
      if (token === session.current) placingRequest.current = null;
    }
  };

  // Each visible session mounts a fresh flow. Later prop updates (e.g. auth
  // becoming true) must not restart the step or submit another order.
  const entry = useRef({ initialStep, goPlacing });
  useEffect(() => {
    if (entry.current.initialStep === 'placing') void entry.current.goPlacing();
  }, []);

  const handlePhoneSubmit = async () => {
    if (phone.length !== 10) return;
    const token = ++session.current;
    setSending(true);
    setPhoneError(null);
    try {
      await requestOtp(phone);
      if (!alive.current || token !== session.current) return;
      setStep('otp');
    } catch (e) {
      if (!alive.current || token !== session.current) return;
      setPhoneError(errText(e, 'Could not send OTP. Try again.'));
    } finally {
      if (alive.current && token === session.current) setSending(false);
    }
  };

  const handleVerified = async (code: string) => {
    const token = ++session.current;
    setVerifying(true);
    setOtpError(null);
    setOtp(code);
    try {
      const result = await verifyOtp(phone, code);
      if (!alive.current || token !== session.current) return;
      if (result === 'ok') {
        if (mode === 'auth') {
          complete();
        } else {
          goPlacing();
        }
      } else {
        setStep('signup');
      }
    } catch (e) {
      if (!alive.current || token !== session.current) return;
      setOtpError(errText(e, 'Verification failed. Try again.'));
    } finally {
      if (alive.current && token === session.current) setVerifying(false);
    }
  };

  const handleOtpResend = async () => {
    if (resendingOtp || verifying || !alive.current) return false;
    const token = ++session.current;
    setResendingOtp(true);
    setOtpError(null);
    try {
      await requestOtp(phone);
      return alive.current && token === session.current;
    } catch (e) {
      if (alive.current && token === session.current) {
        setOtpError(errText(e, 'Could not resend OTP. Try again.'));
      }
      return false;
    } finally {
      if (alive.current && token === session.current) setResendingOtp(false);
    }
  };

  const handleSignup = async (firstName: string, lastName: string) => {
    const token = ++session.current;
    setSigningUp(true);
    setSignupError(null);
    try {
      await signupUser(phone, otp, firstName, lastName);
      if (!alive.current || token !== session.current) return;
      if (mode === 'auth') {
        complete();
      } else {
        goPlacing();
      }
    } catch (e) {
      if (!alive.current || token !== session.current) return;
      setSignupError(errText(e, 'Could not create account. Try again.'));
    } finally {
      if (alive.current && token === session.current) setSigningUp(false);
    }
  };

  const preventClose = step === 'placing' || step === 'success';
  const goBack = useBackAction(() => {
    if (!visible) return;
    if (step === 'placing') return; // The submitted order is still in flight.
    if (step === 'success') { complete(); return; }
    session.current++;
    setResendingOtp(false);
    if (step === 'signup') {
      setSigningUp(false); setSignupError(null); setStep('otp');
    } else if (step === 'otp') {
      setVerifying(false); setOtpError(null); setStep('phone');
    } else {
      onClose();
    }
  });

  return (
    <VillageBottomSheet
      visible={visible}
      onClose={preventClose ? () => {} : onClose}
      onBack={goBack}
      onDismiss={onNativeDismiss}
      dismissable={false}
    >
      {step === 'phone' && (
        <PhoneStep
          phone={phone}
          setPhone={setPhone}
          onSubmit={handlePhoneSubmit}
          onClose={goBack}
          busy={sending}
          onSimPick={num => setPhone(num)}
          error={phoneError}
          badge={mode === 'auth' ? 'LOGIN' : 'LOGIN TO CHECKOUT'}
        />
      )}
      {step === 'otp' && (
        <OtpStep
          phone={phone}
          onBack={goBack}
          onVerified={handleVerified}
          onRetryStart={() => setOtpError(null)}
          onResend={handleOtpResend}
          resending={resendingOtp}
          verifying={verifying}
          error={otpError}
        />
      )}
      {step === 'signup' && (
        <SignupStep
          phone={phone}
          onBack={goBack}
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
          onClose={goBack}
        />
      )}
      {step === 'success' && (
        <SuccessStep
          phone={phone}
          onDone={complete}
          grandTotal={grandTotal}
          itemCount={itemCount}
        />
      )}
    </VillageBottomSheet>
  );
};

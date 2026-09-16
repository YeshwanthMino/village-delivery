// Small shared pieces for the login/checkout sheet steps.

export type Step = 'phone' | 'otp' | 'signup' | 'placing' | 'placing_error' | 'success';

export const OTP_LEN = 6;

export function formatPhone(digits: string): string {
  if (digits.length <= 5) return digits;
  return digits.slice(0, 5) + ' ' + digits.slice(5);
}

// Auth failures arrive either as a thrown Error (e.g. "Select your location
// first") or as the apiClient's NetworkError plain object (carries the real
// server message in .message / .fullMessage). Surface whichever is present.
export function errText(e: any, fallback: string): string {
  return e?.fullMessage || e?.message || fallback;
}

// ─── Phone Step ────────────────────────────────────────────────────────────────

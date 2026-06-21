// src/features/auth/data/appAuthApi.ts
//
// AppAuth (customer) API: phone-OTP login / signup.
// Every endpoint requires the `x-store-id` header (the serviceable village's
// storeId); without it the server returns 404 "Store not found".

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService, AppAuthRoutes } from '@/src/base/constants/AppConstants';
import { AuthTokens } from '@/src/base/services/remote/apiTypes';

const BASE = WebService.villageBaseURL;

function storeOpts(storeId: string) {
  return { headers: { 'x-store-id': storeId } };
}

/**
 * Defensive token parse — mirrors apiClient.performTokenRefresh. The exact
 * login-verify/signup token JSON is undocumented in swagger, so accept either a
 * bare object or a `{ data }` wrapper. Returns null when no accessToken present
 * (drives the new-user branch in verifyLogin).
 */
export function parseTokens(resp: any): AuthTokens | null {
  const t = resp?.data ?? resp;
  if (!t || !t.accessToken) return null;
  return {
    accessToken: t.accessToken,
    refreshToken: t.refreshToken,
    tokenType: t.tokenType ?? 'Bearer',
    expiresIn: t.expiresIn ?? 0,
    userId: t.userId,
  };
}

/**
 * Send the login OTP. The server replies with a `requestId` that must be echoed
 * back on verify-otp / signup. Returns null if the response carries none.
 */
export async function requestOtp(storeId: string, mobileNumber: string): Promise<string | null> {
  const resp = await apiClient.postWithoutAuth<any>(
    `${BASE}${AppAuthRoutes.loginOtp}`,
    { mobileNumber },
    storeOpts(storeId),
  );
  const data = resp?.data ?? resp;
  return data?.requestId ?? null;
}

export type VerifyResult =
  | { status: 'ok'; tokens: AuthTokens }
  | { status: 'new_user' };

export async function verifyLogin(
  storeId: string,
  mobileNumber: string,
  otp: string,
  requestId: string | null,
): Promise<VerifyResult> {
  try {
    const resp = await apiClient.postWithoutAuth<any>(
      `${BASE}${AppAuthRoutes.loginVerify}`,
      { mobileNumber, otp, requestId },
      storeOpts(storeId),
    );
    console.log('[appAuth] login-verify raw:', JSON.stringify(resp));
    const tokens = parseTokens(resp);
    if (tokens) return { status: 'ok', tokens };
    // 2xx without tokens → unregistered number, needs signup.
    return { status: 'new_user' };
  } catch (err: any) {
    // Unregistered numbers may also surface as a 4xx (e.g. 404). Route to signup;
    // re-throw anything else.
    const status = err?.statusCode;
    if (status && status >= 400 && status < 500) return { status: 'new_user' };
    throw err;
  }
}

export interface SignupInput {
  mobileNumber: string;
  otp: string;
  firstName: string;
  lastName: string;
  requestId: string | null;
}

export async function signup(storeId: string, input: SignupInput): Promise<AuthTokens> {
  const resp = await apiClient.postWithoutAuth<any>(
    `${BASE}${AppAuthRoutes.loginSignup}`,
    input,
    storeOpts(storeId),
  );
  console.log('[appAuth] login-signup raw:', JSON.stringify(resp));
  const tokens = parseTokens(resp);
  if (!tokens) throw new Error('Signup did not return a token');
  return tokens;
}

export async function getMe(storeId: string): Promise<any> {
  return apiClient.get<any>(`${BASE}${AppAuthRoutes.me}`, storeOpts(storeId));
}

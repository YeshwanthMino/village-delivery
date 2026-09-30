// src/features/auth/data/appAuthApi.ts
//
// AppAuth (customer) API: phone-OTP login / signup.
// Every endpoint requires the `x-store-id` header (the serviceable village's
// storeId); without it the server returns 404 "Store not found".

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService, AppAuthRoutes } from '@/src/base/constants/AppConstants';
import { AuthTokens } from '@/src/base/services/remote/apiTypes';
import { logger } from '@/src/base/services/logger';
import type { UserObject } from '@/src/base/services/remote/storage/StoredPrefs';

const BASE = WebService.villageBaseURL;

function storeOpts(storeId: string, deviceId?: string | null) {
  const headers: Record<string, string> = { 'x-store-id': storeId };
  if (deviceId) headers['x-device-id'] = deviceId;
  return { headers };
}

/**
 * Defensive token parse — mirrors apiClient.performTokenRefresh. The exact
 * login-verify/signup token JSON is undocumented in swagger, so accept either a
 * bare object or a `{ data }` wrapper. A missing accessToken is checked against
 * response errors before verifyLogin treats it as a verified new user.
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
 * Send the login OTP. The server replies with a `deviceId` that must be echoed
 * back on verify-otp / signup in the request body (confirmed against a working
 * Postman call — an earlier version of this code sent it only as the
 * `x-device-id` header, which the server does not honor for these two calls).
 * It is also kept on the header for now since nothing has shown that hurts.
 * Returns null if the response carries none.
 */
export async function requestOtp(storeId: string, mobileNumber: string): Promise<string | null> {
  const resp = await apiClient.postWithoutAuth<any>(
    `${BASE}${AppAuthRoutes.loginOtp}`,
    { mobileNumber },
    storeOpts(storeId),
  );
  const data = resp?.data ?? resp;
  return data?.deviceId ?? null;
}

export type VerifyResult =
  | { status: 'ok'; tokens: AuthTokens }
  | { status: 'new_user' };

function isUnregisteredUserError(err: any): boolean {
  const status = err?.statusCode;
  if (typeof status !== 'number' || status < 400 || status >= 500) return false;
  const details = [err?.code, err?.message, err?.fullMessage, err?.rawData?.code, err?.rawData?.message]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .replace(/[_-]/g, ' ');
  return /\b(user|account|customer|mobile number|phone number)\b.{0,60}\b(not found|does not exist|doesn't exist|not registered|unregistered)\b/i.test(details)
    || /\b(not found|does not exist|doesn't exist|not registered|unregistered)\b.{0,60}\b(user|account|customer|mobile number|phone number)\b/i.test(details);
}

function isOtpErrorResponse(data: any): boolean {
  const details = [data?.code, data?.message, data?.error]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .replace(/[_-]/g, ' ');
  return /\b(otp|code)\b.{0,60}\b(invalid|incorrect|wrong|expired|mismatch|not found)\b/i.test(details)
    || /\b(invalid|incorrect|wrong|expired|mismatch|not found)\b.{0,60}\b(otp|code)\b/i.test(details);
}

export async function verifyLogin(
  storeId: string,
  mobileNumber: string,
  otp: string,
  deviceId: string | null,
): Promise<VerifyResult> {
  try {
    const resp = await apiClient.postWithoutAuth<any>(
      `${BASE}${AppAuthRoutes.loginVerify}`,
      { mobileNumber, otp, deviceId },
      storeOpts(storeId, deviceId),
    );
    logger.debug('[appAuth] login-verify raw:', JSON.stringify(resp));
    const tokens = parseTokens(resp);
    if (tokens) return { status: 'ok', tokens };
    const data = resp?.data ?? resp;
    if (data?.success === false || data?.error || isOtpErrorResponse(data)) {
      throw new Error(data?.message || 'OTP verification failed. Please try again.');
    }
    // A successful verification with no tokens means this number needs signup.
    return { status: 'new_user' };
  } catch (err: any) {
    // Some servers signal an unregistered number with a 4xx. Only that explicit
    // case advances to signup; invalid/expired OTP and other errors stay on OTP.
    if (isUnregisteredUserError(err)) return { status: 'new_user' };
    throw err;
  }
}

export interface SignupInput {
  mobileNumber: string;
  otp: string;
  firstName: string;
  lastName: string;
}

export async function signup(
  storeId: string,
  input: SignupInput,
  deviceId: string | null,
): Promise<AuthTokens> {
  const resp = await apiClient.postWithoutAuth<any>(
    `${BASE}${AppAuthRoutes.loginSignup}`,
    { ...input, deviceId },
    storeOpts(storeId, deviceId),
  );
  logger.debug('[appAuth] login-signup raw:', JSON.stringify(resp));
  const tokens = parseTokens(resp);
  if (!tokens) throw new Error('Signup did not return a token');
  return tokens;
}

export async function getMe(storeId: string): Promise<UserObject> {
  return apiClient.get<UserObject>(`${BASE}${AppAuthRoutes.me}`, storeOpts(storeId));
}

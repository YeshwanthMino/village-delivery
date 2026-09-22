// src/features/wallet/data/walletApi.ts
//
// Fetches the signed-in user's wallet: GET /app/wallet
// (AppWalletController_getBalance). Needs the auth token and the active store's
// `x-store-id` header, both injected centrally by apiClient — the endpoint 401s
// without a token, so this is signed-in only.
//
// The swagger entry for /app/wallet documents no response body, and the
// wallet-document schema elsewhere in the spec (CreateWalletDto: customerId /
// wallet / cashback / active) does NOT match what this endpoint actually
// returns. A logged-in staging call answered:
//
//     { "cashback": 50, "cashbackExpiryDate": "2026-11-09T18:29:59.999Z", "daysLeft": 55 }
//
// i.e. no `wallet`/`balance` field at all — this is a cashback-only wallet, not
// a general spendable balance. mapWallet is built around that shape but stays
// tolerant of the field-name variants seen on other endpoints (ordersApi etc.)
// in case the live payload differs per account state (e.g. no active cashback).

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';
import { toUnits as toRupeeUnits } from '@/src/shared/utils/currency';
import { logger } from '@/src/base/services/logger';

const BASE = WebService.villageBaseURL;

export interface Wallet {
  /** Cashback balance, in internal price units (see shared/utils/currency). */
  cashback: number;
  /** ISO timestamp the current cashback expires, or null if none/not sent. */
  expiryDate: string | null;
  /** Days remaining until expiry, or null if none/not sent. */
  daysLeft: number | null;
}

/** Pick the first defined value among candidate keys — see ordersApi.pick. */
function pick(obj: unknown, keys: string[]): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const record = obj as Record<string, unknown>;
  for (const k of keys) {
    if (record[k] !== undefined && record[k] !== null) return record[k];
  }
  return undefined;
}

/** Rupees from the API → internal units. Non-numeric input yields null. */
function toUnits(rupeeAmount: unknown): number | null {
  if (rupeeAmount === undefined || rupeeAmount === null || rupeeAmount === '') return null;
  const n = Number(rupeeAmount);
  return Number.isFinite(n) ? toRupeeUnits(n) : null;
}

/** Unwrap a `{ data }` / `{ result }` envelope while the value is an object. */
function unwrap(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  for (const key of ['data', 'result']) {
    const value = (raw as Record<string, unknown>)[key];
    if (value && typeof value === 'object') return value;
  }
  return raw;
}

export function mapWallet(raw: unknown): Wallet | null {
  if (!raw || typeof raw !== 'object') return null;
  const node = unwrap(raw);
  if (!node || typeof node !== 'object') return null;

  const cashback = toUnits(pick(node, ['cashback', 'wallet', 'balance', 'cashbackBalance']));
  // No readable amount means no wallet to show — better a hidden amount than a
  // confident "₹0" that isn't the user's real balance.
  if (cashback === null) return null;

  const expiryRaw = pick(node, ['cashbackExpiryDate', 'expiryDate', 'expiresAt']);
  const daysLeftRaw = pick(node, ['daysLeft', 'expiresInDays', 'daysToExpiry']);
  const daysLeft = daysLeftRaw != null ? Number(daysLeftRaw) : null;

  return {
    cashback,
    expiryDate: expiryRaw != null ? String(expiryRaw) : null,
    daysLeft: daysLeft != null && Number.isFinite(daysLeft) ? daysLeft : null,
  };
}

export async function getWallet(): Promise<Wallet | null> {
  const resp = await apiClient.get<unknown>(`${BASE}/app/wallet`);
  const wallet = mapWallet(resp);
  // Loud on the failure path: an unreadable payload is why the profile card
  // would come up empty, and that is exactly when the raw shape is worth having.
  if (wallet) {
    logger.debug('[wallet] cashback:', wallet.cashback, 'daysLeft:', wallet.daysLeft);
  } else {
    logger.warn('[wallet] could not read a balance from:', JSON.stringify(resp)?.slice(0, 1000));
  }
  return wallet;
}

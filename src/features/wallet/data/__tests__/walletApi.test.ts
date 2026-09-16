// /app/wallet is undocumented in swagger, and the wallet-document schema
// published elsewhere in the API's own spec (customerId/wallet/cashback/active)
// does NOT match its actual response. A real logged-in call on staging
// answered:
//
//     { "cashback": 50, "cashbackExpiryDate": "2026-11-09T18:29:59.999Z", "daysLeft": 55 }
//
// i.e. this is a cashback-only wallet — no spendable "balance" field exists.
// These tests pin that real shape, plus the rupees→units conversion, which is
// the easiest thing to silently get 20x wrong.

import { apiClient } from '@/src/base/services/remote/apiClient';
import { mapWallet, getWallet } from '../walletApi';
import { rupees } from '@/src/shared/utils/currency';

jest.mock('@/src/base/services/remote/apiClient', () => ({
  apiClient: { get: jest.fn() },
}));

const mockGet = apiClient.get as jest.Mock;

describe('mapWallet', () => {
  test('returns null for a payload with no readable cashback amount', () => {
    expect(mapWallet({})).toBeNull();
    expect(mapWallet(null)).toBeNull();
    expect(mapWallet('not an object')).toBeNull();
    expect(mapWallet({ cashback: 'abc' })).toBeNull();
  });

  test('maps the real staging response shape', () => {
    const wallet = mapWallet({
      cashback: 50,
      cashbackExpiryDate: '2026-11-09T18:29:59.999Z',
      daysLeft: 55,
    });
    expect(rupees(wallet!.cashback)).toBe('₹50');
    expect(wallet!.expiryDate).toBe('2026-11-09T18:29:59.999Z');
    expect(wallet!.daysLeft).toBe(55);
  });

  test('unwraps a { data } / { result } envelope', () => {
    expect(mapWallet({ data: { cashback: 250 } })?.cashback).toBe(250 / 20);
    expect(mapWallet({ result: { cashback: 250 } })?.cashback).toBe(250 / 20);
  });

  test('reads the amount from any of the known field-name variants', () => {
    for (const key of ['cashback', 'wallet', 'balance', 'cashbackBalance']) {
      expect(mapWallet({ [key]: 120 })?.cashback).toBe(120 / 20);
    }
  });

  test('converts rupees to internal units so rupees() round-trips', () => {
    const wallet = mapWallet({ cashback: 349 });
    expect(rupees(wallet!.cashback)).toBe('₹349');
  });

  test('keeps a zero amount rather than treating it as missing', () => {
    const wallet = mapWallet({ cashback: 0 });
    expect(wallet).not.toBeNull();
    expect(rupees(wallet!.cashback)).toBe('₹0');
  });

  test('expiryDate and daysLeft are null when the API omits them', () => {
    const wallet = mapWallet({ cashback: 10 });
    expect(wallet!.expiryDate).toBeNull();
    expect(wallet!.daysLeft).toBeNull();
  });
});

describe('getWallet', () => {
  beforeEach(() => mockGet.mockReset());

  test('GETs /app/wallet and maps the response', async () => {
    mockGet.mockResolvedValue({ cashback: 75, cashbackExpiryDate: '2026-01-01', daysLeft: 10 });
    const wallet = await getWallet();
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/app/wallet'));
    expect(rupees(wallet!.cashback)).toBe('₹75');
  });

  test('returns null when the response carries no wallet', async () => {
    mockGet.mockResolvedValue({ message: 'No wallet' });
    await expect(getWallet()).resolves.toBeNull();
  });
});

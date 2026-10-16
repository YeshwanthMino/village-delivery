const mockTrack = jest.fn();
const mockSaved = new Map<string, unknown>();

jest.mock('@/src/base/services/analytics', () => ({ analytics: {
  track: (...args: unknown[]) => mockTrack(...args),
  isAvailable: jest.fn(async () => true),
} }));
jest.mock('@/src/base/services/remote/storage/StoredPrefs', () => ({
  StoredPrefs: {
    getCustomData: jest.fn(async (key: string) => mockSaved.get(key) ?? null),
    setCustomData: jest.fn(async (key: string, value: unknown) => { mockSaved.set(key, value); }),
  },
}));

import type { Order } from '@/src/base/types/village.types';
import { analytics } from '@/src/base/services/analytics';
import { observeOrderOutcomes } from '../observeOrderOutcomes';

const delivered = {
  id: 'o1', status: 'delivered', items: [{ productId: 'p1', quantity: 2 }],
} as Order;

beforeEach(() => {
  mockTrack.mockClear(); mockSaved.clear();
  (analytics.isAvailable as jest.Mock).mockResolvedValue(true);
});

test('does not mark outcomes observed before a provider is configured', async () => {
  (analytics.isAvailable as jest.Mock).mockResolvedValueOnce(false);
  await observeOrderOutcomes([delivered], 'user-1');
  expect(mockTrack).not.toHaveBeenCalled();
  expect(mockSaved.size).toBe(0);
  await observeOrderOutcomes([delivered], 'user-1');
  expect(mockTrack).toHaveBeenCalledTimes(2);
});

test('emits terminal order and line items once per customer, then records a changed outcome', async () => {
  await observeOrderOutcomes([delivered], 'user-1');
  await observeOrderOutcomes([delivered], 'user-1');
  expect(mockTrack.mock.calls).toEqual([
    ['order_outcome_observed', { order_id: 'o1', status: 'delivered', item_count: 2 }],
    ['product_outcome_observed', { order_id: 'o1', product_id: 'p1', quantity: 2, status: 'delivered' }],
  ]);

  await observeOrderOutcomes([{ ...delivered, status: 'refunded' }], 'user-1');
  expect(mockTrack).toHaveBeenCalledWith('product_outcome_observed', {
    order_id: 'o1', product_id: 'p1', quantity: 2, status: 'refunded',
  });
  await observeOrderOutcomes([delivered], 'user-2');
  expect(mockTrack).toHaveBeenCalledTimes(6);
});

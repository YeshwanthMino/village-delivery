import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BillSummaryCard } from '../BillSummaryCard';
import { toUnits } from '@/src/shared/utils/currency';
import type { Bill } from '@/src/base/types/village.types';

let mockUser: { isVip?: boolean } | null = null;

jest.mock('@/src/core/store', () => ({
  useAuthStore: jest.fn(selector => selector({ user: mockUser })),
}));

const mockRawTemplates: Record<string, string> = {
  bill_summary: 'BILL SUMMARY',
  item_total_mrp: 'Item total (MRP)',
  discount_on_mrp: 'Discount on MRP',
  coupon_label: 'Coupon',
  to_pay: 'To pay',
  you_saved_order: 'You saved {n} on this order',
  bill_cashback_earn: "You'll earn {r} cashback on this order",
};

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => mockRawTemplates[key] ?? key }),
}));

function bill(overrides: Partial<Bill> = {}): Bill {
  return {
    itemTotal: toUnits(800),
    mrpTotal: toUnits(800),
    itemDiscount: 0,
    deliveryFee: 0,
    platformFee: 0,
    couponDiscount: 0,
    grandTotal: toUnits(800),
    totalSavings: 0,
    totalCount: 1,
    minOrderValue: toUnits(199),
    belowMinimum: false,
    amountToMinimum: 0,
    ...overrides,
  };
}

describe('BillSummaryCard', () => {
  afterEach(() => {
    mockUser = null;
  });

  test('shows the earned-cashback row once a tier is unlocked', () => {
    mockUser = { isVip: false };
    render(<BillSummaryCard bill={bill()} couponApplied={false} />);

    expect(screen.getByText("You'll earn ₹25 cashback on this order")).toBeTruthy();
  });

  test('hides the cashback row below the first tier', () => {
    mockUser = { isVip: false };
    const belowTier = bill({ grandTotal: toUnits(250), itemTotal: toUnits(250), mrpTotal: toUnits(250) });

    render(<BillSummaryCard bill={belowTier} couponApplied={false} />);

    expect(screen.queryByText(/cashback on this order/)).toBeNull();
  });

  test('a VIP sees the doubled reward, not the standard one', () => {
    mockUser = { isVip: true };
    render(<BillSummaryCard bill={bill()} couponApplied={false} />);

    expect(screen.getByText("You'll earn ₹50 cashback on this order")).toBeTruthy();
  });

  test('the bill total and MRP rows still render unchanged', () => {
    mockUser = { isVip: false };
    const withDiscount = bill({ mrpTotal: toUnits(900), itemDiscount: toUnits(100) });

    render(<BillSummaryCard bill={withDiscount} couponApplied={false} />);

    expect(screen.getByText('₹900')).toBeTruthy();
    expect(screen.getByText('-₹100')).toBeTruthy();
    expect(screen.getByText('₹800')).toBeTruthy();
  });
});

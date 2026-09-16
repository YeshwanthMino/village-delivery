import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BillSummaryCard } from '../BillSummaryCard';
import { toUnits } from '@/src/shared/utils/currency';
import type { Bill } from '@/src/base/types/village.types';

const mockRawTemplates: Record<string, string> = {
  bill_summary: 'BILL SUMMARY',
  item_total_mrp: 'Item total (MRP)',
  discount_on_mrp: 'Discount on MRP',
  coupon_label: 'Coupon',
  to_pay: 'To pay',
  you_saved_order: 'You saved {n} on this order',
  bill_cashback_earn: "You'll earn {r} cashback on this order",
  vip_membership_title: 'VIP Membership',
  wallet_apply_title: 'Wallet balance',
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
    vipMembershipFee: 0,
    walletDiscount: 0,
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
  test('shows the earned-cashback row once a tier is unlocked', () => {
    render(<BillSummaryCard bill={bill()} couponApplied={false} walletApplied={false} cashbackReward="₹25" />);

    expect(screen.getByText("You'll earn ₹25 cashback on this order")).toBeTruthy();
  });

  test('hides the cashback row below the first tier', () => {
    const belowTier = bill({ grandTotal: toUnits(250), itemTotal: toUnits(250), mrpTotal: toUnits(250) });

    render(<BillSummaryCard bill={belowTier} couponApplied={false} walletApplied={false} cashbackReward={null} />);

    expect(screen.queryByText(/cashback on this order/)).toBeNull();
  });

  test('a VIP sees the doubled reward, not the standard one', () => {
    render(<BillSummaryCard bill={bill()} couponApplied={false} walletApplied={false} cashbackReward="₹50" />);

    expect(screen.getByText("You'll earn ₹50 cashback on this order")).toBeTruthy();
  });

  // Regression guard for the finding where BillSummaryCard computed its own
  // cashback via useCartCashback and leaked a false "you'll earn cashback"
  // promise onto OrderDetailScreen's past orders. The component must never
  // render the row unless a caller explicitly passes cashbackReward.
  test('renders no cashback row when cashbackReward is not passed', () => {
    render(<BillSummaryCard bill={bill()} couponApplied={false} walletApplied={false} />);

    expect(screen.queryByText(/cashback on this order/)).toBeNull();
  });

  test('the bill total and MRP rows still render unchanged', () => {
    const withDiscount = bill({ mrpTotal: toUnits(900), itemDiscount: toUnits(100) });

    render(<BillSummaryCard bill={withDiscount} couponApplied={false} walletApplied={false} />);

    expect(screen.getByText('₹900')).toBeTruthy();
    expect(screen.getByText('-₹100')).toBeTruthy();
    expect(screen.getByText('₹800')).toBeTruthy();
  });

  test('shows a VIP Membership line item when the fee was added to this order', () => {
    const withVip = bill({
      itemTotal: toUnits(179),
      mrpTotal: toUnits(179),
      vipMembershipFee: toUnits(45),
      grandTotal: toUnits(224),
    });

    render(<BillSummaryCard bill={withVip} couponApplied={false} walletApplied={false} />);

    expect(screen.getByText('VIP Membership')).toBeTruthy();
    expect(screen.getByText('₹45')).toBeTruthy();
    expect(screen.getByText('₹224')).toBeTruthy(); // To Pay reflects the fee
  });

  test('hides the VIP Membership row when no fee was added', () => {
    render(<BillSummaryCard bill={bill()} couponApplied={false} walletApplied={false} />);

    expect(screen.queryByText('VIP Membership')).toBeNull();
  });

  test('shows a wallet discount line item when wallet is applied', () => {
    const withWallet = bill({
      itemTotal: toUnits(250),
      mrpTotal: toUnits(250),
      walletDiscount: toUnits(50),
      grandTotal: toUnits(200),
    });

    render(<BillSummaryCard bill={withWallet} couponApplied={false} walletApplied={true} />);

    expect(screen.getByText('Wallet balance')).toBeTruthy();
    expect(screen.getByText('-₹50')).toBeTruthy();
    expect(screen.getByText('₹200')).toBeTruthy(); // To Pay reflects the discount
  });

  test('hides the wallet row when walletApplied is false, even if walletDiscount is set', () => {
    const withWallet = bill({ walletDiscount: toUnits(50) });

    render(<BillSummaryCard bill={withWallet} couponApplied={false} walletApplied={false} />);

    expect(screen.queryByText('Wallet balance')).toBeNull();
  });

  test('hides the wallet row when walletDiscount is 0, even if walletApplied is true', () => {
    render(<BillSummaryCard bill={bill()} couponApplied={false} walletApplied={true} />);

    expect(screen.queryByText('Wallet balance')).toBeNull();
  });
});

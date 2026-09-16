import { computeBill } from '../bill';
import { toUnits } from '@/src/shared/utils/currency';
import type { CartLineItem } from '@/src/base/types/village.types';

function lineItem(priceRupees: number, count: number): CartLineItem {
  const priceUnits = toUnits(priceRupees);
  return {
    key: `item-${priceRupees}`,
    productId: `prod-${priceRupees}`,
    variantIndex: null,
    name: 'Test item',
    weight: '1 pc',
    price: priceUnits,
    mrp: priceUnits,
    count,
  };
}

describe('computeBill — minimum order value', () => {
  test('flags belowMinimum when grandTotal is under ₹199', () => {
    const bill = computeBill([lineItem(100, 1)]);

    expect(bill.belowMinimum).toBe(true);
  });

  test('amountToMinimum is the exact rupee shortfall', () => {
    const bill = computeBill([lineItem(100, 1)]);

    expect(Math.round(bill.amountToMinimum * 20)).toBe(99);
  });

  test('is not belowMinimum at exactly ₹199', () => {
    const bill = computeBill([lineItem(199, 1)]);

    expect(bill.belowMinimum).toBe(false);
    expect(bill.amountToMinimum).toBe(0);
  });

  test('is not belowMinimum above ₹199', () => {
    const bill = computeBill([lineItem(250, 1)]);

    expect(bill.belowMinimum).toBe(false);
  });

  test('a coupon discount that drops grandTotal under ₹199 still triggers belowMinimum', () => {
    // itemTotal for a ₹220 item = 11 units. couponDiscount = min(11*0.1, 40/20) = 1.1 units.
    // grandTotal = 11 - 1.1 = 9.9 units = ₹198 — just under the ₹199 line, even though
    // the pre-coupon itemTotal (₹220) would have cleared it.
    const bill = computeBill([lineItem(220, 1)], { couponApplied: true });

    expect(bill.belowMinimum).toBe(true);
  });
});

describe('computeBill — VIP membership add-on', () => {
  test('vipMembershipFee is 0 and excluded from grandTotal when not added', () => {
    const bill = computeBill([lineItem(250, 1)]);

    expect(bill.vipMembershipFee).toBe(0);
    expect(Math.round(bill.grandTotal * 20)).toBe(250);
  });

  test('adding VIP adds the ₹45 fee to vipMembershipFee and grandTotal', () => {
    const bill = computeBill([lineItem(250, 1)], { vipAdded: true });

    expect(Math.round(bill.vipMembershipFee * 20)).toBe(45);
    expect(Math.round(bill.grandTotal * 20)).toBe(295);
  });

  test('the VIP fee no longer helps clear the ₹199 minimum', () => {
    // ₹160 in items alone is below the ₹199 minimum. The fee still lands in
    // grandTotal (₹205), but it's excluded from the minimum-order check, so
    // this cart stays belowMinimum despite grandTotal clearing ₹199.
    const bill = computeBill([lineItem(160, 1)], { vipAdded: true });

    expect(bill.belowMinimum).toBe(true);
    expect(Math.round(bill.grandTotal * 20)).toBe(205);
  });

  test('VIP fee and a coupon discount apply together, fee first then discount', () => {
    // itemTotal ₹220 = 11 units, +₹45 VIP fee = 2.25 units → 13.25 units,
    // couponDiscount = min(11*0.1, 40/20) = 1.1 units (coupon is on itemTotal only).
    // grandTotal = 11 + 2.25 - 1.1 = 12.15 units = ₹243.
    const bill = computeBill([lineItem(220, 1)], { couponApplied: true, vipAdded: true });

    expect(Math.round(bill.grandTotal * 20)).toBe(243);
  });
});

describe('computeBill — wallet redemption', () => {
  test('walletDiscount is 0 when not applied, even if a balance is passed', () => {
    const bill = computeBill([lineItem(250, 1)], { walletApplied: false, walletBalance: toUnits(50) });

    expect(bill.walletDiscount).toBe(0);
    expect(Math.round(bill.grandTotal * 20)).toBe(250);
  });

  test('applying wallet subtracts the balance from grandTotal', () => {
    const bill = computeBill([lineItem(250, 1)], { walletApplied: true, walletBalance: toUnits(50) });

    expect(Math.round(bill.walletDiscount * 20)).toBe(50);
    expect(Math.round(bill.grandTotal * 20)).toBe(200);
  });

  test('wallet discount caps at the pre-wallet total, grandTotal never negative', () => {
    const bill = computeBill([lineItem(250, 1)], { walletApplied: true, walletBalance: toUnits(400) });

    expect(Math.round(bill.walletDiscount * 20)).toBe(250);
    expect(bill.grandTotal).toBe(0);
  });

  test('a cart that clears ₹199 stays eligible even after wallet drops the total to ₹0', () => {
    const bill = computeBill([lineItem(250, 1)], { walletApplied: true, walletBalance: toUnits(400) });

    expect(bill.belowMinimum).toBe(false);
    expect(bill.grandTotal).toBe(0);
  });

  test('totalSavings includes the wallet discount', () => {
    const bill = computeBill([lineItem(250, 1)], { walletApplied: true, walletBalance: toUnits(50) });

    expect(Math.round(bill.totalSavings * 20)).toBe(50);
  });

  test('grandTotalBeforeWallet is unaffected by wallet redemption', () => {
    const withoutWallet = computeBill([lineItem(250, 1)]);
    const withWallet = computeBill([lineItem(250, 1)], { walletApplied: true, walletBalance: toUnits(50) });

    expect(Math.round(withoutWallet.grandTotalBeforeWallet * 20)).toBe(250);
    expect(Math.round(withWallet.grandTotalBeforeWallet * 20)).toBe(250);
    expect(Math.round(withWallet.grandTotal * 20)).toBe(200); // grandTotal itself still drops
  });

  test('grandTotalBeforeWallet includes the VIP fee, same as grandTotal does when wallet is not applied', () => {
    const bill = computeBill([lineItem(250, 1)], { vipAdded: true, walletApplied: true, walletBalance: toUnits(50) });

    expect(Math.round(bill.grandTotalBeforeWallet * 20)).toBe(295); // 250 + 45 VIP fee
    expect(Math.round(bill.grandTotal * 20)).toBe(245); // 295 - 50 wallet
  });
});

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

import { getCartProgressState } from '../cartProgress';
import { CASHBACK_SETTINGS, type CashbackSettings } from '../cashbackConfig';
import { toUnits } from '@/src/shared/utils/currency';

describe('getCartProgressState — below the ₹199 minimum', () => {
  test('below_minimum below ₹199, no VIP upsell', () => {
    const state = getCartProgressState(toUnits(50), false, CASHBACK_SETTINGS);

    expect(state.phase).toBe('below_minimum');
    expect(state.canPlaceOrder).toBe(false);
    expect(state.primary).toEqual({ key: 'shop_more_to_place_order', vars: { n: '₹149' } });
    expect(state.vipUpsell).toBeNull();
    expect(state.unlockedReward).toBeNull();
  });

  test('progress is total/minOrderValue, matching the pre-cashback bar', () => {
    const state = getCartProgressState(toUnits(50), false, CASHBACK_SETTINGS);
    expect(state.progress).toBeCloseTo(50 / 199, 3);
  });

  test('is not below_minimum at exactly ₹199', () => {
    const state = getCartProgressState(toUnits(199), false, CASHBACK_SETTINGS);
    expect(state.phase).not.toBe('below_minimum');
  });

  test('fractional shortfall displays ceiled, never ₹0', () => {
    const state = getCartProgressState(toUnits(198.9), false, CASHBACK_SETTINGS);
    expect(state.primary.vars.n).toBe('₹1');
  });
});

describe('getCartProgressState — toward the first tier (₹199 to ₹750)', () => {
  test('shows the shortfall to tier 1 and its standard reward', () => {
    const state = getCartProgressState(toUnits(250), false, CASHBACK_SETTINGS);

    expect(state.phase).toBe('toward_first_tier');
    expect(state.canPlaceOrder).toBe(true);
    expect(state.primary).toEqual({ key: 'cashback_shop_more', vars: { n: '₹500', r: '₹25' } });
  });

  test('VIP upsell doubles the reward and quotes the fee as monthly', () => {
    const state = getCartProgressState(toUnits(250), false, CASHBACK_SETTINGS);
    expect(state.vipUpsell).toEqual({ key: 'vip_upsell_double', vars: { f: '₹45', r: '₹50' } });
  });

  test('a VIP user sees the VIP reward directly and no upsell', () => {
    const state = getCartProgressState(toUnits(250), true, CASHBACK_SETTINGS);
    expect(state.primary.vars.r).toBe('₹50');
    expect(state.vipUpsell).toBeNull();
  });

  test('progress is 0% just above the minimum, resetting for the new segment', () => {
    const state = getCartProgressState(toUnits(199), false, CASHBACK_SETTINGS);
    expect(state.progress).toBeCloseTo(0, 3);
  });

  test('unlockedReward is null before the first tier', () => {
    const state = getCartProgressState(toUnits(250), false, CASHBACK_SETTINGS);
    expect(state.unlockedReward).toBeNull();
  });

  test('is still toward_first_tier just below the ₹750 boundary', () => {
    const state = getCartProgressState(toUnits(749), false, CASHBACK_SETTINGS);
    expect(state.phase).toBe('toward_first_tier');
    expect(state.primary.vars).toEqual({ n: '₹1', r: '₹25' });
  });
});

describe('getCartProgressState — a tier already unlocked', () => {
  test('at ₹800: counts down to tier 2, not tier 1 already achieved', () => {
    const state = getCartProgressState(toUnits(800), false, CASHBACK_SETTINGS);

    expect(state.phase).toBe('tier_unlocked');
    expect(state.primary).toEqual({ key: 'cashback_shop_more', vars: { n: '₹700', r: '₹50' } });
    expect(state.unlockedReward).toBe('₹25');
    expect(state.vipUpsell).toEqual({ key: 'vip_upsell_double', vars: { f: '₹45', r: '₹100' } });
  });

  test('at ₹1600: counts down to tier 3', () => {
    const state = getCartProgressState(toUnits(1600), false, CASHBACK_SETTINGS);

    expect(state.primary).toEqual({ key: 'cashback_shop_more', vars: { n: '₹650', r: '₹75' } });
    expect(state.unlockedReward).toBe('₹50');
    expect(state.vipUpsell).toEqual({ key: 'vip_upsell_double', vars: { f: '₹45', r: '₹150' } });
    expect(state.progress).toBeCloseTo((1600 - 1500) / (2250 - 1500), 3);
  });

  test('is tier_unlocked exactly at a tier boundary (₹750)', () => {
    const state = getCartProgressState(toUnits(750), false, CASHBACK_SETTINGS);
    expect(state.phase).toBe('tier_unlocked');
    expect(state.unlockedReward).toBe('₹25');
  });

  test('is tier_unlocked exactly at the ₹1500 boundary, unlockedReward reflects tier 2', () => {
    const state = getCartProgressState(toUnits(1500), false, CASHBACK_SETTINGS);
    expect(state.phase).toBe('tier_unlocked');
    expect(state.unlockedReward).toBe('₹50');
  });

  test('stays tier_unlocked (not max_tier) just below the ₹7500 boundary', () => {
    const state = getCartProgressState(toUnits(7499), false, CASHBACK_SETTINGS);
    expect(state.phase).toBe('tier_unlocked');
    expect(state.primary).toEqual({ key: 'cashback_shop_more', vars: { n: '₹2', r: '₹250' } });
  });

  test('a VIP at ₹1600 never sees a standardReward figure anywhere', () => {
    const state = getCartProgressState(toUnits(1600), true, CASHBACK_SETTINGS);

    expect(state.primary.vars.r).toBe('₹150'); // tier 3 vipReward, not ₹75
    expect(state.unlockedReward).toBe('₹100'); // tier 2 vipReward, not ₹50
    expect(state.vipUpsell).toBeNull();
  });
});

describe('getCartProgressState — max tier', () => {
  test('at exactly ₹7500: max_tier, 100% progress, still upsells VIP', () => {
    const state = getCartProgressState(toUnits(7500), false, CASHBACK_SETTINGS);

    expect(state.phase).toBe('max_tier');
    expect(state.progress).toBe(1);
    expect(state.primary).toEqual({ key: 'cashback_max_unlocked', vars: { r: '₹250' } });
    expect(state.unlockedReward).toBe('₹250');
    expect(state.vipUpsell).toEqual({ key: 'vip_upsell_double', vars: { f: '₹45', r: '₹500' } });
  });

  test('above ₹7500 stays at max_tier', () => {
    const state = getCartProgressState(toUnits(9000), false, CASHBACK_SETTINGS);
    expect(state.phase).toBe('max_tier');
  });

  test('a VIP at max tier sees the VIP reward and no upsell', () => {
    const state = getCartProgressState(toUnits(7500), true, CASHBACK_SETTINGS);
    expect(state.primary.vars.r).toBe('₹500');
    expect(state.vipUpsell).toBeNull();
  });
});

describe('getCartProgressState — the kill switch', () => {
  const base = CASHBACK_SETTINGS;

  test('active: false disables cashback entirely', () => {
    const settings: CashbackSettings = { ...base, active: false };
    const state = getCartProgressState(toUnits(800), false, settings);
    expect(state.phase).toBe('disabled');
    expect(state.vipUpsell).toBeNull();
  });

  test('isDeleted: true disables cashback entirely', () => {
    const settings: CashbackSettings = { ...base, isDeleted: true };
    const state = getCartProgressState(toUnits(800), false, settings);
    expect(state.phase).toBe('disabled');
  });

  test('an empty tiers array disables cashback entirely', () => {
    const settings: CashbackSettings = { ...base, tiers: [] };
    const state = getCartProgressState(toUnits(800), false, settings);
    expect(state.phase).toBe('disabled');
  });

  test('disabled still reports canPlaceOrder correctly from minOrderValue', () => {
    const settings: CashbackSettings = { ...base, active: false };
    expect(getCartProgressState(toUnits(50), false, settings).canPlaceOrder).toBe(false);
    expect(getCartProgressState(toUnits(800), false, settings).canPlaceOrder).toBe(true);
  });
});

describe('getCartProgressState — unit-conversion regression', () => {
  test('a ₹750 cart passed in internal units unlocks tier 1, not below_minimum', () => {
    // Guards against comparing cartTotalUnits (units) to a raw rupee tier
    // amount without converting — that bug would misclassify this as far
    // below the minimum instead of at tier 1.
    const state = getCartProgressState(toUnits(750), false, CASHBACK_SETTINGS);
    expect(state.phase).toBe('tier_unlocked');
  });
});

describe('getCartProgressState — tiers supplied out of order', () => {
  test('sorts tiers before evaluating', () => {
    const shuffled: CashbackSettings = {
      ...CASHBACK_SETTINGS,
      tiers: [...CASHBACK_SETTINGS.tiers].reverse(),
    };
    const state = getCartProgressState(toUnits(800), false, shuffled);
    expect(state.primary).toEqual({ key: 'cashback_shop_more', vars: { n: '₹700', r: '₹50' } });
  });
});

describe('getCartProgressState — monthly cap clamping', () => {
  test('clamps the shown reward to the remaining cap when earnedThisMonth is supplied', () => {
    // monthlyCap is 500; 480 already earned leaves ₹20 — below the ₹50 the
    // ₹800 cart would otherwise advertise for tier 2.
    const state = getCartProgressState(toUnits(800), false, CASHBACK_SETTINGS, 480);
    expect(state.primary.vars.r).toBe('₹20');
    expect(state.unlockedReward).toBe('₹20');
  });

  test('is unclamped when earnedThisMonth is omitted', () => {
    const state = getCartProgressState(toUnits(800), false, CASHBACK_SETTINGS);
    expect(state.primary.vars.r).toBe('₹50');
  });
});

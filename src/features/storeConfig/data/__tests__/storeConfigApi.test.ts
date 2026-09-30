import { mapStoreConfig } from '../storeConfigApi';

// The real staging payload, trimmed to the fields the mapper reads.
const PAYLOAD = {
  store: {
    _id: '68989c821388764b3a92f0dd',
    title: 'Village Delivery',
    domain: 'village-delivery.microfox.co',
    address: {
      addressLine1: '1-161, P Errepalli',
      addressLine2: 'Irala Mandal',
      city: 'Chittoor',
      state: 'Andhra Pradesh',
      pincode: '517130',
      country: 'India',
    },
    chargePerKm: 3.5,
    contactNumbers: ['6364463644'],
    logo: 'https://example.test/logo.png',
    location: { latitude: 13.361852751705987, longitude: 79.02544522167852 },
    storeTimings: {
      monday: { open: '07:00', close: '20:00', isClosed: false },
      tuesday: { open: '07:00', close: '20:00', isClosed: false },
      wednesday: { open: '07:00', close: '20:00', isClosed: false },
      thursday: { open: '07:00', close: '20:00', isClosed: false },
      friday: { open: '07:00', close: '20:00', isClosed: false },
      saturday: { open: '07:00', close: '20:00', isClosed: false },
      sunday: { open: '07:00', close: '20:00', isClosed: false },
    },
  },
  cashbackSettings: {
    _id: '6a6d05f3f036ba8d9e3f6d34',
    storeId: '68989c821388764b3a92f0dd',
    activationDelay: '1d',
    expiryPeriod: '2mo',
    minOrderValue: 199,
    monthlyCap: 500,
    tiers: [
      { amount: 750, standardReward: 25, vipReward: 50 },
      { amount: 1500, standardReward: 50, vipReward: 100 },
    ],
    vipMonthlySpendTarget: 2500,
    vipUpgradeFee: 45,
  },
};

describe('mapStoreConfig', () => {
  test('maps the store half of the real payload', () => {
    const { store } = mapStoreConfig(PAYLOAD);

    expect(store).not.toBeNull();
    expect(store!.id).toBe('68989c821388764b3a92f0dd');
    expect(store!.title).toBe('Village Delivery');
    expect(store!.chargePerKm).toBe(3.5);
    expect(store!.contactNumbers).toEqual(['6364463644']);
    expect(store!.address.city).toBe('Chittoor');
    expect(store!.location.latitude).toBeCloseTo(13.3618527);
    expect(store!.timings.monday).toEqual({ open: '07:00', close: '20:00', isClosed: false });
  });

  test('maps the cashback half, defaulting the flags the payload omits', () => {
    const { cashbackSettings } = mapStoreConfig(PAYLOAD);

    expect(cashbackSettings).not.toBeNull();
    expect(cashbackSettings!.active).toBe(true);
    expect(cashbackSettings!.isDeleted).toBe(false);
    expect(cashbackSettings!.minOrderValue).toBe(199);
    expect(cashbackSettings!.vipUpgradeFee).toBe(45);
    expect(cashbackSettings!.tiers).toHaveLength(2);
  });

  test('honours the flags when the server does send them', () => {
    const { cashbackSettings } = mapStoreConfig({
      ...PAYLOAD,
      cashbackSettings: { ...PAYLOAD.cashbackSettings, active: false, isDeleted: true },
    });

    expect(cashbackSettings!.active).toBe(false);
    expect(cashbackSettings!.isDeleted).toBe(true);
  });

  test('unwraps a payload nested under `data`', () => {
    const { store, cashbackSettings } = mapStoreConfig({ data: PAYLOAD });

    expect(store!.id).toBe('68989c821388764b3a92f0dd');
    expect(cashbackSettings!.minOrderValue).toBe(199);
  });

  test('drops a partial week rather than reporting hours it does not have', () => {
    const { store } = mapStoreConfig({
      ...PAYLOAD,
      store: {
        ...PAYLOAD.store,
        storeTimings: { monday: { open: '07:00', close: '20:00', isClosed: false } },
      },
    });

    expect(store!.timings).toEqual({});
  });

  test('keeps a day that is flagged closed with no hours', () => {
    const closedSunday = {
      ...PAYLOAD.store.storeTimings,
      sunday: { open: '', close: '', isClosed: true },
    };
    const { store } = mapStoreConfig({
      ...PAYLOAD,
      store: { ...PAYLOAD.store, storeTimings: closedSunday },
    });

    expect(store!.timings.sunday).toEqual({ open: '', close: '', isClosed: true });
  });

  test('returns nulls, not a throw, for junk', () => {
    expect(mapStoreConfig(null)).toEqual({ store: null, cashbackSettings: null });
    expect(mapStoreConfig({})).toEqual({ store: null, cashbackSettings: null });
    expect(mapStoreConfig({ store: { title: 'No id' } }).store).toBeNull();
  });

  test('keeps the cashback half when the store half is unusable', () => {
    const { store, cashbackSettings } = mapStoreConfig({
      store: null,
      cashbackSettings: PAYLOAD.cashbackSettings,
    });

    expect(store).toBeNull();
    expect(cashbackSettings!.minOrderValue).toBe(199);
  });

  test('skips malformed tiers', () => {
    const { cashbackSettings } = mapStoreConfig({
      ...PAYLOAD,
      cashbackSettings: {
        ...PAYLOAD.cashbackSettings,
        tiers: [{ amount: 750, standardReward: 25, vipReward: 50 }, null, { standardReward: 10 }],
      },
    });

    expect(cashbackSettings!.tiers).toEqual([{ amount: 750, standardReward: 25, vipReward: 50 }]);
  });
});

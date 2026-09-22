import { fetchStoreConfig } from '@/src/features/storeConfig/data/storeConfigApi';
import { DEFAULT_CASHBACK_SETTINGS } from '@/src/features/storeConfig/data/storeConfigDefaults';
import type { MappedStoreConfig } from '@/src/features/storeConfig/data/storeConfigApi';
import type { StoreInfo } from '@/src/features/storeConfig/data/storeConfig.types';
import {
  getCashbackSettings,
  getStoreTimings,
  loadStoreConfig,
  useStoreConfigStore,
} from '../useStoreConfigStore';

jest.mock('@/src/features/storeConfig/data/storeConfigApi', () => ({
  fetchStoreConfig: jest.fn(),
}));

const mockFetch = fetchStoreConfig as jest.MockedFunction<typeof fetchStoreConfig>;

const STORE: StoreInfo = {
  id: 'store-1',
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
  location: { latitude: 13.36, longitude: 79.02 },
  timings: {
    sunday: { open: '07:00', close: '20:00', isClosed: false },
    monday: { open: '07:00', close: '20:00', isClosed: false },
    tuesday: { open: '07:00', close: '20:00', isClosed: false },
    wednesday: { open: '07:00', close: '20:00', isClosed: false },
    thursday: { open: '07:00', close: '20:00', isClosed: false },
    friday: { open: '07:00', close: '20:00', isClosed: false },
    saturday: { open: '07:00', close: '20:00', isClosed: false },
  },
};

const FETCHED: MappedStoreConfig = {
  store: STORE,
  cashbackSettings: {
    ...DEFAULT_CASHBACK_SETTINGS,
    minOrderValue: 249,
    vipUpgradeFee: 99,
  },
};

describe('useStoreConfigStore', () => {
  beforeEach(() => {
    useStoreConfigStore.getState().reset();
    mockFetch.mockReset();
  });

  test('serves the bundled cashback defaults before the fetch lands', () => {
    expect(getCashbackSettings()).toEqual(DEFAULT_CASHBACK_SETTINGS);
    expect(getStoreTimings()).toBeNull();
    expect(useStoreConfigStore.getState().status).toBe('idle');
  });

  test('replaces defaults with the fetched config', async () => {
    mockFetch.mockResolvedValue(FETCHED);

    await loadStoreConfig();

    expect(getCashbackSettings().vipUpgradeFee).toBe(99);
    expect(getStoreTimings()?.monday.open).toBe('07:00');
    expect(useStoreConfigStore.getState().status).toBe('ready');
    expect(useStoreConfigStore.getState().loadedAt).not.toBeNull();
  });

  test('concurrent callers share one request', async () => {
    mockFetch.mockResolvedValue(FETCHED);

    await Promise.all([loadStoreConfig(), loadStoreConfig(), loadStoreConfig()]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('a second load after success is a no-op', async () => {
    mockFetch.mockResolvedValue(FETCHED);

    await loadStoreConfig();
    await loadStoreConfig();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('refresh forces a re-fetch', async () => {
    mockFetch.mockResolvedValue(FETCHED);

    await loadStoreConfig();
    await useStoreConfigStore.getState().refresh();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('a failed fetch leaves the defaults standing and does not reject', async () => {
    mockFetch.mockRejectedValue(new Error('offline'));

    await expect(loadStoreConfig()).resolves.toBeUndefined();

    expect(getCashbackSettings()).toEqual(DEFAULT_CASHBACK_SETTINGS);
    expect(useStoreConfigStore.getState().status).toBe('error');
  });

  test('a retry after a failure is allowed', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(FETCHED);

    await loadStoreConfig();
    await loadStoreConfig();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(getCashbackSettings().vipUpgradeFee).toBe(99);
  });

  test('a response without cashback settings keeps the defaults, not a blank programme', async () => {
    mockFetch.mockResolvedValue({ store: STORE, cashbackSettings: null });

    await loadStoreConfig();

    expect(getCashbackSettings()).toEqual(DEFAULT_CASHBACK_SETTINGS);
    expect(useStoreConfigStore.getState().store).not.toBeNull();
  });
});

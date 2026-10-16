import {
  createFirebaseNativeProvider,
  type FirebaseAnalyticsClient,
} from '../firebase.native';

function client(): jest.Mocked<FirebaseAnalyticsClient> {
  return {
    logEvent: jest.fn().mockResolvedValue(undefined),
    setUserId: jest.fn().mockResolvedValue(undefined),
    setUserProperties: jest.fn().mockResolvedValue(undefined),
    resetAnalyticsData: jest.fn().mockResolvedValue(undefined),
  };
}

describe('Firebase native analytics provider', () => {
  it('loads one SDK client and translates values into Firebase parameters', async () => {
    const sdk = client();
    const loader = jest.fn().mockResolvedValue(sdk);
    const analytics = createFirebaseNativeProvider(loader);
    await expect(analytics.isAvailable?.()).resolves.toBe(true);

    await analytics.track('favorite_changed', { product_id: 'p-1', is_favorite: true });
    await analytics.identify('user-1');
    await analytics.setUserProperties({ locale: 'en', is_vip: 'true' });
    await analytics.reset();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(sdk.logEvent).toHaveBeenCalledWith('favorite_changed', {
      product_id: 'p-1', is_favorite: 1,
    });
    expect(sdk.setUserId).toHaveBeenNthCalledWith(1, 'user-1');
    expect(sdk.setUserProperties).toHaveBeenCalledWith({ locale: 'en', is_vip: 'true' });
    expect(sdk.setUserId).toHaveBeenNthCalledWith(2, null);
    expect(sdk.resetAnalyticsData).toHaveBeenCalledTimes(1);
  });

  it('stays inactive if the configured default Firebase app is unavailable', async () => {
    const analytics = createFirebaseNativeProvider(async () => null);
    await expect(analytics.isAvailable?.()).resolves.toBe(false);
    await expect(analytics.track('app_screen_view', { screen_name: 'home' })).resolves.toBeUndefined();
    await expect(analytics.identify('user-1')).resolves.toBeUndefined();
    await expect(analytics.reset()).resolves.toBeUndefined();
  });
});

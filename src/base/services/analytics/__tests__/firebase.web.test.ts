import {
  createFirebaseWebProvider,
  type FirebaseWebClient,
  type FirebaseWebConfig,
} from '../firebase.web';

const config: FirebaseWebConfig = {
  apiKey: 'public-key',
  appId: 'web-app-id',
  projectId: 'project-id',
  measurementId: 'G-TEST',
};

function client(): jest.Mocked<FirebaseWebClient> {
  return {
    logEvent: jest.fn(),
    setUserId: jest.fn(),
    setUserProperties: jest.fn(),
  };
}

describe('Firebase web analytics provider', () => {
  it('never loads Firebase when the web config is incomplete', async () => {
    const loader = jest.fn();
    const provider = createFirebaseWebProvider(null, loader);
    expect(provider.isAvailable?.()).toBe(false);

    await provider.track('app_screen_view', { screen_name: 'home' });
    await provider.identify('user-1');
    await provider.reset();

    expect(loader).not.toHaveBeenCalled();
  });

  it('maps events and clears the app-owned identity traits on reset', async () => {
    const sdk = client();
    const loader = jest.fn().mockResolvedValue(sdk);
    const provider = createFirebaseWebProvider(config, loader);
    await expect(provider.isAvailable?.()).resolves.toBe(true);

    await provider.track('wallet_application_changed', { applied: true });
    await provider.identify('user-1');
    await provider.setUserProperties({ locale: 'en', is_vip: 'true' });
    await provider.reset();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(sdk.logEvent).toHaveBeenCalledWith('wallet_application_changed', { applied: 1 });
    expect(sdk.setUserId).toHaveBeenNthCalledWith(1, 'user-1');
    expect(sdk.setUserId).toHaveBeenNthCalledWith(2, null);
    expect(sdk.setUserProperties).toHaveBeenNthCalledWith(1, { locale: 'en', is_vip: 'true' });
    expect(sdk.setUserProperties).toHaveBeenNthCalledWith(2, {
      locale: null,
      is_vip: null,
      village_id: null,
      store_id: null,
    });
  });

  it('stays inactive when browser support or SDK initialization fails', async () => {
    const provider = createFirebaseWebProvider(config, async () => {
      throw new Error('IndexedDB unavailable');
    });
    await expect(provider.isAvailable?.()).resolves.toBe(false);

    await expect(provider.track('app_screen_view', { screen_name: 'home' })).resolves.toBeUndefined();
    await expect(provider.identify('user-1')).resolves.toBeUndefined();
    await expect(provider.reset()).resolves.toBeUndefined();
  });
});

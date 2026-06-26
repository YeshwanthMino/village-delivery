// Keep apiClient construction inert during import.
const mockStorage = {
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
  clear: jest.fn(async () => undefined),
  getAllKeys: jest.fn(async () => [] as string[]),
};
const mockPlatform = {
  isWeb: () => false, isMobile: () => true, isIOS: () => true, isAndroid: () => false,
  getPlatform: () => 'ios' as const, getVersion: () => '17.0',
};
jest.mock('../../../base/services/storage', () => ({
  StorageServiceFactory: { create: () => mockStorage, createAsync: async () => mockStorage },
}));
jest.mock('../../../base/services/platform', () => ({
  PlatformServiceFactory: { create: () => mockPlatform, createAsync: async () => mockPlatform },
}));

it('registers a session-expired handler that calls logout()', () => {
  const { apiClient } = require('../../../base/services/remote/apiClient');
  const setSpy = jest.spyOn(apiClient, 'setOnSessionExpired');

  // First import of the store runs the top-level registration.
  const { useAuthStore } = require('../useAuthStore');

  expect(setSpy).toHaveBeenCalledWith(expect.any(Function));
  const handler = setSpy.mock.calls[setSpy.mock.calls.length - 1][0] as () => void;

  const logoutSpy = jest
    .spyOn(useAuthStore.getState(), 'logout')
    .mockResolvedValue(undefined);

  handler();

  expect(logoutSpy).toHaveBeenCalledTimes(1);
});

import { useAuthStore } from '../useAuthStore';
import { queryClient } from '@/src/base/query/queryClient';
import { queryKeys } from '@/src/base/query/queryKeys';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import * as appAuth from '@/src/features/auth/data/appAuthApi';

const mockSetSavedAddresses = jest.fn();
jest.mock('../useLocationStore', () => ({
  useLocationStore: { getState: () => ({ setSavedAddresses: mockSetSavedAddresses }) },
}));
jest.mock('@/src/core/utils/getStoreId', () => ({ getStoreIdSync: () => 'store' }));
jest.mock('@/src/base/services/remote/apiClient', () => ({ apiClient: { setOnSessionExpired: jest.fn() } }));
jest.mock('@/src/features/auth/data/appAuthApi', () => ({ getMe: jest.fn() }));
jest.mock('@/src/base/services/remote/storage/StoredPrefs', () => ({ StoredPrefs: {
  clearCredentials: jest.fn(async () => undefined),
  setUsername: jest.fn(async () => undefined),
  getAccessToken: jest.fn(async () => 'token-a'),
  getRefreshToken: jest.fn(async () => 'refresh-a'),
  getUsername: jest.fn(async () => '9876543210'),
  getUserProfile: jest.fn(async () => ({ id: 'user-a' })),
  setUserProfile: jest.fn(async () => undefined),
} }));

afterEach(() => { queryClient.clear(); jest.clearAllMocks(); });

it('clears account caches and addresses and aborts in-flight account reads at logout', async () => {
  useAuthStore.setState({ isAuthenticated: true, accessToken: 'token-a' });
  queryClient.setQueryData(queryKeys.orders.list(), [{ id: 'old-order' }]);
  queryClient.setQueryData(queryKeys.wallet.detail(), { cashback: 100 });
  let signal!: AbortSignal;
  const pending = queryClient.fetchQuery({
    queryKey: queryKeys.orders.detail('pending'),
    // A cancelled fetch schedules GC in its finally block even after removal.
    // This test owns the client; it does not need a real ten-minute GC timer.
    gcTime: Infinity,
    queryFn: (context) => { signal = context.signal; return new Promise(() => {}); },
  }).catch(() => undefined);
  await useAuthStore.getState().logout();
  await pending;
  expect(signal.aborted).toBe(true);
  expect(queryClient.getQueryData(queryKeys.orders.list())).toBeUndefined();
  expect(queryClient.getQueryData(queryKeys.wallet.detail())).toBeUndefined();
  expect(mockSetSavedAddresses).toHaveBeenCalledWith([]);
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(StoredPrefs.clearCredentials).toHaveBeenCalledTimes(1);
});

it('ignores a startup profile refresh that finishes after logout', async () => {
  let finish!: (value: any) => void;
  (appAuth.getMe as jest.Mock).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await useAuthStore.getState().checkExistingAuth();
  expect(appAuth.getMe).toHaveBeenCalled();
  await useAuthStore.getState().logout();
  finish({ id: 'old-profile' });
  await Promise.resolve();
  expect(useAuthStore.getState().user).toBeNull();
  expect(StoredPrefs.setUserProfile).not.toHaveBeenCalled();
});

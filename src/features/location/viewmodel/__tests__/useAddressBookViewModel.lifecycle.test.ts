import { act, renderHook } from '@testing-library/react-native';
import { useAddressBookViewModel } from '../useAddressBookViewModel';
import { listAddresses, deleteAddress } from '../../data/locationApi';

const mockAuth = { isAuthenticated: true, accessToken: 'user-a' };
const mockSetSaved = jest.fn();
const mockLocation = { savedAddresses: [] as any[], setSavedAddresses: mockSetSaved };
jest.mock('@/src/shared/hooks/useScreenActive', () => ({ useScreenActive: () => true }));
jest.mock('@/src/core/store', () => ({
  useAuthStore: Object.assign((select: any) => select(mockAuth), { getState: () => mockAuth }),
}));
jest.mock('@/src/core/store/useLocationStore', () => ({
  useLocationStore: Object.assign((select: any) => select(mockLocation), { getState: () => mockLocation }),
}));
jest.mock('../../data/locationApi', () => ({ listAddresses: jest.fn(), deleteAddress: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.isAuthenticated = true;
  mockAuth.accessToken = 'user-a';
  mockLocation.savedAddresses = [{ id: 'a' }, { id: 'b' }];
});

it('cancels on sheet dismissal and ignores late results from a signed-out account', async () => {
  let finish!: (value: any) => void;
  (listAddresses as jest.Mock).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { rerender } = renderHook(({ visible }) => useAddressBookViewModel(visible), { initialProps: { visible: true } });
  const signal = (listAddresses as jest.Mock).mock.calls[0][0] as AbortSignal;
  rerender({ visible: false });
  expect(signal.aborted).toBe(true);
  mockAuth.isAuthenticated = false;
  await act(async () => { finish([{ id: 'old-user-address' }]); });
  expect(mockSetSaved).not.toHaveBeenCalled();
});

it('deletes from the latest address list rather than resurrecting an earlier snapshot', async () => {
  (listAddresses as jest.Mock).mockImplementation(() => new Promise(() => {}));
  (deleteAddress as jest.Mock).mockResolvedValue(undefined);
  const { result } = renderHook(useAddressBookViewModel);
  mockLocation.savedAddresses = [{ id: 'a' }, { id: 'c' }];
  await act(async () => { await result.current.remove('a'); });
  expect(mockSetSaved).toHaveBeenCalledWith([{ id: 'c' }]);
});

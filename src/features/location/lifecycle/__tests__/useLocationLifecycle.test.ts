import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useLocationLifecycle } from '../useLocationLifecycle';
import { LocationService } from '../../data/LocationService';

const mockStore = { permission: 'granted', serviceableVillage: null as object | null, refreshPermission: jest.fn(), detectCurrentLocation: jest.fn() };
jest.mock('@/src/core/store/useLocationStore', () => ({ useLocationStore: { getState: () => mockStore } }));
jest.mock('../../data/LocationService', () => ({ LocationService: { hasServicesEnabled: jest.fn() } }));
const enabled = LocationService.hasServicesEnabled as jest.Mock;
let onState!: (state: AppStateStatus) => void;
const remove = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.permission = 'granted'; mockStore.serviceableVillage = null;
  mockStore.refreshPermission.mockResolvedValue('granted');
  enabled.mockResolvedValue(true);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    onState = callback;
    return { remove };
  });
});
afterEach(() => jest.restoreAllMocks());

it('does not start another GPS lookup on ordinary background/foreground cycles', async () => {
  renderHook(useLocationLifecycle);
  await act(async () => {});
  await act(async () => { onState('background'); onState('active'); });
  await act(async () => { onState('background'); onState('active'); });
  expect(mockStore.detectCurrentLocation).not.toHaveBeenCalled();
});

it('detects when location services become enabled and cancels when a picker takes over', async () => {
  enabled.mockResolvedValueOnce(false);
  const { rerender } = renderHook(({ allowed }) => useLocationLifecycle(allowed), { initialProps: { allowed: true } });
  await act(async () => {});
  await act(async () => onState('active'));
  expect(mockStore.detectCurrentLocation).toHaveBeenCalledTimes(1);
  const signal = mockStore.detectCurrentLocation.mock.calls[0][0] as AbortSignal;
  rerender({ allowed: false });
  expect(signal.aborted).toBe(true);
  await act(async () => onState('active'));
  expect(mockStore.detectCurrentLocation).toHaveBeenCalledTimes(1);
});

it('does not auto-commit GPS while the map or address picker owns the selection', async () => {
  enabled.mockResolvedValueOnce(false);
  renderHook(() => useLocationLifecycle(false));
  await act(async () => {});
  await act(async () => onState('active'));
  expect(mockStore.detectCurrentLocation).not.toHaveBeenCalled();
});

it('removes the listener and ignores permission checks that finish after unmount', async () => {
  const { unmount } = renderHook(useLocationLifecycle);
  await act(async () => {});
  let finish!: (value: string) => void;
  mockStore.permission = 'denied';
  mockStore.refreshPermission.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  act(() => { onState('active'); });
  unmount();
  await act(async () => finish('granted'));
  expect(remove).toHaveBeenCalledTimes(1);
  expect(mockStore.detectCurrentLocation).not.toHaveBeenCalled();
});

it('ignores a foreground check superseded by backgrounding', async () => {
  renderHook(useLocationLifecycle);
  await act(async () => {});
  let finish!: (value: string) => void;
  mockStore.permission = 'denied';
  mockStore.refreshPermission.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  act(() => { onState('active'); onState('background'); });
  await act(async () => finish('granted'));
  expect(mockStore.detectCurrentLocation).not.toHaveBeenCalled();
});

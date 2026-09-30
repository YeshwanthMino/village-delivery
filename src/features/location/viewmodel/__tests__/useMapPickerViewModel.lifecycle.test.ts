import { act, renderHook } from '@testing-library/react-native';
import { useMapPickerViewModel } from '../useMapPickerViewModel';
import { findByLocation } from '../../data/locationApi';
import { LocationService } from '../../data/LocationService';

let mockFocused = true;
let mockForegroundPermission = 'undetermined';
const mockSetServiceable = jest.fn();
const mockRecordPermissionResult = jest.fn();
const mockDismissBlockedPrompt = jest.fn();
jest.mock('@/src/shared/hooks/useScreenActive', () => ({ useScreenFocused: () => mockFocused }));
jest.mock('@/src/core/store/useLocationStore', () => ({
  useLocationStore: (select: any) => select({
    setServiceable: mockSetServiceable,
    addRecent: jest.fn(),
    serviceableVillage: null,
    permission: mockForegroundPermission,
    recordPermissionResult: mockRecordPermissionResult,
    dismissBlockedPrompt: mockDismissBlockedPrompt,
  }),
}));
jest.mock('../../data/locationApi', () => ({ findByLocation: jest.fn() }));
jest.mock('../../data/LocationService', () => ({ LocationService: {
  getPermissionState: jest.fn(), requestPermission: jest.fn(), getCurrentPosition: jest.fn(),
} }));
const find = findByLocation as jest.Mock;
const permission = LocationService.requestPermission as jest.Mock;
const coords = { latitude: 12, longitude: 78 };
const next = { latitude: 13, longitude: 79, latitudeDelta: 0.01, longitudeDelta: 0.01 };

beforeEach(() => {
  jest.useFakeTimers(); jest.resetAllMocks(); mockFocused = true; mockForegroundPermission = 'undetermined';
  mockRecordPermissionResult.mockImplementation((result) => {
    mockForegroundPermission = result.granted ? 'granted' : 'denied';
  });
});
afterEach(() => jest.useRealTimers());

it('rejects a stale result as soon as the pin moves, before the debounce fires', async () => {
  let finish!: (value: any) => void;
  find.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { result } = renderHook(useMapPickerViewModel);
  act(() => result.current.moveTo(coords));
  const signal = find.mock.calls[0][1] as AbortSignal;
  act(() => result.current.onRegionSettled(next));
  expect(signal.aborted).toBe(true);
  await act(async () => { finish({ serviceable: true, village: { id: 'old', name: 'Old village' } }); });
  expect(result.current.pinState).toBe('resolving');
  await expect(result.current.confirm()).resolves.toBe(false);
  expect(mockSetServiceable).not.toHaveBeenCalled();
});

it('clears a pending debounce on blur and resolves the preserved center once on return', () => {
  find.mockImplementation(() => new Promise(() => {}));
  const { result, rerender, unmount } = renderHook(useMapPickerViewModel);
  act(() => result.current.onRegionSettled(next));
  mockFocused = false;
  rerender(undefined);
  act(() => jest.advanceTimersByTime(1000));
  expect(find).not.toHaveBeenCalled();
  mockFocused = true;
  rerender(undefined);
  expect(find).toHaveBeenCalledTimes(1);
  expect(find.mock.calls[0][0]).toMatchObject(next);
  const signal = find.mock.calls[0][1] as AbortSignal;
  unmount();
  expect(signal.aborted).toBe(true);
});

it('ignores a permission result and does not start GPS after the screen closes', async () => {
  let finish!: (value: { granted: boolean; canAskAgain: boolean }) => void;
  permission.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { result, unmount } = renderHook(useMapPickerViewModel);
  let request!: Promise<void>;
  act(() => { request = result.current.initialDetect(); });
  unmount();
  await act(async () => { finish({ granted: true, canAskAgain: true }); await request; });
  expect(LocationService.requestPermission).toHaveBeenCalledTimes(1);
  expect(LocationService.getCurrentPosition).not.toHaveBeenCalled();
});

it('requests permission directly on first map entry and shows Settings after a permanent denial', async () => {
  permission.mockResolvedValue({ granted: false, canAskAgain: false });
  find.mockResolvedValue({ serviceable: false, village: null });
  const { result } = renderHook(useMapPickerViewModel);

  await act(async () => { await result.current.initialDetect(); });

  expect(LocationService.getPermissionState).not.toHaveBeenCalled();
  expect(permission).toHaveBeenCalledTimes(1);
  expect(LocationService.getCurrentPosition).not.toHaveBeenCalled();
  expect(result.current.blocked).toBe(true);
});

it('clears blocked guidance and retries GPS when iOS permission is granted in Settings', async () => {
  permission
    .mockResolvedValueOnce({ granted: false, canAskAgain: false })
    .mockResolvedValueOnce({ granted: true, canAskAgain: true });
  find.mockResolvedValue({ serviceable: false, village: null });
  (LocationService.getCurrentPosition as jest.Mock).mockResolvedValue(coords);
  const { result, rerender } = renderHook(useMapPickerViewModel);

  await act(async () => { await result.current.initialDetect(); });
  expect(result.current.blocked).toBe(true);

  mockForegroundPermission = 'granted';
  await act(async () => { rerender(undefined); });

  expect(result.current.blocked).toBe(false);
  expect(permission).toHaveBeenCalledTimes(2);
  expect(LocationService.getCurrentPosition).toHaveBeenCalledTimes(1);
});

it('does not retry a denied native request when a stale global permission still says granted', async () => {
  mockForegroundPermission = 'granted';
  mockRecordPermissionResult.mockImplementation(() => {}); // stale external state
  permission.mockResolvedValue({ granted: false, canAskAgain: false });
  find.mockResolvedValue({ serviceable: false, village: null });
  const { result, rerender } = renderHook(useMapPickerViewModel);

  await act(async () => { await result.current.initialDetect(); });
  rerender(undefined);

  expect(result.current.blocked).toBe(true);
  expect(permission).toHaveBeenCalledTimes(1);
  expect(LocationService.getCurrentPosition).not.toHaveBeenCalled();
});

it('invalidates a confirmed pin synchronously when dragging starts', async () => {
  find.mockResolvedValue({ serviceable: true, village: { id: 'v1', name: 'Village' } });
  const { result } = renderHook(useMapPickerViewModel);
  await act(async () => result.current.moveTo(coords));
  expect(result.current.pinState).toBe('serviceable');
  const confirm = result.current.confirm;
  await act(async () => {
    result.current.onRegionMoving();
    expect(await confirm()).toBe(false); // same event batch, before a render
  });
  expect(mockSetServiceable).not.toHaveBeenCalled();
});

it('coalesces repeated GPS taps and does not let the result override a village pick', async () => {
  let finish!: (value: any) => void;
  permission.mockResolvedValue({ granted: true, canAskAgain: true });
  (LocationService.getCurrentPosition as jest.Mock).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  find.mockResolvedValue({ serviceable: true, village: { id: 'picked', name: 'Picked village' } });
  const { result } = renderHook(useMapPickerViewModel);
  let request!: Promise<unknown>;
  await act(async () => {
    request = result.current.useCurrentLocation();
    void result.current.useCurrentLocation();
  });
  expect(LocationService.getCurrentPosition).toHaveBeenCalledTimes(1);
  const signal = (LocationService.getCurrentPosition as jest.Mock).mock.calls[0][0] as AbortSignal;
  await act(async () => result.current.moveTo(coords));
  expect(signal.aborted).toBe(true);
  await act(async () => { finish(next); await request; });
  expect(result.current.region).toMatchObject(coords);
  expect(result.current.village?.id).toBe('picked');
});

it('cancels pending map work when address list mode hides the map', async () => {
  find.mockImplementation(() => new Promise(() => {}));
  const { result, rerender } = renderHook(({ enabled }) => useMapPickerViewModel(enabled), { initialProps: { enabled: true } });
  act(() => result.current.moveTo(coords));
  const signal = find.mock.calls[0][1] as AbortSignal;
  act(() => result.current.onRegionSettled(next));
  rerender({ enabled: false });
  act(() => jest.advanceTimersByTime(1000));
  expect(signal.aborted).toBe(true);
  expect(find).toHaveBeenCalledTimes(1);
  await expect(result.current.confirm()).resolves.toBe(false);
});

it('cancels a pending pan lookup before starting GPS', async () => {
  permission.mockImplementation(() => new Promise(() => {}));
  const { result, unmount } = renderHook(useMapPickerViewModel);
  act(() => result.current.onRegionSettled(next));
  act(() => { void result.current.useCurrentLocation(); jest.advanceTimersByTime(1000); });
  expect(find).not.toHaveBeenCalled();
  unmount();
});

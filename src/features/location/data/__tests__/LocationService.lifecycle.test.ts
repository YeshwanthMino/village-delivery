import * as Location from 'expo-location';
import { LocationService } from '../LocationService';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  hasServicesEnabledAsync: jest.fn(async () => true),
  getLastKnownPositionAsync: jest.fn(async () => null),
  enableNetworkProviderAsync: jest.fn(async () => undefined),
  getCurrentPositionAsync: jest.fn(),
}));

it('releases its deadline on cancellation and ignores a late native location result', async () => {
  jest.useFakeTimers();
  let finish!: (value: any) => void;
  let entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  (Location.getCurrentPositionAsync as jest.Mock).mockImplementation(() => new Promise(resolve => {
    finish = resolve;
    entered();
  }));
  const controller = new AbortController();
  const request = LocationService.getCurrentPosition(controller.signal);
  const rejection = expect(request).rejects.toMatchObject({ name: 'AbortError' });
  await started;
  expect(jest.getTimerCount()).toBe(1);
  controller.abort();
  await rejection;
  expect(jest.getTimerCount()).toBe(0);
  finish({ coords: { latitude: 12, longitude: 78 } });
  await Promise.resolve();
  // Only the initial cache check; cancellation must not trigger a fallback.
  expect(Location.getLastKnownPositionAsync).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

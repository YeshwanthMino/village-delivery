import { act, renderHook } from '@testing-library/react-native';
import type MapView from 'react-native-maps';
import { useRecenterOnFocus } from '../useRecenterOnFocus';

let mockFocused = true;
jest.mock('@/src/shared/hooks/useScreenActive', () => ({ useScreenFocused: () => mockFocused }));
const region = { latitude: 12, longitude: 78, latitudeDelta: 0.01, longitudeDelta: 0.01 };
const next = { ...region, latitude: 13 };

beforeEach(() => { jest.useFakeTimers(); mockFocused = true; });
afterEach(() => jest.useRealTimers());

it('recenters once with the latest region without scheduling another correction on every pan', () => {
  const animateToRegion = jest.fn();
  const mapRef = { current: { animateToRegion } as unknown as MapView };
  const { rerender } = renderHook(({ value }) => useRecenterOnFocus(mapRef, value), { initialProps: { value: region } });
  act(() => jest.advanceTimersByTime(200));
  rerender({ value: next });
  act(() => jest.advanceTimersByTime(200));
  expect(animateToRegion).toHaveBeenCalledWith(next, 0);
  rerender({ value: region });
  act(() => jest.advanceTimersByTime(1000));
  expect(animateToRegion).toHaveBeenCalledTimes(1);
});

it('cancels corrections on a gesture, blur, hidden map, and unmount', () => {
  const animateToRegion = jest.fn();
  const mapRef = { current: { animateToRegion } as unknown as MapView };
  const { result, rerender, unmount } = renderHook(({ enabled }) => useRecenterOnFocus(mapRef, region, enabled), { initialProps: { enabled: true } });
  act(() => result.current());
  act(() => jest.advanceTimersByTime(400));
  expect(animateToRegion).not.toHaveBeenCalled();
  mockFocused = false; rerender({ enabled: true });
  mockFocused = true; rerender({ enabled: true });
  mockFocused = false; rerender({ enabled: true });
  act(() => jest.advanceTimersByTime(400));
  expect(animateToRegion).not.toHaveBeenCalled();
  mockFocused = true; rerender({ enabled: true });
  rerender({ enabled: false });
  act(() => jest.advanceTimersByTime(400));
  expect(animateToRegion).not.toHaveBeenCalled();
  rerender({ enabled: true });
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});

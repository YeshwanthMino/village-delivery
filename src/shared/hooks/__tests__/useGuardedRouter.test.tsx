import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { NavigationContext } from '@react-navigation/native';
import { useGuardedRouter } from '../useGuardedRouter';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

function screenContext() {
  let focused = true;
  const listeners = new Set<() => void>();
  const navigation = {
    isFocused: () => focused,
    addListener: (_event: string, listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
  return {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <NavigationContext.Provider value={navigation as any}>{children}</NavigationContext.Provider>
    ),
    focus: (value: boolean) => { focused = value; if (value) listeners.forEach(listener => listener()); },
    listeners,
  };
}

beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); mockRouter.canGoBack.mockReturnValue(true); });
afterEach(() => jest.useRealTimers());

it('allows only one navigation across different buttons on the same screen', () => {
  const context = screenContext();
  const { result, unmount } = renderHook(() => [useGuardedRouter(), useGuardedRouter()], context);
  act(() => {
    result.current[0].push('/cart');
    result.current[1].push('/location');
    result.current[0].back();
  });
  expect(mockRouter.push).toHaveBeenCalledTimes(1);
  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
  unmount();
  expect(context.listeners.size).toBe(0);
});

it('rejects callbacks from blurred screens and allows immediate navigation after returning', () => {
  const context = screenContext();
  const { result } = renderHook(useGuardedRouter, context);
  act(() => result.current.push('/location'));
  context.focus(false);
  act(() => { jest.advanceTimersByTime(1000); result.current.replace('/cart'); });
  expect(mockRouter.replace).not.toHaveBeenCalled();
  act(() => { context.focus(true); result.current.back(); result.current.back(); });
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});

it('does not block the next screen or leave a no-op navigation locked', () => {
  const first = renderHook(useGuardedRouter, screenContext());
  const next = renderHook(useGuardedRouter, screenContext());
  act(() => { first.result.current.push('/location'); next.result.current.back(); });
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  act(() => { jest.advanceTimersByTime(750); first.result.current.push('/cart'); });
  expect(mockRouter.push).toHaveBeenCalledTimes(2);
});

it('releases the guard when navigation throws', () => {
  const { result } = renderHook(useGuardedRouter, screenContext());
  mockRouter.push.mockImplementationOnce(() => { throw new Error('route unavailable'); });
  expect(() => result.current.push('/cart')).toThrow('route unavailable');
  result.current.push('/location');
  expect(mockRouter.push).toHaveBeenCalledTimes(2);
});

it('replaces a screen opened without history with its fallback only once', () => {
  mockRouter.canGoBack.mockReturnValue(false);
  const { result } = renderHook(useGuardedRouter, screenContext());
  act(() => { result.current.back('/(dashboard)/orders'); result.current.back(); });
  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).toHaveBeenCalledWith('/(dashboard)/orders');
});

it('defaults Back to Home when there is no navigation history', () => {
  mockRouter.canGoBack.mockReturnValue(false);
  const { result } = renderHook(useGuardedRouter, screenContext());
  act(() => result.current.back());
  expect(mockRouter.replace).toHaveBeenCalledWith('/(dashboard)/home');
});

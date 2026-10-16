import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { NavigationContext } from '@react-navigation/native';
import { AppState, type AppStateStatus } from 'react-native';
import { useScreenActive } from '../useScreenActive';

it('tracks focus and foreground changes, and removes every listener on unmount', () => {
  let focused = true;
  const listeners = new Map<string, () => void>();
  const stops: jest.Mock[] = [];
  const navigation = {
    isFocused: () => focused,
    addListener: (event: string, callback: () => void) => {
      listeners.set(event, callback);
      const stop = jest.fn(() => listeners.delete(event));
      stops.push(stop);
      return stop;
    },
  };
  const originalState = AppState.currentState;
  AppState.currentState = 'active';
  let onAppState: (state: AppStateStatus) => void = () => {};
  const remove = jest.fn();
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, cb) => {
    onAppState = cb;
    return { remove };
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NavigationContext.Provider value={navigation as any}>{children}</NavigationContext.Provider>
  );
  const { result, unmount } = renderHook(useScreenActive, { wrapper });
  expect(result.current).toBe(true);
  act(() => { focused = false; listeners.get('blur')?.(); });
  expect(result.current).toBe(false);
  act(() => { focused = true; listeners.get('focus')?.(); });
  expect(result.current).toBe(true);
  act(() => { AppState.currentState = 'background'; onAppState('background'); });
  expect(result.current).toBe(false);
  act(() => { AppState.currentState = 'active'; onAppState('active'); });
  expect(result.current).toBe(true);
  unmount();
  stops.forEach(stop => expect(stop).toHaveBeenCalledTimes(1));
  expect(remove).toHaveBeenCalledTimes(1);
  spy.mockRestore();
  AppState.currentState = originalState;
});

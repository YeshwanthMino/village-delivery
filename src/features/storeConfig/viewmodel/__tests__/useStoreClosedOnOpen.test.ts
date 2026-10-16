import React from 'react';
import { act, renderHook } from '@testing-library/react-native';

let mockActive = true;
let mockFocused = true;
let mockConfigStatus = 'loading';
let mockStoreStatus = { kind: 'closed' };
jest.mock('@/src/core/store', () => ({
  useStoreTimings: () => null,
  useStoreConfigStore: (select: any) => select({ status: mockConfigStatus }),
}));
jest.mock('@/src/shared/hooks/useScreenActive', () => ({
  useScreenActive: () => mockActive, useScreenFocused: () => mockFocused,
}));
jest.mock('@/src/base/services/logger', () => ({ logger: { debug: jest.fn() } }));
jest.mock('../../domain/storeStatus', () => ({
  getStoreStatus: () => mockStoreStatus,
  needsStoreClosedNotice: (status: any) => status.kind === 'closed',
}));

function newSession(): typeof import('../useStoreClosedOnOpen').useStoreClosedOnOpen {
  let hook!: typeof import('../useStoreClosedOnOpen').useStoreClosedOnOpen;
  jest.doMock('react', () => React);
  jest.isolateModules(() => {
    // A fresh module represents a new app process; keep React's renderer shared.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    hook = require('../useStoreClosedOnOpen').useStoreClosedOnOpen;
  });
  return hook;
}

beforeEach(() => { mockActive = true; mockFocused = true; mockConfigStatus = 'loading'; mockStoreStatus = { kind: 'closed' }; });

it('waits for config, shows once, and stays dismissed across foregrounding and home remounts', () => {
  const hook = newSession();
  const { result, rerender, unmount } = renderHook(hook);
  expect(result.current.visible).toBe(false);
  mockConfigStatus = 'ready';
  rerender(undefined);
  expect(result.current.visible).toBe(true);
  act(() => result.current.close());
  mockActive = false;
  rerender(undefined);
  mockActive = true;
  rerender(undefined);
  expect(result.current.visible).toBe(false);
  unmount();
  expect(renderHook(hook).result.current.visible).toBe(false);
  expect(renderHook(newSession()).result.current.visible).toBe(true);
});

it('closes on navigation away and does not reappear on return', () => {
  mockConfigStatus = 'ready';
  const { result, rerender } = renderHook(newSession());
  expect(result.current.visible).toBe(true);
  mockActive = false; mockFocused = false;
  rerender(undefined);
  expect(result.current.visible).toBe(false);
  mockActive = true; mockFocused = true;
  rerender(undefined);
  expect(result.current.visible).toBe(false);
});

it('does not show a later unsolicited notice if the store was open at startup', () => {
  mockConfigStatus = 'ready'; mockStoreStatus = { kind: 'open' };
  const hook = newSession();
  const { result, rerender, unmount } = renderHook(hook);
  expect(result.current.visible).toBe(false);
  mockStoreStatus = { kind: 'closed' }; mockActive = false;
  rerender(undefined);
  mockActive = true;
  rerender(undefined);
  expect(result.current.visible).toBe(false);
  unmount();
  expect(renderHook(hook).result.current.visible).toBe(false);
});

it('waits for location setup and native sheet dismissal without consuming the startup check', () => {
  mockConfigStatus = 'ready';
  const hook = newSession();
  const { result, rerender } = renderHook(({ ready }) => hook(ready), { initialProps: { ready: false } });
  expect(result.current.visible).toBe(false);
  rerender({ ready: true });
  expect(result.current.visible).toBe(true);
  // Eligibility only controls opening; a later refresh must not silently hide
  // a notice that the customer is already reading.
  rerender({ ready: false });
  expect(result.current.visible).toBe(true);
  act(() => result.current.close());
  rerender({ ready: true });
  expect(result.current.visible).toBe(false);
});

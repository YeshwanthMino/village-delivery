import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Modal, Platform, Pressable, ScrollView, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { VillageBottomSheet } from '../VillageBottomSheet';
import { StoreClosedSheet } from '@/src/features/storeConfig/views/StoreClosedSheet';
import type { StoreStatus } from '@/src/features/storeConfig/domain/storeStatus';

jest.mock('@/src/shared/hooks/useScreenActive', () => ({ useScreenFocused: () => true }));
jest.mock('react-native-gesture-handler', () => ({
  ...jest.requireActual('react-native-gesture-handler'),
  GestureHandlerRootView: jest.requireActual('react-native').View,
}));

const originalOS = Platform.OS;
afterEach(() => { Platform.OS = originalOS; jest.restoreAllMocks(); });

it.each(['android', 'ios'] as const)('on %s, hides content/gestures immediately and reports completed dismissal once', (os) => {
  Platform.OS = os;
  const dismissed = jest.fn();
  const view = (visible: boolean) => <VillageBottomSheet visible={visible} onClose={jest.fn()} onDismiss={dismissed}><Text>Notice</Text></VillageBottomSheet>;
  const { rerender, queryByText, UNSAFE_getByType, UNSAFE_queryByType } = render(view(true));
  const host = UNSAFE_getByType(Modal);
  rerender(view(false));
  expect(queryByText('Notice')).toBeNull();
  expect(UNSAFE_queryByType(GestureDetector)).toBeNull();
  expect(UNSAFE_getByType(Modal)).toBe(host);
  expect(host.props.visible).toBe(false);
  if (os === 'ios') {
    expect(dismissed).not.toHaveBeenCalled();
    act(() => host.props.onDismiss());
  }
  expect(dismissed).toHaveBeenCalledTimes(1);
  act(() => host.props.onDismiss());
  expect(dismissed).toHaveBeenCalledTimes(1);
  rerender(view(true));
  expect(queryByText('Notice')).not.toBeNull();
  expect(UNSAFE_getByType(GestureDetector)).toBeTruthy();
});

it('never closes for a cancelled gesture and closes a completed swipe without an animation callback', () => {
  const pan = jest.spyOn(Gesture, 'Pan');
  const close = jest.fn();
  render(<VillageBottomSheet visible onClose={close}><Text>Notice</Text></VillageBottomSheet>);
  const gesture = pan.mock.results[pan.mock.results.length - 1].value;
  const event = { translationY: 110, velocityY: 700 };
  act(() => gesture.handlers.onEnd(event, false));
  expect(close).not.toHaveBeenCalled();
  act(() => gesture.handlers.onEnd(event, true));
  expect(close).toHaveBeenCalledTimes(1);
  act(() => gesture.handlers.onEnd(event, true));
  expect(close).toHaveBeenCalledTimes(1);
});

it('waits for iOS native dismissal before presenting a rapidly reopened sheet', () => {
  Platform.OS = 'ios';
  const close = jest.fn();
  const view = (visible: boolean) => <VillageBottomSheet visible={visible} onClose={close}><Text>Choices</Text></VillageBottomSheet>;
  const { rerender, queryByText, getByTestId, queryByTestId, UNSAFE_getByType } = render(view(true));
  const modal = UNSAFE_getByType(Modal);
  rerender(view(false));
  rerender(view(true));
  expect(modal.props.visible).toBe(false);
  expect(queryByText('Choices')).toBeNull();
  expect(queryByTestId('sheet-backdrop')).toBeNull();

  act(() => modal.props.onDismiss());
  expect(UNSAFE_getByType(Modal).props.visible).toBe(true);
  expect(queryByText('Choices')).not.toBeNull();
  fireEvent.press(getByTestId('sheet-backdrop'));
  fireEvent.press(getByTestId('sheet-backdrop'));
  expect(close).toHaveBeenCalledTimes(1);
});

it('keeps sheet content scrollable and its buttons responsive without treating them as backdrop taps', () => {
  const close = jest.fn();
  const action = jest.fn();
  const { UNSAFE_getByType, getByText } = render(
    <VillageBottomSheet visible onClose={close}>
      <Pressable onPress={action}><Text>Choose</Text></Pressable>
    </VillageBottomSheet>,
  );
  const scroll = UNSAFE_getByType(ScrollView);
  expect(scroll.props.nestedScrollEnabled).toBe(true);
  expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
  fireEvent.press(getByText('Choose'));
  expect(action).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();
});

it('retains the store notice modal host until native dismissal even when its status is cleared', () => {
  Platform.OS = 'ios';
  const dismissed = jest.fn();
  const closed: StoreStatus = { kind: 'closed', nextOpening: { at: new Date(2026, 8, 30, 9), daysAhead: 1, minutesUntil: 500 } };
  const view = (visible: boolean, status: StoreStatus) => <StoreClosedSheet visible={visible} status={status} timings={null} context="checkout" onClose={jest.fn()} onDismiss={dismissed} />;
  const { rerender, UNSAFE_getByType, queryByText } = render(view(true, closed));
  const host = UNSAFE_getByType(Modal);
  rerender(view(false, { kind: 'unknown' }));
  expect(UNSAFE_getByType(Modal)).toBe(host);
  expect(host.props.visible).toBe(false);
  expect(queryByText('Place Order')).toBeNull();
  expect(dismissed).not.toHaveBeenCalled();
  act(() => host.props.onDismiss());
  expect(dismissed).toHaveBeenCalledTimes(1);
});

import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Keyboard, Modal, Text } from 'react-native';
import { cancelAnimation, withRepeat } from 'react-native-reanimated';
import { HomeBannerCarousel } from '@/src/features/home/views/home/components/HomeBannerCarousel';
import { VillageBottomSheet } from '../VillageBottomSheet';
import { Skeleton } from '../Skeleton';
import type { BannerSection } from '@/src/features/home/data/homeLayout.types';

let mockActive = true;
jest.mock('@/src/shared/hooks/useScreenActive', () => ({
  useScreenActive: () => mockActive,
  useScreenFocused: () => mockActive,
}));
jest.mock('expo-image', () => ({ Image: () => null }));

beforeEach(() => { mockActive = true; jest.useFakeTimers(); });
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

it('stops carousel ticks on blur/background, resumes once, and clears on unmount', () => {
  const section = {
    slides: [{ id: 'a', imageUrl: 'a' }, { id: 'b', imageUrl: 'b' }],
    autoScroll: true, autoPlayDelay: 1000,
  } as BannerSection;
  const timeout = jest.spyOn(global, 'setTimeout');
  const clear = jest.spyOn(global, 'clearTimeout');
  const autoplayTimers = () => timeout.mock.results.filter((_, i) => timeout.mock.calls[i][1] === 1000);
  const view = () => <HomeBannerCarousel section={section} onPressSlide={jest.fn()} />;
  const { rerender, unmount } = render(view());
  const initialTimers = autoplayTimers();
  expect(initialTimers.length).toBeGreaterThan(0);
  act(() => { jest.advanceTimersByTime(900); });
  mockActive = false;
  rerender(view());
  expect(clear).toHaveBeenCalledWith(initialTimers[initialTimers.length - 1].value);
  act(() => { jest.advanceTimersByTime(5000); });
  expect(autoplayTimers()).toHaveLength(initialTimers.length);
  mockActive = true;
  rerender(view());
  const resumedTimers = autoplayTimers();
  expect(resumedTimers.length).toBeGreaterThan(initialTimers.length);
  unmount();
  expect(clear).toHaveBeenCalledWith(resumedTimers[resumedTimers.length - 1].value);
});

it('cancels a repeating skeleton animation on blur and unmount', () => {
  const repeat = jest.spyOn(require('react-native-reanimated'), 'withRepeat');
  const cancel = jest.spyOn(require('react-native-reanimated'), 'cancelAnimation');
  const { rerender, unmount } = render(<Skeleton />);
  expect(withRepeat).toHaveBeenCalled();
  const repeats = repeat.mock.calls.length;
  mockActive = false;
  rerender(<Skeleton />);
  expect(cancelAnimation).toHaveBeenCalled();
  expect(repeat).toHaveBeenCalledTimes(repeats);
  mockActive = true;
  rerender(<Skeleton />);
  const cancellations = cancel.mock.calls.length;
  unmount();
  expect(cancel.mock.calls.length).toBeGreaterThan(cancellations);
});

it('does not retain keyboard listeners or children while a sheet is closed', () => {
  const removes: jest.Mock[] = [];
  const add = jest.spyOn(Keyboard, 'addListener').mockImplementation(() => {
    const remove = jest.fn();
    removes.push(remove);
    return { remove } as unknown as ReturnType<typeof Keyboard.addListener>;
  });
  const view = (visible: boolean) => (
    <VillageBottomSheet visible={visible} onClose={jest.fn()}><Text>Sheet content</Text></VillageBottomSheet>
  );
  const { rerender, queryByText, unmount } = render(view(false));
  expect(add).not.toHaveBeenCalled();
  expect(queryByText('Sheet content')).toBeNull();
  rerender(view(true));
  expect(add).toHaveBeenCalledTimes(2);
  rerender(view(false));
  expect(queryByText('Sheet content')).toBeNull();
  removes.forEach(remove => expect(remove).toHaveBeenCalledTimes(1));
  rerender(view(true));
  mockActive = false;
  rerender(view(true));
  expect(queryByText('Sheet content')).toBeNull();
  unmount();
  removes.forEach(remove => expect(remove).toHaveBeenCalledTimes(1));
});

it('routes modal Back separately from swipe dismissal and dismisses the keyboard first', () => {
  const back = jest.fn();
  const close = jest.fn();
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  const keyboard = jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
  const { UNSAFE_getByType, rerender } = render(
    <VillageBottomSheet visible dismissable={false} onBack={back} onClose={close}><Text>Form</Text></VillageBottomSheet>,
  );
  act(() => UNSAFE_getByType(Modal).props.onRequestClose());
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(back).not.toHaveBeenCalled();
  keyboard.mockReturnValue(false);
  act(() => { jest.advanceTimersByTime(350); });
  act(() => UNSAFE_getByType(Modal).props.onRequestClose());
  expect(back).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();
  rerender(<VillageBottomSheet visible dismissable={false} onClose={close}><Text>Locked</Text></VillageBottomSheet>);
  act(() => UNSAFE_getByType(Modal).props.onRequestClose());
  expect(close).not.toHaveBeenCalled();
});

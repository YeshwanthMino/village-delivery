import { act, renderHook } from '@testing-library/react-native';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import { loopBannerSlides, useBannerCarousel } from '../useBannerCarousel';

let mockActive = true;
jest.mock('../useScreenActive', () => ({ useScreenActive: () => mockActive }));

const eventAt = (x: number) => ({ nativeEvent: { contentOffset: { x, y: 0 } } }) as NativeSyntheticEvent<NativeScrollEvent>;
const defaults = { count: 3, snapInterval: 300, autoPlay: true, delay: 1000, slidesKey: 'a,b,c' };

function setup(overrides = {}) {
  const props = { ...defaults, ...overrides };
  const hook = renderHook(options => useBannerCarousel(options), { initialProps: props });
  const scrollTo = jest.fn();
  hook.result.current.scrollRef.current = { scrollTo } as unknown as ScrollView;
  return { ...hook, scrollTo, props };
}

beforeEach(() => { mockActive = true; jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

it('pauses on touch and drag, then gives the settled slide the full delay', () => {
  const { result, scrollTo } = setup();
  act(() => jest.advanceTimersByTime(900));
  act(() => {
    result.current.scrollHandlers.onTouchStart();
    result.current.scrollHandlers.onScrollBeginDrag();
  });
  act(() => jest.advanceTimersByTime(5000));
  expect(scrollTo).not.toHaveBeenCalled();
  act(() => {
    result.current.scrollHandlers.onScrollEndDrag(eventAt(550));
    result.current.scrollHandlers.onMomentumScrollBegin();
    result.current.scrollHandlers.onScroll(eventAt(600));
    result.current.scrollHandlers.onMomentumScrollEnd(eventAt(600));
  });
  expect(result.current.current).toBe(1);
  act(() => jest.advanceTimersByTime(999));
  expect(scrollTo).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 900, animated: true });
});

it('never advances while momentum is still producing scroll events', () => {
  const { result, scrollTo } = setup();
  act(() => {
    result.current.scrollHandlers.onScrollBeginDrag();
    result.current.scrollHandlers.onScrollEndDrag(eventAt(400));
    result.current.scrollHandlers.onMomentumScrollBegin();
  });
  for (let i = 0; i < 20; i++) {
    act(() => {
      jest.advanceTimersByTime(100);
      result.current.scrollHandlers.onScroll(eventAt(400 + i * 10));
    });
  }
  expect(scrollTo).not.toHaveBeenCalled();
  act(() => result.current.scrollHandlers.onMomentumScrollEnd(eventAt(600)));
  act(() => jest.advanceTimersByTime(1000));
  expect(scrollTo).toHaveBeenCalledTimes(1);
});

it.each(['onTouchEnd', 'onTouchCancel'] as const)('restarts after %s even when the slide does not change', end => {
  const { result, scrollTo } = setup();
  act(() => jest.advanceTimersByTime(900));
  act(() => result.current.scrollHandlers.onTouchStart());
  act(() => jest.advanceTimersByTime(5000));
  act(() => result.current.scrollHandlers[end]());
  act(() => jest.advanceTimersByTime(150));
  act(() => jest.advanceTimersByTime(999));
  expect(scrollTo).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(scrollTo).toHaveBeenCalledWith({ x: 600, animated: true });
});

it('settles a short drag without momentum-end and resumes autoplay', () => {
  const { result, scrollTo } = setup();
  act(() => {
    result.current.scrollHandlers.onScrollBeginDrag();
    result.current.scrollHandlers.onScrollEndDrag(eventAt(600));
  });
  act(() => jest.advanceTimersByTime(150));
  expect(result.current.current).toBe(1);
  act(() => jest.advanceTimersByTime(1000));
  expect(scrollTo).toHaveBeenCalledWith({ x: 900, animated: true });
});

it('wraps forward one card and rebases without an animated rewind', () => {
  const { result, scrollTo } = setup();
  act(() => result.current.scrollHandlers.onMomentumScrollEnd(eventAt(900)));
  expect(result.current.current).toBe(2);
  act(() => jest.advanceTimersByTime(1000));
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 1200, animated: true });
  // Programmatic scrolling also has a fallback if native momentum-end is absent.
  act(() => jest.advanceTimersByTime(150));
  expect(result.current.current).toBe(0);
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 300, animated: false });
  act(() => jest.advanceTimersByTime(1000));
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 600, animated: true });
});

it('wraps a backwards swipe and clamps overscroll to valid indicators', () => {
  const { result, scrollTo } = setup();
  act(() => result.current.scrollHandlers.onMomentumScrollEnd(eventAt(-30)));
  expect(result.current.current).toBe(2);
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 900, animated: false });
  act(() => result.current.scrollHandlers.onMomentumScrollEnd(eventAt(9999)));
  expect(result.current.current).toBe(1);
});

it('pauses in the background and starts a full delay on return, including an interrupted gesture', () => {
  const { result, rerender, props, scrollTo, unmount } = setup();
  act(() => result.current.scrollHandlers.onTouchStart());
  mockActive = false;
  rerender(props);
  scrollTo.mockClear();
  act(() => jest.advanceTimersByTime(5000));
  expect(scrollTo).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
  mockActive = true;
  rerender(props);
  scrollTo.mockClear();
  act(() => jest.advanceTimersByTime(999));
  expect(scrollTo).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(scrollTo).toHaveBeenCalledTimes(1);
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});

it('realigns on width changes and resets safely when slides are replaced or removed', () => {
  const { result, rerender, props, scrollTo } = setup();
  act(() => result.current.scrollHandlers.onMomentumScrollEnd(eventAt(900)));
  rerender({ ...props, snapInterval: 400 });
  expect(result.current.current).toBe(2);
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 1200, animated: false });
  rerender({ ...props, slidesKey: 'd,e,f' });
  expect(result.current.current).toBe(0);
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 300, animated: false });
  rerender({ ...props, count: 1, slidesKey: 'd' });
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: false });
  expect(jest.getTimerCount()).toBe(0);
  rerender({ ...props, count: 0, slidesKey: '' });
  expect(result.current.current).toBe(0);
  expect(jest.getTimerCount()).toBe(0);
});

it('keeps autoplay disabled while allowing manual navigation', () => {
  const { result, scrollTo } = setup({ autoPlay: false });
  act(() => result.current.scrollHandlers.onMomentumScrollEnd(eventAt(600)));
  act(() => jest.advanceTimersByTime(5000));
  expect(result.current.current).toBe(1);
  expect(scrollTo).not.toHaveBeenCalled();
});

it('still settles a swipe when autoplay settings change before momentum-end', () => {
  const { result, rerender, props, scrollTo } = setup();
  act(() => {
    result.current.scrollHandlers.onScrollBeginDrag();
    result.current.scrollHandlers.onScrollEndDrag(eventAt(600));
  });
  rerender({ ...props, autoPlay: false });
  act(() => jest.advanceTimersByTime(150));
  expect(result.current.current).toBe(1);
  rerender({ ...props, autoPlay: true, delay: 2000 });
  act(() => jest.advanceTimersByTime(1999));
  expect(scrollTo).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(scrollTo).toHaveBeenCalledWith({ x: 900, animated: true });
});

it('only duplicates multiple slides and includes the peek after wrapping', () => {
  expect(loopBannerSlides([])).toEqual([]);
  expect(loopBannerSlides(['a'])).toEqual(['a']);
  expect(loopBannerSlides(['a', 'b', 'c'])).toEqual(['c', 'a', 'b', 'c', 'a', 'b']);
});

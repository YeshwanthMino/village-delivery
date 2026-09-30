import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import { useScreenActive } from './useScreenActive';

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

// Some platforms do not send momentum-end after a short drag or scrollTo.
const SCROLL_IDLE_MS = 150;

/** Duplicate the edges so wrapping travels one card, including the next-card peek. */
export function loopBannerSlides<T>(slides: T[]): T[] {
  return slides.length > 1
    ? [slides[slides.length - 1], ...slides, slides[0], slides[1]]
    : slides;
}

export function useBannerCarousel({
  count,
  snapInterval,
  autoPlay,
  delay,
  slidesKey,
}: {
  count: number;
  snapInterval: number;
  autoPlay: boolean;
  delay: number;
  slidesKey: string;
}) {
  const active = useScreenActive();
  const scrollRef = useRef<ScrollView>(null);
  const currentRef = useRef(0);
  const offsetRef = useRef(count > 1 ? snapInterval : 0);
  const touching = useRef(false);
  const dragging = useRef(false);
  const moving = useRef(false);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSlidesKey = useRef(slidesKey);
  const [current, setCurrent] = useState(0);
  const [settled, setSettled] = useState(0);

  const clearAutoplay = useCallback(() => {
    if (autoplayTimer.current !== null) clearTimeout(autoplayTimer.current);
    autoplayTimer.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    clearAutoplay();
    if (idleTimer.current !== null) clearTimeout(idleTimer.current);
    idleTimer.current = null;
  }, [clearAutoplay]);

  const pause = useCallback(() => {
    clearTimers();
    moving.current = true;
  }, [clearTimers]);

  const finishScroll = useCallback(() => {
    clearTimers();
    const page = Math.max(0, Math.min(Math.round(offsetRef.current / snapInterval), count + 2));
    const index = count > 1 ? (page - 1 + count) % count : 0;
    currentRef.current = index;
    setCurrent(index);
    moving.current = false;

    // The duplicate looks identical; rebase without animating back through all slides.
    if (count > 1 && (page === 0 || page > count) && !touching.current && !dragging.current) {
      offsetRef.current = (index + 1) * snapInterval;
      scrollRef.current?.scrollTo({ x: offsetRef.current, animated: false });
    }
    setSettled(value => value + 1);
  }, [clearTimers, count, snapInterval]);

  const queueSettle = useCallback(() => {
    if (idleTimer.current !== null) clearTimeout(idleTimer.current);
    if (!touching.current && !dragging.current) {
      idleTimer.current = setTimeout(finishScroll, SCROLL_IDLE_MS);
    }
  }, [finishScroll]);

  const align = useCallback(() => {
    if (touching.current || dragging.current || moving.current) return;
    offsetRef.current = count > 1 ? (currentRef.current + 1) * snapInterval : 0;
    scrollRef.current?.scrollTo({ x: offsetRef.current, animated: false });
  }, [count, snapInterval]);

  useEffect(() => {
    clearTimers();
    touching.current = false;
    dragging.current = false;
    moving.current = false;
    currentRef.current = previousSlidesKey.current === slidesKey
      ? Math.max(0, Math.min(currentRef.current, count - 1))
      : 0;
    previousSlidesKey.current = slidesKey;
    setCurrent(currentRef.current);
    align();
    setSettled(value => value + 1);
    return clearTimers;
  }, [active, slidesKey, count, align, clearTimers]);

  useEffect(() => {
    if (!active || !autoPlay || count <= 1 || touching.current || dragging.current || moving.current) return;
    autoplayTimer.current = setTimeout(() => {
      autoplayTimer.current = null;
      moving.current = true;
      // One physical page forward, even when the last real card is selected.
      offsetRef.current = (currentRef.current + 2) * snapInterval;
      scrollRef.current?.scrollTo({ x: offsetRef.current, animated: true });
      queueSettle();
    }, delay);
    return clearAutoplay;
  }, [active, autoPlay, count, delay, snapInterval, settled, queueSettle, clearAutoplay]);

  return {
    current,
    scrollRef,
    scrollHandlers: {
      onLayout: align,
      onContentSizeChange: align,
      onTouchStart: () => {
        touching.current = true;
        pause();
      },
      onTouchEnd: () => {
        touching.current = false;
        queueSettle();
      },
      onTouchCancel: () => {
        touching.current = false;
        queueSettle();
      },
      onScrollBeginDrag: () => {
        dragging.current = true;
        pause();
      },
      onScrollEndDrag: (event: ScrollEvent) => {
        dragging.current = false;
        touching.current = false;
        offsetRef.current = event.nativeEvent.contentOffset.x;
        queueSettle();
      },
      onMomentumScrollBegin: () => {
        pause();
        queueSettle();
      },
      onMomentumScrollEnd: (event: ScrollEvent) => {
        offsetRef.current = event.nativeEvent.contentOffset.x;
        finishScroll();
      },
      onScroll: (event: ScrollEvent) => {
        offsetRef.current = event.nativeEvent.contentOffset.x;
        pause();
        queueSettle();
      },
      scrollEventThrottle: 16,
    },
  };
}

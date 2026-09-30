import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import { useScreenActive } from './useScreenActive';

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

// Native momentum-end is not emitted for every short drag or programmatic scroll.
// Wait for a quiet period before using the fallback, and give animated scrollTo
// enough time to reach its destination before treating it as settled.
const SCROLL_IDLE_MS = 180;
const MOMENTUM_MIN_MS = 400;
const AUTO_MIN_MS = 500;
const AUTO_NO_EVENT_MS = 700;
const STALLED_SCROLL_MS = 850;
const AUTO_TARGET_TIMEOUT_MS = 1200;

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
  const scrollXRef = useRef<Animated.Value | null>(null);
  if (scrollXRef.current === null) scrollXRef.current = new Animated.Value(count > 1 ? snapInterval : 0);
  const scrollX = scrollXRef.current;
  const currentRef = useRef(0);
  const offsetRef = useRef(count > 1 ? snapInterval : 0);
  const touching = useRef(false);
  const dragging = useRef(false);
  const moving = useRef(false);
  const momentumStartedAt = useRef<number | null>(null);
  const autoTarget = useRef<number | null>(null);
  const autoStartedAt = useRef(0);
  const sawAutoScroll = useRef(false);
  const lastScrollAt = useRef(0);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSlidesKey = useRef(slidesKey);
  const [current, setCurrent] = useState(0);
  const [settled, setSettled] = useState(0);

  const clearAutoplay = useCallback(() => {
    if (autoplayTimer.current !== null) clearTimeout(autoplayTimer.current);
    autoplayTimer.current = null;
  }, []);

  const clearIdle = useCallback(() => {
    if (idleTimer.current !== null) clearTimeout(idleTimer.current);
    idleTimer.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    clearAutoplay();
    clearIdle();
  }, [clearAutoplay, clearIdle]);

  const pause = useCallback(() => {
    clearTimers();
    autoTarget.current = null;
    momentumStartedAt.current = null;
    moving.current = true;
  }, [clearTimers]);

  const finishScroll = useCallback((x?: number, assumeAutoTarget = false) => {
    clearTimers();
    if (x !== undefined) offsetRef.current = x;
    if (assumeAutoTarget && autoTarget.current !== null) offsetRef.current = autoTarget.current;
    scrollX.setValue(offsetRef.current);
    autoTarget.current = null;
    momentumStartedAt.current = null;

    const page = Math.max(0, Math.min(Math.round(offsetRef.current / snapInterval), count + 2));
    const index = count > 1 ? (page - 1 + count) % count : 0;
    currentRef.current = index;
    setCurrent(index);
    moving.current = false;

    // The duplicate looks identical. Only jump to its real counterpart after
    // the native track is actually at the duplicate's snap point.
    const atSnap = Math.abs(offsetRef.current - page * snapInterval) <= Math.max(2, snapInterval * 0.02);
    if (count > 1 && atSnap && (page === 0 || page > count) && !touching.current && !dragging.current) {
      offsetRef.current = (index + 1) * snapInterval;
      scrollX.setValue(offsetRef.current);
      scrollRef.current?.scrollTo({ x: offsetRef.current, animated: false });
    }
    setSettled(value => value + 1);
  }, [clearTimers, count, scrollX, snapInterval]);

  const queueSettle = useCallback((initialWait = SCROLL_IDLE_MS) => {
    if (touching.current || dragging.current || idleTimer.current !== null) return;

    const check = () => {
      idleTimer.current = null;
      if (touching.current || dragging.current) return;

      const now = Date.now();
      const quietFor = now - lastScrollAt.current;
      const retry = (wait: number) => {
        idleTimer.current = setTimeout(check, Math.max(1, wait));
      };
      if (quietFor < SCROLL_IDLE_MS) {
        retry(SCROLL_IDLE_MS - quietFor);
        return;
      }

      if (momentumStartedAt.current !== null && now - momentumStartedAt.current < MOMENTUM_MIN_MS) {
        retry(MOMENTUM_MIN_MS - (now - momentumStartedAt.current));
        return;
      }

      if (autoTarget.current !== null) {
        const elapsed = now - autoStartedAt.current;
        if (!sawAutoScroll.current) {
          if (elapsed < AUTO_NO_EVENT_MS) {
            retry(AUTO_NO_EVENT_MS - elapsed);
            return;
          }
          finishScroll(undefined, true);
          return;
        }
        if (elapsed < AUTO_MIN_MS) {
          retry(AUTO_MIN_MS - elapsed);
          return;
        }
        if (Math.abs(offsetRef.current - autoTarget.current) > Math.max(2, snapInterval * 0.02)
            && elapsed < AUTO_TARGET_TIMEOUT_MS) {
          retry(SCROLL_IDLE_MS);
          return;
        }
      }

      const page = Math.max(0, Math.min(Math.round(offsetRef.current / snapInterval), count + 2));
      const atSnap = Math.abs(offsetRef.current - page * snapInterval) <= Math.max(2, snapInterval * 0.02);
      if (!atSnap && now - lastScrollAt.current < STALLED_SCROLL_MS) {
        retry(SCROLL_IDLE_MS);
        return;
      }
      if (!atSnap) {
        // A native snap was interrupted without an end event. Complete the
        // nearest page with animation instead of rebasing from a partial page.
        const target = page * snapInterval;
        autoTarget.current = target;
        autoStartedAt.current = now;
        sawAutoScroll.current = false;
        scrollRef.current?.scrollTo({ x: target, animated: true });
        retry(AUTO_NO_EVENT_MS);
        return;
      }
      finishScroll();
    };

    idleTimer.current = setTimeout(check, initialWait);
  }, [count, finishScroll, snapInterval]);

  const align = useCallback(() => {
    if (touching.current || dragging.current || moving.current) return;
    offsetRef.current = count > 1 ? (currentRef.current + 1) * snapInterval : 0;
    scrollX.setValue(offsetRef.current);
    scrollRef.current?.scrollTo({ x: offsetRef.current, animated: false });
  }, [count, scrollX, snapInterval]);

  useEffect(() => {
    clearTimers();
    touching.current = false;
    dragging.current = false;
    moving.current = false;
    momentumStartedAt.current = null;
    autoTarget.current = null;
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
      autoTarget.current = (currentRef.current + 2) * snapInterval;
      autoStartedAt.current = Date.now();
      sawAutoScroll.current = false;
      lastScrollAt.current = autoStartedAt.current;
      scrollRef.current?.scrollTo({ x: autoTarget.current, animated: true });
      queueSettle();
    }, delay);
    return clearAutoplay;
  }, [active, autoPlay, count, delay, snapInterval, settled, queueSettle, clearAutoplay]);

  const recordScroll = (x: number) => {
    const changed = Math.abs(x - offsetRef.current) > 0.5;
    offsetRef.current = x;
    scrollX.setValue(x);
    if (!changed) return;
    lastScrollAt.current = Date.now();
    if (autoTarget.current !== null) sawAutoScroll.current = true;
    clearAutoplay();
    moving.current = true;
    queueSettle();
  };

  return {
    current,
    scrollRef,
    scrollX,
    scrollHandlers: {
      onLayout: align,
      onContentSizeChange: align,
      onTouchStart: () => {
        touching.current = true;
        pause();
      },
      onTouchEnd: () => {
        touching.current = false;
        lastScrollAt.current = Date.now();
        queueSettle();
      },
      onTouchCancel: () => {
        touching.current = false;
        lastScrollAt.current = Date.now();
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
        scrollX.setValue(offsetRef.current);
        lastScrollAt.current = Date.now();
        queueSettle();
      },
      onMomentumScrollBegin: () => {
        clearAutoplay();
        moving.current = true;
        momentumStartedAt.current = Date.now();
        clearIdle();
        queueSettle();
      },
      onMomentumScrollEnd: (event: ScrollEvent) => {
        if (touching.current || dragging.current) return;
        finishScroll(event.nativeEvent.contentOffset.x);
      },
      onScroll: (event: ScrollEvent) => recordScroll(event.nativeEvent.contentOffset.x),
      scrollEventThrottle: 16,
    },
  };
}

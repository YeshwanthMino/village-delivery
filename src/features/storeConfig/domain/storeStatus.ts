// src/features/storeConfig/domain/storeStatus.ts
//
// Classifies "can this order be fulfilled right now?" against the weekly
// store timings, and finds the next opening when it can't. Drives the
// store-closed sheet shown before checkout.
//
// Pure: no React, no store access. `now` is always passed in so checkout can
// recompute at the moment of pressing Place Order rather than trusting a value
// captured when the cart first rendered.
//
// Timezone: like storeTimings.ts, this reads the device clock. Store and
// customers share IST today; a multi-region store needs its zone in the payload.

import { WEEKDAYS, type DayTimings, type WeeklyStoreTimings } from '../data/storeConfig.types';
import { hasStoreTimings } from './storeTimings';

/** One opening period, in minutes since midnight. `close <= open` runs past midnight. */
export interface TimeWindow {
  open: number;
  close: number;
}

/** When the store next opens, relative to `now`. */
export interface NextOpening {
  /** Calendar date of the opening, at the opening minute. */
  at: Date;
  /** 0 = today, 1 = tomorrow, 2+ = a later day. */
  daysAhead: number;
  /** Minutes from `now` until opening. */
  minutesUntil: number;
}

export type StoreStatus =
  | { kind: 'open' }
  /** Open, but too close to closing to fulfil the order before it shuts. */
  | { kind: 'closing_soon'; closesAt: Date; nextOpening: NextOpening | null }
  /** Closed now; the day's first window opens later today. */
  | { kind: 'not_yet_open'; nextOpening: NextOpening }
  /** Closed between two windows on the same day (split shift). */
  | { kind: 'between_shifts'; nextOpening: NextOpening }
  /** Closed for the rest of today; opens tomorrow or later. */
  | { kind: 'closed'; nextOpening: NextOpening }
  /** Timings missing, malformed, or the store never opens — say nothing we can't back up. */
  | { kind: 'unknown' };

/** Past this many minutes to opening, "opens in ~N min" stops being useful. */
export const OPENS_SOON_THRESHOLD_MINUTES = 60;

/** Minimum time before closing an order needs to be picked, packed and sent. */
export const DEFAULT_FULFILMENT_MINUTES = 30;

const DAY_MINUTES = 24 * 60;

function toMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * The opening periods for one day, sorted by opening time. The API sends one
 * window per day today; this is the single place that would change if it
 * starts sending split shifts.
 */
export function getDayWindows(day: DayTimings | null | undefined): TimeWindow[] {
  if (!day || day.isClosed) return [];
  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  if (open === null || close === null || open === close) return [];
  return [{ open, close }];
}

function atMinute(base: Date, daysAhead: number, minute: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + daysAhead, 0, minute);
}

function windowsFor(timings: WeeklyStoreTimings, date: Date, daysAhead: number): TimeWindow[] {
  return getDayWindows(timings[WEEKDAYS[(date.getDay() + daysAhead) % 7]]);
}

/** Closing time of the window serving `now`, or null when closed. */
function currentWindowClose(timings: WeeklyStoreTimings, now: Date): Date | null {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const w of windowsFor(timings, now, 0)) {
    if (w.close > w.open && nowMin >= w.open && nowMin < w.close) return atMinute(now, 0, w.close);
    if (w.close <= w.open && nowMin >= w.open) return atMinute(now, 1, w.close);
  }
  // A window that opened yesterday and runs past midnight.
  for (const w of windowsFor(timings, now, 6)) {
    if (w.close <= w.open && nowMin < w.close) return atMinute(now, 0, w.close);
  }
  return null;
}

/** First window opening strictly after `from`, searching a week ahead. */
export function findNextOpening(
  timings: WeeklyStoreTimings,
  now: Date,
  from: Date = now,
): NextOpening | null {
  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    for (const w of windowsFor(timings, now, daysAhead)) {
      const at = atMinute(now, daysAhead, w.open);
      if (at.getTime() > from.getTime()) {
        return {
          at,
          daysAhead,
          minutesUntil: Math.round((at.getTime() - now.getTime()) / 60000),
        };
      }
    }
  }
  return null;
}

export function getStoreStatus(
  timings: WeeklyStoreTimings | null | undefined,
  now: Date = new Date(),
  fulfilmentMinutes: number = DEFAULT_FULFILMENT_MINUTES,
): StoreStatus {
  if (!timings || !hasStoreTimings(timings)) return { kind: 'unknown' };

  const closesAt = currentWindowClose(timings, now);
  if (closesAt) {
    const remaining = (closesAt.getTime() - now.getTime()) / 60000;
    if (remaining >= fulfilmentMinutes) return { kind: 'open' };
    return { kind: 'closing_soon', closesAt, nextOpening: findNextOpening(timings, now, closesAt) };
  }

  const nextOpening = findNextOpening(timings, now);
  if (!nextOpening) return { kind: 'unknown' };
  if (nextOpening.daysAhead > 0) return { kind: 'closed', nextOpening };

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openedEarlierToday = windowsFor(timings, now, 0).some((w) => w.open <= nowMin);
  return openedEarlierToday
    ? { kind: 'between_shifts', nextOpening }
    : { kind: 'not_yet_open', nextOpening };
}

/** Whether checkout should stop and explain the delay before placing. */
export function needsStoreClosedNotice(status: StoreStatus): boolean {
  return status.kind !== 'open' && status.kind !== 'unknown';
}

// ---- Formatting helpers (locale-free; copy lives in the view)

/** "10:00 AM" for minutes-since-midnight. Avoids Intl, which Hermes ships partially. */
export function formatClock(minutes: number): string {
  const m = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const h24 = Math.floor(m / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

export function formatDateClock(date: Date): string {
  return formatClock(date.getHours() * 60 + date.getMinutes());
}

/** "10:00 AM – 2:00 PM" lines for the day of `date`. */
export function formatDayHours(timings: WeeklyStoreTimings, date: Date): string[] {
  return windowsFor(timings, date, 0).map((w) => `${formatClock(w.open)} – ${formatClock(w.close)}`);
}

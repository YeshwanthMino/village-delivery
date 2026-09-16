// src/features/storeConfig/domain/storeTimings.ts
//
// Pure helpers over the weekly store timings from /app/store-config.
// No React, no store access — unit-testable in isolation.
//
// Times are compared in the device's local timezone. Both the store and its
// customers are in one place (Chittoor, IST), so device-local and store-local
// are the same clock in practice; a multi-region store would need the store's
// own zone carried in the payload.

import { WEEKDAYS, type DayTimings, type Weekday, type WeeklyStoreTimings } from '../data/storeConfig.types';

/** Minutes since midnight for an "HH:mm" string, or null if unparseable. */
function toMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function getWeekday(date: Date): Weekday {
  return WEEKDAYS[date.getDay()];
}

/** The opening hours that apply on `date`'s calendar day. */
export function getDayTimings(
  timings: WeeklyStoreTimings | null | undefined,
  date: Date = new Date(),
): DayTimings | null {
  if (!timings) return null;
  return timings[getWeekday(date)] ?? null;
}

/**
 * Whether the store is serving at `date`.
 *
 * Returns false when timings are unknown or malformed, which is why callers
 * that gate ordering must check `hasStoreTimings` first — an unanswerable
 * question must not read as "closed" and lock customers out.
 */
export function isStoreOpenAt(
  timings: WeeklyStoreTimings | null | undefined,
  date: Date = new Date(),
): boolean {
  if (!timings) return false;
  const nowMinutes = date.getHours() * 60 + date.getMinutes();

  const today = timings[getWeekday(date)];
  if (today && !today.isClosed) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    if (open !== null && close !== null) {
      // close > open is a same-day window; close <= open runs past midnight.
      if (close > open ? nowMinutes >= open && nowMinutes < close : nowMinutes >= open) {
        return true;
      }
    }
  }

  // A window opened yesterday can still be running (e.g. 20:00 → 02:00).
  const yesterday = timings[WEEKDAYS[(date.getDay() + 6) % 7]];
  if (yesterday && !yesterday.isClosed) {
    const open = toMinutes(yesterday.open);
    const close = toMinutes(yesterday.close);
    if (open !== null && close !== null && close <= open && nowMinutes < close) {
      return true;
    }
  }

  return false;
}

/** True once a full, usable week of timings is known. */
export function hasStoreTimings(timings: WeeklyStoreTimings | null | undefined): boolean {
  if (!timings) return false;
  return WEEKDAYS.every((day) => Boolean(timings[day]));
}

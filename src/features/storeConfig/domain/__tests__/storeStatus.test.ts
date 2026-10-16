import {
  formatClock,
  formatDayHours,
  getStoreStatus,
  needsStoreClosedNotice,
} from '../storeStatus';
import { WEEKDAYS, type WeeklyStoreTimings } from '../../data/storeConfig.types';

function week(overrides: Partial<WeeklyStoreTimings> = {}): WeeklyStoreTimings {
  const base = {} as WeeklyStoreTimings;
  for (const day of WEEKDAYS) base[day] = { open: '10:00', close: '22:00', isClosed: false };
  return { ...base, ...overrides };
}

const CLOSED = { open: '10:00', close: '22:00', isClosed: true };

// 2026-09-08 is a Tuesday; 2026-09-12 a Saturday.
const tue = (h: number, m = 0) => new Date(2026, 8, 8, h, m);
const sat = (h: number, m = 0) => new Date(2026, 8, 12, h, m);

describe('getStoreStatus', () => {
  test('open during hours', () => {
    expect(getStoreStatus(week(), tue(14))).toEqual({ kind: 'open' });
  });

  test('before opening, later today', () => {
    const s = getStoreStatus(week(), tue(8, 30));
    expect(s.kind).toBe('not_yet_open');
    if (s.kind !== 'not_yet_open') return;
    expect(s.nextOpening.daysAhead).toBe(0);
    expect(s.nextOpening.minutesUntil).toBe(90);
  });

  test('shortly before opening reports minutes remaining', () => {
    const s = getStoreStatus(week(), tue(9, 30));
    expect(s.kind === 'not_yet_open' && s.nextOpening.minutesUntil).toBe(30);
  });

  test('after closing opens tomorrow', () => {
    const s = getStoreStatus(week(), tue(23, 30));
    expect(s.kind).toBe('closed');
    if (s.kind !== 'closed') return;
    expect(s.nextOpening.daysAhead).toBe(1);
    expect(s.nextOpening.at).toEqual(new Date(2026, 8, 9, 10, 0));
  });

  test('skips closed days to the next operating day, not "tomorrow"', () => {
    const s = getStoreStatus(week({ sunday: CLOSED }), sat(23));
    expect(s.kind).toBe('closed');
    if (s.kind !== 'closed') return;
    expect(s.nextOpening.daysAhead).toBe(2);
    expect(s.nextOpening.at.getDay()).toBe(1); // Monday
  });

  test('closed for several consecutive days', () => {
    const s = getStoreStatus(week({ wednesday: CLOSED, thursday: CLOSED, friday: CLOSED }), tue(23));
    expect(s.kind === 'closed' && s.nextOpening.daysAhead).toBe(4);
  });

  test('closing soon when remaining time is below fulfilment time', () => {
    const s = getStoreStatus(week(), tue(21, 45), 30);
    expect(s.kind).toBe('closing_soon');
    if (s.kind !== 'closing_soon') return;
    expect(s.closesAt).toEqual(tue(22));
    expect(s.nextOpening?.daysAhead).toBe(1);
  });

  test('not closing soon when there is enough time', () => {
    expect(getStoreStatus(week(), tue(21, 0), 30).kind).toBe('open');
  });

  test('overnight window still open after midnight', () => {
    const t = week({ monday: { open: '20:00', close: '02:00', isClosed: false } });
    expect(getStoreStatus(t, tue(0, 30)).kind).toBe('open');
  });

  test('unknown when timings are missing or the store never opens', () => {
    expect(getStoreStatus(null, tue(10)).kind).toBe('unknown');
    const allClosed = week(Object.fromEntries(WEEKDAYS.map((d) => [d, CLOSED])));
    expect(getStoreStatus(allClosed, tue(10)).kind).toBe('unknown');
  });

  test('malformed day is treated as closed, not as a bogus opening time', () => {
    const s = getStoreStatus(week({ wednesday: { open: 'xx', close: '22:00', isClosed: false } }), tue(23));
    expect(s.kind === 'closed' && s.nextOpening.daysAhead).toBe(2);
  });
});

describe('needsStoreClosedNotice', () => {
  test('only for closed-ish states', () => {
    expect(needsStoreClosedNotice({ kind: 'open' })).toBe(false);
    expect(needsStoreClosedNotice({ kind: 'unknown' })).toBe(false);
    expect(needsStoreClosedNotice(getStoreStatus(week(), tue(8)))).toBe(true);
  });
});

describe('formatting', () => {
  test('formatClock', () => {
    expect(formatClock(0)).toBe('12:00 AM');
    expect(formatClock(600)).toBe('10:00 AM');
    expect(formatClock(12 * 60 + 5)).toBe('12:05 PM');
    expect(formatClock(22 * 60)).toBe('10:00 PM');
  });

  test('formatDayHours', () => {
    expect(formatDayHours(week(), tue(8))).toEqual(['10:00 AM – 10:00 PM']);
    expect(formatDayHours(week({ tuesday: CLOSED }), tue(8))).toEqual([]);
  });
});

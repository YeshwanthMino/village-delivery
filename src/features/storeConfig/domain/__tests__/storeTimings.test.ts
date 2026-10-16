import { getDayTimings, getWeekday, hasStoreTimings, isStoreOpenAt } from '../storeTimings';
import { WEEKDAYS, type WeeklyStoreTimings } from '../../data/storeConfig.types';

function week(overrides: Partial<WeeklyStoreTimings> = {}): WeeklyStoreTimings {
  const base = {} as WeeklyStoreTimings;
  for (const day of WEEKDAYS) base[day] = { open: '07:00', close: '20:00', isClosed: false };
  return { ...base, ...overrides };
}

// 2026-09-08 is a Tuesday.
const at = (hours: number, minutes = 0) => new Date(2026, 8, 8, hours, minutes);

describe('getWeekday', () => {
  test('names the day the way the payload does', () => {
    expect(getWeekday(at(10))).toBe('tuesday');
  });
});

describe('isStoreOpenAt', () => {
  test('open inside the window', () => {
    expect(isStoreOpenAt(week(), at(10))).toBe(true);
  });

  test('closed before opening and at/after closing', () => {
    expect(isStoreOpenAt(week(), at(6, 59))).toBe(false);
    expect(isStoreOpenAt(week(), at(20, 0))).toBe(false);
    expect(isStoreOpenAt(week(), at(21))).toBe(false);
  });

  test('open exactly at the opening minute', () => {
    expect(isStoreOpenAt(week(), at(7, 0))).toBe(true);
  });

  test('a day flagged closed is closed all day', () => {
    expect(isStoreOpenAt(week({ tuesday: { open: '07:00', close: '20:00', isClosed: true } }), at(10))).toBe(false);
  });

  test('a window running past midnight stays open into the next day', () => {
    const overnight = week({
      monday: { open: '20:00', close: '02:00', isClosed: false },
      tuesday: { open: '20:00', close: '02:00', isClosed: false },
    });

    expect(isStoreOpenAt(overnight, at(1))).toBe(true);   // Monday's window
    expect(isStoreOpenAt(overnight, at(3))).toBe(false);
    expect(isStoreOpenAt(overnight, at(22))).toBe(true);  // Tuesday's own
  });

  test('yesterday closed means no spillover into today', () => {
    const overnight = week({
      monday: { open: '20:00', close: '02:00', isClosed: true },
      tuesday: { open: '20:00', close: '02:00', isClosed: false },
    });

    expect(isStoreOpenAt(overnight, at(1))).toBe(false);
  });

  test('unknown or malformed timings answer false — callers gate on hasStoreTimings', () => {
    expect(isStoreOpenAt(null, at(10))).toBe(false);
    expect(isStoreOpenAt({} as WeeklyStoreTimings, at(10))).toBe(false);
    expect(isStoreOpenAt(week({ tuesday: { open: '25:00', close: 'noon', isClosed: false } }), at(10))).toBe(false);
  });
});

describe('getDayTimings', () => {
  test("returns the given date's day", () => {
    expect(getDayTimings(week({ tuesday: { open: '08:00', close: '18:00', isClosed: false } }), at(10)))
      .toEqual({ open: '08:00', close: '18:00', isClosed: false });
  });

  test('null when timings are unknown', () => {
    expect(getDayTimings(null, at(10))).toBeNull();
  });
});

describe('hasStoreTimings', () => {
  test('true only for a full week', () => {
    expect(hasStoreTimings(week())).toBe(true);
    expect(hasStoreTimings({} as WeeklyStoreTimings)).toBe(false);
    expect(hasStoreTimings(null)).toBe(false);
  });
});

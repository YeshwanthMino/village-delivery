// src/features/location/domain/__tests__/villageSearch.test.ts

import { hasCoordinates, withCoordinates } from '../villageSearch';
import type { Village } from '../models';

const make = (id: string, latitude?: number, longitude?: number): Village => ({
  id,
  name: `Village ${id}`,
  latitude,
  longitude,
});

describe('hasCoordinates', () => {
  it('accepts a village carrying both coordinates', () => {
    expect(hasCoordinates(make('a', 13.36, 79.02))).toBe(true);
  });

  it('accepts coordinates at the origin', () => {
    // 0 is a legitimate lat/lng — a truthiness check would wrongly drop it.
    expect(hasCoordinates(make('a', 0, 0))).toBe(true);
  });

  it('rejects a village missing either coordinate', () => {
    expect(hasCoordinates(make('a'))).toBe(false);
    expect(hasCoordinates(make('a', 13.36, undefined))).toBe(false);
    expect(hasCoordinates(make('a', undefined, 79.02))).toBe(false);
  });

  it('rejects null coordinates coming from the API', () => {
    expect(hasCoordinates({ ...make('a'), latitude: null as any })).toBe(false);
  });

  it('rejects non-finite coordinates', () => {
    expect(hasCoordinates(make('a', NaN, 79.02))).toBe(false);
    expect(hasCoordinates(make('a', 13.36, Infinity))).toBe(false);
  });

  it('rejects coordinates outside the valid lat/lng range', () => {
    expect(hasCoordinates(make('a', 91, 79.02))).toBe(false);
    expect(hasCoordinates(make('a', 13.36, 181))).toBe(false);
  });
});

describe('withCoordinates', () => {
  it('keeps only the villages the map can recenter to', () => {
    const list = [make('a', 13.36, 79.02), make('b'), make('c', 12.9, 77.5)];
    expect(withCoordinates(list).map((v) => v.id)).toEqual(['a', 'c']);
  });

  it('preserves the incoming order', () => {
    const list = [make('c', 12.9, 77.5), make('a', 13.36, 79.02)];
    expect(withCoordinates(list).map((v) => v.id)).toEqual(['c', 'a']);
  });

  it('handles an empty list', () => {
    expect(withCoordinates([])).toEqual([]);
  });

  it('narrows the type so latitude/longitude are non-optional', () => {
    const [first] = withCoordinates([make('a', 13.36, 79.02)]);
    // Compiles only if the return type is narrowed — no non-null assertion here.
    const lat: number = first.latitude;
    const lng: number = first.longitude;
    expect([lat, lng]).toEqual([13.36, 79.02]);
  });
});

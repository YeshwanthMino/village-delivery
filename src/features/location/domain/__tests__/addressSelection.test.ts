// src/features/location/domain/__tests__/addressSelection.test.ts
import {
  pickDefaultAddress,
  findAddressById,
  deriveSelectedAddress,
  seedSelectedId,
} from '../addressSelection';
import type { Address } from '../models';

const make = (id: string, isDefault = false): Address => ({
  id,
  villageId: 'v1',
  villageName: 'Village',
  addressLine1: `Line ${id}`,
  tag: 'home',
  isDefault,
});

describe('pickDefaultAddress', () => {
  it('returns null when none are default', () => {
    expect(pickDefaultAddress([make('a'), make('b')])).toBeNull();
  });
  it('returns the only default', () => {
    expect(pickDefaultAddress([make('a'), make('b', true)])?.id).toBe('b');
  });
  it('returns the FIRST when multiple are default', () => {
    expect(pickDefaultAddress([make('a', true), make('b', true)])?.id).toBe('a');
  });
});

describe('findAddressById', () => {
  it('finds by id', () => {
    expect(findAddressById([make('a'), make('b')], 'b')?.id).toBe('b');
  });
  it('returns null for null id or no match', () => {
    expect(findAddressById([make('a')], null)).toBeNull();
    expect(findAddressById([make('a')], 'zzz')).toBeNull();
  });
});

describe('deriveSelectedAddress', () => {
  it('prefers the explicitly selected id', () => {
    expect(deriveSelectedAddress([make('a', true), make('b')], 'b')?.id).toBe('b');
  });
  it('falls back to the default when selected id is missing', () => {
    expect(deriveSelectedAddress([make('a', true), make('b')], 'zzz')?.id).toBe('a');
  });
  it('returns null when nothing selected and no default', () => {
    expect(deriveSelectedAddress([make('a'), make('b')], null)).toBeNull();
  });
});

describe('seedSelectedId', () => {
  it('keeps an existing selection', () => {
    expect(seedSelectedId([make('a', true)], 'x')).toBe('x');
  });
  it('seeds from the default when nothing is selected', () => {
    expect(seedSelectedId([make('a'), make('b', true)], null)).toBe('b');
  });
  it('seeds from the FIRST default when multiple defaults', () => {
    expect(seedSelectedId([make('a', true), make('b', true)], null)).toBe('a');
  });
  it('returns null when nothing selected and no default', () => {
    expect(seedSelectedId([make('a')], null)).toBeNull();
  });
});

// src/features/location/domain/__tests__/addressSelection.test.ts
import {
  findAddressById,
  deriveSelectedAddress,
  reconcileSelectedId,
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
  it('returns the explicitly selected address', () => {
    expect(deriveSelectedAddress([make('a', true), make('b')], 'b')?.id).toBe('b');
  });
  it('returns null when the selected id is missing — never falls back to default', () => {
    expect(deriveSelectedAddress([make('a', true), make('b')], 'zzz')).toBeNull();
  });
  it('returns null when nothing is selected, even if a default exists', () => {
    expect(deriveSelectedAddress([make('a', true), make('b')], null)).toBeNull();
  });
});

describe('reconcileSelectedId', () => {
  it('keeps a still-valid selection id', () => {
    expect(reconcileSelectedId([make('a'), make('b')], 'b')).toBe('b');
  });
  it('returns null when the selected id no longer exists in the list', () => {
    expect(reconcileSelectedId([make('a')], 'b')).toBeNull();
  });
  it('returns null when nothing is selected', () => {
    expect(reconcileSelectedId([make('a')], null)).toBeNull();
  });
  it('never seeds from isDefault', () => {
    expect(reconcileSelectedId([make('a', true), make('b', true)], null)).toBeNull();
  });
});

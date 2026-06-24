// src/features/location/domain/__tests__/addressSelection.test.ts
import {
  findAddressById,
  deriveSelectedAddress,
  reconcileSelectedId,
  villageFromAddress,
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

const fullAddress: Address = {
  id: 'a1',
  villageId: 'v1',
  villageName: 'Errepalli',
  storeId: 'store1',
  addressLine1: '1-127',
  pincode: '123456',
  latitude: 13.36,
  longitude: 79.02,
  tag: 'home',
  isDefault: true,
};

describe('villageFromAddress', () => {
  it('builds a Village carrying name, storeId, coords, pincode', () => {
    expect(villageFromAddress(fullAddress)).toEqual({
      id: 'v1',
      name: 'Errepalli',
      storeId: 'store1',
      pincode: '123456',
      latitude: 13.36,
      longitude: 79.02,
    });
  });

  it('returns null when the address has no storeId', () => {
    expect(villageFromAddress({ ...fullAddress, storeId: undefined })).toBeNull();
  });

  it('falls back to storeId for the village id when villageId is empty', () => {
    expect(villageFromAddress({ ...fullAddress, villageId: '' })?.id).toBe('store1');
  });
});

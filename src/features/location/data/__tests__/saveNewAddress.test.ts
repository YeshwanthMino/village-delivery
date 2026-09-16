// src/features/location/data/__tests__/saveNewAddress.test.ts
import { saveNewAddress, updateExistingAddress } from '../saveNewAddress';
import type { CreateAddressInput } from '../locationApi';
import type { Address } from '../../domain/models';

const input: CreateAddressInput = {
  villageId: 'v1',
  addressLine1: '12 Main St',
  isDefault: true,
  tag: 'home',
  mobileNumber: '9999999999',
};

const created: Address = {
  id: 'new1',
  villageId: 'v1',
  villageName: 'Village',
  addressLine1: '12 Main St',
  tag: 'home',
  isDefault: true,
};

const fresh: Address[] = [created];

it('creates, selects, refreshes, and returns the created address in order', async () => {
  const calls: string[] = [];
  const setSelected = jest.fn(async () => { calls.push('setSelected'); });
  const setSaved = jest.fn(() => { calls.push('setSaved'); });

  const result = await saveNewAddress(input, {
    create: jest.fn(async () => { calls.push('create'); return created; }),
    list: jest.fn(async () => { calls.push('list'); return fresh; }),
    setSelected,
    setSaved,
  });

  expect(result).toBe(created);
  expect(calls).toEqual(['create', 'setSelected', 'list', 'setSaved']);
  expect(setSelected).toHaveBeenCalledWith(created);
  expect(setSaved).toHaveBeenCalledWith(fresh);
});

it('propagates a create error and does not refresh', async () => {
  const setSaved = jest.fn();
  await expect(
    saveNewAddress(input, {
      create: jest.fn(async () => { throw new Error('boom'); }),
      list: jest.fn(async () => []),
      setSelected: jest.fn(),
      setSaved,
    }),
  ).rejects.toThrow('boom');
  expect(setSaved).not.toHaveBeenCalled();
});

const updated: Address = {
  id: 'new1',
  villageId: 'v1',
  villageName: 'Village',
  addressLine1: '99 New St',
  tag: 'home',
  isDefault: true,
};

it('updates, selects, refreshes, and returns the updated address in order', async () => {
  const calls: string[] = [];
  const setSelected = jest.fn(async () => { calls.push('setSelected'); });
  const setSaved = jest.fn(() => { calls.push('setSaved'); });

  const result = await updateExistingAddress('new1', input, {
    update: jest.fn(async () => { calls.push('update'); return updated; }),
    list: jest.fn(async () => { calls.push('list'); return [updated]; }),
    setSelected,
    setSaved,
  });

  expect(result).toBe(updated);
  expect(calls).toEqual(['update', 'setSelected', 'list', 'setSaved']);
  expect(setSelected).toHaveBeenCalledWith(updated);
  expect(setSaved).toHaveBeenCalledWith([updated]);
});

it('propagates an update error and does not refresh', async () => {
  const setSaved = jest.fn();
  await expect(
    updateExistingAddress('new1', input, {
      update: jest.fn(async () => { throw new Error('boom'); }),
      list: jest.fn(async () => []),
      setSelected: jest.fn(),
      setSaved,
    }),
  ).rejects.toThrow('boom');
  expect(setSaved).not.toHaveBeenCalled();
});

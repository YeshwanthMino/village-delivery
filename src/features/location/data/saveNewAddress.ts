// src/features/location/data/saveNewAddress.ts
//
// Pure orchestration for saving a new delivery address: create it, make it the
// selected address, then refresh the saved list. Dependencies are injected so
// the sequence is testable without IO.

import type { Address } from '../domain/models';
import type { CreateAddressInput } from './locationApi';

export interface SaveNewAddressDeps {
  create: (input: CreateAddressInput) => Promise<Address>;
  list: () => Promise<Address[]>;
  setSelected: (address: Address) => void | Promise<void>;
  setSaved: (addresses: Address[]) => void;
}

/** Persist + select + refresh. Returns the created address. */
export async function saveNewAddress(
  input: CreateAddressInput,
  deps: SaveNewAddressDeps,
): Promise<Address> {
  const created = await deps.create(input);
  await deps.setSelected(created);
  const fresh = await deps.list();
  deps.setSaved(fresh);
  return created;
}

export interface UpdateAddressDeps {
  update: (id: string, input: CreateAddressInput) => Promise<Address>;
  list: () => Promise<Address[]>;
  setSelected: (address: Address) => void | Promise<void>;
  setSaved: (addresses: Address[]) => void;
}

/** Update + select + refresh. Returns the updated address. */
export async function updateExistingAddress(
  id: string,
  input: CreateAddressInput,
  deps: UpdateAddressDeps,
): Promise<Address> {
  const updated = await deps.update(id, input);
  await deps.setSelected(updated);
  const fresh = await deps.list();
  deps.setSaved(fresh);
  return updated;
}

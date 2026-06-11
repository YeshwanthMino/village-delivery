// src/features/location/data/AddressRepository.ts

import { Address } from '../domain/models';
import {
  CreateAddressInput,
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from './locationApi';

export interface AddressRepository {
  list(): Promise<Address[]>;
  create(input: CreateAddressInput): Promise<Address>;
  update(id: string, input: CreateAddressInput): Promise<Address>;
  remove(id: string): Promise<void>;
  makeDefault(id: string, input: CreateAddressInput): Promise<Address>;
}

/** Hits the real /address endpoints. Requires a bearer token (authed users). */
export const RemoteAddressRepository: AddressRepository = {
  list: listAddresses,
  create: createAddress,
  update: updateAddress,
  remove: deleteAddress,
  makeDefault: setDefaultAddress,
};

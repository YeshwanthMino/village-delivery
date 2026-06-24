// src/features/location/data/__tests__/mappers.test.ts
import { mapAddress } from '../mappers';

// Shape returned by GET /app/address (village nested under `villageId`).
const apiAddress = {
  _id: '6a37e5e544c38d7d5d569e86',
  storeId: '68989c821388764b3a92f0dd',
  label: 'Home',
  addressLine: '1-127, near post office',
  isDefault: true,
  location: { latitude: 13.360002, longitude: 79.028059 },
  villageId: {
    _id: '691860854a92a246c6456b98',
    title: 'Errepalli (Diguva HW)',
    storeId: '68989c821388764b3a92f0dd',
    pincode: '123456',
    defaultLocation: { latitude: 13.3599, longitude: 79.0282 },
  },
};

it('maps the nested villageId API shape into an Address', () => {
  const a = mapAddress(apiAddress);
  expect(a.id).toBe('6a37e5e544c38d7d5d569e86');
  expect(a.villageId).toBe('691860854a92a246c6456b98');
  expect(a.villageName).toBe('Errepalli (Diguva HW)');
  expect(a.storeId).toBe('68989c821388764b3a92f0dd');
  expect(a.addressLine1).toBe('1-127, near post office');
  expect(a.latitude).toBe(13.360002);
  expect(a.longitude).toBe(79.028059);
  expect(a.pincode).toBe('123456');
  expect(a.tag).toBe('home');
  expect(a.isDefault).toBe(true);
});

it('falls back to defaultLocation coords when no address location is present', () => {
  const a = mapAddress({ ...apiAddress, location: undefined });
  expect(a.latitude).toBe(13.3599);
  expect(a.longitude).toBe(79.0282);
});

it('still parses the legacy flat/village-key shape', () => {
  const a = mapAddress({
    _id: 'x1',
    villageId: 'v9',
    village: { name: 'Old Village' },
    addressLine1: '5 Old Rd',
    latitude: 1,
    longitude: 2,
    label: 'Work',
  });
  expect(a.id).toBe('x1');
  expect(a.villageId).toBe('v9');
  expect(a.villageName).toBe('Old Village');
  expect(a.storeId).toBeUndefined();
  expect(a.latitude).toBe(1);
  expect(a.tag).toBe('work');
});

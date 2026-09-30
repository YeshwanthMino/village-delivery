// src/features/location/data/__tests__/mappers.test.ts
import { mapAddress, mapVillage, mapVillageList } from '../mappers';

// Shape returned by GET /app/addresses (village nested under `villageId`).
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

it('reads a nested village ID rather than using the same object string for every location', () => {
  expect(mapVillage({
    title: 'Mittoor',
    villageId: { _id: 'v2', storeId: 's1', defaultLocation: { latitude: 13, longitude: 79 } },
  })).toMatchObject({ id: 'v2', name: 'Mittoor', storeId: 's1', latitude: 13, longitude: 79 });
});

// Shape returned by GET /app/villages?search=… (array of village objects).
const apiVillage = {
  _id: '691860854a92a246c6456b98',
  title: 'Mittoor',
  storeId: '68989c821388764b3a92f0dd',
  branchId: '6aaf533997eadd21dfbf4325',
  pincode: '517001',
  defaultLocation: { latitude: 13.36, longitude: 79.02 },
};

describe('mapVillageList', () => {
  it('maps a bare array of villages', () => {
    const out = mapVillageList([apiVillage]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: '691860854a92a246c6456b98',
      name: 'Mittoor',
      storeId: '68989c821388764b3a92f0dd',
      branchId: '6aaf533997eadd21dfbf4325',
      pincode: '517001',
      latitude: 13.36,
      longitude: 79.02,
    });
  });

  it('unwraps the { villages: [...], count } search envelope', () => {
    const out = mapVillageList({ villages: [apiVillage], count: 1 });
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Mittoor');
  });

  it('maps a real /app/villages village (defaultLocation → lat/lng)', () => {
    const out = mapVillageList({
      villages: [
        {
          _id: '691860854a92a246c6456b98',
          title: 'Errepalli (Diguva HW)',
          storeId: '68989c821388764b3a92f0dd',
          pincode: '123456',
          defaultLocation: { latitude: 13.360026, longitude: 79.028338 },
        },
      ],
      count: 1,
    });
    expect(out[0]).toMatchObject({
      id: '691860854a92a246c6456b98',
      name: 'Errepalli (Diguva HW)',
      storeId: '68989c821388764b3a92f0dd',
      pincode: '123456',
      latitude: 13.360026,
      longitude: 79.028338,
    });
  });

  it('unwraps a { data: [...] } envelope', () => {
    expect(mapVillageList({ data: [apiVillage] })).toHaveLength(1);
  });

  it('unwraps items / results envelopes', () => {
    expect(mapVillageList({ items: [apiVillage] })).toHaveLength(1);
    expect(mapVillageList({ results: [apiVillage] })).toHaveLength(1);
  });

  it('returns [] for empty or garbage input', () => {
    expect(mapVillageList([])).toEqual([]);
    expect(mapVillageList(null)).toEqual([]);
    expect(mapVillageList({ nope: true })).toEqual([]);
  });

  it('drops elements that map to null', () => {
    expect(mapVillageList([{ foo: 'bar' }, apiVillage])).toHaveLength(1);
  });
});

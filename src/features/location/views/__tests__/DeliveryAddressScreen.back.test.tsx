import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { DeliveryAddressScreen } from '../DeliveryAddressScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
let mockParams: Record<string, string> = {};
const address = { id: 'a1', addressLine1: '1 Main Street', villageName: 'Village', tag: 'home' };
const mockSelectAddress = jest.fn();
const mockState = { savedAddresses: [] as typeof address[], selectedAddressId: null, setSelectedAddress: mockSelectAddress, setSavedAddresses: jest.fn() };
const mockVm = {
  map: {
    region: { latitude: 12, longitude: 78, latitudeDelta: 0.01, longitudeDelta: 0.01 },
    pinState: 'serviceable', primary: 'Village', secondary: null,
    initialDetect: jest.fn(), moveTo: jest.fn(), onRegionMoving: jest.fn(), onRegionSettled: jest.fn(),
    useCurrentLocation: jest.fn(), isCurrentPin: () => true, detectingGps: false, blocked: false,
  },
  saving: false, canSave: true, editingId: null as string | null, error: null,
  addressLine1: '1 Main Street', landmark: '', tag: 'home', isDefault: false,
  setAddressLine1: jest.fn(), setLandmark: jest.fn(), setTag: jest.fn(), setIsDefault: jest.fn(),
  beginEdit: jest.fn(), reset: jest.fn(), save: jest.fn(),
};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
}));
jest.mock('@/src/core/store/useLocationStore', () => ({ useLocationStore: (select: any) => select(mockState) }));
jest.mock('../../viewmodel/useAddAddressViewModel', () => ({ useAddAddressViewModel: () => mockVm }));
jest.mock('../../data/locationApi', () => ({ deleteAddress: jest.fn() }));
jest.mock('react-native-maps', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  const Map = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn() }));
    return <View testID="map" {...props} />;
  });
  Map.displayName = 'MockMap';
  return { __esModule: true, default: Map, PROVIDER_GOOGLE: 'google' };
});

let systemBack!: () => boolean | null | undefined;
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks();
  mockParams = {}; mockCanGoBack = true;
  mockState.savedAddresses = [];
  mockVm.saving = false; mockVm.editingId = null;
  mockSelectAddress.mockResolvedValue(undefined);
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, callback) => {
    systemBack = callback;
    return { remove: jest.fn() };
  });
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

const nextBack = () => act(() => { jest.advanceTimersByTime(350); systemBack(); });

it('leaves an initial empty-address map without inserting an empty list step', () => {
  render(<DeliveryAddressScreen />);
  fireEvent.press(screen.getByLabelText('Back'));
  act(() => { systemBack(); });
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('map')).not.toBeNull();
});

it.each([['', '/cart'], ['1', '/(dashboard)/profile']])('returns manage=%s to the correct source without history', (manage, fallback) => {
  mockCanGoBack = false; mockParams = { manage };
  render(<DeliveryAddressScreen />);
  act(() => { systemBack(); });
  expect(mockBack).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith(fallback);
});

it('backs through details, map, and the existing address list without discarding details early', () => {
  mockState.savedAddresses = [address];
  render(<DeliveryAddressScreen />);
  fireEvent.press(screen.getByText('Add New Address'));
  fireEvent.press(screen.getByText('Confirm location'));
  expect(screen.getByDisplayValue('1 Main Street')).toBeTruthy();
  act(() => { systemBack(); });
  expect(screen.queryByDisplayValue('1 Main Street')).toBeNull();
  expect(screen.getByTestId('map')).toBeTruthy();
  expect(mockVm.reset).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Back')); // second rapid tap must not skip the map
  expect(screen.getByTestId('map')).toBeTruthy();
  nextBack();
  expect(screen.queryByTestId('map')).toBeNull();
  expect(mockVm.reset).toHaveBeenCalledTimes(1);
  expect(mockBack).not.toHaveBeenCalled();
  nextBack();
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it('keeps the form open while an address save is in flight', () => {
  const view = render(<DeliveryAddressScreen />);
  fireEvent.press(screen.getByText('Confirm location'));
  mockVm.saving = true; view.rerender(<DeliveryAddressScreen />);
  act(() => { systemBack(); });
  expect(screen.getByDisplayValue('1 Main Street')).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
  expect(mockVm.reset).not.toHaveBeenCalled();
});

it('does not navigate again when a selection finishes after Back', async () => {
  let finish!: () => void;
  mockSelectAddress.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  mockState.savedAddresses = [address];
  render(<DeliveryAddressScreen />);
  await act(async () => { fireEvent.press(screen.getByText('1 Main Street, Village')); });
  act(() => { systemBack(); });
  await act(async () => { finish(); });
  expect(mockBack).toHaveBeenCalledTimes(1);
});

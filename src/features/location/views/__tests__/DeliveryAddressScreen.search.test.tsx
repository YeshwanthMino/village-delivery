// A village picked in the search screen must move the Add Address camera to it.

import React from 'react';
import { render, act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DeliveryAddressScreen } from '../DeliveryAddressScreen';
import { MapPickerScreen } from '../MapPickerScreen';
import { LocationService } from '../../data/LocationService';
import { findByLocation } from '../../data/locationApi';
import { useLocationStore } from '@/src/core/store/useLocationStore';

const mockAnimate = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
let mockParams: Record<string, string> = {};
let mockFocused = true;

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: (...a: unknown[]) => mockAnimate(...a) }));
    return <View testID="map" {...props} />;
  });
  MapView.displayName = 'MockMapView';
  return { __esModule: true, default: MapView, PROVIDER_GOOGLE: 'google' };
});

describe.each([['delivery address', DeliveryAddressScreen], ['map picker', MapPickerScreen]] as const)('%s map events', (_name, Component) => {
  it('ignores programmatic events and resolves the first real drag even if the camera emitted no event', async () => {
    render(<Component />);
    await flush();
    const before = find.mock.calls.length;
    const region = { latitude: 12, longitude: 78, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    fireEvent(screen.getByTestId('map'), 'regionChangeComplete', region, { isGesture: false });
    expect(find).toHaveBeenCalledTimes(before);
    fireEvent(screen.getByTestId('map'), 'regionChange', region, { isGesture: true });
    fireEvent(screen.getByTestId('map'), 'regionChangeComplete', region, { isGesture: true });
    await waitFor(() => expect(find).toHaveBeenCalledTimes(before + 1));
    expect(find).toHaveBeenLastCalledWith({ latitude: 12, longitude: 78 }, expect.anything());
  });
});

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb, [cb]),
  useRouter: () => ({ push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), replace: (...a: unknown[]) => mockReplace(...a), dismissTo: (...a: unknown[]) => mockDismissTo(...a), canGoBack: () => true }),
}));
jest.mock('@/src/shared/hooks/useScreenActive', () => ({ useScreenFocused: () => mockFocused }));

jest.mock('../../data/LocationService', () => ({
  LocationService: {
    getPermissionState: jest.fn(),
    requestPermission: jest.fn(),
    getCurrentPosition: jest.fn(),
  },
}));
jest.mock('../../data/locationApi', () => ({
  findByLocation: jest.fn(),
  deleteAddress: jest.fn(),
  createAddress: jest.fn(),
  listAddresses: jest.fn(),
  updateAddress: jest.fn(),
}));

const svc = LocationService as jest.Mocked<typeof LocationService>;
const find = findByLocation as jest.Mock;

const flush = () => act(async () => { await new Promise((r) => setImmediate(r)); });
const lastAnimateCoords = () => {
  const call = mockAnimate.mock.calls[mockAnimate.mock.calls.length - 1];
  return call && { latitude: call[0].latitude, longitude: call[0].longitude };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockFocused = true;
  svc.getPermissionState.mockResolvedValue('granted');
  svc.requestPermission.mockResolvedValue({ granted: true, canAskAgain: true });
  svc.getCurrentPosition.mockResolvedValue({ latitude: 37.42, longitude: -122.08 });
  find.mockResolvedValue({ serviceable: false, village: null });
});

it.each([['delivery address', DeliveryAddressScreen], ['map picker', MapPickerScreen]] as const)(
  '%s waits for focus before requesting iOS location permission',
  async (_name, Component) => {
    useLocationStore.setState({ savedAddresses: [] });
    mockFocused = false;
    const view = render(<Component />);
    await flush();
    expect(svc.requestPermission).not.toHaveBeenCalled();

    mockFocused = true;
    view.rerender(<Component />);
    await flush();
    expect(svc.requestPermission).toHaveBeenCalledTimes(1);

    view.rerender(<Component />);
    await flush();
    expect(svc.requestPermission).toHaveBeenCalledTimes(1);
  },
);

describe('DeliveryAddressScreen village search', () => {
  it('opens the search screen asking to return to Add Address', async () => {
    render(<DeliveryAddressScreen />);
    await flush();
    fireEvent.press(screen.getByLabelText('Search location'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/location/search', params: { returnTo: '/address/add' } });
  });

  it('moves the camera to a village picked after the screen is already showing', async () => {
    const view = render(<DeliveryAddressScreen />);
    await flush(); // GPS fix lands, camera at the Googleplex
    expect(lastAnimateCoords()).toEqual({ latitude: 37.42, longitude: -122.08 });

    mockParams = { lat: '13.36', lng: '79.02', at: '1' };
    view.rerender(<DeliveryAddressScreen />);
    await flush();

    expect(lastAnimateCoords()).toEqual({ latitude: 13.36, longitude: 79.02 });
  });

  it('keeps the picked village when the GPS fix arrives after the pick', async () => {
    let resolveFix!: (v: { latitude: number; longitude: number }) => void;
    svc.getCurrentPosition.mockReturnValue(new Promise((r) => { resolveFix = r; }));

    const view = render(<DeliveryAddressScreen />);
    await flush();
    mockParams = { lat: '13.36', lng: '79.02', at: '1' };
    view.rerender(<DeliveryAddressScreen />);
    await flush();
    expect(lastAnimateCoords()).toEqual({ latitude: 13.36, longitude: 79.02 });

    resolveFix({ latitude: 37.42, longitude: -122.08 }); // slow GPS, too late
    await flush();

    expect(lastAnimateCoords()).toEqual({ latitude: 13.36, longitude: 79.02 });
  });
});

it('commits and navigates once when map Confirm is tapped repeatedly during persistence', async () => {
  let finish!: () => void;
  const commit = jest.spyOn(useLocationStore.getState(), 'setServiceable').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const recent = jest.spyOn(useLocationStore.getState(), 'addRecent').mockResolvedValue();
  find.mockResolvedValue({ serviceable: true, village: { id: 'v1', name: 'Picked village', storeId: 's1' } });
  const view = render(<MapPickerScreen />);
  try {
    await flush();
    await act(async () => {
      fireEvent.press(screen.getByText('Confirm & Continue'));
      fireEvent.press(screen.getByText('Confirm & Continue'));
      fireEvent.press(screen.getByText('Confirm & Continue'));
    });
    expect(commit).toHaveBeenCalledTimes(1);
    expect(mockDismissTo).not.toHaveBeenCalled();
    await act(async () => finish());
    expect(recent).toHaveBeenCalledTimes(1);
    expect(mockDismissTo).toHaveBeenCalledTimes(1);
    expect(mockDismissTo).toHaveBeenCalledWith('/(dashboard)/home');
  } finally {
    view.unmount(); commit.mockRestore(); recent.mockRestore();
  }
});

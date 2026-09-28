// A village picked in the search screen must move the Add Address camera to it.

import React from 'react';
import { render, act, fireEvent, screen } from '@testing-library/react-native';
import { DeliveryAddressScreen } from '../DeliveryAddressScreen';
import { LocationService } from '../../data/LocationService';
import { findByLocation } from '../../data/locationApi';

const mockAnimate = jest.fn();
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: (...a: unknown[]) => mockAnimate(...a) }));
    return <View testID="map" {...props} />;
  });
  return { __esModule: true, default: MapView, PROVIDER_GOOGLE: 'google' };
});

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb, [cb]),
  useRouter: () => ({ push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

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
  svc.getPermissionState.mockResolvedValue('granted');
  svc.getCurrentPosition.mockResolvedValue({ latitude: 37.42, longitude: -122.08 });
  find.mockResolvedValue({ serviceable: false, village: null });
});

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

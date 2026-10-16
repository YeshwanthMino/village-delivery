import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Modal, Platform } from 'react-native';
import { VillageBottomSheet } from '@/src/shared/components/VillageBottomSheet';
import { LocationPermissionSheet } from '../LocationPermissionSheet';
import { LocationSheet } from '../LocationSheet';

const mockRouter = { push: jest.fn() };
let mockFocused = true;
const mockVm = {
  permission: 'denied', blocked: true, lastError: null, detecting: false,
  village: null, recentLocations: [],
  detectCurrentLocation: jest.fn(), selectAddress: jest.fn(), selectRecent: jest.fn(),
  dismissBlocked: jest.fn(), openSettings: jest.fn(),
};

jest.mock('@/src/shared/hooks/useScreenActive', () => ({ useScreenFocused: () => mockFocused }));
jest.mock('@/src/shared/components', () => ({
  VillageBottomSheet: jest.requireActual('@/src/shared/components/VillageBottomSheet').VillageBottomSheet,
}));
jest.mock('@/src/shared/hooks/useGuardedRouter', () => ({ useGuardedRouter: () => mockRouter }));
jest.mock('@/src/core/utils/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('../../viewmodel/useLocationViewModel', () => ({ useLocationViewModel: () => mockVm }));
jest.mock('../../viewmodel/useAddressBookViewModel', () => ({
  useAddressBookViewModel: () => ({ isAuthenticated: false, addresses: [] }),
}));
jest.mock('react-native-gesture-handler', () => ({
  ...jest.requireActual('react-native-gesture-handler'),
  GestureHandlerRootView: jest.requireActual('react-native').View,
}));

const originalOS = Platform.OS;
beforeEach(() => { jest.clearAllMocks(); mockVm.blocked = true; mockFocused = true; });
afterEach(() => { Platform.OS = originalOS; jest.restoreAllMocks(); });

it.each(['ios', 'android'] as const)('uses one %s modal through blocked, picker, and closed states', (os) => {
  Platform.OS = os;
  const close = jest.fn();
  const view = (visible: boolean) => <LocationSheet visible={visible} onClose={close} />;
  const screen = render(view(true));
  expect(screen.UNSAFE_getAllByType(Modal)).toHaveLength(1);
  const host = screen.UNSAFE_getByType(Modal);
  expect(screen.getByText('perm_blocked_title')).toBeTruthy();
  expect(screen.queryByText('change_delivery_location')).toBeNull();

  const clock = jest.spyOn(Date, 'now').mockReturnValue(1000);
  act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());
  expect(mockVm.dismissBlocked).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();

  mockVm.blocked = false;
  screen.rerender(view(true));
  expect(screen.UNSAFE_getByType(Modal)).toBe(host);
  expect(screen.getByText('change_delivery_location')).toBeTruthy();
  clock.mockReturnValue(1400); // a deliberate second Back after the rapid-tap guard
  act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());
  expect(close).toHaveBeenCalledTimes(1);

  screen.rerender(view(false));
  expect(host.props.visible).toBe(false);
  expect(screen.queryByText('change_delivery_location')).toBeNull();
  expect(screen.UNSAFE_getAllByType(Modal)).toHaveLength(1);
  if (os === 'ios') act(() => host.props.onDismiss());
  screen.rerender(view(true));
  expect(screen.getByText('change_delivery_location')).toBeTruthy();
});

it('lets a forced location picker dismiss its blocked prompt by Back or sheet gesture', () => {
  const close = jest.fn();
  const screen = render(<LocationPermissionSheet visible onClose={close} dismissable={false} />);
  expect(screen.UNSAFE_getAllByType(Modal)).toHaveLength(1);
  let sheet = screen.UNSAFE_getByType(VillageBottomSheet);
  expect(sheet.props.dismissable).toBe(true);
  const clock = jest.spyOn(Date, 'now').mockReturnValue(1000);
  act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());
  act(() => sheet.props.onClose()); // outside tap or completed swipe
  expect(mockVm.dismissBlocked).toHaveBeenCalledTimes(2);
  expect(close).not.toHaveBeenCalled();

  mockVm.blocked = false;
  screen.rerender(<LocationPermissionSheet visible onClose={close} dismissable={false} />);
  sheet = screen.UNSAFE_getByType(VillageBottomSheet);
  expect(sheet.props.dismissable).toBe(false);
  clock.mockReturnValue(1400);
  act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByText('search_your_location')).toBeTruthy();
});

it('closes the owning location sheet on blur even when blocked guidance handles ordinary dismissal', () => {
  function Screen() {
    const [visible, setVisible] = React.useState(true);
    return <LocationSheet visible={visible} onClose={() => setVisible(false)} />;
  }
  const screen = render(<Screen />);
  expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(true);
  mockFocused = false;
  screen.rerender(<Screen />);
  expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
  expect(mockVm.dismissBlocked).not.toHaveBeenCalled();
  mockFocused = true;
  screen.rerender(<Screen />);
  expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
});

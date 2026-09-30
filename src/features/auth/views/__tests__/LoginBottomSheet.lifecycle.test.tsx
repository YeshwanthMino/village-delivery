import React from 'react';
import { act, render } from '@testing-library/react-native';
import { LoginBottomSheet } from '../LoginBottomSheet';

let mockPhone: any;
let mockOtp: any;
let mockSuccess: any;
let mockSheet: any;
let mockSignup: any;
let mockFocused = true;
const mockRequestOtp = jest.fn();
const mockVerifyOtp = jest.fn();
jest.mock('@/src/core/store/useAuthStore', () => ({
  useAuthStore: (select: any) => select({ requestOtp: mockRequestOtp, verifyOtp: mockVerifyOtp, signupUser: jest.fn() }),
}));
jest.mock('@/src/shared/hooks/useScreenActive', () => ({ useScreenFocused: () => mockFocused }));
jest.mock('@/src/shared/components/VillageBottomSheet', () => ({ VillageBottomSheet: (props: any) => { mockSheet = props; return props.children; } }));
jest.mock('../login-sheet/PhoneStep', () => ({ PhoneStep: (props: any) => { mockPhone = props; return null; } }));
jest.mock('../login-sheet/OtpStep', () => ({ OtpStep: (props: any) => { mockOtp = props; return null; } }));
jest.mock('../login-sheet/SignupStep', () => ({ SignupStep: (props: any) => { mockSignup = props; return null; } }));
jest.mock('../login-sheet/PlacingStep', () => ({ PlacingStep: () => null }));
jest.mock('../login-sheet/PlacingErrorStep', () => ({ PlacingErrorStep: () => null }));
jest.mock('../login-sheet/SuccessStep', () => ({ SuccessStep: (props: any) => { mockSuccess = props; return null; } }));

beforeEach(() => {
  jest.useFakeTimers();
  mockPhone = mockOtp = mockSuccess = mockSignup = mockSheet = undefined;
  mockFocused = true;
  mockRequestOtp.mockReset();
  mockVerifyOtp.mockReset();
});
afterEach(() => jest.useRealTimers());

it('does not advance a reopened sheet when an old OTP request completes', async () => {
  let finish!: () => void;
  mockRequestOtp.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  const view = (visible: boolean) => <LoginBottomSheet visible={visible} onClose={jest.fn()} onComplete={jest.fn()} />;
  const { rerender } = render(view(true));
  act(() => mockPhone.setPhone('9876543210'));
  let request!: Promise<void>;
  act(() => { request = mockPhone.onSubmit(); });
  rerender(view(false));
  rerender(view(true));
  expect(mockSheet.visible).toBe(false);
  act(() => mockSheet.onDismiss());
  expect(mockSheet.visible).toBe(true);
  await act(async () => { finish(); await request; });
  expect(mockOtp).toBeUndefined();
  expect(mockPhone.busy).toBe(false);
});

it('keeps the native host hidden until dismissal completes, then reports the handoff', () => {
  const dismissed = jest.fn();
  const view = (visible: boolean) => <LoginBottomSheet visible={visible} onClose={jest.fn()} onComplete={jest.fn()} onDismiss={dismissed} />;
  const { rerender } = render(view(true));
  rerender(view(false));
  rerender(view(true));
  expect(mockSheet.visible).toBe(false);
  expect(dismissed).not.toHaveBeenCalled();
  act(() => mockSheet.onDismiss());
  expect(dismissed).toHaveBeenCalledTimes(1);
  expect(mockSheet.visible).toBe(true);
});

it('does not place an order when verification finishes after dismissal', async () => {
  mockRequestOtp.mockResolvedValue(undefined);
  let finish!: (value: string) => void;
  mockVerifyOtp.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const place = jest.fn();
  const complete = jest.fn();
  const view = (visible: boolean) => <LoginBottomSheet visible={visible} onClose={jest.fn()} onComplete={complete} onPlaceOrder={place} />;
  const { rerender } = render(view(true));
  act(() => mockPhone.setPhone('9876543210'));
  await act(async () => { await mockPhone.onSubmit(); });
  let request!: Promise<void>;
  act(() => { request = mockOtp.onVerified('123456'); });
  rerender(view(false));
  await act(async () => { finish('ok'); await request; });
  expect(place).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();
});

it('clears the order animation delay when the sheet unmounts', async () => {
  let finish!: () => void;
  const place = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const { unmount } = render(<LoginBottomSheet visible initialStep="placing" onClose={jest.fn()} onComplete={jest.fn()} onPlaceOrder={place} />);
  expect(jest.getTimerCount()).toBe(1);
  unmount();
  expect(jest.getTimerCount()).toBe(0);
  await act(async () => { finish(); });
  expect(mockSuccess).toBeUndefined();
  expect(place).toHaveBeenCalledTimes(1);
});

it('dismisses the screen flag on blur so returning cannot submit the same checkout twice', () => {
  const place = jest.fn(() => new Promise<void>(() => {}));
  function Screen() {
    const [visible, setVisible] = React.useState(true);
    return <LoginBottomSheet visible={visible} initialStep="placing" onClose={() => setVisible(false)} onComplete={jest.fn()} onPlaceOrder={place} />;
  }
  const { rerender } = render(<Screen />);
  mockFocused = false;
  rerender(<Screen />);
  expect(jest.getTimerCount()).toBe(0);
  mockFocused = true;
  rerender(<Screen />);
  expect(place).toHaveBeenCalledTimes(1);
});

it('supports modal Back on the phone step even though swipe dismissal is disabled', () => {
  const close = jest.fn();
  render(<LoginBottomSheet visible onClose={close} onComplete={jest.fn()} />);
  expect(mockSheet.dismissable).toBe(false);
  act(() => mockSheet.onBack());
  expect(close).toHaveBeenCalledTimes(1);
});

it('moves OTP Back to the phone step and ignores a verification completing afterward', async () => {
  mockRequestOtp.mockResolvedValue(undefined);
  let finish!: (value: string) => void;
  mockVerifyOtp.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const place = jest.fn();
  const close = jest.fn();
  render(<LoginBottomSheet visible onClose={close} onComplete={jest.fn()} onPlaceOrder={place} />);
  act(() => mockPhone.setPhone('9876543210'));
  await act(async () => mockPhone.onSubmit());
  let request!: Promise<void>;
  act(() => { request = mockOtp.onVerified('123456'); });
  act(() => mockSheet.onBack());
  expect(mockPhone.phone).toBe('9876543210');
  await act(async () => { finish('ok'); await request; });
  expect(place).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
});

it('goes from signup to OTP, then phone, without skipping steps on rapid Back events', async () => {
  mockRequestOtp.mockResolvedValue(undefined);
  mockVerifyOtp.mockResolvedValue('new_user');
  const close = jest.fn();
  render(<LoginBottomSheet visible onClose={close} onComplete={jest.fn()} />);
  act(() => mockPhone.setPhone('9876543210'));
  await act(async () => mockPhone.onSubmit());
  await act(async () => mockOtp.onVerified('123456'));
  expect(mockSignup.phone).toBe('9876543210');
  mockPhone = undefined;
  act(() => mockSheet.onBack());
  act(() => mockOtp.onBack());
  expect(mockPhone).toBeUndefined();
  act(() => { jest.advanceTimersByTime(350); mockSheet.onBack(); });
  expect(mockPhone.phone).toBe('9876543210');
  expect(close).not.toHaveBeenCalled();
});

it('keeps an in-flight order open, then completes success only once for Back and the success timer', async () => {
  const complete = jest.fn();
  const close = jest.fn();
  const place = jest.fn().mockResolvedValue(undefined);
  render(<LoginBottomSheet visible initialStep="placing" onClose={close} onComplete={complete} onPlaceOrder={place} />);
  act(() => mockSheet.onBack());
  expect(close).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(1200); });
  act(() => { mockSheet.onBack(); mockSuccess.onDone(); });
  expect(complete).toHaveBeenCalledTimes(1);
  expect(place).toHaveBeenCalledTimes(1);
});

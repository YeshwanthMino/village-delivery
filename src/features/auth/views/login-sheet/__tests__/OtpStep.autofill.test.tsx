import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { OtpStep } from '../OtpStep';

const props = {
  phone: '9876543210',
  onBack: jest.fn(),
  onVerified: jest.fn(),
  onRetryStart: jest.fn(),
  onResend: jest.fn(async () => true),
  resending: false,
  verifying: false,
  error: null,
};

beforeEach(() => { jest.useFakeTimers(); props.onVerified.mockClear(); });
afterEach(() => jest.useRealTimers());

it('distributes an iOS SMS AutoFill code and verifies the complete value once', () => {
  const { UNSAFE_getAllByType } = render(<OtpStep {...props} />);
  const boxes = UNSAFE_getAllByType(TextInput);
  expect(boxes[0].props.maxLength).toBe(6);
  fireEvent.changeText(boxes[0], '123456');
  expect(UNSAFE_getAllByType(TextInput).map(box => box.props.value)).toEqual(['1', '2', '3', '4', '5', '6']);
  expect(props.onVerified).toHaveBeenCalledTimes(1);
  expect(props.onVerified).toHaveBeenCalledWith('123456');
});

it('accepts a full pasted code from any focused box and keeps manual entry working', () => {
  const { UNSAFE_getAllByType } = render(<OtpStep {...props} />);
  let boxes = UNSAFE_getAllByType(TextInput);
  fireEvent.changeText(boxes[0], '1');
  fireEvent.changeText(boxes[1], '2');
  boxes = UNSAFE_getAllByType(TextInput);
  expect(boxes.slice(0, 2).map(box => box.props.value)).toEqual(['1', '2']);
  fireEvent.changeText(boxes[2], ' 9 8 7 6 5 4 ');
  expect(UNSAFE_getAllByType(TextInput).map(box => box.props.value)).toEqual(['9', '8', '7', '6', '5', '4']);
  expect(props.onVerified).toHaveBeenLastCalledWith('987654');
});

it('clears the code after a verification error so another autofill can work', () => {
  const { UNSAFE_getAllByType, rerender } = render(<OtpStep {...props} />);
  fireEvent.changeText(UNSAFE_getAllByType(TextInput)[0], '123456');
  rerender(<OtpStep {...props} error="Invalid OTP" />);
  expect(UNSAFE_getAllByType(TextInput).map(box => box.props.value)).toEqual(['', '', '', '', '', '']);
  fireEvent.changeText(UNSAFE_getAllByType(TextInput)[0], '654321');
  expect(props.onVerified).toHaveBeenLastCalledWith('654321');
  act(() => jest.advanceTimersByTime(100));
});

it('clears red error styling when the first digit of a retry is entered', () => {
  function RetryOtp() {
    const [error, setError] = React.useState<string | null>('Invalid OTP');
    return <OtpStep {...props} error={error} onRetryStart={() => setError(null)} />;
  }
  const { UNSAFE_getAllByType, queryByText } = render(<RetryOtp />);
  let first = UNSAFE_getAllByType(TextInput)[0];
  expect(first).toHaveStyle({ borderColor: '#f43f5e' });
  expect(queryByText('Invalid OTP')).not.toBeNull();
  fireEvent.changeText(first, '1');
  first = UNSAFE_getAllByType(TextInput)[0];
  expect(first.props.value).toBe('1');
  expect(first).toHaveStyle({ borderColor: '#16a34a' });
  expect(queryByText('Invalid OTP')).toBeNull();
});

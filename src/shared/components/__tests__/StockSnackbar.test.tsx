import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { StockSnackbar } from '../StockSnackbar';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';

const reset = () => useSnackbarStore.setState({ message: null, key: 0, bottomOffset: 0 });

beforeEach(() => {
  reset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('StockSnackbar', () => {
  it('renders nothing when there is no message', () => {
    render(<StockSnackbar />);
    expect(screen.queryByTestId('stock-snackbar')).toBeNull();
  });

  it('renders the message and an Ok button once shown', () => {
    render(<StockSnackbar />);
    act(() => useSnackbarStore.getState().show('We only have 1 left in stock'));

    expect(screen.getByText('We only have 1 left in stock')).toBeTruthy();
    expect(screen.getByText('Ok')).toBeTruthy();
  });

  it('pressing Ok dismisses it immediately', () => {
    render(<StockSnackbar />);
    act(() => useSnackbarStore.getState().show('Capped out'));

    fireEvent.press(screen.getByText('Ok'));

    expect(screen.queryByTestId('stock-snackbar')).toBeNull();
  });

  it('auto-dismisses after 2.5s', () => {
    render(<StockSnackbar />);
    act(() => useSnackbarStore.getState().show('Capped out'));

    act(() => jest.advanceTimersByTime(2500));

    expect(screen.queryByTestId('stock-snackbar')).toBeNull();
  });

  it('a repeat show() before the timeout resets the countdown', () => {
    render(<StockSnackbar />);
    act(() => useSnackbarStore.getState().show('Capped out'));

    act(() => jest.advanceTimersByTime(2000)); // 500ms shy of dismissal
    act(() => useSnackbarStore.getState().show('Capped out')); // repeat tap

    act(() => jest.advanceTimersByTime(2000)); // would've been 4000ms since first show
    expect(screen.getByText('Capped out')).toBeTruthy(); // still visible — timer restarted

    act(() => jest.advanceTimersByTime(500)); // now 2500ms since the repeat show()
    expect(screen.queryByTestId('stock-snackbar')).toBeNull();
  });
});

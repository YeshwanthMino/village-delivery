import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FullWidthStepper } from '../FullWidthStepper';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';

beforeEach(() => useSnackbarStore.setState({ message: null, key: 0, bottomOffset: 0 }));

describe('FullWidthStepper', () => {
  it('calls onAdd when below maxQuantity', () => {
    const onAdd = jest.fn();
    render(<FullWidthStepper count={1} maxQuantity={3} onAdd={onAdd} onDec={jest.fn()} />);

    fireEvent.press(screen.getByTestId('stepper-add'));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('shows the stock-limit snackbar instead of calling onAdd once maxQuantity is hit', () => {
    const onAdd = jest.fn();
    render(<FullWidthStepper count={2} maxQuantity={2} onAdd={onAdd} onDec={jest.fn()} />);

    fireEvent.press(screen.getByTestId('stepper-add'));

    expect(onAdd).not.toHaveBeenCalled();
    expect(useSnackbarStore.getState().message).toBe('We only have 2 left in stock');
  });
});

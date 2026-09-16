import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CompactStepper } from '../CompactStepper';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';

beforeEach(() => useSnackbarStore.setState({ message: null, key: 0, bottomOffset: 0 }));

describe('CompactStepper', () => {
  it('calls onAdd when below maxQuantity', () => {
    const onAdd = jest.fn();
    render(<CompactStepper count={1} maxQuantity={3} onAdd={onAdd} onDec={jest.fn()} />);

    fireEvent.press(screen.getByTestId('stepper-add'));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(useSnackbarStore.getState().message).toBeNull();
  });

  it('shows the stock-limit snackbar instead of calling onAdd once maxQuantity is hit', () => {
    const onAdd = jest.fn();
    render(<CompactStepper count={3} maxQuantity={3} onAdd={onAdd} onDec={jest.fn()} />);

    fireEvent.press(screen.getByTestId('stepper-add'));

    expect(onAdd).not.toHaveBeenCalled();
    expect(useSnackbarStore.getState().message).toBe('We only have 3 left in stock');
  });

  it('always allows onAdd when maxQuantity is undefined', () => {
    const onAdd = jest.fn();
    render(<CompactStepper count={99} onAdd={onAdd} onDec={jest.fn()} />);

    fireEvent.press(screen.getByTestId('stepper-add'));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { NavigationContext, usePreventRemove } from '@react-navigation/native';
import { AddressBackGuard } from '../AddressBackGuard';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'), usePreventRemove: jest.fn(),
}));

it('intercepts native Back for an internal step and allows an explicit successful exit', () => {
  const dispatch = jest.fn();
  const onBack = jest.fn();
  const leaving = { current: false };
  render(<NavigationContext.Provider value={{ dispatch } as any}>
    <AddressBackGuard enabled leaving={leaving} onBack={onBack} />
  </NavigationContext.Provider>);
  const [enabled, callback] = (usePreventRemove as jest.Mock).mock.calls[0];
  expect(enabled).toBe(true);
  const back = { type: 'GO_BACK' };
  act(() => callback({ data: { action: back } }));
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(dispatch).not.toHaveBeenCalled();
  leaving.current = true;
  act(() => callback({ data: { action: back } }));
  expect(dispatch).toHaveBeenCalledWith(back);
});

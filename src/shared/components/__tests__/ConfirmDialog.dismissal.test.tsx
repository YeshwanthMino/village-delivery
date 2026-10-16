import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Modal, Platform } from 'react-native';
import { ConfirmDialog } from '../ConfirmDialog';

let mockFocused = true;
jest.mock('@/src/shared/hooks/useScreenActive', () => ({ useScreenFocused: () => mockFocused }));

const originalOS = Platform.OS;
afterEach(() => { Platform.OS = originalOS; mockFocused = true; });

it('removes its scrim on close and queues a quick iOS reopen until native dismissal', () => {
  Platform.OS = 'ios';
  const cancel = jest.fn();
  const confirm = jest.fn();
  const view = (visible: boolean) => (
    <ConfirmDialog visible={visible} title="Delete address?" confirmLabel="Delete" cancelLabel="Cancel" onConfirm={confirm} onCancel={cancel} />
  );
  const { rerender, getByText, getAllByLabelText, queryByText, UNSAFE_getByType } = render(view(true));
  const modal = UNSAFE_getByType(Modal);
  fireEvent.press(getByText('Delete'));
  fireEvent.press(getByText('Delete'));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(cancel).not.toHaveBeenCalled();
  fireEvent.press(getAllByLabelText('Cancel')[0]);
  fireEvent.press(getAllByLabelText('Cancel')[0]);
  expect(cancel).toHaveBeenCalledTimes(1);

  rerender(view(false));
  rerender(view(true));
  expect(modal.props.visible).toBe(false);
  expect(queryByText('Delete address?')).toBeNull();
  act(() => modal.props.onDismiss());
  expect(UNSAFE_getByType(Modal).props.visible).toBe(true);
  expect(queryByText('Delete address?')).not.toBeNull();
});

it('clears a pending confirmation when its screen blurs', () => {
  const cancel = jest.fn();
  const view = () => <ConfirmDialog visible title="Sign out?" confirmLabel="Sign out" cancelLabel="Cancel" onConfirm={jest.fn()} onCancel={cancel} />;
  const { rerender, queryByText, UNSAFE_getByType } = render(view());
  mockFocused = false;
  rerender(view());
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(UNSAFE_getByType(Modal).props.visible).toBe(false);
  expect(queryByText('Sign out?')).toBeNull();
});

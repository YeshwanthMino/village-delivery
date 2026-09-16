import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { WalletApplyCard } from '../WalletApplyCard';
import { toUnits } from '@/src/shared/utils/currency';

const mockRawTemplates: Record<string, string> = {
  wallet_apply_title: 'Wallet balance',
  wallet_apply_available: '{n} cashback available',
  wallet_apply_applied: '{n} applied to this order',
  apply: 'APPLY',
  remove: 'REMOVE',
};

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => mockRawTemplates[key] ?? key }),
}));

describe('WalletApplyCard', () => {
  test('hides when balance is null', () => {
    const { toJSON } = render(
      <WalletApplyCard balance={null} applied={false} onApply={jest.fn()} onRemove={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  test('hides when balance is 0', () => {
    const { toJSON } = render(
      <WalletApplyCard balance={0} applied={false} onApply={jest.fn()} onRemove={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  test('hides when balance is undefined (still loading, errored, or unauthenticated)', () => {
    const { toJSON } = render(
      <WalletApplyCard balance={undefined} applied={false} onApply={jest.fn()} onRemove={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  test('not applied: shows the available amount and an APPLY button', () => {
    render(
      <WalletApplyCard balance={toUnits(50)} applied={false} onApply={jest.fn()} onRemove={jest.fn()} />
    );

    expect(screen.getByText('Wallet balance')).toBeTruthy();
    expect(screen.getByText('₹50 cashback available')).toBeTruthy();
    expect(screen.getByText('APPLY')).toBeTruthy();
    expect(screen.queryByText('REMOVE')).toBeNull();
  });

  test('tapping the card while not applied calls onApply', () => {
    const onApply = jest.fn();
    render(
      <WalletApplyCard balance={toUnits(50)} applied={false} onApply={onApply} onRemove={jest.fn()} />
    );

    fireEvent.press(screen.getByTestId('wallet-apply-card'));

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  test('applied: shows the applied amount and a REMOVE button', () => {
    render(
      <WalletApplyCard balance={toUnits(50)} applied={true} onApply={jest.fn()} onRemove={jest.fn()} />
    );

    expect(screen.getByText('₹50 applied to this order')).toBeTruthy();
    expect(screen.getByText('REMOVE')).toBeTruthy();
    expect(screen.queryByText('APPLY')).toBeNull();
  });

  test('tapping the card while applied calls onRemove', () => {
    const onRemove = jest.fn();
    render(
      <WalletApplyCard balance={toUnits(50)} applied={true} onApply={jest.fn()} onRemove={onRemove} />
    );

    fireEvent.press(screen.getByTestId('wallet-apply-card'));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

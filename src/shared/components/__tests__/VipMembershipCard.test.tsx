import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { VipMembershipCard } from '../VipMembershipCard';

let mockUser: { isVip?: boolean } | null = null;

jest.mock('@/src/core/store', () => ({
  useAuthStore: jest.fn(selector => selector({ user: mockUser })),
}));

const mockRawTemplates: Record<string, string> = {
  vip_membership_title: 'VIP Membership',
  vip_membership_benefit: 'Double cashback on every order · {f}/month',
  vip_membership_added_title: 'VIP Membership added',
  vip_membership_added_benefit: 'Cashback on this order is now doubled',
  add: 'ADD',
  remove: 'REMOVE',
};

jest.mock('@/src/core/utils/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => mockRawTemplates[key] ?? key }),
}));

describe('VipMembershipCard', () => {
  afterEach(() => {
    mockUser = null;
  });

  test('not added: shows the fee and an ADD button', () => {
    mockUser = { isVip: false };
    render(<VipMembershipCard added={false} onAdd={jest.fn()} onRemove={jest.fn()} />);

    expect(screen.getByText('VIP Membership')).toBeTruthy();
    expect(screen.getByText('Double cashback on every order · ₹45/month')).toBeTruthy();
    expect(screen.getByText('ADD')).toBeTruthy();
    expect(screen.queryByText('REMOVE')).toBeNull();
  });

  test('tapping the card while not added calls onAdd', () => {
    mockUser = { isVip: false };
    const onAdd = jest.fn();
    render(<VipMembershipCard added={false} onAdd={onAdd} onRemove={jest.fn()} />);

    fireEvent.press(screen.getByTestId('vip-membership-card'));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  test('added: shows the added state and a REMOVE button', () => {
    mockUser = { isVip: false };
    render(<VipMembershipCard added={true} onAdd={jest.fn()} onRemove={jest.fn()} />);

    expect(screen.getByText('VIP Membership added')).toBeTruthy();
    expect(screen.getByText('Cashback on this order is now doubled')).toBeTruthy();
    expect(screen.getByText('REMOVE')).toBeTruthy();
    expect(screen.queryByText('ADD')).toBeNull();
  });

  test('tapping the card while added calls onRemove', () => {
    mockUser = { isVip: false };
    const onRemove = jest.fn();
    render(<VipMembershipCard added={true} onAdd={jest.fn()} onRemove={onRemove} />);

    fireEvent.press(screen.getByTestId('vip-membership-card'));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  test('a real VIP user never sees the card, even if added is somehow true', () => {
    mockUser = { isVip: true };
    const { toJSON } = render(<VipMembershipCard added={false} onAdd={jest.fn()} onRemove={jest.fn()} />);
    expect(toJSON()).toBeNull();

    const { toJSON: toJSON2 } = render(<VipMembershipCard added={true} onAdd={jest.fn()} onRemove={jest.fn()} />);
    expect(toJSON2()).toBeNull();
  });

  test('a logged-out user (no profile) is treated as non-VIP and sees the card', () => {
    mockUser = null;
    render(<VipMembershipCard added={false} onAdd={jest.fn()} onRemove={jest.fn()} />);

    expect(screen.getByText('VIP Membership')).toBeTruthy();
  });
});

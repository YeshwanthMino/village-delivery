import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { useWalletQuery } from '../useWalletQuery';

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('@/src/core/store/useAuthStore', () => ({
  useAuthStore: jest.fn(selector => selector({ isAuthenticated: true })),
}));
jest.mock('../../walletApi', () => ({ getWallet: jest.fn() }));

const mockUseQuery = useQuery as jest.Mock;

describe('useWalletQuery', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseQuery.mockReturnValue({ data: null });
  });

  test('defaults to normal caching — no forced refetch on mount', () => {
    renderHook(() => useWalletQuery());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ refetchOnMount: undefined })
    );
  });

  test('alwaysFresh forces a refetch on every mount', () => {
    renderHook(() => useWalletQuery({ alwaysFresh: true }));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ refetchOnMount: 'always' })
    );
  });

  test('stays gated on isAuthenticated regardless of alwaysFresh', () => {
    renderHook(() => useWalletQuery({ alwaysFresh: true }));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });
});

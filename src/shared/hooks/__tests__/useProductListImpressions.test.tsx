import { renderHook } from '@testing-library/react-native';
import { useProductListImpressions } from '../useProductListImpressions';

const mockTrack = jest.fn();
jest.mock('@/src/base/services/analytics', () => ({ analytics: { track: (...args: unknown[]) => mockTrack(...args) } }));
jest.mock('../useScreenActive', () => ({ useScreenFocused: () => true }));

beforeEach(() => mockTrack.mockClear());

test('records visible products once with one-based list positions', () => {
  const { result, rerender } = renderHook(
    ({ listId }) => useProductListImpressions<{ id: string }>(listId, 'category'),
    { initialProps: { listId: 'category:fruit' } },
  );
  const items = [
    { item: { id: 'apple' }, index: 0, isViewable: true },
    { item: { id: 'banana' }, index: 1, isViewable: false },
  ];
  result.current.onViewableItemsChanged({ viewableItems: items as any });
  result.current.onViewableItemsChanged({ viewableItems: items as any });
  expect(mockTrack.mock.calls).toEqual([
    ['product_impression', { product_id: 'apple', list_id: 'category:fruit', source: 'category', position: 1 }],
  ]);

  rerender({ listId: 'category:vegetables' });
  result.current.onViewableItemsChanged({ viewableItems: items as any });
  expect(mockTrack).toHaveBeenLastCalledWith('product_impression', {
    product_id: 'apple', list_id: 'category:vegetables', source: 'category', position: 1,
  });
});

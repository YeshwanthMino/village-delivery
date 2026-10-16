import { renderHook } from '@testing-library/react-native';
import { useProductRailImpressions } from '../useProductRailImpressions';

const mockTrack = jest.fn();
jest.mock('@/src/base/services/analytics', () => ({ analytics: { track: (...args: unknown[]) => mockTrack(...args) } }));
jest.mock('../useScreenActive', () => ({ useScreenFocused: () => true }));

beforeEach(() => mockTrack.mockClear());

test('requires vertical rail visibility as well as horizontal card viewability', () => {
  const { result } = renderHook(() => useProductRailImpressions<{ id: string }>('similar:p0', 'similar_products', undefined, 'request-1', 'v2'));
  let y = 9000;
  (result.current.railRef as any).current = {
    measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(0, y, 300, 200),
  };
  const viewableItems = [{ item: { id: 'p1' }, index: 0, isViewable: true }] as any;
  result.current.onViewableItemsChanged({ viewableItems });
  expect(mockTrack).not.toHaveBeenCalled();

  y = 100;
  result.current.checkVisible();
  result.current.checkVisible();
  expect(mockTrack.mock.calls).toEqual([
    ['product_impression', {
      product_id: 'p1', list_id: 'similar:p0', source: 'similar_products', position: 1,
      recommendation_id: 'request-1', model_version: 'v2',
    }],
  ]);
});

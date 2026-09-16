import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('@/src/features/product/data/productDetailApi', () => ({
  getProductDetail: jest.fn(),
}));

import { Product, Variant } from '@/src/base/types/village.types';
import { ProductDetail } from '@/src/features/product/data/productDetail.types';
import { getProductDetail } from '@/src/features/product/data/productDetailApi';
import { useVariantSheet } from '../useVariantSheet';

const mockGetProductDetail = getProductDetail as jest.MockedFunction<typeof getProductDetail>;

/** A promise plus externally-callable resolve/reject, so a test can control
 *  exactly when the "network" responds relative to other actions. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const variants: Variant[] = [
  { id: 'v0', name: '250 ml', price: 10, mrp: 12 },
  { id: 'v1', name: '1 L', price: 35, mrp: 40 },
];

const productWithVariants: Product = {
  id: 'p1',
  categoryId: 'c1',
  name: 'Product A',
  nameTE: '',
  weight: '',
  price: 10,
  mrp: 12,
  rating: 0,
  reviews: 0,
  variants,
};

const productWithoutVariants = (id: string, name: string): Product => ({
  id,
  categoryId: 'c1',
  name,
  nameTE: '',
  weight: '',
  price: 5,
  mrp: 6,
  rating: 0,
  reviews: 0,
});

const detailWithVariants = (variantList: Variant[]): ProductDetail => ({
  id: 'p2',
  title: 'Product B',
  teluguTitle: '',
  description: '',
  image: 'image.png',
  images: ['image.png'],
  mrp: 40,
  price: 35,
  discountPct: 0,
  inStock: true,
  active: true,
  variants: variantList,
  similarProducts: [],
});

beforeEach(() => {
  mockGetProductDetail.mockReset();
});

describe('useVariantSheet', () => {
  it('opens synchronously on the fast path when the candidate already has variants', () => {
    const { result } = renderHook(() => useVariantSheet());

    act(() => {
      result.current.open(productWithVariants);
    });

    expect(result.current.product).toEqual(productWithVariants);
    expect(result.current.loading).toBe(false);
    expect(mockGetProductDetail).not.toHaveBeenCalled();
  });

  it('slow path: sets loading during the fetch, then product on success', async () => {
    const { promise, resolve } = deferred<ProductDetail>();
    mockGetProductDetail.mockReturnValue(promise);
    const candidate = productWithoutVariants('p2', 'Product B');

    const { result } = renderHook(() => useVariantSheet());

    act(() => {
      result.current.open(candidate);
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolve(detailWithVariants(variants));
      await promise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.product?.variants).toEqual(variants);
    expect(result.current.error).toBeNull();
  });

  it('slow path failure: sets error, clears loading, leaves product null', async () => {
    const { promise, reject } = deferred<ProductDetail>();
    mockGetProductDetail.mockReturnValue(promise);
    const candidate = productWithoutVariants('p2', 'Product B');

    const { result } = renderHook(() => useVariantSheet());

    act(() => {
      result.current.open(candidate);
    });

    await act(async () => {
      reject(new Error('network down'));
      await promise.catch(() => {});
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.product).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('network down');
  });

  it('empty-variants guard: a response with no variants sets error, not product', async () => {
    const { promise, resolve } = deferred<ProductDetail>();
    mockGetProductDetail.mockReturnValue(promise);
    const candidate = productWithoutVariants('p2', 'Product B');

    const { result } = renderHook(() => useVariantSheet());

    act(() => {
      result.current.open(candidate);
    });

    await act(async () => {
      resolve(detailWithVariants([]));
      await promise;
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.product).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('a fast-path open for a second product supersedes an in-flight fetch for the first, without latching loading', async () => {
    const { promise, resolve } = deferred<ProductDetail>();
    mockGetProductDetail.mockReturnValue(promise);
    const slowCandidate = productWithoutVariants('p1', 'Product A (slow)');

    const { result } = renderHook(() => useVariantSheet());

    act(() => {
      result.current.open(slowCandidate);
    });
    expect(result.current.loading).toBe(true);

    // Product B already has its variants: fast path, opens immediately and
    // takes ownership of the requestId ref away from A's in-flight fetch.
    act(() => {
      result.current.open(productWithVariants);
    });

    expect(result.current.product).toEqual(productWithVariants);
    expect(result.current.loading).toBe(false);

    // A's response lands after the sheet has already moved on to B.
    await act(async () => {
      resolve(detailWithVariants(variants));
      await promise;
    });

    expect(result.current.product).toEqual(productWithVariants);
    expect(result.current.loading).toBe(false);
  });

  it('closing during an in-flight fetch keeps the sheet closed once the fetch resolves', async () => {
    const { promise, resolve } = deferred<ProductDetail>();
    mockGetProductDetail.mockReturnValue(promise);
    const candidate = productWithoutVariants('p2', 'Product B');

    const { result } = renderHook(() => useVariantSheet());

    act(() => {
      result.current.open(candidate);
    });
    expect(result.current.loading).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.product).toBeNull();
    expect(result.current.loading).toBe(false);

    await act(async () => {
      resolve(detailWithVariants(variants));
      await promise;
    });

    expect(result.current.product).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

// What a real API product costs, from payload to the price the customer reads
// in the cart. Every route into the cart must agree.

import { mapProductDetail } from '@/src/features/product/data/productDetailApi';
import { mapApiProduct } from '@/src/features/home/data/productMapper';
import { productSnapshot, getCartItems, computeBill } from '@/src/features/cart/domain/bill';
import { rupees } from '@/src/shared/utils/currency';
import type { Product } from '@/src/base/types/village.types';

// A product that genuinely costs ₹45, priced the way the backend sends it.
const RAW_API_PRODUCT = {
  _id: 'p1',
  title: 'Farm Fresh Eggs',
  mrp: 50,
  listPrice: 48,
  dealPrice: 45,
  landingImage: 'https://img/eggs.png',
  variantIds: [
    { _id: 'v1', title: '6 pc', mrp: 50, dealPrice: 45, stock: 10, landingImage: 'https://img/eggs.png' },
    { _id: 'v2', title: '12 pc', mrp: 95, dealPrice: 88, stock: 4, landingImage: 'https://img/eggs.png' },
  ],
};

/** Rebuild the Product the variant sheet is handed, exactly as the carousel,
 *  search and category screens do after fetching product detail. */
function productForVariantSheet(): Product {
  const detail = mapProductDetail(RAW_API_PRODUCT);
  return {
    id: detail.id,
    categoryId: '',
    name: detail.title,
    nameTE: detail.teluguTitle || '',
    weight: '',
    price: detail.price,
    mrp: detail.mrp,
    rating: 0,
    reviews: 0,
    image: detail.image,
    variants: detail.variants,
  } as Product;
}

describe('cart pricing for API products', () => {
  test('a ₹45 product added from the variant sheet reads ₹45 in the cart', () => {
    const product = productForVariantSheet();

    // What ProductCard / VariantBottomSheet do on ADD.
    const snapshot = productSnapshot(product, 0);
    const items = getCartItems({ [snapshot.key]: 1 }, { [snapshot.key]: snapshot });

    expect(rupees(items[0].price)).toBe('₹45');
  });

  test('the second variant keeps its own price', () => {
    const product = productForVariantSheet();

    const snapshot = productSnapshot(product, 1);
    const items = getCartItems({ [snapshot.key]: 1 }, { [snapshot.key]: snapshot });

    expect(rupees(items[0].price)).toBe('₹88');
  });

  test('a variant-less product added without a variant index reads ₹45', () => {
    const product = productForVariantSheet();

    const snapshot = productSnapshot(product, null);
    const items = getCartItems({ [snapshot.key]: 1 }, { [snapshot.key]: snapshot });

    expect(rupees(items[0].price)).toBe('₹45');
  });

  test('the bill totals what the lines say', () => {
    const product = productForVariantSheet();

    const a = productSnapshot(product, 0); // ₹45
    const b = productSnapshot(product, 1); // ₹88
    const items = getCartItems(
      { [a.key]: 2, [b.key]: 1 },
      { [a.key]: a, [b.key]: b },
    );
    const bill = computeBill(items);

    // 45*2 + 88 = 178
    expect(rupees(bill.itemTotal)).toBe('₹178');
    expect(rupees(bill.grandTotal)).toBe('₹178');
  });

  test('mapApiProduct agrees with mapProductDetail on price', () => {
    // The home rails map through mapApiProduct while detail screens use
    // mapProductDetail; a cart line must not depend on which screen it came from.
    expect(mapApiProduct(RAW_API_PRODUCT).price)
      .toBe(mapProductDetail(RAW_API_PRODUCT).price);
  });
});

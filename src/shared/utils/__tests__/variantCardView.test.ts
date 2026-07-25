import { resolveVariantCardView } from '../variantCardView';
import { CartSnapshot, Variant } from '@/src/base/types/village.types';

const variants: Variant[] = [
  { id: 'v0', name: '1 pc (250 ml)', price: 15.5, mrp: 29.95, stock: 4 },
  { id: 'v1', name: '1 pc (1 L)', price: 58.25, mrp: 99.95, stock: 2 },
];

const litreSnapshot: CartSnapshot = {
  key: 'p1-v1',
  productId: 'p1',
  variantIndex: 1,
  name: 'Figaro Extra Virgin Olive Oil',
  weight: '1 pc (1 L)',
  price: 58.25,
  mrp: 99.95,
};

const base = { fallbackPrice: 15.5, fallbackMrp: 29.95 };

describe('resolveVariantCardView', () => {
  it('offers the default variant and an options count when nothing is in the cart', () => {
    expect(resolveVariantCardView({ ...base, variants, lastSnapshot: undefined, totalCount: 0 }))
      .toEqual({
        mode: 'add',
        opensSheet: true,
        price: 15.5,
        mrp: 29.95,
        packLabel: '1 pc (250 ml)',
        optionsLabel: '2 options',
        count: 0,
      });
  });

  it('mirrors the last-touched variant once something is in the cart', () => {
    expect(resolveVariantCardView({ ...base, variants, lastSnapshot: litreSnapshot, totalCount: 3 }))
      .toEqual({
        mode: 'stepper',
        opensSheet: true,
        price: 58.25,
        mrp: 99.95,
        packLabel: '1 pc (1 L)',
        optionsLabel: '2 options',
        count: 3,
      });
  });

  it('ignores a stale snapshot when the product has left the cart', () => {
    const view = resolveVariantCardView({ ...base, variants, lastSnapshot: litreSnapshot, totalCount: 0 });
    expect(view.mode).toBe('add');
    expect(view.packLabel).toBe('1 pc (250 ml)');
    expect(view.price).toBe(15.5);
  });

  it('treats a single variant as an ordinary product — no sheet, no options label', () => {
    expect(resolveVariantCardView({
      ...base,
      variants: [variants[0]],
      lastSnapshot: undefined,
      totalCount: 2,
    })).toEqual({
      mode: 'stepper',
      opensSheet: false,
      price: 15.5,
      mrp: 29.95,
      packLabel: '1 pc (250 ml)',
      optionsLabel: '',
      count: 2,
    });
  });

  it('falls back to product-level pricing when there are no variants at all', () => {
    expect(resolveVariantCardView({
      ...base,
      variants: undefined,
      lastSnapshot: undefined,
      totalCount: 0,
    })).toEqual({
      mode: 'add',
      opensSheet: false,
      price: 15.5,
      mrp: 29.95,
      packLabel: '',
      optionsLabel: '',
      count: 0,
    });
  });

  it('still opens the sheet when the flag is set but the variant array is absent', () => {
    const view = resolveVariantCardView({
      ...base,
      variants: undefined,
      lastSnapshot: undefined,
      totalCount: 0,
      forceSheet: true,
    });
    expect(view.opensSheet).toBe(true);
    expect(view.optionsLabel).toBe('');
  });

  it('ignores a snapshot belonging to a single-variant product', () => {
    const view = resolveVariantCardView({
      ...base,
      variants: [variants[0]],
      lastSnapshot: litreSnapshot,
      totalCount: 1,
    });
    expect(view.price).toBe(15.5);
    expect(view.packLabel).toBe('1 pc (250 ml)');
  });
});

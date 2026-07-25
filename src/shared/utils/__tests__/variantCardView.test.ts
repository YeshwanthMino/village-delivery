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
        optionsCount: 2,
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
        optionsCount: 2,
        count: 3,
      });
  });

  it('ignores a stale snapshot when the product has left the cart', () => {
    const view = resolveVariantCardView({ ...base, variants, lastSnapshot: litreSnapshot, totalCount: 0 });
    expect(view.mode).toBe('add');
    expect(view.packLabel).toBe('1 pc (250 ml)');
    expect(view.price).toBe(15.5);
  });

  it('treats a single variant as an ordinary product — no sheet, no options count', () => {
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
      optionsCount: 0,
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
      optionsCount: 0,
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
    expect(view.optionsCount).toBe(0);
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

  it('uses fallbackPackLabel for a variant-less product (e.g. a static-catalog weight)', () => {
    const view = resolveVariantCardView({
      ...base,
      variants: undefined,
      lastSnapshot: undefined,
      totalCount: 0,
      fallbackPackLabel: '500 g',
    });
    expect(view.packLabel).toBe('500 g');
  });

  it('shows the snapshot price, not the current variant price, after a repricing', () => {
    // The catalog price for variant 1 has since moved to 58.25, but this line
    // was added at 51.0 — the card must keep showing what was actually added,
    // not re-derive a number from the (now different) variants array.
    const stalePricedSnapshot: CartSnapshot = {
      ...litreSnapshot,
      price: 51.0,
      weight: '1 pc (1 L) — old pack',
    };
    const view = resolveVariantCardView({
      ...base,
      variants,
      lastSnapshot: stalePricedSnapshot,
      totalCount: 2,
    });
    expect(view.price).toBe(51.0);
    expect(view.packLabel).toBe('1 pc (1 L) — old pack');
  });

  it('shows a legitimately free snapshot as ₹0 rather than falling back', () => {
    const free: CartSnapshot = { ...litreSnapshot, price: 0, mrp: 0 };
    const view = resolveVariantCardView({ ...base, variants, lastSnapshot: free, totalCount: 1 });
    expect(view.price).toBe(0);
    expect(view.mrp).toBe(0);
  });

  it('shows a legitimately free default variant as ₹0 rather than falling back', () => {
    const freeVariants: Variant[] = [
      { id: 'v0', name: '1 pc (250 ml)', price: 0, mrp: 0, stock: 4 },
      variants[1],
    ];
    const view = resolveVariantCardView({
      ...base,
      variants: freeVariants,
      lastSnapshot: undefined,
      totalCount: 0,
    });
    expect(view.price).toBe(0);
    expect(view.mrp).toBe(0);
  });

  it('treats a literal empty variants array the same as no variants at all', () => {
    const view = resolveVariantCardView({
      ...base,
      variants: [],
      lastSnapshot: undefined,
      totalCount: 0,
    });
    expect(view).toEqual({
      mode: 'add',
      opensSheet: false,
      price: 15.5,
      mrp: 29.95,
      packLabel: '',
      optionsCount: 0,
      count: 0,
    });
  });

  it('falls back to the default variant when the cart pointer has no snapshot behind it', () => {
    // hydrateCart backfills lastVariantKey but not cartSnapshots, so a cart
    // persisted before this feature shipped can have a pointer with nothing
    // behind it. That must fall through cleanly rather than crash or show
    // undefined fields.
    const view = resolveVariantCardView({
      ...base,
      variants,
      lastSnapshot: undefined,
      totalCount: 3,
    });
    expect(view).toEqual({
      mode: 'stepper',
      opensSheet: true,
      price: 15.5,
      mrp: 29.95,
      packLabel: '1 pc (250 ml)',
      optionsCount: 2,
      count: 3,
    });
  });
});

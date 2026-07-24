// src/features/home/data/productMapper.ts
//
// Maps backend product objects (with variantIds) to the Product interface.
// Handles both multi-variant products and single-variant products consistently.

import { Product, Variant } from '@/src/base/types/village.types';

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapVariant(v: any): Variant {
  const mrp = num(v?.mrp);
  const price = num(v?.dealPrice ?? v?.listPrice ?? v?.mrp);

  return {
    name: String(v?.title ?? ''),
    price,
    mrp,
  };
}

/**
 * Map a backend product object (with variantIds) to the Product interface.
 * - Extracts variants from variantIds array
 * - Handles both active and inactive variants
 * - Defaults inStock to true if no stock data (matches existing behavior)
 */
export function mapApiProduct(p: any): Product {
  const variants = Array.isArray(p?.variantIds)
    ? p.variantIds.map(mapVariant)
    : [];

  // Use first variant's price for the product-level price, or 0
  const firstVariant = variants[0];
  const productPrice = firstVariant?.price ?? 0;
  const productMrp = firstVariant?.mrp ?? 0;

  return {
    id: String(p?._id ?? ''),
    categoryId: String(p?.categoryId?._id ?? ''),
    name: String(p?.title ?? ''),
    nameTE: String(p?.teluguTitle ?? ''),
    weight: '', // Not provided by backend
    price: productPrice,
    mrp: productMrp,
    rating: num(p?.rating),
    reviews: num(p?.reviews),
    emoji: '', // Not provided by backend
    gradientFrom: '', // Not provided by backend
    gradientTo: '', // Not provided by backend
    variants: variants.length > 0 ? variants : undefined,
  };
}

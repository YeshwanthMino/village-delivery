// src/features/home/data/productMapper.ts
//
// Maps backend product objects (with variantIds) to the Product interface.
// Extracts comprehensive data from variants including images, pricing, taxes, and stock.

import { Product, Variant } from '@/src/base/types/village.types';

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapVariant(v: any): Variant {
  const mrp = num(v?.mrp);
  const listPrice = num(v?.listPrice);
  const dealPrice = num(v?.dealPrice);
  const price = dealPrice > 0 ? dealPrice : listPrice > 0 ? listPrice : mrp;
  const stock = num(v?.stockId?.stock ?? v?.stock);
  const images = Array.isArray(v?.images) ? v.images : [];
  const primaryImage = v?.landingImage || images[0];

  return {
    id: String(v?._id ?? ''),
    name: String(v?.title ?? ''),
    nameTE: String(v?.teluguTitle ?? ''),
    slug: String(v?.slug ?? ''),
    description: String(v?.description ?? ''),
    price,
    mrp,
    listPrice,
    dealPrice,
    stock,
    image: primaryImage ? String(primaryImage) : undefined,
    images: images.length > 0 ? images.map(String) : undefined,
    taxType: String(v?.taxType ?? ''),
    taxRate: num(v?.taxRate),
    hasFreeItem: Boolean(v?.hasFreeItem),
    hsn: String(v?.hsn ?? ''),
    active: Boolean(v?.active),
  };
}

/**
 * Map a backend product object (with variantIds) to the Product interface.
 * - Extracts comprehensive variant data including images, pricing tiers, and tax info
 * - Aggregates stock from all variants
 * - Uses first variant's image and price for product-level defaults
 */
export function mapApiProduct(p: any): Product {
  const variants = Array.isArray(p?.variantIds)
    ? p.variantIds.map(mapVariant)
    : [];

  // Aggregate stock from all variants
  const totalStock = variants.reduce((sum: number, v: Variant) => sum + (v.stock ?? 0), 0);

  // Use first variant's price and image for product-level fields
  const firstVariant = variants[0];
  const productPrice = firstVariant?.price ?? 0;
  const productMrp = firstVariant?.mrp ?? 0;
  const productImage = firstVariant?.image;
  const productImages = firstVariant?.images;

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
    description: String(p?.description ?? ''),
    manufacturerId: String(p?.manufacturerId ?? ''),
    brandId: String(p?.brandId ?? ''),
    stock: totalStock,
    image: productImage,
    images: productImages,
    emoji: '', // Not provided by backend
    gradientFrom: '', // Not provided by backend
    gradientTo: '', // Not provided by backend
    variants: variants.length > 0 ? variants : undefined,
  };
}

// src/features/product/data/productDetailApi.ts
//
// Product detail via GET /app/product/:id, keyed by the x-store-id header.
// mapProductDetail is a pure transform (unit-tested); getProductDetail wraps
// it with the network call.

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';
import { mapProduct, isProductActive } from '@/src/features/home/data/homeLayoutMapper';
import { mapApiProduct } from '@/src/features/home/data/productMapper';
import { ProductDetail } from './productDetail.types';
import { toUnits } from '@/src/shared/utils/currency';

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function mapProductDetail(p: any): ProductDetail {
  // Use the comprehensive mapApiProduct to extract all variant data
  const fullProduct = mapApiProduct(p);

  // If product has variants, use first variant's price; otherwise use product-level price
  // Variant prices are already in units (mapApiProduct converts at the boundary);
  // the product-level fallbacks are raw rupees off the payload, so convert those.
  const firstVariant = fullProduct.variants?.[0];
  const mrp = firstVariant?.mrp ?? toUnits(num(p?.mrp));
  const price = firstVariant?.price ?? toUnits(num(p?.dealPrice ?? p?.listPrice ?? p?.mrp));
  const discountPct = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

  // Use first variant's image if available, otherwise product image
  const variantImage = firstVariant?.image;
  const image = variantImage || p?.landingImage || (Array.isArray(p?.images) ? p.images[0] : undefined) || '';

  // Use first variant's images if available, otherwise product images
  const variantImages = firstVariant?.images;
  const imagesRaw = variantImages || (Array.isArray(p?.images) ? p.images.filter(Boolean) : []);
  const images = imagesRaw && imagesRaw.length > 0 ? imagesRaw : image ? [image] : [];

  const similarRaw = Array.isArray(p?.similarProducts) ? p.similarProducts : [];

  // Stock resolution mirrors the price fallback above: prefer the variants
  // (where the backend actually tracks inventory), fall back to the product-level
  // field for variant-less products, and treat a *missing* value as in-stock —
  // absent data must not hide a sellable product.
  const hasVariants = (fullProduct.variants?.length ?? 0) > 0;
  const rawStock = p?.stockId?.stock ?? p?.stock;
  const stock = hasVariants
    ? fullProduct.stock
    : rawStock != null
      ? num(rawStock)
      : undefined;

  return {
    id: String(p?._id ?? ''),
    title: String(p?.title ?? ''),
    teluguTitle: p?.teluguTitle || undefined,
    description: String(p?.description ?? ''),
    image,
    images,
    mrp,
    price,
    discountPct,
    inStock: stock == null ? true : stock > 0,
    stock,
    active: p?.active !== false,
    categoryTitle: p?.categoryId?.title || p?.category || undefined,
    variants: fullProduct.variants,
    similarProducts: similarRaw.filter(isProductActive).map(mapProduct),
  };
}

export async function getProductDetail(storeId: string, id: string): Promise<ProductDetail> {
  const data = await apiClient.get<any>(
    `${WebService.villageBaseURL}/app/product/${id}`,
    { headers: { Accept: '*/*', 'x-store-id': storeId } },
  );
  return mapProductDetail(data);
}

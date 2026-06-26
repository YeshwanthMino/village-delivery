// src/features/product/data/productDetailApi.ts
//
// Product detail via GET /app/product/:id, keyed by the x-store-id header.
// mapProductDetail is a pure transform (unit-tested); getProductDetail wraps
// it with the network call.

import { mapProduct, isProductActive } from '@/src/features/home/data/homeLayoutMapper';
import { ProductDetail } from './productDetail.types';

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function mapProductDetail(p: any): ProductDetail {
  const mrp = num(p?.mrp);
  const price = num(p?.dealPrice ?? p?.listPrice ?? p?.mrp);
  const discountPct = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const image = p?.landingImage || (Array.isArray(p?.images) ? p.images[0] : undefined) || '';
  const imagesRaw = Array.isArray(p?.images) ? p.images.filter(Boolean) : [];
  const images = imagesRaw.length > 0 ? imagesRaw : image ? [image] : [];
  const similarRaw = Array.isArray(p?.similarProducts) ? p.similarProducts : [];

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
    categoryTitle: p?.categoryId?.title || undefined,
    similarProducts: similarRaw.filter(isProductActive).map(mapProduct),
  };
}

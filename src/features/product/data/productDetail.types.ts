// src/features/product/data/productDetail.types.ts
//
// View-model for the product detail page (GET /app/product/:id). Raw API
// objects are mapped into this by productDetailApi so the UI never touches
// backend field shapes directly.

import { HomeProduct } from '@/src/features/home/data/homeLayout.types';
import { Variant } from '@/src/base/types/village.types';

export interface ProductDetail {
  id: string;
  title: string;
  teluguTitle?: string;
  description: string;
  image: string;          // landingImage || images[0]
  images: string[];       // images[], falling back to [image] when empty
  mrp: number;
  price: number;          // dealPrice ?? listPrice ?? mrp
  discountPct: number;    // 0 when no discount
  inStock: boolean;       // false when stock is 0; absent stock => true
  stock?: number;         // available quantity
  active: boolean;        // p.active !== false (missing flag => active)
  categoryTitle?: string; // categoryId.title
  variants?: Variant[];   // available variants for the product
  similarProducts: HomeProduct[];
}

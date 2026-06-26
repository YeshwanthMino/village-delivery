// src/features/product/data/productDetail.types.ts
//
// View-model for the product detail page (GET /app/product/:id). Raw API
// objects are mapped into this by productDetailApi so the UI never touches
// backend field shapes directly.

import { HomeProduct } from '@/src/features/home/data/homeLayout.types';

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
  categoryTitle?: string; // categoryId.title
  similarProducts: HomeProduct[];
}

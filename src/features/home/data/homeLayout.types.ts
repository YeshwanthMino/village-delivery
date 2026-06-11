// src/features/home/data/homeLayout.types.ts
//
// View-model types for the dynamic home page-layout
// (GET /app/page-layout/path/main). Raw API objects are mapped into these by
// homeLayoutMapper so the UI never touches backend field shapes directly.

export interface BannerSlide {
  id: string;
  title: string;
  imageUrl: string;
  link?: string;
}

export interface CategoryItem {
  id: string; // docId of the category
  title: string;
  imageUrl: string;
  link?: string;
}

export interface HomeProduct {
  id: string;
  title: string;
  teluguTitle?: string;
  image: string;
  mrp: number;
  price: number; // dealPrice ?? listPrice ?? mrp
  discountPct: number; // 0 when no discount
  inStock: boolean;
  slug?: string;
  link?: string;
  categoryId?: string;
}

export interface BannerSection {
  kind: 'banner';
  id: string;
  title: string;
  hideTitle: boolean;
  slides: BannerSlide[];
  height: number;
  autoScroll: boolean;
  autoPlayDelay: number;
  itemsPerSlide: number;
}

export interface CategorySection {
  kind: 'category';
  id: string;
  title: string;
  hideTitle: boolean;
  items: CategoryItem[];
}

export interface ProductCarouselSection {
  kind: 'productCarousel';
  id: string;
  title: string;
  hideTitle: boolean;
  products: HomeProduct[];
}

export type HomeSection = BannerSection | CategorySection | ProductCarouselSection;

export interface HomeLayout {
  id: string;
  title: string;
  path: string;
  sections: HomeSection[];
}

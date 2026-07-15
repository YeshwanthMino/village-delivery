export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: () => [...queryKeys.products.all, 'list'] as const,
    byCategory: (categoryId: string) => [...queryKeys.products.list(), { categoryId }] as const,
    search: (term: string) => [...queryKeys.products.list(), 'search', { term }] as const,
    detail: (id: string) => [...queryKeys.products.list(), 'detail', { id }] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
  },
  heroSlides: {
    all: ['heroSlides'] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: () => [...queryKeys.orders.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.orders.all, id] as const,
  },
  villages: {
    all: ['villages'] as const,
    search: (term: string) => [...queryKeys.villages.all, 'search', { term }] as const,
  },
} as const;

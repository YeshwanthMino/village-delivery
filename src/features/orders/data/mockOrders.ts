import { Order } from '@/src/base/types/village.types';

export const MOCK_ORDERS: Order[] = [
  // ── 1. Active: Out for delivery ──────────────────────────────────────────
  {
    id: 'ORD-2026-001',
    placedAt: '2026-05-14T08:30:00.000Z',
    status: 'out_for_delivery',
    deliveryAddress: '12-3, Gandhi Nagar, Nuziveedu, AP 521202',
    paymentMethod: 'cod',
    items: [
      { productId: 'd1', name: 'Whole Milk',         nameTE: 'పూర్తి పాలు',    emoji: '🥛', weight: '1 L',   price: 2.50, mrp: 2.75, quantity: 2 },
      { productId: 'v1', name: 'Yellow Onions',      nameTE: 'ఉల్లిపాయలు',    emoji: '🧅', weight: '1 Kg',  price: 1.25, mrp: 1.50, quantity: 1 },
      { productId: 's1', name: 'Milk Chocolate Bar', nameTE: 'చాక్లెట్ బార్', emoji: '🍫', weight: '100 g', price: 1.50, mrp: 1.75, quantity: 3 },
    ],
    bill: {
      itemTotal:      10.75,
      mrpTotal:       12.25,
      itemDiscount:    1.50,
      deliveryFee:     0,
      platformFee:     0.10,
      couponDiscount:  0,
      grandTotal:     10.85,
      totalSavings:    1.50,
      totalCount:      6,
    },
  },

  // ── 2. Active: Confirmed ─────────────────────────────────────────────────
  {
    id: 'ORD-2026-002',
    placedAt: '2026-05-14T06:15:00.000Z',
    status: 'confirmed',
    deliveryAddress: '12-3, Gandhi Nagar, Nuziveedu, AP 521202',
    paymentMethod: 'upi',
    items: [
      { productId: 'b1', name: 'Fresh Orange Juice', nameTE: 'నారింజ రసం',    emoji: '🍊', weight: '1 L',   price: 3.00, mrp: 3.50, quantity: 2 },
      { productId: 's1', name: 'Milk Chocolate Bar', nameTE: 'చాక్లెట్ బార్', emoji: '🍫', weight: '100 g', price: 1.50, mrp: 1.75, quantity: 2 },
    ],
    bill: {
      itemTotal:      9.00,
      mrpTotal:      10.50,
      itemDiscount:   1.50,
      deliveryFee:    0,
      platformFee:    0.10,
      couponDiscount: 0,
      grandTotal:     9.10,
      totalSavings:   1.50,
      totalCount:     4,
    },
  },

  // ── 3. Past: Delivered (recent) ──────────────────────────────────────────
  {
    id: 'ORD-2026-003',
    placedAt: '2026-05-12T10:00:00.000Z',
    status: 'delivered',
    deliveryAddress: '12-3, Gandhi Nagar, Nuziveedu, AP 521202',
    paymentMethod: 'cod',
    items: [
      { productId: 'f1', name: 'Sweet Navel Oranges', nameTE: 'తీపి నారింజలు', emoji: '🍊', weight: '1 Kg', price: 3.75, mrp: 4.25, quantity: 2 },
      { productId: 'd1', name: 'Whole Milk',           nameTE: 'పూర్తి పాలు',  emoji: '🥛', weight: '1 L',  price: 2.50, mrp: 2.75, quantity: 1 },
    ],
    bill: {
      itemTotal:     10.00,
      mrpTotal:      11.25,
      itemDiscount:   1.25,
      deliveryFee:    0,
      platformFee:    0.10,
      couponDiscount: 0,
      grandTotal:    10.10,
      totalSavings:   1.25,
      totalCount:     3,
    },
  },

  // ── 4. Past: Delivered (older) ───────────────────────────────────────────
  {
    id: 'ORD-2026-004',
    placedAt: '2026-05-08T14:20:00.000Z',
    status: 'delivered',
    deliveryAddress: '12-3, Gandhi Nagar, Nuziveedu, AP 521202',
    paymentMethod: 'cod',
    items: [
      { productId: 'v1', name: 'Yellow Onions', nameTE: 'ఉల్లిపాయలు', emoji: '🧅', weight: '1 Kg',  price: 1.25, mrp: 1.50, quantity: 2 },
      { productId: 'v2', name: 'Vine Tomatoes', nameTE: 'టమోటాలు',    emoji: '🍅', weight: '500 g', price: 1.00, mrp: 1.25, quantity: 2 },
      { productId: 'd2', name: 'Greek Yogurt',  nameTE: 'పెరుగు',      emoji: '🥣', weight: '500 g', price: 2.00, mrp: 2.50, quantity: 1 },
    ],
    bill: {
      itemTotal:      6.50,
      mrpTotal:       8.00,
      itemDiscount:   1.50,
      deliveryFee:    0,
      platformFee:    0.10,
      couponDiscount: 0,
      grandTotal:     6.60,
      totalSavings:   1.50,
      totalCount:     5,
    },
  },

  // ── 5. Past: Cancelled ───────────────────────────────────────────────────
  {
    id: 'ORD-2026-005',
    placedAt: '2026-05-06T09:45:00.000Z',
    status: 'cancelled',
    deliveryAddress: '12-3, Gandhi Nagar, Nuziveedu, AP 521202',
    paymentMethod: 'cod',
    items: [
      { productId: 'f3', name: 'Alphonso Mangoes', nameTE: 'అల్ఫాన్సో మామిడిపండ్లు', emoji: '🥭', weight: '1 Kg', price: 6.00, mrp: 7.50, quantity: 1 },
      { productId: 'd1', name: 'Whole Milk',        nameTE: 'పూర్తి పాలు',             emoji: '🥛', weight: '1 L',  price: 2.50, mrp: 2.75, quantity: 1 },
    ],
    bill: {
      itemTotal:      8.50,
      mrpTotal:      10.25,
      itemDiscount:   1.75,
      deliveryFee:    0,
      platformFee:    0.10,
      couponDiscount: 0,
      grandTotal:     8.60,
      totalSavings:   1.75,
      totalCount:     2,
    },
  },
];

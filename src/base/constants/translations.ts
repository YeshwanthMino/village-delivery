// village-delivery/src/base/constants/translations.ts

export type Locale = 'te' | 'en';

type TranslationMap = Record<string, Record<Locale, string>>;

export const TRANSLATIONS: TranslationMap = {
  add:              { te: 'జోడించు +', en: 'ADD' },
  added:            { te: 'జోడించారు', en: 'ADDED' },
  see_all:          { te: 'అన్నీ చూడు', en: 'See all' },
  shop_now:         { te: 'ఇప్పుడు కొనండి', en: 'Shop Now' },
  search_placeholder: { te: 'వస్తువులు వెతకండి…', en: 'Search groceries…' },
  home_label:       { te: 'ఇల్లు', en: 'Home' },
  delivery_eta:     { te: '{n} నిమిషాల్లో డెలివరీ', en: 'Delivery in {n} min' },
  top_picks:        { te: 'మీ కోసం బెస్ట్ ఎంపికలు', en: 'Top picks for you' },
  shop_by_category: { te: 'వర్గాల ద్వారా కొనండి', en: 'Shop by category' },
  continue_btn:     { te: 'కొనసాగించు →', en: 'Continue →' },
  view_cart:        { te: 'కార్ట్ చూడండి', en: 'View cart' },
  nav_home:         { te: 'హోమ్', en: 'Home' },
  nav_categories:   { te: 'వర్గాలు', en: 'Categories' },
  nav_cart:         { te: 'కార్ట్', en: 'Cart' },
  nav_profile:      { te: 'ప్రొఫైల్', en: 'Profile' },
  choose_language:  { te: 'మీ భాష ఎంచుకోండి', en: 'Choose your language' },
  welcome:          { te: 'మీకు స్వాగతం!', en: 'Welcome!' },
  whatsapp_help:    { te: 'సహాయం', en: 'Help' },
  whatsapp_chat:    { te: 'WhatsApp లో మాట్లాడండి', en: 'Chat on WhatsApp' },
  payment_title:    { te: 'చెల్లింపు పద్ధతి', en: 'Payment Method' },
  cod:              { te: 'నగదు చెల్లింపు', en: 'Cash on Delivery' },
  upi:              { te: 'UPI చెల్లింపు', en: 'UPI Payment' },
  proceed_checkout: { te: 'చెక్అవుట్ కు వెళ్ళండి →', en: 'PROCEED TO CHECKOUT →' },
  item_count:       { te: '{n} వస్తువు', en: '{n} item' },
  discount_badge:   { te: '{n}% తగ్గింపు', en: '{n}% OFF' },
  // Category names keyed by category id
  cat_fruits:       { te: 'పండ్లు', en: 'Fruits' },
  cat_vegetables:   { te: 'కూరగాయలు', en: 'Vegetables' },
  cat_dairy:        { te: 'పాల ఉత్పత్తులు', en: 'Dairy' },
  cat_snacks:       { te: 'స్నాక్స్', en: 'Snacks' },
  cat_beverages:    { te: 'పానీయాలు', en: 'Beverages' },
  cat_bakery:       { te: 'బేకరీ', en: 'Bakery' },
  cat_meat:         { te: 'మాంసం', en: 'Meat' },
  cat_frozen:       { te: 'ఫ్రోజన్', en: 'Frozen' },
  cat_organic:      { te: 'సేంద్రీయ', en: 'Organic' },
  cat_pantry:       { te: 'పాంట్రీ', en: 'Pantry' },

  // Cart screen
  my_cart:             { te: 'నా కార్ట్',                                          en: 'My Cart' },
  your_items:          { te: 'మీ వస్తువులు',                                       en: 'Your Items' },
  fbt:                 { te: 'తరచుగా కలిసి కొనే వస్తువులు',                        en: 'Frequently Bought Together' },
  delivering_to_home:  { te: 'ఇంటికి డెలివరీ',                                     en: 'Delivering to Home' },
  change:              { te: 'మార్చు',                                              en: 'CHANGE' },
  secure_payments:     { te: 'సురక్షిత చెల్లింపులు · నిజమైన ఉత్పత్తులు',          en: 'Safe & secure payments · 100% genuine products' },

  // Bill summary
  bill_summary:        { te: 'బిల్లు వివరాలు',                                     en: 'BILL SUMMARY' },
  item_total_mrp:      { te: 'వస్తువుల మొత్తం (MRP)',                              en: 'Item total (MRP)' },
  discount_on_mrp:     { te: 'MRP పై తగ్గింపు',                                    en: 'Discount on MRP' },
  delivery_fee:        { te: 'డెలివరీ చార్జ్',                                     en: 'Delivery fee' },
  free:                { te: 'ఉచిత',                                               en: 'FREE' },
  platform_fee:        { te: 'ప్లాట్‌ఫారమ్ చార్జ్',                               en: 'Platform fee' },
  coupon_label:        { te: 'కూపన్ (VILLAGE10)',                                   en: 'Coupon (VILLAGE10)' },
  to_pay:              { te: 'చెల్లించాల్సిన మొత్తం',                              en: 'To Pay' },
  you_saved_order:     { te: '🎉 మీరు {n} ఆదా చేశారు',                            en: '🎉 You saved {n} on this order' },

  // Delivery ETA card
  free_over_500:       { te: '₹500 పైన ఉచిత',                                     en: 'Free over ₹500' },

  // Savings strip
  youre_saving:        { te: 'మీరు {n} ఆదా చేస్తున్నారు',                         en: "You're saving {n} on this order" },

  // Empty cart
  cart_empty_title:    { te: 'మీ కార్ట్ ఖాళీగా ఉంది',                             en: 'Your cart is empty' },
  cart_empty_subtitle: { te: 'తాజా కిరాణా వస్తువులు కార్ట్‌కు జోడించండి',         en: 'Add fresh groceries, dairy, snacks and more to your cart' },
  start_shopping:      { te: 'షాపింగ్ ప్రారంభించండి',                             en: 'Start Shopping' },

  // Floating cart pill
  one_item_cart:       { te: '1 వస్తువు కార్ట్‌లో',                               en: '1 item in cart' },
  n_items_cart:        { te: '{n} వస్తువులు కార్ట్‌లో',                            en: '{n} items in cart' },
  view_cart_arrow:     { te: 'కార్ట్ చూడండి →',                                   en: 'View cart →' },

  // Coupon row
  coupon_applied:      { te: 'కూపన్ VILLAGE10 వర్తించింది',                        en: 'Coupon VILLAGE10 applied' },
  apply_coupon:        { te: 'కూపన్ వర్తించండి',                                   en: 'Apply coupon' },
  coupon_savings:      { te: 'మీరు ₹{n} ఆదా చేశారు',                              en: 'You saved ₹{n}' },
  coupon_hint:         { te: 'VILLAGE10 వర్తించడానికి నొక్కండి — 10% తగ్గింపు',   en: 'Tap to apply VILLAGE10 — 10% off, up to ₹40' },
  remove:              { te: 'తొలగించు',                                           en: 'REMOVE' },
  apply:               { te: 'వర్తించు',                                           en: 'APPLY' },

  // Categories screen
  groceries_title:     { te: 'కిరాణా వస్తువులు',                                   en: 'Groceries' },
  sort:                { te: 'క్రమబద్ధం',                                          en: 'Sort' },
  sort_popular:        { te: 'అత్యంత జనాదరణ',                                      en: 'Most Popular' },
  sort_price_asc:      { te: 'ధర: తక్కువ నుండి ఎక్కువ',                          en: 'Price: Low to High' },
  sort_price_desc:     { te: 'ధర: ఎక్కువ నుండి తక్కువ',                          en: 'Price: High to Low' },
  sort_rating:         { te: 'అత్యుత్తమ రేటింగ్',                                  en: 'Top Rated' },
  cat_tagline:         { te: 'తాజా · నాణ్యమైన · 12 నిమిషాల్లో',                  en: 'Fresh · Quality · Delivered in 12 min' },
  filter_all:          { te: 'అన్నీ',                                              en: 'All' },
  filter_best_sellers: { te: 'బెస్ట్ సెల్లర్స్',                                  en: 'Best sellers' },
  filter_new:          { te: 'కొత్తవి',                                            en: 'New' },
  filter_on_sale:      { te: 'సేల్‌లో',                                           en: 'On sale' },
  filter_top_rated:    { te: 'టాప్ రేటెడ్',                                        en: 'Top rated' },
  items_label:         { te: '{n} వస్తువులు',                                      en: '{n} items' },
  cat_count:           { te: '{n} వర్గాలు',                                        en: '{n} categories' },

  // Search screen
  search_brands_ph:    { te: 'కిరాణా వస్తువులు, బ్రాండ్లు వెతకండి…',             en: 'Search groceries, brands…' },
  no_results:          { te: '"{n}" కోసం ఫలితాలు లేవు',                           en: 'No results for "{n}"' },
  start_typing:        { te: 'వెతకడానికి టైప్ చేయండి',                            en: 'Start typing to search' },

  // Profile screen
  sign_in_title:       { te: 'విలేజ్ డెలివరీకి సైన్ ఇన్ చేయండి',                en: 'Sign in to Village Delivery' },
  sign_in_subtitle:    { te: 'ఆర్డర్లు ట్రాక్ చేయండి, ఫేవరెట్లు సేవ్ చేయండి',  en: 'Track orders, save favourites and unlock member-only deals.' },
  sign_in_btn:         { te: 'సైన్ ఇన్',                                          en: 'Sign In' },
};

/** Returns translated string; falls back to English if key missing. */
export function translate(key: string, locale: Locale): string {
  return TRANSLATIONS[key]?.[locale] ?? TRANSLATIONS[key]?.en ?? key;
}

/** Replace `{n}` in a template string. */
export function interpolate(template: string, n: number | string): string {
  return template.replaceAll('{n}', String(n));
}

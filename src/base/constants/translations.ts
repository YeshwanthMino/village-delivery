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
  top_picks_title:           { te: 'టాప్ పిక్స్',               en: 'Top Picks' },
  search_top_picks_ph:       { te: 'టాప్ పిక్స్ వెతకండి…',      en: 'Search top picks…' },
  top_picks_empty_title:     { te: 'వస్తువులు కనుగొనబడలేదు',   en: 'No products found' },
  top_picks_empty_subtitle:  { te: 'వేరే పదాలతో వెతకండి',       en: 'Try a different search term' },
  shop_by_category: { te: 'వర్గాల ద్వారా కొనండి', en: 'Shop by category' },
  continue_btn:     { te: 'కొనసాగించు →', en: 'Continue →' },
  view_cart:        { te: 'కార్ట్ చూడండి', en: 'View cart' },
  nav_home:         { te: 'హోమ్', en: 'Home' },
  nav_categories:   { te: 'వర్గాలు', en: 'Categories' },
  nav_cart:         { te: 'కార్ట్', en: 'Cart' },
  nav_profile:      { te: 'ప్రొఫైల్', en: 'Profile' },
  nav_orders:       { te: 'నా ఆర్డర్లు', en: 'My Orders' },
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

  // Bottom sheets
  choose_variant:      { te: 'బరువు / ప్యాక్ సైజ్ ఎంచుకోండి', en: 'Choose a weight / pack size' },
  sort_by:             { te: 'క్రమబద్ధం చేయండి',              en: 'Sort by' },

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

  // Orders screen
  orders_empty_title:    { te: 'ఇంకా ఆర్డర్లు లేవు',           en: 'No orders yet' },
  orders_empty_subtitle: { te: 'మీ మొదటి ఆర్డర్ ఇక్కడ కనిపిస్తుంది', en: 'Your first order will appear here' },

  // Order list & detail
  orders_filter_all:          { te: 'అన్నీ',                       en: 'All' },
  orders_no_results:          { te: 'ఆర్డర్లు లేవు',              en: 'No orders' },
  orders_active:              { te: 'చురుకైన ఆర్డర్లు',           en: 'Active Orders' },
  orders_past:                { te: 'గత ఆర్డర్లు',                en: 'Past Orders' },
  order_id:                   { te: 'ఆర్డర్ {n}',                 en: 'Order {n}' },
  status_placed:              { te: 'ఆర్డర్ చేయబడింది',           en: 'Order Placed' },
  status_confirmed:           { te: 'నిర్ధారించబడింది',            en: 'Confirmed' },
  status_out_for_delivery:    { te: 'డెలివరీకి బయలుదేరింది',       en: 'Out for Delivery' },
  status_delivered:           { te: 'డెలివరీ అయింది',              en: 'Delivered' },
  status_cancelled:           { te: 'రద్దు చేయబడింది',             en: 'Cancelled' },
  reorder_btn:                { te: 'మళ్ళీ ఆర్డర్ చేయి',          en: 'Reorder' },
  delivery_address_label:     { te: 'డెలివరీ చిరునామా',            en: 'Delivery Address' },
  payment_method_used:        { te: 'చెల్లింపు',                   en: 'Payment' },
  view_details:               { te: 'వివరాలు చూడండి →',           en: 'View Details →' },
};

/** Returns translated string; falls back to English if key missing. */
export function translate(key: string, locale: Locale): string {
  return TRANSLATIONS[key]?.[locale] ?? TRANSLATIONS[key]?.en ?? key;
}

/** Replace `{n}` in a template string. */
export function interpolate(template: string, n: number | string): string {
  return template.replaceAll('{n}', String(n));
}

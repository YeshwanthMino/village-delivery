// village-delivery/src/base/constants/translations.ts

export type Locale = 'te' | 'en';

type TranslationMap = Record<string, Record<Locale, string>>;

export const TRANSLATIONS: TranslationMap = {
  add:              { te: 'జోడించు +', en: 'ADD' },
  added:            { te: 'జోడించారు', en: 'ADDED' },
  see_all:          { te: 'అన్నీ చూడు', en: 'See all' },
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
};

/** Returns translated string; falls back to English if key missing. */
export function translate(key: string, locale: Locale): string {
  return TRANSLATIONS[key]?.[locale] ?? TRANSLATIONS[key]?.en ?? key;
}

/** Replace `{n}` in a template string. */
export function interpolate(template: string, n: number | string): string {
  return template.replaceAll('{n}', String(n));
}

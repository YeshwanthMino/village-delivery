// Maps Tailwind gradient class names → hex color values for use with expo-linear-gradient
const GRADIENT_COLORS: Record<string, string> = {
  // from- classes
  'from-amber-100': '#fef3c7',
  'from-amber-50':  '#fffbeb',
  'from-blue-100':  '#dbeafe',
  'from-blue-50':   '#eff6ff',
  'from-cyan-50':   '#ecfeff',
  'from-emerald-600': '#059669',
  'from-green-100': '#dcfce7',
  'from-green-50':  '#f0fdf4',
  'from-green-600': '#16a34a',
  'from-lime-600':  '#65a30d',
  'from-orange-100':'#ffedd5',
  'from-purple-100':'#f3e8ff',
  'from-red-100':   '#fee2e2',
  'from-rose-100':  '#ffe4e6',
  'from-sky-50':    '#f0f9ff',
  'from-stone-100': '#f5f5f4',
  'from-yellow-100':'#fef9c3',
  'from-yellow-50': '#fefce8',
  // to- classes
  'to-amber-50':    '#fffbeb',
  'to-blue-50':     '#eff6ff',
  'to-cyan-50':     '#ecfeff',
  'to-emerald-50':  '#ecfdf5',
  'to-emerald-700': '#047857',
  'to-green-50':    '#f0fdf4',
  'to-green-700':   '#15803d',
  'to-indigo-50':   '#eef2ff',
  'to-lime-50':     '#f7fee7',
  'to-orange-50':   '#fff7ed',
  'to-pink-50':     '#fdf2f8',
  'to-purple-50':   '#faf5ff',
  'to-red-50':      '#fef2f2',
  'to-rose-50':     '#fff1f2',
  'to-sky-50':      '#f0f9ff',
  'to-slate-50':    '#f8fafc',
  'to-stone-50':    '#fafaf9',
  'to-teal-50':     '#f0fdfa',
  'to-teal-700':    '#0f766e',
  'to-violet-50':   '#f5f3ff',
  'to-yellow-50':   '#fefce8',
};

/** Convert a Tailwind gradient class name to its hex color value. */
export function gradientColor(cls: string, fallback = '#f1f5f9'): string {
  return GRADIENT_COLORS[cls] ?? fallback;
}

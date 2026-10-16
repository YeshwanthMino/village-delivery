import { createElement, forwardRef } from 'react';

// Large system font sizes make fixed-height rows (header, banners, category
// tiles, cart bar) clip their text. Allow some scaling for accessibility but
// cap it. React 19 ignores Text.defaultProps, so wrap the components instead.
// `require` (not `import *`) so we patch the real module object, not an interop copy.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require('react-native') as typeof import('react-native');

const MAX_FONT_SIZE_MULTIPLIER = 1.15;

function withFontCap<P extends object>(Base: React.ComponentType<P>) {
  const Capped = forwardRef<unknown, P>((props, ref) =>
    createElement(Base as React.ComponentType<any>, {
      maxFontSizeMultiplier: MAX_FONT_SIZE_MULTIPLIER,
      ...props,
      ref,
    }),
  );
  Capped.displayName = (Base as { displayName?: string }).displayName;
  return Capped;
}

const CappedText = withFontCap(RN.Text);
const CappedTextInput = withFontCap(RN.TextInput);

Object.defineProperty(RN, 'Text', { get: () => CappedText, configurable: true });
Object.defineProperty(RN, 'TextInput', { get: () => CappedTextInput, configurable: true });

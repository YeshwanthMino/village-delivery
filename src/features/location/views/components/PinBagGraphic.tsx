// src/features/location/views/components/PinBagGraphic.tsx
//
// Purple gradient map-pin with a shopping-bag glyph — the "not serviceable"
// hero illustration.

import React from 'react';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export const PinBagGraphic = ({ width = 62, height = 78 }: Props) => (
  <Svg width={width} height={height} viewBox="0 0 62 78" fill="none">
    <Ellipse cx="31" cy="73" rx="13" ry="4" fill="rgba(124,58,237,0.12)" />
    <Path
      d="M31 3C17.74 3 7 13.74 7 27c0 17.5 24 47 24 47S55 44.5 55 27C55 13.74 44.26 3 31 3z"
      fill="url(#pinGradP)"
    />
    <Circle cx="31" cy="26" r="11" fill="white" fillOpacity={0.95} />
    {/* shopping bag */}
    <Path
      d="M26 24h10a1 1 0 0 1 1 1l.6 6.4a1.5 1.5 0 0 1-1.5 1.6h-9.2a1.5 1.5 0 0 1-1.5-1.6L26 25a1 1 0 0 1 1-1z"
      fill="#7c3aed"
    />
    <Path
      d="M28 24v-1.2a3 3 0 0 1 6 0V24"
      stroke="#7c3aed"
      strokeWidth={1.6}
      strokeLinecap="round"
      fill="none"
    />
    <Defs>
      <LinearGradient id="pinGradP" x1="31" y1="3" x2="31" y2="74" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#a855f7" />
        <Stop offset="1" stopColor="#7c3aed" />
      </LinearGradient>
    </Defs>
  </Svg>
);

// src/features/location/views/components/LocationPinGraphic.tsx
//
// Green gradient map-pin illustration (Village Delivery design hero).

import React from 'react';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export const LocationPinGraphic = ({ width = 62, height = 78 }: Props) => (
  <Svg width={width} height={height} viewBox="0 0 62 78" fill="none">
    <Ellipse cx="31" cy="73" rx="13" ry="4" fill="rgba(0,0,0,0.09)" />
    <Path
      d="M31 3C17.74 3 7 13.74 7 27c0 17.5 24 47 24 47S55 44.5 55 27C55 13.74 44.26 3 31 3z"
      fill="url(#pinGrad)"
    />
    <Circle cx="31" cy="26" r="9.5" fill="white" fillOpacity={0.92} />
    <Circle cx="31" cy="26" r="3.5" fill="#16a34a" />
    <Defs>
      <LinearGradient id="pinGrad" x1="31" y1="3" x2="31" y2="74" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#4ade80" />
        <Stop offset="1" stopColor="#15803d" />
      </LinearGradient>
    </Defs>
  </Svg>
);

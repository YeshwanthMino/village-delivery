import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

/** Vector illustration for "we don't deliver here yet": a map pin standing
 *  between two village houses, with a dashed route that stops short and a
 *  badge marking the location as unavailable. Same palette as the basket
 *  illustration in LoadErrorState. */
export const NotServiceableIllustration = () => (
  <Svg width={200} height={170} viewBox="0 0 200 170">
    <Circle cx={100} cy={88} r={74} fill="#f0fdf4" />
    <Circle cx={32} cy={40} r={5} fill="#bbf7d0" />
    <Circle cx={172} cy={58} r={7} fill="#dcfce7" />
    <Circle cx={166} cy={132} r={4} fill="#bbf7d0" />
    <Ellipse cx={100} cy={150} rx={62} ry={7} fill="#16a34a" fillOpacity={0.12} />

    {/* left house */}
    <Rect x={38} y={112} width={32} height={34} rx={3} fill="#bbf7d0" />
    <Path d="M33 114 L54 94 L75 114 Z" fill="#16a34a" />
    <Rect x={49} y={128} width={10} height={18} rx={2} fill="#15803d" fillOpacity={0.55} />

    {/* right house */}
    <Rect x={134} y={118} width={28} height={28} rx={3} fill="#bbf7d0" />
    <Path d="M130 120 L148 102 L166 120 Z" fill="#22c55e" />
    <Rect x={144} y={132} width={9} height={14} rx={2} fill="#15803d" fillOpacity={0.55} />

    {/* dashed route that stops short of the pin */}
    <Path
      d="M54 150 C70 150 78 142 90 142"
      fill="none"
      stroke="#16a34a"
      strokeWidth={3}
      strokeLinecap="round"
      strokeDasharray="1 8"
      strokeOpacity={0.7}
    />

    {/* map pin */}
    <Path
      d="M100 26 C80 26 65 41 65 60 C65 84 100 126 100 126 C100 126 135 84 135 60 C135 41 120 26 100 26 Z"
      fill="#22c55e"
    />
    <Path
      d="M100 26 C120 26 135 41 135 60 C135 84 100 126 100 126 Z"
      fill="#16a34a"
      fillOpacity={0.35}
    />
    <Circle cx={100} cy={60} r={17} fill="#ffffff" />
    <Circle cx={100} cy={60} r={6.5} fill="#16a34a" />

    {/* unavailable badge */}
    <Circle cx={134} cy={38} r={17} fill="#f59e0b" />
    <G stroke="#ffffff" strokeWidth={4} strokeLinecap="round">
      <Line x1={127.5} y1={31.5} x2={140.5} y2={44.5} />
      <Line x1={140.5} y1={31.5} x2={127.5} y2={44.5} />
    </G>
  </Svg>
);

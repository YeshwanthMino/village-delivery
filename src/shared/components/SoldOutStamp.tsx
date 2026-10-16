import Svg, { G, Rect, Text as SvgText } from "react-native-svg";
import { useTranslation } from "@/src/core/utils/useTranslation";

const RED = "#ef4444";

type Props = {
  /** Rendered width in px; height follows the 200:90 viewBox. */
  width: number;
  label?: string;
};

/** Rubber-stamp "SOLD OUT" drawn as vector shapes. The tilt lives inside the
 *  SVG, so it stays crisp — rotating a bordered native View aliases its edges. */
export const SoldOutStamp = ({ width, label }: Props) => {
  const { t } = useTranslation();
  const text = label ?? t("sold_out");
  return (
    <Svg
      opacity={0.85}
      accessibilityLabel={text}
      width={width}
      height={(width * 90) / 200}
      viewBox="0 0 200 90"
      pointerEvents="none"
    >
      <G rotation={-8} origin="100, 45">
        <Rect
          x={10}
          y={16}
          width={180}
          height={58}
          rx={8}
          fill="#ffffff"
          fillOpacity={0.6}
          stroke={RED}
          strokeWidth={2.5}
        />
        <SvgText
          x={100}
          y={55}
          fill={RED}
          fontSize={text.length > 9 ? 22 : 28}
          fontWeight="600"
          letterSpacing={2}
          textAnchor="middle"
        >
          {text}
        </SvgText>
      </G>
    </Svg>
  );
};

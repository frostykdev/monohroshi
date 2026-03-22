import { StyleSheet, TextStyle, View, ViewStyle } from "react-native";
import { AnimatedRollingNumber } from "react-native-animated-rolling-numbers";
import { Typography } from "@components/ui/Typography";
import { getCurrencySymbol } from "@constants/account-types";
import { colors } from "@constants/colors";
import type { AppColor } from "@constants/colors";

type Props = {
  value: number;
  currency: string;
  /** Optional sign prefix: "−" or "+" */
  prefix?: string;
  /** Text color token, e.g. "error" or "textPrimary" */
  color?: AppColor;
  /** Extra styles (fontSize / fontWeight only — color is controlled via `color` prop) */
  style?: TextStyle | TextStyle[];
  /** Duration in ms, default 900 */
  duration?: number;
};

export const AnimatedBalance = ({
  value,
  currency,
  prefix,
  color = "textPrimary",
  style,
  duration = 900,
}: Props) => {
  const sym = getCurrencySymbol(currency);
  const flatStyle = StyleSheet.flatten(style) ?? {};
  const resolvedColor = colors[color];

  const digitStyle: TextStyle = {
    fontSize: flatStyle.fontSize ?? 32,
    fontWeight: (flatStyle.fontWeight as TextStyle["fontWeight"]) ?? "700",
    color: resolvedColor,
    includeFontPadding: false,
  };

  return (
    <View style={s.row}>
      {prefix ? (
        <Typography variant="h1" style={[flatStyle, { color: resolvedColor }]}>
          {prefix}
        </Typography>
      ) : null}
      <AnimatedRollingNumber
        value={Math.abs(value)}
        useGrouping
        // locale="uk-UA"
        textStyle={digitStyle}
      />
      <Typography variant="h1" style={[flatStyle, { color: resolvedColor }]}>
        {" "}
        {sym}
      </Typography>
    </View>
  );
};

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  } as ViewStyle,
});
